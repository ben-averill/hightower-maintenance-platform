export type CategoryId =
  "frame" | "suspension" | "wheels" | "brakes" | "drivetrain" | "cockpit";
export interface ComponentCategory {
  id: CategoryId;
  name: string;
}
export interface Manufacturer {
  id: string;
  name: string;
}
export interface BikeModel {
  id: string;
  manufacturerId: string;
  name: string;
  year: number | null;
}
export interface Bike {
  id: string;
  modelId: string;
  name: string;
  size: string;
  wheelSizeInches: number;
  color: string;
  build: string;
  drivetrainDescription: string | null;
  serial: string | null;
}
export interface Component {
  id: string;
  manufacturerId: string | null;
  name: string;
  model: string | null;
  specifications: Record<string, string | number | null>;
  identitySource: "user-provided" | "unspecified";
}
export interface ComponentSlot {
  id: string;
  bikeId: string;
  categoryId: CategoryId;
  name: string;
}
export interface ComponentInstance {
  id: string;
  componentId: string;
  slotId: string;
  installedAt: string | null;
  installedAtBikeHours: number | null;
  removedAt: string | null;
  removedAtBikeHours: number | null;
  serial: string | null;
  isMock: boolean;
  setup?: {
    handlebarWidthMm?: number;
    originalHandlebarWidthMm?: number;
    source: "user-provided";
  };
}
export interface SourceProvenance {
  manufacturer: string | null;
  document: string | null;
  url: string | null;
  revision: string | null;
  date: string | null;
  sourceType: "manufacturer-document" | "illustrative-fixture";
}
export interface MaintenanceRule {
  id: string;
  componentId: string;
  name: string;
  serviceType: string;
  intervalHours: number | null;
  authority: "manufacturer" | "application-demo";
  verified: boolean;
  source: SourceProvenance;
}
export interface MaintenanceEvent {
  id: string;
  instanceId: string;
  date: string;
  bikeHours: number | null;
  serviceType: string;
  workPerformed: string;
  partsReplaced: string[];
  fluid: string | null;
  mechanic: string | null;
  cost: { amount: number; currency: string } | null;
  notes: string;
  attachments: string[];
  procedureReference: string | null;
  isMock: boolean;
}
export interface UsageRecord {
  id: string;
  bikeId: string;
  recordedAt: string;
  cumulativeHours: number | null;
  isMock: boolean;
}
export interface BikeData {
  manufacturers: Manufacturer[];
  models: BikeModel[];
  bike: Bike;
  categories: ComponentCategory[];
  components: Component[];
  slots: ComponentSlot[];
  instances: ComponentInstance[];
  rules: MaintenanceRule[];
  events: MaintenanceEvent[];
  usage: UsageRecord;
}
export type MaintenanceStatus =
  "good" | "approaching" | "due" | "overdue" | "unknown";
export interface MaintenanceState {
  status: MaintenanceStatus;
  hoursSinceService: number | null;
  intervalHours: number | null;
  progress: number | null;
  reason: string;
}
