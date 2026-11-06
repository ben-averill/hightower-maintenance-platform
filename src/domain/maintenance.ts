import type {
  ComponentInstance,
  MaintenanceEvent,
  MaintenanceRule,
  MaintenanceState,
} from "./models";

export const statusLabels = {
  good: "Good",
  approaching: "Approaching service",
  due: "Due",
  overdue: "Overdue",
  unknown: "Unknown",
} as const;

export const validHours = (value: number | null): value is number =>
  value !== null && Number.isFinite(value) && value >= 0;
export const validDate = (date: string): boolean =>
  Number.isFinite(Date.parse(date));

export function historyForInstance(
  events: MaintenanceEvent[],
  instanceId: string,
): MaintenanceEvent[] {
  return events
    .filter((event) => event.instanceId === instanceId)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export function calculateMaintenance(input: {
  instance: ComponentInstance;
  rule: MaintenanceRule | undefined;
  events: MaintenanceEvent[];
  currentHours: number | null;
  asOf: string;
}): MaintenanceState {
  const { instance, rule, events, currentHours, asOf } = input;
  const unknown = (reason: string): MaintenanceState => ({
    status: "unknown",
    hoursSinceService: null,
    intervalHours: rule?.intervalHours ?? null,
    progress: null,
    reason,
  });
  if (!rule || rule.componentId !== instance.componentId)
    return unknown("No applicable service rule yet.");
  if (
    rule.authority === "manufacturer" &&
    (!rule.verified || !rule.source.document || !rule.source.url)
  ) {
    return unknown(
      "Manufacturer documentation and interval still need verification.",
    );
  }
  if (!validHours(rule.intervalHours) || rule.intervalHours === 0)
    return unknown("Service interval is not defined.");
  if (!validHours(currentHours) || !validDate(asOf))
    return unknown("Current usage or date is unknown.");
  if (
    instance.installedAt &&
    (!validDate(instance.installedAt) ||
      Date.parse(instance.installedAt) > Date.parse(asOf))
  ) {
    return unknown("Installation date conflicts with usage.");
  }
  if (instance.removedAt && Date.parse(instance.removedAt) <= Date.parse(asOf))
    return unknown("This component is no longer installed.");
  const matching = events.filter(
    (event) =>
      event.instanceId === instance.id &&
      event.serviceType === rule.serviceType,
  );
  if (matching.some((event) => !validDate(event.date)))
    return unknown("Service history contains an invalid date.");
  const history = matching
    .filter((event) => Date.parse(event.date) <= Date.parse(asOf))
    .sort(
      (a, b) =>
        Date.parse(a.date) - Date.parse(b.date) ||
        (a.bikeHours ?? 0) - (b.bikeHours ?? 0),
    );
  let baseline = instance.installedAtBikeHours;
  for (const event of history) {
    if (
      !validHours(event.bikeHours) ||
      event.bikeHours > currentHours ||
      (baseline !== null &&
        (!validHours(baseline) || event.bikeHours < baseline)) ||
      (instance.installedAt &&
        Date.parse(event.date) < Date.parse(instance.installedAt))
    ) {
      return unknown(
        "Service history and usage are incomplete or inconsistent.",
      );
    }
    baseline = event.bikeHours;
  }
  if (!validHours(baseline) || baseline > currentHours)
    return unknown("A valid installation or service baseline is needed.");
  const hoursSinceService = currentHours - baseline;
  const progress = hoursSinceService / rule.intervalHours;
  const status =
    progress > 1
      ? "overdue"
      : progress === 1
        ? "due"
        : progress >= 0.8
          ? "approaching"
          : "good";
  return {
    status,
    hoursSinceService,
    intervalHours: rule.intervalHours,
    progress,
    reason: history.length
      ? "Since the latest matching service."
      : "Since this component was installed.",
  };
}
