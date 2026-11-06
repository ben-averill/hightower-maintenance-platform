import { useEffect,useMemo } from "react";
import { BufferGeometry,CanvasTexture,Float32BufferAttribute,Quaternion,SRGBColorSpace,Vector3 } from "three";
import type { Primitive } from "./primitives";
import { FadedMaterial } from "./sceneAppearance";

type Grip=Extract<Primitive,{kind:"ergon-grip"}>;
export function gripBasis(shape:Pick<Grip,"from"|"to">) {
  const axis=new Vector3(...shape.to).sub(new Vector3(...shape.from)).normalize();
  const back=new Vector3(-1,0,0).addScaledVector(axis,axis.x).normalize();
  const up=new Vector3().crossVectors(back,axis).normalize();
  if(up.y<0) up.negate();
  return {axis,back,up};
}
export function gripSurface(shape:Grip,t:number,angle:number) {
  const {back,up}=gripBasis(shape),c=Math.cos(angle),s=Math.sin(angle);
  const blend=Math.min(1,Math.max(0,(t-.10)/.65)),wing=blend*blend*(3-2*blend);
  const shoulder=1-.055*(Math.exp(-t*60)+Math.exp(-(1-t)*60));
  const rear=Math.max(0,c),reach=shape.radius+shape.wing*wing*rear*rear;
  return new Vector3(...shape.from).lerp(new Vector3(...shape.to),t)
    .addScaledVector(back,c*reach*shoulder)
    .addScaledVector(up,(s*shape.radius*.89+shape.wing*wing*.14*rear*rear)*shoulder);
}
export function ergonGripGeometry(shape:Grip):BufferGeometry {
  const positions:number[]=[],uv:number[]=[],indices:number[]=[],lengthSteps=48,sides=64;
  for(let i=0;i<=lengthSteps;i++) for(let j=0;j<=sides;j++) {
    positions.push(...gripSurface(shape,i/lengthSteps,j/sides*Math.PI*2).toArray());uv.push(i/lengthSteps,j/sides);
  }
  const reverse=gripBasis(shape).axis.z<0;
  const triangle=(a:number,b:number,c:number)=>indices.push(...(reverse?[a,c,b]:[a,b,c]));
  for(let i=0;i<lengthSteps;i++) for(let j=0;j<sides;j++) {
    const a=i*(sides+1)+j,b=a+sides+1;
    triangle(a,b,a+1);triangle(a+1,b,b+1);
  }
  for(const end of [0,lengthSteps]) {
    const center=positions.length/3;
    positions.push(...new Vector3(...shape.from).lerp(new Vector3(...shape.to),end/lengthSteps).toArray());uv.push(end/lengthSteps,.5);
    for(let j=0;j<sides;j++) {
      const a=end*(sides+1)+j;
      if(end===0) triangle(center,a,a+1);else triangle(center,a+1,a);
    }
  }
  const geometry=new BufferGeometry();
  geometry.setAttribute("position",new Float32BufferAttribute(positions,3));geometry.setAttribute("uv",new Float32BufferAttribute(uv,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();return geometry;
}
function gripTexture() {
  const canvas=document.createElement("canvas");canvas.width=1024;canvas.height=512;
  const ctx=canvas.getContext("2d")!;ctx.fillStyle="#242728";ctx.fillRect(0,0,1024,512);
  const groove=(points:number[][],width=4)=>{
    ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x!,y!):ctx.moveTo(x!,y!));
    ctx.strokeStyle="#101516";ctx.lineWidth=width;ctx.stroke();
    ctx.strokeStyle="#343839";ctx.lineWidth=.8;ctx.stroke();
  };
  // Long molded panel borders, diagonals, and denser outboard finger texture.
  for(const y of [28,91,159,228,304,382,458]) groove([[100,y],[190,y+9],[975,y+9]]);
  for(let x=180;x<1040;x+=155) groove([[x-90,18],[x+75,240],[x-80,500]],5);
  for(let x=745;x<990;x+=30) groove([[x-48,12],[x+65,245],[x-43,505]],3);
  const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.anisotropy=4;return texture;
}
function endTexture() {
  const canvas=document.createElement("canvas");canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext("2d")!;
  ctx.fillStyle="#222729";ctx.fillRect(0,0,256,256);
  ctx.strokeStyle="#e1e4de";ctx.lineWidth=24;ctx.lineCap="round";
  ctx.beginPath();ctx.arc(127,127,85,.16*Math.PI,1.9*Math.PI);ctx.stroke();
  ctx.beginPath();ctx.moveTo(206,100);ctx.bezierCurveTo(166,68,143,107,160,132);ctx.bezierCurveTo(179,153,210,137,210,109);ctx.stroke();
  const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;return texture;
}
export function ErgonGrip({shape,faded,statusColor}:{shape:Grip;faded:boolean;statusColor?:string}) {
  const geometry=useMemo(()=>ergonGripGeometry(shape),[shape]);
  const texture=useMemo(gripTexture,[]),cap=useMemo(endTexture,[]);
  const {axis}=gripBasis(shape),at=new Vector3(...shape.to).addScaledVector(axis,shape.radius*.018);
  const rotation=new Quaternion().setFromUnitVectors(new Vector3(0,0,1),axis);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useEffect(()=>()=>{texture.dispose();cap.dispose();},[texture,cap]);
  return <group>
    <mesh geometry={geometry} castShadow={!faded}>
      {faded?<FadedMaterial/>:<meshStandardMaterial map={texture} color={statusColor??"#ffffff"} roughness={.89} metalness={0}/>}
    </mesh>
    {!faded&&<mesh position={at} quaternion={rotation}>
      <circleGeometry args={[shape.radius*.89,48]}/>
      <meshStandardMaterial map={cap} roughness={.8}/>
    </mesh>}
  </group>;
}
