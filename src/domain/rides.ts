import type { BikeData, Ride, UsageRecord } from "./models";
import { validDate, validHours } from "./maintenance";
import type { RideFileSummary } from "./rideFiles";

/** Hours a ride adds to the bike meter: moving time, falling back to elapsed. */
export function rideHours(ride: Ride): number {
  const seconds = ride.movingSeconds ?? ride.elapsedSeconds;
  return Number.isFinite(seconds) && seconds > 0 ? seconds / 3600 : 0;
}

/** Rides that happened after the starting meter was read. */
export function ridesAfterBaseline(data: BikeData): Ride[] {
  return data.rides.filter((ride) => ride.localDate > data.usage.recordedAt);
}

/**
 * The effective bike meter: the starting meter plus every ride dated after it.
 * Rounded to 0.1 h so it can seed the service form's 0.1 h step.
 */
export function currentUsage(data: BikeData): UsageRecord {
  const baseline = data.usage;
  if (!validHours(baseline.cumulativeHours)) return baseline;
  const rides = ridesAfterBaseline(data);
  const total = rides.reduce((sum, ride) => sum + rideHours(ride), 0);
  const latest = rides.reduce(
    (date, ride) => (ride.localDate > date ? ride.localDate : date),
    baseline.recordedAt,
  );
  return {
    ...baseline,
    recordedAt: latest,
    cumulativeHours: Math.round((baseline.cumulativeHours + total) * 10) / 10,
  };
}

/** Bike data as the rest of the app should see it: usage includes rides. */
export function withRideUsage(data: BikeData): BikeData {
  return { ...data, usage: currentUsage(data) };
}

/**
 * Runs a command against the ride-adjusted view, then restores the stored
 * starting meter so derived hours are never written back as the baseline.
 */
export function applyWithRideUsage(
  data: BikeData,
  command: (view: BikeData) => BikeData,
): BikeData {
  return { ...command(withRideUsage(data)), usage: data.usage };
}

export function setStartingMeter(
  data: BikeData,
  input: { hours: number; date: string },
): BikeData {
  if (!validHours(input.hours)) throw new Error("Enter hours of 0 or more.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !validDate(input.date))
    throw new Error("Enter a valid date.");
  return {
    ...data,
    usage: {
      ...data.usage,
      id: `usage-${input.date}`,
      recordedAt: input.date,
      cumulativeHours: input.hours,
      isMock: false,
    },
  };
}

export function removeRide(data: BikeData, rideId: string): BikeData {
  return { ...data, rides: data.rides.filter((ride) => ride.id !== rideId) };
}

/** Two records of one ride (e.g. a file import and a later API sync) start within this window. */
const sameRideWindowMs = 2 * 60 * 1000;

export function findSameRide(rides: Ride[], startedAt: string): Ride | undefined {
  const start = Date.parse(startedAt);
  return rides.find(
    (ride) => Math.abs(Date.parse(ride.startedAt) - start) <= sameRideWindowMs,
  );
}

const sortRides = (rides: Ride[]) =>
  [...rides].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));

/** Calendar date of an instant in the browser's time zone (YYYY-MM-DD). */
export function localDateOf(instant: string): string {
  const date = new Date(instant);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function rideFromFile(
  summary: RideFileSummary,
  input: { bikeId: string; fileName: string; localDate: string },
): Ride {
  return {
    id: `ride-file-${summary.startedAt.replace(/[^0-9]/g, "")}`,
    bikeId: input.bikeId,
    name:
      summary.name ||
      input.fileName.replace(/\.(gpx|tcx)$/i, "").replace(/[_-]+/g, " ") ||
      "Ride",
    startedAt: summary.startedAt,
    localDate: input.localDate,
    elapsedSeconds: summary.elapsedSeconds,
    movingSeconds: summary.movingSeconds,
    distanceMeters: summary.distanceMeters,
    elevationMeters: summary.elevationMeters,
    sportType: summary.sportType ?? "Ride",
    source: { provider: "file", format: summary.format, fileName: input.fileName },
  };
}

/** Adds rides read from files, skipping any that are already recorded. */
export function importRideFiles(
  data: BikeData,
  files: { fileName: string; summary: RideFileSummary; localDate: string }[],
): { data: BikeData; added: Ride[]; duplicates: string[] } {
  const rides = [...data.rides];
  const added: Ride[] = [];
  const duplicates: string[] = [];
  for (const file of files) {
    if (findSameRide(rides, file.summary.startedAt)) {
      duplicates.push(file.fileName);
      continue;
    }
    const ride = rideFromFile(file.summary, {
      bikeId: data.bike.id,
      fileName: file.fileName,
      localDate: file.localDate,
    });
    rides.push(ride);
    added.push(ride);
  }
  return { data: { ...data, rides: sortRides(rides) }, added, duplicates };
}

/** Subset of Strava's SummaryActivity that the importer reads. */
export interface StravaActivitySummary {
  id: number | string;
  name: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  elapsed_time: number;
  moving_time: number | null;
  distance: number | null;
  total_elevation_gain: number | null;
  gear_id: string | null;
}

export const stravaRideSportTypes: ReadonlySet<string> = new Set([
  "Ride",
  "MountainBikeRide",
  "EMountainBikeRide",
  "GravelRide",
  "EBikeRide",
]);

export function rideFromStrava(
  activity: StravaActivitySummary,
  bikeId: string,
): Ride {
  const activityId = String(activity.id);
  return {
    id: `ride-strava-${activityId}`,
    bikeId,
    name: activity.name || "Strava ride",
    startedAt: activity.start_date,
    localDate: activity.start_date_local.slice(0, 10),
    elapsedSeconds: activity.elapsed_time,
    movingSeconds: activity.moving_time,
    distanceMeters: activity.distance,
    elevationMeters: activity.total_elevation_gain,
    sportType: activity.sport_type,
    source: { provider: "strava", activityId, gearId: activity.gear_id },
  };
}

export interface StravaImportResult {
  data: BikeData;
  added: Ride[];
  skippedDuplicates: number;
  skippedOther: number;
}

/**
 * Adds cycling activities to the bike, skipping ones already imported. When
 * `gearId` is set, only activities Strava assigned to that bike are taken.
 */
export function importStravaActivities(
  data: BikeData,
  activities: StravaActivitySummary[],
  options: { gearId: string | null },
): StravaImportResult {
  const known = new Set(
    data.rides.flatMap((ride) =>
      ride.source?.provider === "strava" ? [ride.source.activityId] : [],
    ),
  );
  const added: Ride[] = [];
  let skippedDuplicates = 0;
  let skippedOther = 0;
  for (const activity of activities) {
    const activityId = String(activity.id);
    if (
      !stravaRideSportTypes.has(activity.sport_type) ||
      (options.gearId !== null && activity.gear_id !== options.gearId) ||
      !validDate(activity.start_date) ||
      !/^\d{4}-\d{2}-\d{2}/.test(activity.start_date_local ?? "")
    ) {
      skippedOther += 1;
      continue;
    }
    if (known.has(activityId) || findSameRide(data.rides, activity.start_date)) {
      skippedDuplicates += 1;
      continue;
    }
    known.add(activityId);
    added.push(rideFromStrava(activity, data.bike.id));
  }
  return {
    data: { ...data, rides: sortRides([...data.rides, ...added]) },
    added,
    skippedDuplicates,
    skippedOther,
  };
}

/** Unix seconds to request Strava activities from on the next sync. */
export function nextSyncAfter(data: BikeData): number {
  const latest = data.rides
    .filter((ride) => ride.source?.provider === "strava")
    .reduce((max, ride) => Math.max(max, Date.parse(ride.startedAt)), 0);
  if (latest > 0) return Math.floor(latest / 1000);
  // First sync: everything from the starting meter's date onwards.
  return Math.floor(Date.parse(`${data.usage.recordedAt}T00:00:00Z`) / 1000);
}
