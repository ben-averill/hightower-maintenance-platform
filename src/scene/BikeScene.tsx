import { brakePose, type BrakeEnd } from "./brakeGeometry";
import { geometryAnchors, sceneScale } from "./geometry";
import { visibleInInspection, type FrameInspection, type InspectionAngle } from "./frameInspection";
import { useEffect, useMemo, useRef, type ComponentRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { CanvasTexture, Vector3, type Group, type MeshBasicMaterial } from "three";
import type {
  ComponentSlot,
  MaintenanceStatus,
  CategoryId,
} from "../domain/models";
import { proceduralModel } from "./model";
import {SuspensionParts} from "./SuspensionRig";
import {movePoint,suspensionPose,type SuspensionPose} from "./suspensionMotion";
import { ColorwayContext } from "./sceneAppearance";
import { floorOpacity } from "./floorVisibility";
import { colorways,type ColorwayId } from "../app/colorways";

const { rear, front } = geometryAnchors();

export const statusColors: Record<MaintenanceStatus, string> = {
  unknown: "#86958e",
  good: "#79b88b",
  approaching: "#d3ac47",
  due: "#e88839",
  overdue: "#d85a4e",
};
interface Props {
  colorway: ColorwayId;
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
// A dark photo studio lit by a long softbox overhead, as in Santa Cruz's
// product shots. Glossy and metallic paint reflect it as a bright streak along
// the top of each tube, while the undersides fall away into shadow. Low strips
// at the sides and back keep the dark side of the bike from going flat black.
function StudioLighting() {
  return (
    <Environment resolution={512} frames={1} environmentIntensity={1}>
      {/* A wide diffuser over the whole set: its edges sit low enough that
          tubes seen from bike height still catch it along their tops. */}
      <Lightformer form="rect" intensity={3} position={[0, 4.5, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[18, 16, 1]} />
      {/* The brighter core of the softbox, running the length of the bike. */}
      <Lightformer form="rect" intensity={30} position={[0, 5, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 3, 1]} />
      {/* Narrow strips along the front and back edges of the softbox: these
          draw the crisp white lines along the tops of the tubes. */}
      <Lightformer form="rect" intensity={24} position={[0, 4, 3.4]} target={[0, 1, 0]} scale={[10, 0.6, 1]} />
      <Lightformer form="rect" intensity={24} position={[0, 4, -3.4]} target={[0, 1, 0]} scale={[10, 0.6, 1]} />
      <Lightformer form="rect" intensity={0.35} position={[0, 1.5, 8]} rotation={[0, Math.PI, 0]} scale={[14, 2, 1]} />
      <Lightformer form="rect" intensity={0.35} position={[0, 1.5, -8]} scale={[14, 2, 1]} />
      <Lightformer form="rect" intensity={0.2} position={[-9, 1.5, 0]} rotation={[0, Math.PI / 2, 0]} scale={[10, 2, 1]} />
      <Lightformer form="rect" intensity={0.2} position={[9, 1.5, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[10, 2, 1]} />
    </Environment>
  );
}
// The studio floor, like a product shot: a broad pool of light under the bike
// and soft contact shadows under each tyre. Both follow the contact patches
// through suspension travel and fade out before the camera drops to floor
// level, so nothing hangs in the air below the bike.
function radialAlphaTexture(stops: [number, number][]) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  // Alpha maps read the green channel: white is opaque, black is clear.
  for (const [at, alpha] of stops) {
    const level = Math.round(alpha * 255);
    gradient.addColorStop(at, `rgb(${level},${level},${level})`);
  }
  context.fillStyle = "#000000";
  context.fillRect(0, 0, 128, 128);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new CanvasTexture(canvas);
}
function StudioFloor({ pose, glow }: { pose: SuspensionPose; glow: string }) {
  const group = useRef<Group>(null);
  const materials = useRef<(MeshBasicMaterial | null)[]>([]);
  const direction = useRef(new Vector3());
  const textures = useMemo(() => ({
    shadow: radialAlphaTexture([[0, 1], [0.35, 0.7], [1, 0]]),
    light: radialAlphaTexture([[0, 1], [0.3, 0.8], [0.6, 0.35], [1, 0]]),
  }), []);
  useEffect(() => () => { textures.shadow.dispose(); textures.light.dispose(); }, [textures]);
  const rearX = rear[0] * sceneScale, frontX = movePoint(movePoint(front, pose.fork), pose.ground)[0] * sceneScale;
  const middle = (rearX + frontX) / 2, wheelbase = frontX - rearX;
  const layers = [
    // Pool of light, a little behind the bike so it rises around the wheels.
    { x: middle, z: -0.25, length: wheelbase * 2.6, depth: 3.6, strength: 1, color: glow, texture: textures.light },
    { x: middle, z: 0, length: wheelbase + 1.2, depth: 0.7, strength: 0.3, color: "#000000", texture: textures.shadow },
    { x: rearX, z: 0, length: 0.95, depth: 0.42, strength: 0.78, color: "#000000", texture: textures.shadow },
    { x: frontX, z: 0, length: 0.95, depth: 0.42, strength: 0.78, color: "#000000", texture: textures.shadow },
  ];
  useFrame(({ camera }) => {
    camera.getWorldDirection(direction.current);
    const opacity = floorOpacity(Math.asin(-direction.current.y));
    if (group.current) group.current.visible = opacity > 0;
    materials.current.forEach((material, index) => {
      if (material) material.opacity = layers[index]!.strength * opacity;
    });
  });
  return (
    <group ref={group} name="studio-floor">
      {layers.map((layer, index) => (
        <mesh key={index} rotation={[-Math.PI / 2, 0, 0]} position={[layer.x, 0.001 + index * 0.0005, layer.z]}
          scale={[layer.length, layer.depth, 1]} renderOrder={-2 + index}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial ref={material => { materials.current[index] = material; }} color={layer.color}
            alphaMap={layer.texture} transparent opacity={layer.strength} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
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
  const colorway=colorways[props.colorway];
  const travel=useMemo(()=>suspensionPose(props.suspensionTravel,props.cassetteAngle),[props.suspensionTravel,props.cassetteAngle]);
  return (
    <Canvas
      dpr={[1, 1.6]}
      camera={{ position: [1.7, 1.75, 4.8], fov: 30 }}
      fallback={
        <div className="canvas-fallback">
          3D needs WebGL. Use the component buttons to explore your bike.
        </div>
      }
    >
      <StudioLighting />
      <ambientLight intensity={0.3} />
      <hemisphereLight args={["#ffffff", "#3a3a3a", 0.8]} />
      <directionalLight position={[-3, 3, -4]} intensity={0.9} color="#c8dfec" />
      {/* Key light from the overhead softbox. */}
      <directionalLight position={[0.6, 6, 1.6]} intensity={2.6} />
      <ColorwayContext.Provider value={colorway}><group name="suspension-bike"
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
      </group></ColorwayContext.Provider>
      <StudioFloor pose={travel} glow={colorway.glow} />
      <Controls resetVersion={props.resetVersion} frontView={props.frontView} brakeView={props.brakeView} frameInspection={props.frameInspection} inspectionAngle={props.inspectionAngle} />
    </Canvas>
  );
}







