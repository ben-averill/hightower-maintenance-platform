# Domain model

All IDs are stable strings, ready to become database primary/foreign keys. Null means unknown, not zero. No domain interface depends on React or Three.js.

| Entity            | Identity / relationships             | Responsibility                                                                                              |
| ----------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Manufacturer      | id                                   | Brand identity; no inferred specifications                                                                  |
| BikeModel         | id, manufacturerId                   | Product family, unknown model year allowed                                                                  |
| Bike              | id, modelId                          | Physical bike; size, wheels, color and build from user                                                      |
| ComponentCategory | id                                   | Navigation/assembly taxonomy                                                                                |
| Component         | id, manufacturerId?                  | Catalog product, nullable exact model and specs                                                             |
| ComponentSlot     | id, bikeId, categoryId               | Stable position such as suspension.fork                                                                     |
| ComponentInstance | id, componentId, slotId              | Physical installed part, install/removal date and bike-meter baseline                                       |
| MaintenanceRule   | id, componentId                      | Service type, interval, manufacturer/application-demo authority and evidence                                |
| MaintenanceEvent  | id, instanceId                       | Date, service type, bike hours, work, parts, fluid, mechanic, cost, notes, attachments, procedure reference |
| UsageRecord       | id, bikeId                           | Timestamped cumulative riding-hour meter and mock flag                                                      |
| SetupSnapshot     | id, bikeId                           | Timestamped per-instance typed values/units; future immutable snapshot                                      |
| Ride              | id, bikeId, setupSnapshotId?         | Times, distance, elevation, location, notes, telemetry association                                          |
| TelemetrySession  | id, rideId, bikeId                   | Vendor, UTC start and external sample reference                                                             |
| Sensor            | id                                   | Vendor, model, calibration reference                                                                        |
| TelemetryChannel  | id, sessionId, sensorId, instanceId? | Quantity, canonical unit and optional physical component binding                                            |
| TelemetrySample   | channelId, elapsedSeconds            | Normalized numeric sample outside UI state                                                                  |

## Installation and replacement invariants

A slot has one active instance in this first slice. Replacement retires that instance with a date and meter and installs a new instance at the same boundary. IDs must be new. Meter/date may not precede known installation or service. The old catalog definition and all events remain unchanged. An event belongs permanently to an instance; it is not moved to its replacement. The demo replacement UI is limited to the fork. Future swaps between bikes need an Installation entity so one physical component can have several installation periods.

## Evidence and unknowns

Source metadata carries manufacturer, document title, URL, revision, date, and source type. Manufacturer activation requires verified documentation and applicability; the seeded rule remains unverified with null interval. Supplied bike/component names are user-provided identity information, not independently verified specifications. Wheel/tire/hub, crank, chainring, chain, cassette, cockpit and frame serial/year details remain unspecified. GX Eagle AXS is recorded as a known drivetrain assembly description; the exact derailleur variant is unknown.

## Usage and maintenance

Bike hours are a cumulative meter, not a per-component age. Component age derives from installation and matching service baselines. Events record the meter at the time of work. A different procedure does not reset a rule. Missing/contradictory history yields Unknown. Mock flags mark all seeded usage/service records; installation dates/meters are demonstration values. Component specification data does not acquire credibility from demo history.

## Storage evolution

Start with in-memory normalized arrays. Later introduce repository methods that call the same validation and pure domain functions. Add runtime validation at import/storage boundaries, database foreign keys, uniqueness for active installation, and transactions around replacement. Keep telemetry samples in purpose-built external storage and store only session/channel metadata in relational tables. Manufacturer recommendations and app-derived analysis always remain separate entities.
