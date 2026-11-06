import { describe, expect, it } from "vitest";
import { createSeedData, forkInstanceId } from "../data/seed";
import { calculateMaintenance, historyForInstance } from "./maintenance";
import { activeInstance, recordService, replaceComponent } from "./commands";
import type { MaintenanceEvent } from "./models";

function fixture() {
  const data = createSeedData();
  return {
    data,
    instance: activeInstance(data, "suspension.fork")!,
    rule: data.rules.find((item) => item.authority === "application-demo")!,
    events: data.events,
    currentHours: 153,
    asOf: "2026-09-30",
  };
}
function newEvent(overrides: Partial<MaintenanceEvent> = {}): MaintenanceEvent {
  return {
    ...createSeedData().events[0]!,
    id: "service-new",
    date: "2026-09-30",
    bikeHours: 153,
    ...overrides,
  };
}
describe("maintenance intervals", () => {
  it.each([
    [120, "good"],
    [153, "good"],
    [160, "approaching"],
    [170, "due"],
    [170.1, "overdue"],
  ] as const)("at %s bike hours calculates %s", (currentHours, status) => {
    expect(calculateMaintenance({ ...fixture(), currentHours }).status).toBe(
      status,
    );
  });
  it("calculates 33 hours since matching service", () => {
    expect(calculateMaintenance(fixture())).toMatchObject({
      hoursSinceService: 33,
      progress: 0.66,
      intervalHours: 50,
    });
  });
  it("does not fabricate a manufacturer interval", () => {
    const input = fixture();
    expect(
      calculateMaintenance({ ...input, rule: input.data.rules[0] }).status,
    ).toBe("unknown");
  });
  it("unverified manufacturer rules stay unknown even with a number", () => {
    const input = fixture();
    expect(
      calculateMaintenance({
        ...input,
        rule: { ...input.data.rules[0]!, intervalHours: 50 },
      }).status,
    ).toBe("unknown");
  });
  it.each([null, -1, Infinity, NaN])(
    "unknown or invalid usage %s is not healthy",
    (currentHours) => {
      expect(calculateMaintenance({ ...fixture(), currentHours }).status).toBe(
        "unknown",
      );
    },
  );
  it.each([null, 0, -1, Infinity])(
    "rejects invalid interval %s",
    (intervalHours) => {
      const input = fixture();
      expect(
        calculateMaintenance({
          ...input,
          rule: { ...input.rule, intervalHours },
        }).status,
      ).toBe("unknown");
    },
  );
  it("requires a baseline when there is no service history", () => {
    const input = fixture();
    expect(
      calculateMaintenance({
        ...input,
        events: [],
        instance: { ...input.instance, installedAtBikeHours: null },
      }).status,
    ).toBe("unknown");
  });
  it("uses installation hours as baseline when known", () => {
    const input = fixture();
    expect(
      calculateMaintenance({
        ...input,
        events: [],
        instance: { ...input.instance, installedAtBikeHours: 130 },
      }).hoursSinceService,
    ).toBe(23);
  });
  it("ignores another procedure and another component", () => {
    const input = fixture();
    const events = [
      ...input.events,
      newEvent({ serviceType: "inspection" }),
      newEvent({ instanceId: "other-fork" }),
    ];
    expect(calculateMaintenance({ ...input, events }).hoursSinceService).toBe(
      33,
    );
  });
  it("ignores future events", () => {
    const input = fixture();
    expect(
      calculateMaintenance({
        ...input,
        events: [...input.events, newEvent({ date: "2026-10-01" })],
      }).hoursSinceService,
    ).toBe(33);
  });
  it("does not depend on event array order", () => {
    const input = fixture();
    expect(
      calculateMaintenance({ ...input, events: [newEvent(), ...input.events] })
        .hoursSinceService,
    ).toBe(0);
  });
  it("rejects inconsistent history rather than silently clamping hours", () => {
    const input = fixture();
    expect(
      calculateMaintenance({
        ...input,
        events: [...input.events, newEvent({ bikeHours: 100 })],
      }).status,
    ).toBe("unknown");
  });
  it("unknown latest service hours do not fall back to older service", () => {
    const input = fixture();
    expect(
      calculateMaintenance({
        ...input,
        events: [...input.events, newEvent({ bikeHours: null })],
      }).status,
    ).toBe("unknown");
  });
});
describe("service recording", () => {
  it("records immutably against a physical instance and resets matching usage", () => {
    const input = fixture();
    const updated = recordService(input.data, newEvent());
    expect(input.data.events).toHaveLength(1);
    expect(historyForInstance(updated.events, forkInstanceId)).toHaveLength(2);
    expect(
      calculateMaintenance({ ...input, events: updated.events })
        .hoursSinceService,
    ).toBe(0);
  });
  it.each([
    { instanceId: "missing" },
    { id: "service-demo-001" },
    { bikeHours: 154 },
    { bikeHours: -1 },
    { date: "2027-01-01" },
    { date: "2025-01-01" },
    { workPerformed: " " },
    { bikeHours: 110 },
  ])("rejects invalid service %j", (override) => {
    expect(() => recordService(createSeedData(), newEvent(override))).toThrow();
  });
});
describe("component lifecycle", () => {
  const replacement = {
    slotId: "suspension.fork",
    newInstanceId: "replacement-fork",
    componentId: "product-suspension.fork",
    date: "2026-09-30",
    bikeHours: 153,
  };
  it("replaces the fork without replacing the bike or reassigning history", () => {
    const input = fixture();
    const updated = replaceComponent(input.data, replacement);
    expect(updated.bike).toEqual(input.data.bike);
    expect(updated.events).toEqual(input.data.events);
    expect(
      updated.instances.find((item) => item.id === forkInstanceId)
        ?.removedAtBikeHours,
    ).toBe(153);
    const current = activeInstance(updated, "suspension.fork")!;
    expect(current.id).toBe("replacement-fork");
    expect(historyForInstance(updated.events, current.id)).toEqual([]);
    expect(historyForInstance(updated.events, forkInstanceId)).toHaveLength(1);
    expect(
      calculateMaintenance({
        ...input,
        instance: current,
        events: updated.events,
      }).hoursSinceService,
    ).toBe(0);
    expect(input.instance.removedAt).toBeNull();
  });
  it.each([
    { newInstanceId: forkInstanceId },
    { slotId: "missing" },
    { componentId: "missing" },
    { date: "2025-01-01" },
    { date: "2026-07-01" },
    { bikeHours: 110 },
    { bikeHours: 154 },
    { bikeHours: NaN },
  ])("rejects invalid replacement %j", (override) => {
    expect(() =>
      replaceComponent(createSeedData(), { ...replacement, ...override }),
    ).toThrow();
  });
  it("does not accept new service on a retired component", () => {
    const updated = replaceComponent(createSeedData(), replacement);
    expect(() => recordService(updated, newEvent())).toThrow(
      "installed component",
    );
  });
});
