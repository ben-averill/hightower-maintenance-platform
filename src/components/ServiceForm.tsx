import { useState, type FormEvent } from "react";
import type {
  BikeData,
  ComponentInstance,
  MaintenanceEvent,
} from "../domain/models";

export function ServiceForm({
  data,
  instance,
  onSave,
  onCancel,
}: {
  data: BikeData;
  instance: ComponentInstance;
  onSave: (event: MaintenanceEvent) => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    try {
      onSave({
        id: crypto.randomUUID(),
        instanceId: instance.id,
        date: String(fields.get("date")),
        bikeHours: Number(fields.get("hours")),
        serviceType: String(fields.get("serviceType")),
        workPerformed: String(fields.get("work")).trim(),
        mechanic: String(fields.get("mechanic")).trim() || null,
        notes: String(fields.get("notes")).trim(),
        partsReplaced: [],
        fluid: null,
        cost: null,
        attachments: [],
        procedureReference: null,
        isMock: true,
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not record this service.",
      );
    }
  }
  return (
    <form className="service-form" onSubmit={submit}>
      <div className="section-heading">
        <h3>Add mock service</h3>
        <button type="button" className="text-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <p className="muted small">
        Demo record only. Refreshing clears your changes.
      </p>
      <div className="form-row">
        <label>
          Service date
          <input
            type="date"
            name="date"
            required
            min={instance.installedAt ?? undefined}
            max={data.usage.recordedAt}
            defaultValue={data.usage.recordedAt}
          />
        </label>
        <label>
          Bike hours
          <input
            type="number"
            name="hours"
            required
            step="0.1"
            min={instance.installedAtBikeHours ?? 0}
            max={data.usage.cumulativeHours ?? undefined}
            defaultValue={data.usage.cumulativeHours ?? ""}
          />
        </label>
      </div>
      <label>
        Service type
        <select name="serviceType">
          <option value="fork-service">Fork service (demo cycle)</option>
          <option value="inspection">Inspection only</option>
        </select>
      </label>
      <label>
        Work performed
        <input
          name="work"
          required
          maxLength={200}
          placeholder="Describe the mock service"
        />
      </label>
      <label>
        Shop / mechanic
        <input name="mechanic" maxLength={100} placeholder="Optional" />
      </label>
      <label>
        Notes
        <textarea
          name="notes"
          rows={2}
          maxLength={1000}
          placeholder="Optional notes"
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="primary-button" type="submit">
        Save mock service <span>↗</span>
      </button>
    </form>
  );
}
