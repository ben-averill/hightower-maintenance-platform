import { sweptGeometry } from "./sweptGeometry";
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  Object3D,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  Vector3,
  Vector2,
} from "three";
import type { Primitive } from "./primitives";
import { ChainMesh } from "./ChainMesh";
import { ErgonGrip } from "./ergonGrip";
import { ErgonSaddle } from "./ergonSaddle";
import { profileGeometry } from "./profileGeometry";
import { forkDecalGeometry, forkDecalTexture } from "./forkDecal";
import { forkArchGeometry } from "./forkArchGeometry";
import { shockDecalGeometry, shockDecalTexture } from "./shockDecal";
import { tireDecalGeometry, tireDecalTexture } from "./tireDecal";
import { FadedMaterial } from "./sceneAppearance";
import { drawSantaCruzWordmark } from "./santaCruzWordmark";
import { surfaceShellGeometry } from "./surfaceShell";
import { drawHightowerWordmark } from "./hightowerWordmark";

function TireDecal({shape,faded}:{shape:Extract<Primitive,{kind:"tire-decal"}>;faded:boolean}) {
  const texture=useMemo(()=>tireDecalTexture(shape.artwork),[shape.artwork]);
  const geometry=useMemo(()=>tireDecalGeometry(shape),[shape]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  if(faded) return null;
  return <mesh geometry={geometry}>{shape.artwork === "MAXXIS"
    ? <meshBasicMaterial map={texture} transparent toneMapped={false} depthWrite={false} polygonOffset polygonOffsetFactor={-1}/>
    : <meshStandardMaterial map={texture} transparent depthWrite={false} roughness={.83} metalness={0} polygonOffset polygonOffsetFactor={-1}/>}</mesh>;
}

function ShockDecal({shape,faded}:{shape:Extract<Primitive,{kind:"shock-decal"}>;faded:boolean}) {
  const texture=useMemo(()=>shockDecalTexture(shape.style),[shape.style]);
  const geometry=useMemo(()=>shockDecalGeometry(shape),[shape]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  if(faded) return null;
  return <mesh geometry={geometry}><meshPhysicalMaterial map={texture} transparent
    depthWrite={false} roughness={.36} metalness={.4} polygonOffset polygonOffsetFactor={-1}/></mesh>;
}

function ForkDecal({shape, faded}: {shape: Extract<Primitive,{kind:"fork-decal"}>; faded:boolean}) {
  const texture=useMemo(() => forkDecalTexture(shape.side),[shape.side]);
  const geometry=useMemo(() => forkDecalGeometry(shape),[shape]);
  useEffect(() => () => texture.dispose(),[texture]);
  useEffect(() => () => geometry.dispose(),[geometry]);
  if(faded) return null;
  return <mesh geometry={geometry}>
    <meshPhysicalMaterial map={texture} transparent depthWrite={false}
      roughness={.42} metalness={.28} polygonOffset polygonOffsetFactor={-1} />
  </mesh>;
}

function Decal({
  shape,
  faded,
}: {
  shape: Extract<Primitive, { kind: "label" }>;
  faded: boolean;
}) {
  const orientation = useMemo(() => {
    if (!shape.basis) return undefined;
    const right = new Vector3(...shape.basis.right).normalize();
    const normal = new Vector3(...shape.basis.normal).normalize();
    const up = normal.clone().cross(right).normalize();
    return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(right, up, normal));
  }, [shape]);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = shape.artwork ? Math.round(1024*shape.height/shape.width) : 128;
    const context = canvas.getContext("2d")!;
    context.font = "italic 900 100px Arial, sans-serif";
    context.fillStyle = shape.color;
    context.textAlign = "center";
    context.textBaseline = "middle";
    if (shape.artwork === "santa-cruz" || shape.artwork === "santa-cruz-stacked") {
      drawSantaCruzWordmark(context,canvas.width,canvas.height,shape.artwork==="santa-cruz-stacked");
    } else if(shape.artwork === "hightower") {
      drawHightowerWordmark(context,canvas.width,canvas.height,shape.color);
    } else if (shape.fitText) {
      context.translate(512, 0);
      context.scale(920 / Math.max(1, context.measureText(shape.text).width), 1);
      context.fillText(shape.text, 0, 68);
    } else context.fillText(shape.text, 512, 68, 1000);
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, [shape]);
  useEffect(() => () => texture.dispose(), [texture]);
  const decalGeometry=useMemo(()=>{
    const alongX=shape.curvatureAxis === "x";
    const geometry=new PlaneGeometry(shape.width,shape.height,shape.curvature && alongX?24:1,shape.curvature && !alongX?16:1);
    if(shape.curvature) {
      const positions=geometry.getAttribute("position"),r=shape.curvature;
      for(let i=0;i<positions.count;i++) {
        const across=alongX?positions.getX(i):positions.getY(i);
        positions.setZ(i,Math.sqrt(Math.max(0,r*r-across**2))-r);
      }
      geometry.computeVertexNormals();
    }
    return geometry;
  },[shape]);
  useEffect(()=>()=>decalGeometry.dispose(),[decalGeometry]);
  if(faded) return null;
  return (
    <mesh
      position={shape.at}
      geometry={decalGeometry}
      quaternion={orientation}
      rotation={orientation ? undefined : [
        0,
        shape.back ? Math.PI : 0,
        shape.back ? -shape.angle : shape.angle,
      ]}
    >
      <meshBasicMaterial
        toneMapped={!shape.artwork}
        map={texture}
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-1}
      />
    </mesh>
  );
}

function PrimitiveMesh({
  shape,
  faded,
  statusColor,
}: {
  shape: Primitive;
  faded: boolean;
  statusColor?: string;
}) {
  const instances = useRef<InstancedMesh>(null);
  const transform = useMemo(() => {
    if (shape.kind !== "tube" && shape.kind !== "sleeve") return null;
    const from = new Vector3(...shape.from),
      to = new Vector3(...shape.to);
    return {
      center: from.clone().add(to).multiplyScalar(0.5),
      length: from.distanceTo(to),
      rotation: new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        to.sub(from).normalize(),
      ),
    };
  }, [shape]);
  const geometry = useMemo(
    () => {
      if (shape.kind === "sweep") return sweptGeometry(shape);
      if (shape.kind === "profile") return profileGeometry(shape);
      if (shape.kind === "surface-shell") return surfaceShellGeometry(shape);
      if (shape.kind === "fork-arch") return forkArchGeometry(shape);
      if (shape.kind === "sleeve") {
        const half = new Vector3(...shape.from).distanceTo(new Vector3(...shape.to)) / 2;
        return new LatheGeometry([
          new Vector2(shape.innerRadius, -half), new Vector2(shape.outerRadius, -half),
          new Vector2(shape.endOuterRadius ?? shape.outerRadius, half), new Vector2(shape.innerRadius, half),
          new Vector2(shape.innerRadius, -half),
        ], 40);
      }
      return null;
    },
    [shape],
  );
  useEffect(() => () => geometry?.dispose(), [geometry]);
  useLayoutEffect(() => {
    if (shape.kind !== "blocks" || !instances.current) return;
    const pose = new Object3D();
    shape.blocks.forEach((block, index) => {
      pose.position.set(...block.at);
      pose.rotation.set(...block.rotation);
      pose.scale.set(...block.size);
      pose.updateMatrix();
      instances.current!.setMatrixAt(index, pose.matrix);
    });
    instances.current.instanceMatrix.needsUpdate = true;
    instances.current.computeBoundingSphere();
  }, [shape]);
  const material = faded ? <FadedMaterial/> : (
    <meshPhysicalMaterial
      color={statusColor ?? shape.color}
      vertexColors={shape.kind === "profile" && !!shape.headSection?.boreRadius}
      roughness={shape.roughness ?? 0.38}
      metalness={shape.metalness ?? 0.3}
      clearcoat={shape.kind === "profile" ? 0.35 : 0}
      clearcoatRoughness={0.22}
    />
  );
  if (shape.kind === "fork-decal") return <ForkDecal shape={shape} faded={faded} />;
  if (shape.kind === "shock-decal") return <ShockDecal shape={shape} faded={faded} />;
  if (shape.kind === "tire-decal") return <TireDecal shape={shape} faded={faded} />;
  if (shape.kind === "label") return <Decal shape={shape} faded={faded} />;
  if (shape.kind === "chain") return <ChainMesh shape={shape} material={material} faded={faded}/>;
  if (shape.kind === "ergon-grip") return <ErgonGrip shape={shape} faded={faded} statusColor={statusColor}/>;
  if (shape.kind === "ergon-saddle") return <ErgonSaddle shape={shape} faded={faded} statusColor={statusColor}/>;
  if (shape.kind === "sleeve" && geometry && transform)
    return <mesh geometry={geometry} position={transform.center} quaternion={transform.rotation} castShadow={!faded}>{material}</mesh>;
  if ((shape.kind === "sweep" || shape.kind === "profile" || shape.kind === "surface-shell" || shape.kind === "fork-arch") && geometry)
    return (
      <mesh geometry={geometry} castShadow={!faded}>
        {material}
      </mesh>
    );
  if (shape.kind === "blocks")
    return (
      <instancedMesh
        ref={instances}
        args={[undefined, undefined, shape.blocks.length]}
        castShadow={!faded}
      >
        <boxGeometry args={[1, 1, 1]} />
        {material}
      </instancedMesh>
    );
  if (shape.kind === "tube" && transform)
    return (
      <mesh
        position={transform.center}
        quaternion={transform.rotation}
        castShadow={!faded}
      >
        <cylinderGeometry
          args={[
            shape.endRadius ?? shape.radius,
            shape.radius,
            transform.length,
            20,
          ]}
        />
        {material}
      </mesh>
    );
  if (shape.kind === "ring")
    return (
      <mesh position={shape.at} castShadow={!faded}>
        <torusGeometry args={[shape.radius, shape.tube, 12, 80]} />
        {material}
      </mesh>
    );
  if (shape.kind === "box")
    return (
      <mesh position={shape.at} rotation={shape.rotation} castShadow={!faded}>
        <boxGeometry args={shape.size} />
        {material}
      </mesh>
    );
  return null;
}

// Scrubbing transforms groups without rebuilding unchanged carbon and wheel meshes.
export const ModelPrimitive=memo(PrimitiveMesh);
