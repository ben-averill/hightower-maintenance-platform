import "./rides.css";
import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import type { BikeData } from "../domain/models";
import {
  currentUsage,
  importRideFiles,
  importStravaActivities,
  localDateOf,
  nextSyncAfter,
  ridesAfterBaseline,
  removeRide,
  rideHours,
  setStartingMeter,
} from "../domain/rides";
import { parseRideFile, summarizeRideFile, type RideFileSummary } from "../domain/rideFiles";
import {
  disconnectStrava,
  fetchStravaActivities,
  fetchStravaStatus,
  loadStravaGearId,
  saveStravaGearId,
  stravaConnectUrl,
  type StravaStatus,
} from "../app/stravaClient";

const formatDuration = (hours: number) => {
  const minutes = Math.round(hours * 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
};
const formatKm = (meters: number | null) =>
  meters === null ? "—" : `${(meters / 1000).toFixed(1)} km`;

export function RidesPanel({
  data,
  onChange,
  notice,
}: {
  data: BikeData;
  onChange: (data: BikeData) => void;
  notice: string | null;
}) {
  const [status, setStatus] = useState<StravaStatus | null>(null);
  const [gearId, setGearId] = useState<string | null>(loadStravaGearId);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(notice);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const refreshStatus = useCallback(async () => {
    try {
      setError(null);
      setStatus(await fetchStravaStatus());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, []);
  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const usage = currentUsage(data);
  const counted = new Set(ridesAfterBaseline(data).map((ride) => ride.id));
  const connected = status?.connected === true ? status : null;
  const bikes = connected?.bikes.filter((bike) => !bike.retired) ?? [];

  async function sync() {
    if (gearId === null) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const activities = await fetchStravaActivities(nextSyncAfter(data));
      const result = importStravaActivities(data, activities, {
        gearId: gearId || null,
      });
      onChange(result.data);
      const hours = result.added.reduce((sum, ride) => sum + rideHours(ride), 0);
      setMessage(
        result.added.length
          ? `Added ${result.added.length} ride${result.added.length === 1 ? "" : "s"} · +${hours.toFixed(1)} h`
          : "No new rides on this bike.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function importFiles(list: FileList | File[]) {
    const files = [...list];
    if (!files.length) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const parsed: { fileName: string; summary: RideFileSummary; localDate: string }[] = [];
    const failures: string[] = [];
    for (const file of files) {
      try {
        const summary = summarizeRideFile(parseRideFile(await file.text()));
        parsed.push({ fileName: file.name, summary, localDate: localDateOf(summary.startedAt) });
      } catch (cause) {
        failures.push(`${file.name}: ${cause instanceof Error ? cause.message : String(cause)}`);
      }
    }
    const result = importRideFiles(data, parsed);
    if (result.added.length) onChange(result.data);
    const hours = result.added.reduce((sum, ride) => sum + rideHours(ride), 0);
    const parts = [
      result.added.length
        ? `Added ${result.added.length} ride${result.added.length === 1 ? "" : "s"} · +${hours.toFixed(1)} h`
        : null,
      result.duplicates.length
        ? `${result.duplicates.length} already imported`
        : null,
    ].filter(Boolean);
    if (parts.length) setMessage(parts.join(" · "));
    if (failures.length) setError(failures.join("\n"));
    if (fileInput.current) fileInput.current.value = "";
    setBusy(false);
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    void importFiles(event.dataTransfer.files);
  }

  async function disconnect() {
    setBusy(true);
    try {
      await disconnectStrava();
      setMessage("Disconnected from Strava. Imported rides are kept.");
      await refreshStatus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  function saveMeter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      onChange(
        setStartingMeter(data, {
          hours: Number(form.get("hours")),
          date: String(form.get("date")),
        }),
      );
      setError(null);
      setMessage("Starting meter saved.");
      (event.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <section className={`rides-panel${dragging ? " is-dragging" : ""}`} aria-labelledby="rides-heading"
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }}
      onDrop={onDrop}>
      <div className="eyebrow" id="rides-heading">
        RIDES
      </div>

      <div className="rides-meter">
        <strong>{usage.cumulativeHours} h</strong>
        <span>
          {data.usage.cumulativeHours} h starting meter
          {data.usage.isMock ? " (mock)" : ""} on {data.usage.recordedAt} +{" "}
          {counted.size} ride{counted.size === 1 ? "" : "s"}
        </span>
      </div>
      <details className="replacement rides-meter-edit">
        <summary>
          Set starting meter <span>＋</span>
        </summary>
        <form onSubmit={saveMeter} className="service-form">
          <p className="rides-hint">
            Bike hours before the first ride you want to import. Rides dated
            after this day add to it.
          </p>
          <div className="form-row">
            <label>
              Hours
              <input type="number" name="hours" min={0} step="0.1" required
                defaultValue={data.usage.cumulativeHours ?? 0} />
            </label>
            <label>
              As of
              <input type="date" name="date" required defaultValue={data.usage.recordedAt} />
            </label>
          </div>
          <button className="secondary-button" type="submit">Save starting meter</button>
        </form>
      </details>

      <div className="rides-import">
        <input ref={fileInput} type="file" accept=".gpx,.tcx,application/gpx+xml" multiple hidden
          onChange={(event) => event.target.files && void importFiles(event.target.files)} />
        <button className="primary-button" disabled={busy} onClick={() => fileInput.current?.click()}>
          {busy ? "Importing…" : "Import ride files"} <span>＋</span>
        </button>
        <p className="rides-hint">
          On strava.com open a ride, then <strong>⋯ › Export GPX</strong>. Choose or drop the
          .gpx files here. TCX works too.
        </p>
      </div>

      <details className="replacement rides-strava" open={connected !== null || notice !== null}>
        <summary>
          Strava sync (optional) <span>＋</span>
        </summary>
      {status === null && !error ? <p className="rides-hint">Checking Strava…</p> : null}
      {status && !status.configured ? (
        <p className="rides-hint">
          Pulls rides automatically. Needs a Strava subscription and your own
          API app: add <code>STRAVA_CLIENT_ID</code> and{" "}
          <code>STRAVA_CLIENT_SECRET</code> to <code>.env.local</code>, then
          restart <code>npm run dev</code>. See docs/strava.md.
        </p>
      ) : null}
      {status?.configured && !status.connected ? (
        <a className="primary-button" href={stravaConnectUrl}>
          Connect Strava <span>↗</span>
        </a>
      ) : null}
      {connected ? (
        <div className="rides-sync">
          <p className="rides-hint">
            Connected as {connected.athlete.name || "your Strava account"}
            {connected.canReadPrivate ? "" : " · private rides not shared"}
          </p>
          <label>
            Strava bike for this Hightower
            <select
              value={gearId ?? "__choose"}
              onChange={(event) => {
                setGearId(event.target.value);
                saveStravaGearId(event.target.value);
              }}
            >
              <option value="__choose" disabled>
                Choose a bike…
              </option>
              {bikes.map((bike) => (
                <option key={bike.id} value={bike.id}>
                  {bike.name}
                  {bike.primary ? " (primary)" : ""}
                </option>
              ))}
              <option value="">Any bike: import all rides</option>
            </select>
          </label>
          <button className="primary-button" onClick={sync}
            disabled={busy || gearId === null || gearId === "__choose"}>
            {busy ? "Syncing…" : "Sync rides"} <span>↻</span>
          </button>
          <button className="text-button" onClick={disconnect} disabled={busy}>
            Disconnect Strava
          </button>
        </div>
      ) : null}
      </details>

      {message ? <p className="rides-message" role="status">{message}</p> : null}
      {error ? <p className="rides-error" role="alert">{error}</p> : null}

      {data.rides.length ? (
        <ol className="rides-list">
          {data.rides.slice(0, 12).map((ride) => (
            <li key={ride.id} className={counted.has(ride.id) ? undefined : "is-before-meter"}>
              <div>
                <strong>{ride.name}</strong>
                <span>
                  {ride.localDate} · {formatDuration(rideHours(ride))} ·{" "}
                  {formatKm(ride.distanceMeters)}
                  {ride.source ? ` · ${ride.source.provider === "strava" ? "Strava" : ride.source.format.toUpperCase()}` : ""}
                  {counted.has(ride.id) ? "" : " · before starting meter"}
                </span>
              </div>
              <button className="text-button" aria-label={`Remove ${ride.name}`}
                title="Remove ride" onClick={() => onChange(removeRide(data, ride.id))}>×</button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rides-hint">No rides imported yet.</p>
      )}
      {data.rides.length > 12 ? (
        <p className="rides-hint">+ {data.rides.length - 12} earlier rides</p>
      ) : null}
    </section>
  );
}
