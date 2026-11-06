import type { BikeData, ComponentInstance, MaintenanceEvent } from "./models";
import { validDate, validHours } from "./maintenance";

export function activeInstance(
  data: BikeData,
  slotId: string,
): ComponentInstance | undefined {
  return data.instances.find(
    (instance) => instance.slotId === slotId && instance.removedAt === null,
  );
}

export function recordService(
  data: BikeData,
  event: MaintenanceEvent,
): BikeData {
  const instance = data.instances.find((item) => item.id === event.instanceId);
  if (!instance || instance.removedAt)
    throw new Error("Select an installed component.");
  if (!event.id.trim() || data.events.some((item) => item.id === event.id))
    throw new Error("This service ID already exists.");
  if (!event.workPerformed.trim() || !event.serviceType.trim())
    throw new Error("Describe the work and service type.");
  if (
    !validDate(event.date) ||
    !validDate(data.usage.recordedAt) ||
    Date.parse(event.date) > Date.parse(data.usage.recordedAt) ||
    (instance.installedAt &&
      Date.parse(event.date) < Date.parse(instance.installedAt))
  ) {
    throw new Error(
      "Service date must be within the installation and usage dates.",
    );
  }
  if (
    !validHours(event.bikeHours) ||
    !validHours(data.usage.cumulativeHours) ||
    event.bikeHours > data.usage.cumulativeHours ||
    (instance.installedAtBikeHours !== null &&
      event.bikeHours < instance.installedAtBikeHours)
  ) {
    throw new Error(
      "Service hours must be between installation and current bike usage.",
    );
  }
  const meter = event.bikeHours;
  if (
    data.events.some(
      (item) =>
        item.instanceId === instance.id &&
        validHours(item.bikeHours) &&
        ((Date.parse(item.date) < Date.parse(event.date) &&
          item.bikeHours > meter) ||
          (Date.parse(item.date) > Date.parse(event.date) &&
            item.bikeHours < meter)),
    )
  ) {
    throw new Error("Service hours conflict with existing history.");
  }
  return { ...data, events: [...data.events, event] };
}

export function replaceComponent(
  data: BikeData,
  input: {
    slotId: string;
    newInstanceId: string;
    componentId: string;
    date: string;
    bikeHours: number;
  },
): BikeData {
  const previous = activeInstance(data, input.slotId);
  if (!previous) throw new Error("No installed component in this slot.");
  if (
    !input.newInstanceId.trim() ||
    data.instances.some((item) => item.id === input.newInstanceId)
  )
    throw new Error("Replacement needs a unique instance ID.");
  if (!data.components.some((item) => item.id === input.componentId))
    throw new Error("Unknown catalog component.");
  if (
    !validDate(input.date) ||
    !validDate(data.usage.recordedAt) ||
    Date.parse(input.date) > Date.parse(data.usage.recordedAt) ||
    (previous.installedAt &&
      Date.parse(input.date) < Date.parse(previous.installedAt))
  )
    throw new Error("Invalid replacement date.");
  if (
    !validHours(input.bikeHours) ||
    !validHours(data.usage.cumulativeHours) ||
    input.bikeHours > data.usage.cumulativeHours ||
    (previous.installedAtBikeHours !== null &&
      input.bikeHours < previous.installedAtBikeHours)
  )
    throw new Error("Invalid replacement usage.");
  if (
    data.events.some(
      (event) =>
        event.instanceId === previous.id &&
        (Date.parse(event.date) > Date.parse(input.date) ||
          (event.bikeHours !== null && event.bikeHours > input.bikeHours)),
    )
  ) {
    throw new Error(
      "Replacement cannot precede the installed component’s service history.",
    );
  }
  const replacement: ComponentInstance = {
    id: input.newInstanceId,
    componentId: input.componentId,
    slotId: input.slotId,
    installedAt: input.date,
    installedAtBikeHours: input.bikeHours,
    removedAt: null,
    removedAtBikeHours: null,
    serial: null,
    isMock: true,
  };
  return {
    ...data,
    instances: [
      ...data.instances.map((instance) =>
        instance.id === previous.id
          ? {
              ...instance,
              removedAt: input.date,
              removedAtBikeHours: input.bikeHours,
            }
          : instance,
      ),
      replacement,
    ],
  };
}
