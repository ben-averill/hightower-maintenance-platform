import {advanceSuspensionPlayback,initialSuspensionPlayback} from "../scene/suspensionPlayback";
import {suspensionTravel as travelLimits} from "../scene/suspensionMotion";
import type {BrakeEnd} from "../scene/brakeGeometry";
import type {FrameInspection,InspectionAngle} from "../scene/frameInspection";
import type {ResolvedTheme,ThemePreference} from "../app/useTheme";
import {lazy,Suspense,useEffect,useReducer,useRef,useState,type ReactNode} from "react";
import type {BikeData,CategoryId,MaintenanceStatus} from "../domain/models";
import {statusLabels} from "../domain/maintenance";
import {SceneBoundary} from "./SceneBoundary";
import {categorySymbols} from "./categorySymbols";
const BikeScene=lazy(()=>import("../scene/BikeScene"));

export function BikeViewport({theme,preference,onThemeChange,data,category,selectedSlotId,frameInspection,
  setFrameInspection,statuses,demo,controlsVisible,detailsControl,controlsToggle,onBrowse,selectCategory,selectComponent}:{
  theme:ResolvedTheme;preference:ThemePreference;onThemeChange:(value:ThemePreference)=>void;
  data:BikeData;category:CategoryId|null;selectedSlotId:string|null;frameInspection:FrameInspection;
  setFrameInspection:(view:FrameInspection)=>void;statuses:Record<string,MaintenanceStatus>;demo:boolean;
  controlsVisible:boolean;detailsControl:ReactNode;controlsToggle:ReactNode;onBrowse:()=>void;
  selectCategory:(id:CategoryId|null)=>void;selectComponent:(id:string)=>void;
}) {
  const [travelMotion,setSuspensionTravel]=useReducer(advanceSuspensionPlayback,initialSuspensionPlayback);
  const suspensionTravel=travelMotion.percent;
  const [brakeView,setBrakeView]=useState<BrakeEnd|null>(null);
  const [frontView,setFrontView]=useState(false);
  const [inspectionAngle,setInspectionAngle]=useState<InspectionAngle>("three-quarter");
  const [isolate,setIsolate]=useState(false);
  const [showStatus,setShowStatus]=useState(false);
  const [resetVersion,setResetVersion]=useState(0);
  const [activeTool,setActiveTool]=useState<"travel"|"options"|null>(null);
  const navigation=useRef<HTMLElement>(null),dock=useRef<HTMLElement>(null);
  useEffect(()=>{
    const panel=dock.current,workspace=panel?.closest<HTMLElement>(".immersive-workbench");
    if(!panel||!workspace)return;
    const update=()=>workspace.style.setProperty("--dock-height",`${Math.ceil(panel.getBoundingClientRect().height)}px`);
    const observer=new ResizeObserver(update);observer.observe(panel);update();
    return ()=>{observer.disconnect();workspace.style.removeProperty("--dock-height");};
  },[]);
  const travelButton=useRef<HTMLButtonElement>(null),optionsButton=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(frameInspection!=="bike"){setBrakeView(null);setFrontView(false);setIsolate(false);}
  },[frameInspection]);
  useEffect(()=>{
    if(brakeView&&selectedSlotId!==`brake.${brakeView}`)setBrakeView(null);
  },[selectedSlotId,brakeView]);
  useEffect(()=>{
    navigation.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.scrollIntoView({block:"nearest",inline:"nearest"});
  },[category]);
  const categoryName=data.categories.find(item=>item.id===category)?.name;
  const visibleSlots=data.slots.filter(item=>item.categoryId===category);
  const focus=frameInspection!=="bike"?`assembly:${frameInspection}`:category==="frame"?"all":selectedSlotId??"all";
  const cameraView=brakeView?"close-up":frontView?"front":inspectionAngle;
  const selectedBrake=selectedSlotId==="brake.front"?"front":selectedSlotId==="brake.rear"?"rear":null;
  function chooseCategory(id:CategoryId|null){
    setBrakeView(null);setFrontView(false);setIsolate(false);setFrameInspection("bike");
    selectCategory(id);onBrowse();
  }
  function chooseComponent(id:string){
    if(id!=="frame")setFrameInspection("bike");selectComponent(id);
  }
  function chooseFocus(value:string){
    if(value==="all"){chooseCategory(category);return;}
    if(value.startsWith("assembly:")){
      selectCategory("frame");onBrowse();setFrameInspection(value.slice(9) as FrameInspection);return;
    }
    chooseComponent(value);
  }
  function chooseView(value:string){
    setBrakeView(null);setFrontView(false);
    if(value==="close-up"&&selectedBrake)setBrakeView(selectedBrake);
    else if(value==="front")setFrontView(true);
    else setInspectionAngle(value as InspectionAngle);
    setResetVersion(value=>value+1);
  }
  function closeTool(){
    const button=activeTool==="travel"?travelButton:optionsButton;
    setActiveTool(null);button.current?.focus();
  }
  return <section className="viewer" aria-label="Interactive bike workbench">
    <div className="canvas-area">
      <SceneBoundary><Suspense fallback={<div className="canvas-fallback">Preparing your workbench…</div>}>
        <BikeScene theme={theme} suspensionTravel={suspensionTravel} cassetteAngle={travelMotion.cassetteAngle}
          slots={data.slots} category={category} selectedSlotId={selectedSlotId} isolate={isolate} showStatus={showStatus}
          statuses={statuses} onSelect={chooseComponent} resetVersion={resetVersion} frontView={frontView}
          brakeView={brakeView} frameInspection={frameInspection} inspectionAngle={inspectionAngle}/>
      </Suspense></SceneBoundary>
      <div className="canvas-label" hidden={!controlsVisible}>{demo?"Demo calculation active · fictional interval"
        :suspensionTravel>0?"Medium / Low geometry · estimated suspension motion":"Medium / Low geometry · frame surfaces estimated"}</div>
      <div className="canvas-instructions" hidden={!controlsVisible}><span>↔ Drag to orbit</span><span>⇧ Drag to pan</span><span>⊕ Scroll to zoom</span></div>
    </div>
    <aside ref={dock} className={`control-dock${controlsVisible?"":" is-collapsed"}`} aria-label="Bike controls" onKeyDown={event=>{
      if(event.key==="Escape"&&activeTool){event.stopPropagation();closeTool();}
    }}>
      <nav ref={navigation} className="assembly-nav" aria-label="Bike categories" hidden={!controlsVisible}>
        <button aria-pressed={category===null} onClick={()=>chooseCategory(null)}><span aria-hidden="true">⌘</span>Whole bike</button>
        {data.categories.map(item=><button key={item.id} aria-pressed={category===item.id} onClick={()=>chooseCategory(item.id)}>
          <span aria-hidden="true">{categorySymbols[item.id]}</span>{item.name}</button>)}
      </nav>
      <div className="dock-control-row">
        <div className="dock-selection" hidden={!controlsVisible}>
          {category?<select aria-label={`${categoryName} selection`} value={focus} onChange={event=>chooseFocus(event.target.value)}>
            <option value="all">All {categoryName?.toLowerCase()}</option>
            {category==="frame"?<>
              <option value="assembly:front">Front triangle</option><option value="assembly:rear">Rear triangle</option>
              <option value="assembly:links">VPP links</option><option value="assembly:frame">Frame and shock</option>
            </>:visibleSlots.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
          </select>:<span className="dock-hint">Choose a category or click a part</span>}
          {category&&frameInspection==="bike"&&<button aria-pressed={isolate}
            onClick={()=>setIsolate(value=>!value)}>Isolate</button>}
          {detailsControl}
        </div>
        <div className="dock-view-tools" hidden={!controlsVisible}>
          <select aria-label="Viewing angle" value={cameraView} onChange={event=>chooseView(event.target.value)}>
            <option value="three-quarter">Three-quarter</option><option value="side">Side profile</option>
            {(frontView||category==="cockpit"||category==="suspension")&&<option value="front">Front assembly</option>}
            {selectedBrake&&<option value="close-up">Brake close-up</option>}
          </select>
          <button className="dock-icon" aria-label="Reset camera view" title="Reset view" onClick={()=>{
            setBrakeView(null);setFrontView(false);setResetVersion(value=>value+1);
          }}>↺</button>
          <button ref={travelButton} aria-expanded={activeTool==="travel"} aria-controls="travel-controls"
            onClick={()=>setActiveTool(value=>value==="travel"?null:"travel")}>Travel</button>
          <button ref={optionsButton} aria-expanded={activeTool==="options"} aria-controls="workbench-options"
            onClick={()=>setActiveTool(value=>value==="options"?null:"options")}>Options</button>
        </div>
        {controlsToggle}
      </div>
      <div id="travel-controls" className="suspension-control" hidden={!controlsVisible||activeTool!=="travel"} role="group" aria-label="Suspension travel controls">
        <div className="travel-heading"><label htmlFor="suspension-travel">Suspension travel</label><output htmlFor="suspension-travel">{suspensionTravel}%</output></div>
        <div className="travel-slider-row"><span>0%</span>
          <input id="suspension-travel" type="range" min="0" max="100" step="1" value={suspensionTravel}
            aria-valuetext={`${suspensionTravel}% travel, ${travelLimits.rear*suspensionTravel/100} mm rear, ${travelLimits.front*suspensionTravel/100} mm front`}
            onChange={event=>{setSuspensionTravel(Number(event.target.value));chooseCategory(null);}}/>
          <span>100%</span><button aria-label="Reset suspension travel" disabled={suspensionTravel===0} onClick={()=>setSuspensionTravel(0)}>Reset</button>
        </div>
        <div className="travel-readout"><span>Rear <strong>{(travelLimits.rear*suspensionTravel/100).toFixed(1)} / {travelLimits.rear} mm</strong></span>
          <span>Front <strong>{(travelLimits.front*suspensionTravel/100).toFixed(1)} / {travelLimits.front} mm</strong></span></div>
      </div>
      <div id="workbench-options" className="dock-options" hidden={!controlsVisible||activeTool!=="options"}>
        <div className="dock-options-row"><label>Theme <select aria-label="Color theme" value={preference}
          onChange={event=>onThemeChange(event.target.value as ThemePreference)}>
          <option value="system">System theme</option><option value="light">Light</option><option value="dark">Dark</option>
        </select></label><button aria-pressed={showStatus} onClick={()=>setShowStatus(value=>!value)}>Service colors</button>
          <details className="dock-about"><summary>About this prototype</summary>
            <p>Medium / Low geometry with estimated frame surfaces. Usage and service history are mock data. Edits reset on refresh; service intervals await verification.</p>
          </details>
        </div>
      </div>
      {showStatus&&controlsVisible&&<div className="dock-status-legend" aria-label="Maintenance color legend">
        {(Object.keys(statusLabels) as MaintenanceStatus[]).map(status=><span key={status}><i className={`legend-dot status-${status}`}/>{statusLabels[status]}</span>)}
      </div>}
    </aside>
  </section>;
}
