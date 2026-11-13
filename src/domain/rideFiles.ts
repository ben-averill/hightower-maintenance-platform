/**
 * Reads ride files exported from Strava (Export GPX, or a TCX original) into
 * ride summaries. Pure string parsing so it runs in tests and the browser.
 *
 * FIT (binary) is not supported; Strava's "Export GPX" works for every
 * activity you own.
 */

export interface TrackPoint {
  time: number; // epoch ms
  lat: number | null;
  lon: number | null;
  ele: number | null;
  /** Cumulative distance from the device (TCX), when present. */
  distance: number | null;
}

export interface ParsedRideFile {
  format: "gpx" | "tcx";
  name: string | null;
  sportType: string | null;
  points: TrackPoint[];
}

export interface RideFileSummary {
  format: "gpx" | "tcx";
  name: string | null;
  sportType: string | null;
  startedAt: string;
  elapsedSeconds: number;
  movingSeconds: number;
  distanceMeters: number | null;
  elevationMeters: number | null;
}

/** Below this speed a segment counts as stopped (≈1.8 km/h). */
const movingSpeed = 0.5;
/** Ignore climbs smaller than this to keep GPS altitude noise out of the total. */
const elevationNoise = 3;

const tag = (name: string) => `(?:[\\w-]+:)?${name}`;
const textOf = (xml: string, name: string): string | null => {
  const match = new RegExp(`<${tag(name)}\\b[^>]*>([\\s\\S]*?)</${tag(name)}>`).exec(xml);
  return match ? decode(match[1]!.trim()) : null;
};
const attrOf = (attributes: string, name: string): string | null => {
  const match = new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`).exec(attributes);
  return match ? match[1]! : null;
};
const decode = (text: string) =>
  text
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const num = (text: string | null): number | null => {
  if (text === null || text === "") return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
};
const blocks = (xml: string, name: string) =>
  [...xml.matchAll(new RegExp(`<${tag(name)}\\b([^>]*)>([\\s\\S]*?)</${tag(name)}>`, "g"))]
    .map((match) => ({ attributes: match[1]!, body: match[2]! }));

export function parseRideFile(text: string): ParsedRideFile {
  const head = text.slice(0, 2000);
  if (new RegExp(`<${tag("gpx")}\\b`).test(head)) return parseGpx(text);
  if (new RegExp(`<${tag("TrainingCenterDatabase")}\\b`).test(head)) return parseTcx(text);
  if (/^\s*[\x0c-\x0e]/.test(text) || text.slice(8, 12) === ".FIT")
    throw new Error("FIT files aren’t supported yet. On Strava, use ⋯ › Export GPX instead.");
  throw new Error("Not a GPX or TCX file.");
}

function parseGpx(xml: string): ParsedRideFile {
  const track = blocks(xml, "trk")[0]?.body ?? xml;
  const beforeSegments = track.split(new RegExp(`<${tag("trkseg")}\\b`))[0] ?? "";
  const points = blocks(xml, "trkpt").flatMap(({ attributes, body }) => {
    const time = Date.parse(textOf(body, "time") ?? "");
    if (!Number.isFinite(time)) return [];
    return [{
      time,
      lat: num(attrOf(attributes, "lat")),
      lon: num(attrOf(attributes, "lon")),
      ele: num(textOf(body, "ele")),
      distance: null,
    }];
  });
  return {
    format: "gpx",
    name: textOf(beforeSegments, "name") ?? textOf(xml.split(new RegExp(`<${tag("trk")}\\b`))[0] ?? "", "name"),
    sportType: textOf(beforeSegments, "type"),
    points,
  };
}

function parseTcx(xml: string): ParsedRideFile {
  const activity = blocks(xml, "Activity")[0];
  const points = blocks(xml, "Trackpoint").flatMap(({ body }) => {
    const time = Date.parse(textOf(body, "Time") ?? "");
    if (!Number.isFinite(time)) return [];
    return [{
      time,
      lat: num(textOf(body, "LatitudeDegrees")),
      lon: num(textOf(body, "LongitudeDegrees")),
      ele: num(textOf(body, "AltitudeMeters")),
      distance: num(textOf(body, "DistanceMeters")),
    }];
  });
  return {
    format: "tcx",
    name: activity ? textOf(activity.body.replace(new RegExp(`<${tag("Lap")}\\b[\\s\\S]*`), ""), "Notes") : null,
    sportType: activity ? attrOf(activity.attributes, "Sport") : null,
    points,
  };
}

export function haversineMeters(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371008.8 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Elapsed/moving time, distance and climbing from a parsed file. */
export function summarizeRideFile(file: ParsedRideFile): RideFileSummary {
  const points = [...file.points].sort((a, b) => a.time - b.time);
  if (points.length < 2)
    throw new Error("The file has no timed track points. Was it a manual activity?");
  const first = points[0]!;
  const last = points[points.length - 1]!;
  let distance = 0;
  let hasDistance = false;
  let moving = 0;
  let climb = 0;
  let hasElevation = false;
  let anchor: number | null = first.ele;
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1]!;
    const point = points[index]!;
    const seconds = (point.time - prev.time) / 1000;
    let meters: number | null = null;
    if (point.distance !== null && prev.distance !== null) {
      meters = Math.max(0, point.distance - prev.distance);
    } else if (point.lat !== null && point.lon !== null && prev.lat !== null && prev.lon !== null) {
      meters = haversineMeters(
        { lat: prev.lat, lon: prev.lon },
        { lat: point.lat, lon: point.lon },
      );
    }
    if (meters !== null) {
      hasDistance = true;
      distance += meters;
      if (seconds > 0 && meters / seconds >= movingSpeed) moving += seconds;
    }
    if (point.ele !== null) {
      hasElevation = true;
      if (anchor === null) anchor = point.ele;
      else if (point.ele - anchor >= elevationNoise) {
        climb += point.ele - anchor;
        anchor = point.ele;
      } else if (anchor - point.ele >= elevationNoise) anchor = point.ele;
    }
  }
  const elapsed = Math.round((last.time - first.time) / 1000);
  return {
    format: file.format,
    name: file.name,
    sportType: file.sportType,
    startedAt: new Date(first.time).toISOString(),
    elapsedSeconds: elapsed,
    // Without positions (indoor files) fall back to elapsed time.
    movingSeconds: hasDistance ? Math.round(moving) : elapsed,
    distanceMeters: hasDistance ? Math.round(distance) : null,
    elevationMeters: hasElevation ? Math.round(climb) : null,
  };
}
