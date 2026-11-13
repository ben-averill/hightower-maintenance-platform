import { describe, expect, it } from "vitest";
import { createSeedData } from "../data/seed";
import { haversineMeters, parseRideFile, summarizeRideFile } from "./rideFiles";
import { currentUsage, importRideFiles, importStravaActivities } from "./rides";

// ~0.001° latitude ≈ 111 m. Points every 20 s → 5.6 m/s while moving.
const point = (lat: number, time: string, ele: number) =>
  `<trkpt lat="${lat.toFixed(6)}" lon="-75.200000"><ele>${ele}</ele><time>${time}</time></trkpt>`;

const stravaGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="StravaGPX" version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
 <metadata><time>2026-11-08T14:00:00Z</time></metadata>
 <trk>
  <name>Wissahickon &amp; Forbidden Drive</name>
  <type>mountain_biking</type>
  <trkseg>
   ${point(40.0, "2026-11-08T14:00:00Z", 50)}
   ${point(40.001, "2026-11-08T14:00:20Z", 55)}
   ${point(40.002, "2026-11-08T14:00:40Z", 54)}
   ${point(40.002, "2026-11-08T14:05:40Z", 54)}
   ${point(40.003, "2026-11-08T14:06:00Z", 62)}
  </trkseg>
 </trk>
</gpx>`;

const tcx = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
 <Activities><Activity Sport="Biking">
  <Id>2026-11-10T21:00:00Z</Id>
  <Lap StartTime="2026-11-10T21:00:00Z">
   <Track>
    <Trackpoint><Time>2026-11-10T21:00:00Z</Time><AltitudeMeters>10</AltitudeMeters><DistanceMeters>0</DistanceMeters></Trackpoint>
    <Trackpoint><Time>2026-11-10T21:10:00Z</Time><AltitudeMeters>40</AltitudeMeters><DistanceMeters>3000</DistanceMeters></Trackpoint>
    <Trackpoint><Time>2026-11-10T21:20:00Z</Time><AltitudeMeters>20</AltitudeMeters><DistanceMeters>6000</DistanceMeters></Trackpoint>
   </Track>
  </Lap>
 </Activity></Activities>
</TrainingCenterDatabase>`;

describe("ride files", () => {
  it("reads a Strava GPX export and excludes stopped time", () => {
    const file = parseRideFile(stravaGpx);
    expect(file).toMatchObject({
      format: "gpx",
      name: "Wissahickon & Forbidden Drive",
      sportType: "mountain_biking",
    });
    const summary = summarizeRideFile(file);
    expect(summary.startedAt).toBe("2026-11-08T14:00:00.000Z");
    expect(summary.elapsedSeconds).toBe(360);
    // The 5-minute stop (no movement) is not moving time.
    expect(summary.movingSeconds).toBe(60);
    expect(summary.distanceMeters).toBeGreaterThan(330);
    expect(summary.distanceMeters).toBeLessThan(338);
    // +5 to 55 m; the 1 m dip is noise so 55 m stays the anchor; then +7.
    expect(summary.elevationMeters).toBe(12);
  });

  it("reads a TCX file using device distance", () => {
    const summary = summarizeRideFile(parseRideFile(tcx));
    expect(summary).toMatchObject({
      format: "tcx",
      sportType: "Biking",
      elapsedSeconds: 1200,
      movingSeconds: 1200,
      distanceMeters: 6000,
      elevationMeters: 30,
    });
  });

  it("rejects FIT and unknown files with a clear message", () => {
    expect(() => parseRideFile("\x0e\x10\x00\x00\x00\x00\x00\x00.FIT")).toThrow(/Export GPX/);
    expect(() => parseRideFile("hello")).toThrow(/GPX or TCX/);
    expect(() =>
      summarizeRideFile(parseRideFile('<gpx><trk><trkseg></trkseg></trk></gpx>')),
    ).toThrow(/no timed track points/);
  });

  it("measures distance on the globe", () => {
    expect(haversineMeters({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(111195, -1);
  });
});

describe("importing ride files", () => {
  const summary = () => summarizeRideFile(parseRideFile(stravaGpx));

  it("adds a ride, adds its moving time, and skips the same file again", () => {
    const first = importRideFiles(createSeedData(), [
      { fileName: "Morning_Ride.gpx", summary: summary(), localDate: "2026-11-08" },
    ]);
    expect(first.added).toHaveLength(1);
    expect(first.data.rides[0]).toMatchObject({
      name: "Wissahickon & Forbidden Drive",
      localDate: "2026-11-08",
      source: { provider: "file", format: "gpx", fileName: "Morning_Ride.gpx" },
    });
    expect(currentUsage(first.data).cumulativeHours).toBe(153); // 60 s rounds to 153.0
    const again = importRideFiles(first.data, [
      { fileName: "copy.gpx", summary: summary(), localDate: "2026-11-08" },
    ]);
    expect(again.added).toHaveLength(0);
    expect(again.duplicates).toEqual(["copy.gpx"]);
  });

  it("names a ride from the file name when the file has none", () => {
    const { added } = importRideFiles(createSeedData(), [
      { fileName: "Evening_Ride.gpx", summary: { ...summary(), name: null }, localDate: "2026-11-08" },
    ]);
    expect(added[0]?.name).toBe("Evening Ride");
  });

  it("does not double-count a file ride when Strava sync later returns it", () => {
    const { data } = importRideFiles(createSeedData(), [
      { fileName: "a.gpx", summary: summary(), localDate: "2026-11-08" },
    ]);
    const synced = importStravaActivities(
      data,
      [{
        id: 77, name: "Same ride", sport_type: "MountainBikeRide",
        start_date: "2026-11-08T14:00:30Z", start_date_local: "2026-11-08T09:00:30Z",
        elapsed_time: 360, moving_time: 60, distance: 330,
        total_elevation_gain: 13, gear_id: null,
      }],
      { gearId: null },
    );
    expect(synced.added).toHaveLength(0);
    expect(synced.data.rides).toHaveLength(1);
  });
});
