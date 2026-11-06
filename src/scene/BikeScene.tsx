import { brakePose, type BrakeEnd } from "./brakeGeometry";
import { sceneScale } from "./geometry";
import { visibleInInspection, type FrameInspection, type InspectionAngle } from "./frameInspection";
import { useEffect, useMemo, useRef, type ComponentRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { PMREMGenerator, Vector3, type Group, type GridHelper, type ShadowMaterial } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type {
  ComponentSlot,
  MaintenanceStatus,
  CategoryId,
} from "../domain/models";
import { proceduralModel } from "./model";
import {SuspensionParts} from "./SuspensionRig";
import {suspensionPose} from "./suspensionMotion";
import { FadeColorContext,scenePalette } from "./sceneAppearance";
import { floorOpacity } from "./floorVisibility";
import type { ResolvedTheme } from "../app/useTheme";

export const statusColors: Record<MaintenanceStatus, string> = {
  unknown: "#86958e",
  good: "#79b88b",
  approaching: "#d3ac47",
  due: "#e88839",
  overdue: "#d85a4e",
};
interface Props {
  theme: ResolvedTheme;
  suspensionTravel: number;
  cassetteAngle: number;
  slots: ComponentSlot[];
  category: CategoryId | null;
  selectedSlotId: string | null;
  isolate: boolean;
  showStatus: boolean;
  statuses: Record<string, MaintenanceStatus>;
  onSelect: (slotId: string) => void;
  resetVersion: number;
  frontView: boolean;
  brakeView: BrakeEnd | null;
  frameInspection: FrameInspection;
  inspectionAngle: InspectionAngle;
}
function StudioReflections() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const previous = scene.environment;
    const previousIntensity = scene.environmentIntensity;
    const room = new RoomEnvironment();
    const generator = new PMREMGenerator(gl);
    const environment = generator.fromScene(room, 0.04);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.5;
    room.dispose();
    generator.dispose();
    return () => {
      scene.environment = previous;
      scene.environmentIntensity = previousIntensity;
      environment.dispose();
    };
  }, [gl, scene]);
  return null;
}
function StudioFloor({ theme }: { theme: ResolvedTheme }) {
  const group = useRef<Group>(null);
  const grid = useRef<GridHelper>(null);
  const shadow = useRef<ShadowMaterial>(null);
  const direction = useRef(new Vector3());
  useFrame(({ camera }) => {
    camera.getWorldDirection(direction.current);
    const opacity = floorOpacity(Math.asin(-direction.current.y));
    if (group.current) group.current.visible = opacity > 0;
    if (shadow.current) shadow.current.opacity = 0.12 * opacity;
    if (grid.current) {
      const materials = Array.isArray(grid.current.material)
        ? grid.current.material : [grid.current.material];
      for (const material of materials) material.opacity = opacity;
    }
  });
  return (
    <group ref={group} name="studio-floor">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.018, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <shadowMaterial ref={shadow} transparent opacity={0.12} depthWrite={false} />
      </mesh>
      <gridHelper
        ref={grid}
        args={[20, 80, theme === "dark" ? "#34424a" : "#cdd5c7", theme === "dark" ? "#26323a" : "#dbe1d5"]}
        position={[0, -0.02, 0]}
        material-transparent
        material-depthWrite={false}
      />
    </group>
  );
}
function Controls({ resetVersion, frontView, brakeView, frameInspection, inspectionAngle }: Pick<Props, "resetVersion" | "frontView" | "brakeView" | "frameInspection" | "inspectionAngle">) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera, size } = useThree();
  useEffect(() => {
    const distance = Math.max(5.2, 7.5 / (size.width / size.height));
    if (brakeView) {
      const [x,y,z] = brakePose(brakeView).rotor.map(value => value * sceneScale);
      const closeDistance = Math.max(1.12, 1.9 / (size.width / size.height));
      camera.position.set(x! + closeDistance * (brakeView === "front" ? -0.32 : 0.18), y! + 0.045 + closeDistance * 0.18, z! - closeDistance * 0.98);
      controls.current?.target.set(x!, y! + 0.045, z!);
    } else if (frontView) {
      const closeDistance = Math.max(3.25, 4.2 / (size.width / size.height));
      camera.position.set(.9 + closeDistance * .8, 1.22 + closeDistance * .24, closeDistance * .6);
      controls.current?.target.set(.9, 1.22, 0);
    } else if (frameInspection !== "bike" || inspectionAngle === "side") {
      const centers = {front: [.05,1.15], rear: [-.63,.86], links: [-.28,.96], frame: [-.17,1.12], bike: [0,1.03]};
      const [x,y] = centers[frameInspection];
      const extent = {front: 3.15, rear: 2.45, links: 1.65, frame: 3.5, bike: 5.15}[frameInspection];
      const fit = Math.max(extent, extent * 1.25 / (size.width / size.height));
      camera.position.set(x! + (inspectionAngle === "side" ? 0 : fit * .56), y! + (inspectionAngle === "side" ? 0 : fit * .27), fit * (inspectionAngle === "side" ? 1 : .83));
      controls.current?.target.set(x!,y!,0);
    } else {
      camera.position.set(distance * 0.24, 1.0 + distance * 0.1, distance * 0.98);
      controls.current?.target.set(0, 1.0, 0);
    }
    controls.current?.update();
  }, [camera, size.width, size.height, resetVersion, frontView, brakeView, frameInspection, inspectionAngle]);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={[0, 1.0, 0]}
      minDistance={brakeView || frameInspection !== "bike" ? 0.35 : 2}
      maxDistance={Math.max(15, 15 / (size.width / size.height))}
      maxPolarAngle={Math.PI - 0.01}
      enableDamping
      dampingFactor={0.08}
    />
  );
}
export default function BikeScene(props: Props) {
  const { category, selectedSlotId, isolate, showStatus, statuses, onSelect } =
    props;
  const travel=useMemo(()=>suspensionPose(props.suspensionTravel,props.cassetteAngle),[props.suspensionTravel,props.cassetteAngle]);
  return (
    <Canvas
      shadows
      dpr={[1, 1.6]}
      camera={{ position: [1.7, 1.75, 4.8], fov: 30 }}
      fallback={
        <div className="canvas-fallback">
          3D needs WebGL. Use the component buttons to explore your bike.
        </div>
      }
    >
      <color attach="background" args={[scenePalette[props.theme].background]} />
      <StudioReflections />
      <ambientLight intensity={0.6} />
      <hemisphereLight args={["#ffffff", "#9aa88d", 1.15]} />
      <directionalLight
        position={[-3, 3, -4]}
        intensity={1.2}
        color="#c8dfec"
      />
      <directionalLight
        position={[1, 5, 3]}
        intensity={2.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-normalBias={0.005}
      />
      <FadeColorContext.Provider value={scenePalette[props.theme].faded}><group name="suspension-bike"
        position={travel.ground.offset.map(v=>v*sceneScale) as [number,number,number]} rotation={[0,0,travel.ground.angle]}>
        {proceduralModel.map((binding) => {
          const slot = props.slots.find((item) => item.id === binding.slotId);
          const selected = selectedSlotId === binding.slotId;
          const inFocus = selectedSlotId
            ? selected
            : category
              ? slot?.categoryId === category
              : true;
          return (
            <group
              key={binding.slotId}
              name={`asset:${binding.slotId}`}
              visible={binding.primitives.some(shape => visibleInInspection(props.frameInspection,binding.slotId,shape))
                && !(props.frameInspection === "bike" && isolate && !inFocus)}
              onClick={event=>{
                event.stopPropagation();
                onSelect(binding.slotId);
              }}
            >
              <SuspensionParts binding={binding} pose={travel} inspection={props.frameInspection}
                faded={props.frameInspection === "bike" && !inFocus}
                statusColor={showStatus ? statusColors[statuses[binding.slotId] ?? "unknown"] : undefined}/>

            </group>
          );
        })}
      </group></FadeColorContext.Provider>
      <StudioFloor theme={props.theme} />
      <Controls resetVersion={props.resetVersion} frontView={props.frontView} brakeView={props.brakeView} frameInspection={props.frameInspection} inspectionAngle={props.inspectionAngle} />
    </Canvas>
  );
}







