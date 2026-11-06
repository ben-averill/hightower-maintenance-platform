import { useEffect, useRef, useState } from "react";
import { createSeedData } from "../data/seed";
import { activeInstance, recordService, replaceComponent } from "../domain/commands";
import { calculateMaintenance } from "../domain/maintenance";
import type { CategoryId, MaintenanceEvent, MaintenanceStatus } from "../domain/models";
import { ComponentPanel } from "../components/ComponentPanel";
import { BikeViewport } from "../components/BikeViewport";
import { BikeOverview } from "../components/BikeOverview";
import { useTheme } from "./useTheme";
import type { FrameInspection } from "../scene/frameInspection";

export function App() {
  const {preference,setPreference,theme}=useTheme();
  const [data, setData] = useState(createSeedData);
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [frameInspection, setFrameInspection] = useState<FrameInspection>("bike");
  const [demo, setDemo] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const detailsToggle = useRef<HTMLButtonElement>(null);
  const closeDetailsButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (inspectorOpen && controlsVisible) closeDetailsButton.current?.focus({ preventScroll: true });
  }, [inspectorOpen, selectedSlotId, controlsVisible]);
  const slot = data.slots.find((item) => item.id === selectedSlotId);
  function maintenanceFor(slotId: string) {
    const instance = activeInstance(data, slotId)!;
    return calculateMaintenance({
      instance,
      rule: data.rules.find((rule) => rule.componentId === instance.componentId && rule.authority === (demo ? "application-demo" : "manufacturer")),
      events: data.events,
      currentHours: data.usage.cumulativeHours,
      asOf: data.usage.recordedAt,
    });
  }
  const statuses = Object.fromEntries(data.slots.map((item) => [item.id, maintenanceFor(item.id).status])) as Record<string, MaintenanceStatus>;
  function selectComponent(slotId: string) {
    if (slotId !== "frame") setFrameInspection("bike");
    setSelectedSlotId(slotId);
    setCategory(data.slots.find((item) => item.id === slotId)?.categoryId ?? null);
    setInspectorOpen(true);
    setControlsVisible(true);
  }
  function selectCategory(id: CategoryId | null) {
    setFrameInspection("bike");
    setCategory(id);
    setSelectedSlotId(null);
  }
  function save(event: MaintenanceEvent) { setData(recordService(data, event)); }
  function replace() {
    if (!slot) return;
    const instance = activeInstance(data, slot.id)!;
    setData(replaceComponent(data, {
      slotId: slot.id, newInstanceId: `fork-${crypto.randomUUID()}`,
      componentId: instance.componentId, date: data.usage.recordedAt,
      bikeHours: data.usage.cumulativeHours!,
    }));
  }
  function closeInspector() {
    setInspectorOpen(false);
    detailsToggle.current?.focus();
  }
  return (
    <div className="app-shell immersive-workbench">
      <main aria-label="Bike workbench">
        <BikeViewport theme={theme} preference={preference} onThemeChange={setPreference} data={data} category={category} selectedSlotId={selectedSlotId}
          frameInspection={frameInspection} setFrameInspection={setFrameInspection}
          statuses={statuses} demo={demo} controlsVisible={controlsVisible}
          detailsControl={<button ref={detailsToggle} aria-expanded={inspectorOpen} aria-controls="component-inspector"
            onClick={() => {if(!inspectorOpen&&category==="frame"&&!slot)selectComponent("frame");else setInspectorOpen(!inspectorOpen);}}>Details</button>}
          controlsToggle={<button className="visibility-toggle" aria-expanded={controlsVisible}
            aria-label={controlsVisible?"Hide controls":"Show controls"} title={controlsVisible?"Hide controls":"Show controls"}
            onClick={()=>setControlsVisible(!controlsVisible)}>{controlsVisible?"⌄":"Show controls"}</button>}
          onBrowse={() => setInspectorOpen(false)}
          selectCategory={selectCategory} selectComponent={selectComponent} />
      </main>
      <header className="scene-header" hidden={!controlsVisible}>
        <div className="scene-brand"><div><h1>HIGHTOWER 4</h1><span>{data.bike.size} · {data.bike.wheelSizeInches}″ · {data.bike.build}</span></div></div>
      </header>
      <aside id="component-inspector" className="inspector floating-inspector" aria-label="Component information"
        hidden={!controlsVisible || !inspectorOpen} onKeyDown={event => {
          if (event.key === "Escape") { event.stopPropagation(); closeInspector(); }
        }}>
        <div className="inspector-bar"><span className="mini-label">BIKE DETAILS</span>
          <button ref={closeDetailsButton} aria-label="Close details" onClick={closeInspector}>×</button></div>
        {slot ? <ComponentPanel key={slot.id} data={data} slot={slot} maintenance={maintenanceFor(slot.id)}
          demo={demo} onSave={save} onReplace={replace} /> :
          <BikeOverview data={data} category={category} selectComponent={selectComponent} />}
        <div className="inspector-demo">
          <p>Mock usage & service history. Edits reset on refresh.</p>
          <label className="demo-toggle"><input type="checkbox" checked={demo} onChange={event => setDemo(event.target.checked)} />
            <span className="switch" />Use illustrative 50 h rule <span className="mini-label">NOT FOX GUIDANCE</span>
          </label>
        </div>
      </aside>

    </div>
  );
}
