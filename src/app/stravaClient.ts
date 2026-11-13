import type { StravaActivitySummary } from "../domain/rides";

export interface StravaBike {
  id: string;
  name: string;
  primary: boolean;
  retired: boolean;
}

export type StravaStatus =
  | { configured: false; connected: false }
  | { configured: true; connected: false }
  | {
      configured: true;
      connected: true;
      athlete: { name: string };
      canReadPrivate: boolean;
      bikes: StravaBike[];
    };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new Error("Could not reach the local dev server.");
  }
  const body = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok || !body)
    throw new Error(
      body?.error ??
        (response.status === 404
          ? "Strava bridge not found. Run the app with npm run dev."
          : `Request failed (${response.status}).`),
    );
  return body;
}

export const stravaConnectUrl = "/api/strava/connect";

export function fetchStravaStatus(): Promise<StravaStatus> {
  return request<StravaStatus>("/api/strava/status");
}

export async function fetchStravaActivities(
  after: number,
): Promise<StravaActivitySummary[]> {
  const body = await request<{ activities: StravaActivitySummary[] }>(
    `/api/strava/activities?after=${encodeURIComponent(after)}`,
  );
  return body.activities;
}

export async function disconnectStrava(): Promise<void> {
  await request("/api/strava/disconnect", { method: "POST" });
}

const gearKey = "hightower.strava-gear-id";
/** `null` = not chosen yet; "" = import rides on any bike. */
export function loadStravaGearId(): string | null {
  try {
    return localStorage.getItem(gearKey);
  } catch {
    return null;
  }
}
export function saveStravaGearId(gearId: string): void {
  try {
    localStorage.setItem(gearKey, gearId);
  } catch {
    // Kept for this page session only.
  }
}
