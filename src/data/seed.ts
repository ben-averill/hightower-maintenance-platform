import type {
  BikeData,
  CategoryId,
  Component,
  ComponentSlot,
} from "../domain/models";
import { ownerCockpit, loamCarbon } from "./bikeSetup";

const bikeId = "bike-hightower-001";
const definitions: {
  id: string;
  category: CategoryId;
  name: string;
  product?: string;
  manufacturer?: string;
}[] = [
  {
    id: "frame",
    category: "frame",
    name: "Frame",
    product: "Hightower 4",
    manufacturer: "santa-cruz",
  },
  {
    id: "suspension.fork",
    category: "suspension",
    name: "Fork",
    product: "36 Performance Elite",
    manufacturer: "fox",
  },
  {
    id: "suspension.shock",
    category: "suspension",
    name: "Rear shock",
    product: "Float X Performance Elite",
    manufacturer: "fox",
  },
  { id: "wheel.front", category: "wheels", name: "Front wheel" },
  { id: "wheel.rear", category: "wheels", name: "Rear wheel" },
  {
    id: "brake.front",
    category: "brakes",
    name: "Front brake",
    product: "Maven Bronze",
    manufacturer: "sram",
  },
  {
    id: "brake.rear",
    category: "brakes",
    name: "Rear brake",
    product: "Maven Bronze",
    manufacturer: "sram",
  },
  { id: "drivetrain.crank", category: "drivetrain", name: "Crank" },
  { id: "drivetrain.chainring", category: "drivetrain", name: "Chainring" },
  { id: "drivetrain.chain", category: "drivetrain", name: "Chain" },
  { id: "drivetrain.cassette", category: "drivetrain", name: "Cassette" },
  { id: "drivetrain.derailleur", category: "drivetrain", name: "Derailleur" },
  { id: "drivetrain.shifter", category: "drivetrain", name: "Shifter", product: "GX AXS Pod Controller", manufacturer: "sram" },
  { id: "cockpit.handlebar", category: "cockpit", name: "Handlebar", product: `Loam Carbon Handlebar · ${loamCarbon.riseMm} mm rise`, manufacturer: "pnw" },
  { id: "cockpit.stem", category: "cockpit", name: "Stem", product: "Enduro MK3 Stem", manufacturer: "burgtec" },
  { id: "cockpit.grips", category: "cockpit", name: "Grips", product: "GA3", manufacturer: "ergon" },
  { id: "cockpit.dropper", category: "cockpit", name: "Dropper", product: "V3 Dropper", manufacturer: "oneup" },
  { id: "cockpit.dropper-remote", category: "cockpit", name: "Dropper lever", product: "Dropper Remote", manufacturer: "oneup" },
  { id: "cockpit.saddle", category: "cockpit", name: "Saddle", product: "SMS Comp Men", manufacturer: "ergon" },
];
const slots: ComponentSlot[] = definitions.map((item) => ({
  id: item.id,
  bikeId,
  categoryId: item.category,
  name: item.name,
}));
const components: Component[] = definitions.map((item):Component => ({
  id: `product-${item.id}`,
  manufacturerId: item.manufacturer ?? null,
  name: item.product ?? `${item.name} · specification pending`,
  model: item.product ?? null,
  specifications: item.id === "cockpit.handlebar" ? { riseMm:loamCarbon.riseMm, material:"carbon" } : {},
  identitySource: item.product ? "user-provided" : "unspecified",
}));
export const forkProductId = "product-suspension.fork";
export const forkInstanceId = "instance-suspension.fork-001";
export function createSeedData(): BikeData {
  return structuredClone({
    manufacturers: [
      { id: "santa-cruz", name: "Santa Cruz" },
      { id: "fox", name: "Fox" },
      { id: "sram", name: "SRAM" },
      { id: "pnw", name: "PNW Components" },
      { id: "ergon", name: "Ergon" },
      { id: "burgtec", name: "Burgtec" },
      { id: "oneup", name: "OneUp Components" },
    ],
    models: [
      {
        id: "hightower-4",
        manufacturerId: "santa-cruz",
        name: "Hightower 4",
        year: null,
      },
    ],
    bike: {
      id: bikeId,
      modelId: "hightower-4",
      name: "Santa Cruz Hightower 4",
      size: "Medium",
      wheelSizeInches: 29,
      color: "Gloss Day Green",
      build: "GX AXS",
      drivetrainDescription: "SRAM GX Eagle AXS",
      serial: null,
    },
    categories: [
      { id: "frame", name: "Frame" },
      { id: "suspension", name: "Suspension" },
      { id: "wheels", name: "Wheels" },
      { id: "brakes", name: "Brakes" },
      { id: "drivetrain", name: "Drivetrain" },
      { id: "cockpit", name: "Cockpit" },
    ],
    components,
    slots,
    instances: slots.map((slot) => ({
      id: `instance-${slot.id}-001`,
      componentId: `product-${slot.id}`,
      slotId: slot.id,
      installedAt: "2026-01-15",
      installedAtBikeHours: 0,
      removedAt: null,
      removedAtBikeHours: null,
      serial: null,
      isMock: true,
      ...(slot.id === "cockpit.handlebar" ? { setup: { ...ownerCockpit, source: "user-provided" as const } } : {}),
    })),
    usage: {
      id: "usage-demo-001",
      bikeId,
      recordedAt: "2026-09-30",
      cumulativeHours: 153,
      isMock: true,
    },
    rules: [
      {
        id: "fork-manufacturer-pending",
        componentId: forkProductId,
        name: "Manufacturer service interval",
        serviceType: "fork-service",
        intervalHours: null,
        authority: "manufacturer",
        verified: false,
        source: {
          manufacturer: "Fox",
          document: null,
          url: null,
          revision: null,
          date: null,
          sourceType: "manufacturer-document",
        },
      },
      {
        id: "fork-illustrative-50h",
        componentId: forkProductId,
        name: "Illustrative service cycle",
        serviceType: "fork-service",
        intervalHours: 50,
        authority: "application-demo",
        verified: false,
        source: {
          manufacturer: null,
          document: "Fictional test fixture — not service guidance",
          url: null,
          revision: null,
          date: null,
          sourceType: "illustrative-fixture",
        },
      },
    ],
    events: [
      {
        id: "service-demo-001",
        instanceId: forkInstanceId,
        date: "2026-08-12",
        bikeHours: 120,
        serviceType: "fork-service",
        workPerformed: "Example fork service",
        partsReplaced: [],
        fluid: null,
        mechanic: "Demo workshop",
        cost: null,
        notes:
          "Fictional history to demonstrate the maintenance flow. No actual work is asserted.",
        attachments: [],
        procedureReference: null,
        isMock: true,
      },
    ],
  } satisfies BikeData);
}
