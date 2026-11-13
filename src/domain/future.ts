// Boundary contracts only. Ride lives in models.ts. Samples and importers do not enter application state yet.
export interface SetupSnapshot {
  id: string;
  bikeId: string;
  capturedAt: string;
  values: {
    instanceId: string;
    parameter: string;
    value: number | string;
    unit: string | null;
  }[];
}
export interface TelemetrySession {
  id: string;
  bikeId: string;
  rideId: string;
  startedAt: string;
  vendor: string;
  externalSampleReference: string;
}
export interface Sensor {
  id: string;
  vendor: string;
  model: string | null;
  calibrationReference: string | null;
}
export interface TelemetryChannel {
  id: string;
  sessionId: string;
  sensorId: string;
  instanceId: string | null;
  quantity: string;
  unit: string;
}
export interface TelemetrySample {
  channelId: string;
  elapsedSeconds: number;
  value: number;
}
export interface TelemetryImporter<Input> {
  vendor: string;
  normalize(input: Input): AsyncIterable<TelemetrySample>;
}
