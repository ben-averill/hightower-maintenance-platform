import { useState } from "react";
import type {
  BikeData,
  ComponentSlot,
  MaintenanceEvent,
  MaintenanceState,
} from "../domain/models";
import { activeInstance } from "../domain/commands";
import { historyForInstance, statusLabels } from "../domain/maintenance";
import { ServiceForm } from "./ServiceForm";

export function ComponentPanel({
  data,
  slot,
  maintenance,
  demo,
  onSave,
  onReplace,
}: {
  data: BikeData;
  slot: ComponentSlot;
  maintenance: MaintenanceState;
  demo: boolean;
  onSave: (event: MaintenanceEvent) => void;
  onReplace: () => void;
}) {
  const instance = activeInstance(data, slot.id)!;
  const product = data.components.find(
    (item) => item.id === instance.componentId,
  )!;
  const manufacturer = data.manufacturers.find(
    (item) => item.id === product.manufacturerId,
  );
  const [tab, setTab] = useState<"overview" | "history">("overview");
  const [adding, setAdding] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [message, setMessage] = useState("");
  const [replaceError, setReplaceError] = useState("");
  const [includeRetired, setIncludeRetired] = useState(false);
  const isFork = slot.id === "suspension.fork";
  const currentEvents = historyForInstance(data.events, instance.id);
  const retiredIds = data.instances
    .filter((item) => item.slotId === slot.id && item.removedAt)
    .map((item) => item.id);
  const events = includeRetired
    ? data.events
        .filter(
          (event) =>
            event.instanceId === instance.id ||
            retiredIds.includes(event.instanceId),
        )
        .sort((a, b) => b.date.localeCompare(a.date))
    : currentEvents;
  return (
    <>
      <div className="eyebrow">
        Component inspector <span className="live-dot" />
      </div>
      <div className="component-title">
        <p>{manufacturer?.name ?? "Specification pending"}</p>
        <h2>{product.model ?? slot.name}</h2>
      </div>
      <div className="component-meta">
        <span>{slot.name}</span>
        <span>Installed · mock</span>
      </div>
      <div className="tabs" aria-label="Component details">
        <button
          aria-pressed={tab === "overview"}
          onClick={() => setTab("overview")}
        >
          Overview
        </button>
        <button
          aria-pressed={tab === "history"}
          onClick={() => setTab("history")}
        >
          Service history <span>{currentEvents.length}</span>
        </button>
      </div>
      {tab === "overview" ? (
        <>
          <section className="maintenance-card">
            <div className="section-heading">
              <h3>Maintenance</h3>
              <span className={`status status-${maintenance.status}`}>
                {statusLabels[maintenance.status]}
              </span>
            </div>
            <p className="small muted">
              {demo && isFork
                ? "Illustrative rule · not Fox guidance"
                : "Manufacturer recommendation"}
            </p>
            {maintenance.hoursSinceService !== null ? (
              <>
                <div className="usage-value">
                  {Number(maintenance.hoursSinceService.toFixed(1))}
                  <span> / {maintenance.intervalHours} h</span>
                </div>
                <div
                  className="meter"
                  role="meter"
                  aria-label="Demo service interval used"
                  aria-valuemin={0}
                  aria-valuemax={maintenance.intervalHours ?? 50}
                  aria-valuenow={Math.min(
                    maintenance.hoursSinceService,
                    maintenance.intervalHours ?? 50,
                  )}
                >
                  <i
                    style={{
                      width: `${Math.min((maintenance.progress ?? 0) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="small muted">{maintenance.reason}</p>
              </>
            ) : (
              <p className="unknown-copy">{maintenance.reason}</p>
            )}
            {isFork && (
              <div className="source-note">
                <span>↗</span>
                <div>
                  <strong>Fox service documentation</strong>
                  <p>
                    Exact interval, procedure and source pending verification.
                  </p>
                </div>
              </div>
            )}
          </section>
          <section className="detail-section">
            <div className="section-heading">
              <h3>Component details</h3>
              <span className="mini-label">USER PROVIDED</span>
            </div>
            <dl>
              <div>
                <dt>Manufacturer</dt>
                <dd>{manufacturer?.name ?? "Not specified"}</dd>
              </div>
              <div>
                <dt>Model</dt>
                <dd>{product.model ?? "Not specified"}</dd>
              </div>
              <div>
                <dt>Installed on</dt>
                <dd>
                  {instance.installedAt ?? "Unknown"} <small>mock</small>
                </dd>
              </div>
              <div>
                <dt>Installation meter</dt>
                <dd>
                  {instance.installedAtBikeHours ?? "Unknown"} h{" "}
                  <small>mock</small>
                </dd>
              </div>
              <div>
                <dt>Serial / exact variant</dt>
                <dd>Not specified</dd>
              </div>
              <div>
                <dt>Setup</dt>
                <dd>{instance.setup?.handlebarWidthMm
                  ? `${instance.setup.handlebarWidthMm} mm · cut from ${instance.setup.originalHandlebarWidthMm ?? "unknown"} mm (owner provided)`
                  : "Not recorded"}</dd>
              </div>
            </dl>
            <p className="instance-id">INSTANCE / {instance.id}</p>
          </section>
          <div className="usage-summary">
            <span className="usage-icon">◷</span>
            <div>
              <strong>{data.usage.cumulativeHours} riding hours</strong>
              <p>Mock bike usage · {data.usage.recordedAt}</p>
            </div>
            <span className="mini-label">DEMO</span>
          </div>
        </>
      ) : (
        <section className="history-section">
          <div className="section-heading">
            <h3>Service history</h3>
            <span className="mini-label">MOCK DATA</span>
          </div>
          {retiredIds.length > 0 && (
            <label className="check-label">
              <input
                type="checkbox"
                checked={includeRetired}
                onChange={(event) => setIncludeRetired(event.target.checked)}
              />
              Include previous components
            </label>
          )}
          {events.length === 0 && (
            <p className="empty-copy">
              No service records for this component instance.
            </p>
          )}
          {events.map((event) => (
            <article className="history-event" key={event.id}>
              <div className="history-dot" />
              <span className="mini-label">
                {event.date} · {event.bikeHours ?? "Unknown"} H
              </span>
              <h4>{event.workPerformed}</h4>
              <p>{event.mechanic ?? "Mechanic not recorded"}</p>
              <p>{event.notes}</p>
              <span className="mini-label">
                {event.instanceId === instance.id
                  ? "CURRENT COMPONENT"
                  : "PREVIOUS COMPONENT"}{" "}
                · MOCK
              </span>
            </article>
          ))}
        </section>
      )}
      {message && (
        <p className="success" role="status">
          {message}
        </p>
      )}
      {isFork ? (
        <section className="panel-actions">
          {adding ? (
            <ServiceForm
              data={data}
              instance={instance}
              onCancel={() => setAdding(false)}
              onSave={(event) => {
                onSave(event);
                setAdding(false);
                setTab("history");
                setMessage("Mock service recorded for this fork.");
              }}
            />
          ) : (
            <button
              className="primary-button"
              onClick={() => {
                setAdding(true);
                setMessage("");
              }}
            >
              Record mock service <span>+</span>
            </button>
          )}
          <details
            className="replacement"
            open={replacing}
            onToggle={(event) => setReplacing(event.currentTarget.open)}
          >
            <summary>
              Component lifecycle <span>↗</span>
            </summary>
            <p className="small muted">
              Install a fresh demo fork of the same model at{" "}
              {data.usage.cumulativeHours} bike hours. The previous fork and its
              history are retained. This is a simulated replacement.
            </p>
            <button
              className="secondary-button"
              onClick={() => {
                try {
                  onReplace();
                  setAdding(false);
                  setReplacing(false);
                  setMessage(
                    "New mock fork installed. Previous history is preserved.",
                  );
                  setReplaceError("");
                } catch (cause) {
                  setReplaceError(
                    cause instanceof Error
                      ? cause.message
                      : "Replacement failed.",
                  );
                }
              }}
            >
              Install replacement demo fork
            </button>
            {replaceError && (
              <p className="error" role="alert">
                {replaceError}
              </p>
            )}
          </details>
        </section>
      ) : (
        <p className="scope-note">
          Service entry is available for the fork in this first slice. This
          component is ready for verified specifications and rules.
        </p>
      )}
    </>
  );
}
