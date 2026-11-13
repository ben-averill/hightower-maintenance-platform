import { describe, expect, it } from "vitest";
import { createSeedData, forkInstanceId } from "../data/seed";
import { recordService } from "./commands";
import {
  applyWithRideUsage,
  currentUsage,
  importStravaActivities,
  nextSyncAfter,
  removeRide,
  setStartingMeter,
  type StravaActivitySummary,
} from "./rides";

const activity = (
  override: Partial<StravaActivitySummary> = {},
): StravaActivitySummary => ({
  id: 1001,
  name: "Lunch ride",
  sport_type: "MountainBikeRide",
  start_date: "2026-10-04T16:00:00Z",
  start_date_local: "2026-10-04T12:00:00Z",
  elapsed_time: 9000,
  moving_time: 7200,
  distance: 24000,
  total_elevation_gain: 650,
  gear_id: "b123",
  ...override,
});

describe("Strava import", () => {
  it("adds cycling activities and skips duplicates on re-sync", () => {
    const first = importStravaActivities(createSeedData(), [activity()], {
      gearId: "b123",
    });
    expect(first.added).toHaveLength(1);
    expect(first.data.rides[0]).toMatchObject({
      id: "ride-strava-1001",
      localDate: "2026-10-04",
      movingSeconds: 7200,
      source: { provider: "strava", activityId: "1001", gearId: "b123" },
    });
    const again = importStravaActivities(first.data, [activity()], {
      gearId: "b123",
    });
    expect(again.added).toHaveLength(0);
    expect(again.skippedDuplicates).toBe(1);
    expect(again.data.rides).toHaveLength(1);
  });

  it("skips runs and rides on other bikes", () => {
    const result = importStravaActivities(
      createSeedData(),
      [
        activity({ id: 1, sport_type: "Run" }),
        activity({ id: 2, gear_id: "b999" }),
        activity({ id: 3 }),
      ],
      { gearId: "b123" },
    );
    expect(result.added.map((ride) => ride.source?.provider === "strava" ? ride.source.activityId : null)).toEqual(["3"]);
    expect(result.skippedOther).toBe(2);
  });

  it("accepts any bike when no gear is chosen", () => {
    const result = importStravaActivities(
      createSeedData(),
      [activity({ id: 2, gear_id: null }), activity({ id: 3, gear_id: "x" })],
      { gearId: null },
    );
    expect(result.added).toHaveLength(2);
  });
});

describe("bike meter", () => {
  it("adds moving time of rides after the starting meter", () => {
    const seed = createSeedData();
    const { data } = importStravaActivities(
      seed,
      [
        activity({ id: 1, moving_time: 5400 }),
        activity({
          id: 2,
          start_date: "2026-09-01T10:00:00Z",
          start_date_local: "2026-09-01T10:00:00Z",
        }),
      ],
      { gearId: null },
    );
    const usage = currentUsage(data);
    expect(usage.cumulativeHours).toBe(154.5);
    expect(usage.recordedAt).toBe("2026-10-04");
    expect(data.usage.cumulativeHours).toBe(153);
  });

  it("falls back to elapsed time without moving time", () => {
    const { data } = importStravaActivities(
      createSeedData(),
      [activity({ moving_time: null, elapsed_time: 3600 })],
      { gearId: null },
    );
    expect(currentUsage(data).cumulativeHours).toBe(154);
  });

  it("lets service be recorded at ride-adjusted hours without moving the baseline", () => {
    const { data } = importStravaActivities(createSeedData(), [activity()], {
      gearId: null,
    });
    const event = {
      ...data.events[0]!,
      id: "svc-after-ride",
      instanceId: forkInstanceId,
      date: "2026-10-04",
      bikeHours: 155,
    };
    expect(() => recordService(data, event)).toThrow();
    const updated = applyWithRideUsage(data, (view) =>
      recordService(view, event),
    );
    expect(updated.events.at(-1)?.id).toBe("svc-after-ride");
    expect(updated.usage).toEqual(data.usage);
  });

  it("sets a real starting meter and validates it", () => {
    const updated = setStartingMeter(createSeedData(), {
      hours: 40,
      date: "2026-11-01",
    });
    expect(updated.usage).toMatchObject({
      cumulativeHours: 40,
      recordedAt: "2026-11-01",
      isMock: false,
    });
    expect(() =>
      setStartingMeter(createSeedData(), { hours: -1, date: "2026-11-01" }),
    ).toThrow();
    expect(() =>
      setStartingMeter(createSeedData(), { hours: 1, date: "nope" }),
    ).toThrow();
  });

  it("removes a ride", () => {
    const { data } = importStravaActivities(createSeedData(), [activity()], {
      gearId: null,
    });
    expect(removeRide(data, "ride-strava-1001").rides).toHaveLength(0);
  });
});

describe("sync window", () => {
  it("starts at the starting meter date, then after the latest Strava ride", () => {
    const seed = createSeedData();
    expect(nextSyncAfter(seed)).toBe(Date.parse("2026-09-30T00:00:00Z") / 1000);
    const { data } = importStravaActivities(seed, [activity()], {
      gearId: null,
    });
    expect(nextSyncAfter(data)).toBe(Date.parse("2026-10-04T16:00:00Z") / 1000);
  });
});
