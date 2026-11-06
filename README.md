# Hightower · Bike workbench

A local 3D maintenance prototype for a Santa Cruz Hightower 4, Medium, 29″, Gloss Day Green, GX AXS. React + strict TypeScript + Vite + Three.js / React Three Fiber / Drei, with plain CSS and an in-memory domain model.

## Run

Use Node 22.12+ (tested with 22.16) or Node 20.19+ and npm.

```sh
npm install
npm run dev
```

Open the localhost URL printed by Vite. On Windows, use `npm.cmd` if PowerShell blocks `npm.ps1`.

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

## Try the fork flow

1. Choose **Suspension**, then **Fork**, or click the fork in the 3D view.
2. Orbit by dragging, zoom by scrolling, and pan with Shift-drag or right-drag. **Reset view** restores the camera. **Isolate** hides other components.
3. The inspector initially shows **Unknown**: the Fox manufacturer interval has not been verified.
4. Enable **Use illustrative 50 h rule** below the workbench. The fictional fixture calculates 33 / 50 h since mock service at 120 bike hours, using a current mock meter of 153 h. **Service colors** displays the calculated state on the geometry.
5. Choose **Record mock service**, enter work performed, and save. Inspect the new record in **Service history**; matching fork service now calculates 0 / 50 h. An inspection does not reset the service cycle.
6. Under **Component lifecycle**, install a replacement demo fork. It gets a new identity and a usage baseline of 153 h. In history, select **Include previous components** to inspect the retired fork's retained records.

Everything is local to the current page session. Refreshing restores the seed; nothing is saved to a database or browser storage. All installation dates, usage and history are mock data. The 50-hour interval is a fictional calculation fixture, **not Fox guidance**. Unknown specifications and manufacturer intervals have not been invented. Geometry is a photo-informed procedural approximation with curved frame tubes, low-mounted shock, tread and drivetrain details; it is not a dimensionally accurate Hightower model. Reference branding does not verify the installed parts. Only the fork has service-entry and replacement UI in this first slice.

## Architecture

- [Product plan](docs/product-plan.md): assessment, scope, architecture, phases, risks and open questions.
- [Data model](docs/data-model.md): stable IDs, product/instance distinction, history, usage and future telemetry.
- [3D architecture](docs/3d-architecture.md): slot binding, selection, isolation and GLB migration.
- `src/domain`: pure TypeScript models, commands, maintenance calculations and tests.
- `src/data`: user-provided identities and explicitly mock history.
- `src/scene`: procedural asset and presentation, independent of service logic.
- `src/app` and `src/components`: state coordination and HTML controls.

Verification completed: strict TypeScript and production build pass; all 42 domain tests pass. Browser checks covered direct 3D fork picking, assembly selection, isolation, orbit/reset, the 33/50-hour demo, service recording and reset to 0/50, and replacement with retained history. Desktop and narrow layouts were inspected. The installed dependency audit reports zero vulnerabilities.

## Next five steps

1. Verify exact component variants and manufacturer documentation, then activate sourced service rules.
2. Add versioned local persistence, validated import/export and migrations.
3. Support calendar/distance rules, multiple procedures and explicit meter corrections.
4. Replace the schematic with a licensed GLB and validate its slot bindings and performance.
5. Add ride/setup entry, then one file-based telemetry adapter with timing, unit and calibration validation.
