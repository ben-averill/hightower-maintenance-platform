import { createSeedData } from "../data/seed";
import type { BikeData } from "../domain/models";

const storageKey = "hightower.bike-data";
const currentVersion = 1;

interface StoredBikeData {
  version: number;
  savedAt: string;
  data: BikeData;
}

function looksLikeBikeData(value: unknown): value is BikeData {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return (
    ["components", "slots", "instances", "rules", "events"].every((key) =>
      Array.isArray(data[key]),
    ) &&
    typeof data.bike === "object" &&
    typeof data.usage === "object" &&
    (data.rides === undefined || Array.isArray(data.rides))
  );
}

/**
 * Loads saved bike data, or the seed when nothing valid is stored.
 * Catalog, slot and bike identity always come from the current seed so code
 * changes to the model reach existing saves; history, installed instances,
 * usage and rides come from storage.
 */
export function loadBikeData(): BikeData {
  const seed = createSeedData();
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return seed;
    const stored = JSON.parse(raw) as Partial<StoredBikeData>;
    if (stored.version !== currentVersion || !looksLikeBikeData(stored.data))
      return seed;
    const saved = stored.data;
    const slotIds = new Set(seed.slots.map((slot) => slot.id));
    const savedSlots = new Set(saved.instances.map((item) => item.slotId));
    const seedSetup = new Map(
      seed.instances.map((item) => [item.id, item.setup] as const),
    );
    return {
      ...seed,
      // Keep saved instances (with setup from code, which is user-provided
      // there), and seed any slot added since the save.
      instances: [
        ...saved.instances
          .filter((item) => slotIds.has(item.slotId))
          .map((item) => {
            const { setup: _savedSetup, ...rest } = item;
            const setup = seedSetup.get(item.id);
            return setup ? { ...rest, setup } : rest;
          }),
        ...seed.instances.filter((item) => !savedSlots.has(item.slotId)),
      ],
      events: saved.events,
      usage: saved.usage,
      rides: saved.rides ?? [],
    };
  } catch {
    return seed;
  }
}

export function saveBikeData(data: BikeData): void {
  try {
    const stored: StoredBikeData = {
      version: currentVersion,
      savedAt: new Date().toISOString(),
      data,
    };
    localStorage.setItem(storageKey, JSON.stringify(stored));
  } catch {
    // Storage can be unavailable (private window, quota); the app keeps working in memory.
  }
}

export function clearBikeData(): void {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // Nothing to clear.
  }
}
