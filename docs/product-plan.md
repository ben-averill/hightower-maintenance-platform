# Hightower — product and implementation plan

## Repository assessment

The supplied workspace was empty on 2026-09-30: no application, dependencies, Git checkout, or repository instructions. There is no working code to preserve and no architectural conflict. Node 22.16 and npm 10 are available.

## Vision and core use cases

A digital bike represents a physical bicycle across configuration changes, maintenance, setup, and rides. The 3D bike is the spatial navigation surface: inspect the bike, focus an assembly, select a physical component, understand its evidence and history, and record service. Replacing a fork must not erase its history or change the bike identity.

## MVP and this delivery

The eventual MVP includes interactive orbit/pan/zoom, assembly focus, component selection, information panels, sourced manufacturer intervals, usage-based maintenance coloring, service logging, and replacement of independent components. This first delivery proves that pattern with a procedural Hightower representation and a complete fork flow. It includes in-memory replacement and service records; reloading restores the clearly marked demo seed. Unknown specifications remain null or explicitly unspecified.

## Non-goals

No authentication, database, payments, cloud deployment, external integrations, telemetry analysis, proprietary hardware, photorealistic model, or real maintenance advice. No real manufacturer interval is asserted until the exact applicable documentation is verified.

## Proposed architecture and decisions

- React + strict TypeScript + Vite; Three.js through React Three Fiber and Drei. Plain CSS with shared tokens; no UI framework or state library.
- Pure domain functions own maintenance and replacement. A small React state boundary owns the demo dataset. Selection, isolation, camera, and visualization mode are separate view state.
- Bike model → bike → component slots → physical instances. A slot is the enduring assembly position; an instance is the actual installed part. A catalog component describes its product. Service records reference the instance, never a mesh or slot alone.
- A model binding maps geometry groups to slots, then resolves the currently installed instance. Replacement therefore retains spatial identity and changes physical identity.
- Manufacturer rules and illustrative application rules are separate records, with evidence and explicit source types. Unknown evidence never becomes a green status. App approaching threshold (80%) is display policy, not manufacturer guidance.
- In-memory data first. Pure commands can later sit behind a repository API without changing the scene. No speculative persistence implementation.

React 19 and Fiber 9 are paired per [Fiber installation guidance](https://r3f.docs.pmnd.rs/getting-started/installation). Node requirements follow [Vite documentation](https://vite.dev/guide/). Lockfile pins the installed dependency graph.

## Domain model

See [data-model.md](data-model.md). Core entities are BikeModel, Bike, ComponentCategory, Component (catalog product), ComponentSlot, ComponentInstance, Manufacturer, MaintenanceRule, MaintenanceEvent, and UsageRecord. Future boundary contracts describe SetupSnapshot, Ride, TelemetrySession, Sensor, TelemetryChannel, and TelemetrySample without implementing analysis or integration.

## 3D architecture

See [3d-architecture.md](3d-architecture.md). Procedural geometry is an interaction asset, not an exact scale CAD model. Each selectable group is bound explicitly to a slot. Domain code imports no Three.js or React code. A production GLB can replace the geometry and binding manifest together. Default, selected, isolated, exploded, and hidden presentation states have a scene-local contract; this slice implements highlighting and isolation only.

## Data flow

Seed → app state → domain selectors/calculations → panel and scene status map.
Canvas or HTML selector → selection state → focused scene and selected-instance panel.
Service form → validated domain command → immutable event append → recalculated state.
Replacement → close previous installation → create new instance at current bike usage → resolve slot binding again. Old history remains accessible by instance ID.

## Maintenance logic

First supported interval is cumulative riding hours. Pick only events for the same instance and service type, no later than evaluation time, with nondecreasing valid meter readings. Use last matching service or a known installation baseline. Unknown hours, absent baseline, invalid chronology, unverified manufacturer rule, or nonpositive interval yield Unknown. Exact interval is Due; greater is Overdue; at least 80% is Approaching; otherwise Good. Hours used = current bike meter − service/installation bike meter. Replacement starts a new usage baseline and never inherits old service. A future used-component import needs a known carried usage baseline; this slice does not assume one.

The seeded manufacturer fork rule has no numeric interval or documentation and yields Unknown. An opt-in, explicitly fictional 50-hour demonstration rule with mock meter 153 and mock service meter 120 yields 33/50 hours. Recording matching demo service at 153 yields 0/50. Demo state is never labeled manufacturer guidance. Status measures interval progress, not mechanical safety or ride readiness. Calendar, distance, multiple-rule aggregation, and stricter-of-several constraints are later extensions.

## Telemetry and future capabilities

Vendor hardware → file adapter/importer → normalized timestamped session/channel data → ride and physical component association → future analysis. Channel metadata records units, sensor identity, component instance, and calibration reference. Samples use session-relative seconds; sessions define UTC start. Large sample arrays stay outside React and relational rows, in external storage referenced by session. Importers eventually report clock alignment, gaps, units, and calibration quality. No adapter is built now.

Setup snapshots remain immutable and can attach to rides. Future rides may import from Garmin/Strava through adapters. Predictive outputs must retain provenance/model version and augment manufacturer guidance rather than overwriting it. A future compatibility catalog can link bike/component/sensor combinations to mount, installation, and calibration documentation; compatibility must be evidence-based.

## Recommended folder structure

`src/domain/`: interfaces, pure commands, calculations and tests.
`src/data/`: clearly labeled seed records.
`src/app/`: orchestration and domain state.
`src/components/`: HTML navigation, details and forms.
`src/scene/`: geometry, slot bindings, scene presentation and camera.
`docs/`: design decisions, scope and follow-up work.

## Implementation phases

1. Assess and document the domain, evidence boundaries and rendering contract.
2. Scaffold strict TS, React, Vite, CSS, build and domain tests.
3. Build procedural scene, camera, assembly selection and component panel.
4. Complete fork service flow, demo calculations and instance replacement.
5. Run typecheck, tests, production build and browser interaction checks; record limits.

## Major risks

- Incorrect year/variant or document applicability: keep exact unknowns empty, require provenance before activation.
- False precision in placeholder geometry: label the model as schematic and avoid dimension claims.
- Bike meters can reset or span swapped components: retain installation boundaries; later introduce explicit meter corrections and cross-bike usage attribution.
- WebGL availability and mobile GPU limits: constrain geometry/DPR and preserve HTML selection when 3D is unavailable.
- History can become ambiguous across swaps: immutable instance IDs and retained retired installations.
- No persistence in this first pass: clearly show that refresh resets demo edits.
- GLB licensing, size and stable bindings require validation before production use.

## Open questions

Exact bike model year/serial, fork/shock variants, setup and other component specifications; appropriate manufacturer documents and service types; riding-hour definition; initial and carried usage for existing parts; service on removed components; desired persistence/export; production asset source/license; phone workflows and offline support. These are deliberately unresolved rather than inferred from the build name.

## Next five implementation steps

1. Verify exact component identities and applicable manufacturer documents; populate provenance and approved rules.
2. Add versioned local persistence and export/import with runtime validation and migrations.
3. Extend service rules to calendar/distance, multiple procedures and explicit usage corrections.
4. Acquire a licensed GLB and validate its slot bindings, picking, performance and accessibility alternatives.
5. Add ride and setup entry, then a single file-based telemetry adapter with units, timing and calibration validation.
