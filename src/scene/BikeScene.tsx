import { brakePose, type BrakeEnd } from "./brakeGeometry";
import { geometryAnchors, sceneScale } from "./geometry";
import { visibleInInspection, type FrameInspection, type InspectionAngle } from "./frameInspection";
import { useEffect, useMemo, useRef, type ComponentRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { CanvasTexture, PMREMGenerator, Vector3, type Group, type MeshBasicMaterial } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
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
// Soft contact shadows under each tyre, like a product shot. They follow the
// contact patches through suspension travel and fade out before the camera
// drops to floor level, so they never hang in the air below the bike.
function contactShadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  // Alpha maps read the green channel: white is solid shadow, black is none.
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.35, "#b3b3b3");
  gradient.addColorStop(1, "#000000");
  context.fillStyle = "#000000";
  context.fillRect(0, 0, 128, 128);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new CanvasTexture(canvas);
}
function WheelShadows({ pose }: { pose: SuspensionPose }) {
  const group = useRef<Group>(null);
  const materials = useRef<(MeshBasicMaterial | null)[]>([]);
  const direction = useRef(new Vector3());
  const texture = useMemo(contactShadowTexture, []);
  useEffect(() => () => texture.dispose(), [texture]);
  const rearX = rear[0], frontX = movePoint(movePoint(front, pose.fork), pose.ground)[0];
  // A tight, dark patch under each tyre plus a faint pool across the wheelbase.
  const contacts = [
    { x: rearX, length: 0.95, depth: 0.42, strength: 0.78 },
    { x: frontX, length: 0.95, depth: 0.42, strength: 0.78 },
    { x: (rearX + frontX) / 2, length: (frontX - rearX) * sceneScale + 1.2, depth: 0.7, strength: 0.3 },
  ];
  useFrame(({ camera }) => {
    camera.getWorldDirection(direction.current);
    const opacity = floorOpacity(Math.asin(-direction.current.y));
    if (group.current) group.current.visible = opacity > 0;
    materials.current.forEach((material, index) => {
      if (material) material.opacity = contacts[index]!.strength * opacity;
    });
  });
  return (
    <group ref={group} name="wheel-shadows">
      {contacts.map((contact, index) => (
        <mesh key={index} rotation={[-Math.PI / 2, 0, 0]} position={[contact.x * sceneScale, 0.001 + index * 0.0005, 0]}
          scale={[contact.length, contact.depth, 1]} renderOrder={-1}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial ref={material => { materials.current[index] = material; }} color="#000000"
            alphaMap={texture} transparent opacity={contact.strength} depthWrite={false} toneMapped={false} />
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
      <color attach="background" args={[colorway.canvas]} />
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
      />
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
      <WheelShadows pose={travel} />
      <Controls resetVersion={props.resetVersion} frontView={props.frontView} brakeView={props.brakeView} frameInspection={props.frameInspection} inspectionAngle={props.inspectionAngle} />
    </Canvas>
  );
}







