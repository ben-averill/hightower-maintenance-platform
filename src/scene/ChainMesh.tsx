import { useEffect, useLayoutEffect, useMemo, useRef, type ReactElement } from "react";
import { CylinderGeometry, InstancedMesh, Matrix4, Quaternion, Vector3, type BufferGeometry } from "three";
import { profileGeometry } from "./profileGeometry";
import type { Primitive } from "./primitives";

type Chain=Extract<Primitive,{kind:"chain"}>;
export function chainMatrices(shape:Chain) {
  const plates:Matrix4[]=[],rollers:Matrix4[]=[],pins:Matrix4[]=[];
  const pitch=shape.pitch;
  shape.joints.forEach((point,i)=>{
    const a=new Vector3(...point),b=new Vector3(...shape.joints[(i+1)%shape.joints.length]!);
    const right=b.clone().sub(a).normalize(),up=new Vector3(0,0,1).cross(right).normalize();
    const normal=right.clone().cross(up).normalize();
    const rotation=new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(right,up,normal));
    const middle=a.clone().add(b).multiplyScalar(.5),offset=pitch*(i%2?.205:.15);
    for(const side of [-1,1]) plates.push(new Matrix4().compose(middle.clone().addScaledVector(normal,side*offset),rotation,
      new Vector3(a.distanceTo(b),pitch,pitch*.052)));
    const pinRotation=new Quaternion().setFromUnitVectors(new Vector3(0,1,0),normal);
    rollers.push(new Matrix4().compose(a,pinRotation,new Vector3(pitch*.27,pitch*.25,pitch*.27)));
    pins.push(new Matrix4().compose(a,pinRotation,new Vector3(pitch*.105,pitch*.49,pitch*.105)));
  });
  return {plates,rollers,pins};
}
function Instances({geometry,matrices,material,faded}:{geometry:BufferGeometry;matrices:Matrix4[];material:ReactElement;faded:boolean}) {
  const ref=useRef<InstancedMesh>(null);
  useLayoutEffect(()=>{
    matrices.forEach((matrix,i)=>ref.current!.setMatrixAt(i,matrix));
    ref.current!.instanceMatrix.needsUpdate=true;ref.current!.computeBoundingSphere();
  },[matrices]);
  return <instancedMesh ref={ref} args={[geometry,undefined,matrices.length]} castShadow={!faded}>{material}</instancedMesh>;
}
export function ChainMesh({shape,material,faded}:{shape:Chain;material:ReactElement;faded:boolean}) {
  const matrices=useMemo(()=>chainMatrices(shape),[shape]);
  const geometries=useMemo(()=>({
    plate:profileGeometry({kind:"profile",contour:[[-.72,0],[-.65,.20],[-.45,.24],[-.18,.15],[.18,.15],[.45,.24],[.65,.20],[.72,0],
      [.65,-.20],[.45,-.24],[.18,-.15],[-.18,-.15],[-.45,-.24],[-.65,-.20]],holes:[],z:0,depth:1,bevel:0,round:.1,color:"#aaa"}),
    cylinder:new CylinderGeometry(1,1,1,12),
  }),[]);
  useEffect(()=>()=>{geometries.plate.dispose();geometries.cylinder.dispose();},[geometries]);
  return <group>
    <Instances geometry={geometries.plate} matrices={matrices.plates} material={material} faded={faded}/>
    <Instances geometry={geometries.cylinder} matrices={matrices.rollers} material={material} faded={faded}/>
    <Instances geometry={geometries.cylinder} matrices={matrices.pins} faded={faded} material={
      faded?material:<meshStandardMaterial color="#424b4d" metalness={.8} roughness={.38}/>
    }/>
  </group>;
}
