import { useEffect,useMemo } from "react";
import { CanvasTexture,ExtrudeGeometry,Float32BufferAttribute,Path,Shape,SRGBColorSpace } from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { add } from "./geometry";
import { refineCaps } from "./profileGeometry";
import { FadedMaterial } from "./sceneAppearance";
import { sweep,tube,type Point,type Primitive } from "./primitives";

type XY=[number,number];
type Saddle=Extract<Primitive,{kind:"ergon-saddle"}>;
const upper:XY[]=[[-125,0],[-123,40],[-116,59],[-101,69],[-85,70],[-68,65],[-47,51],[-24,36],[0,27],[45,24],[103,22],[121,19],[128,8],[129,0]];
export const saddleOutline:XY[]=[...upper,...upper.slice(1,-1).reverse().map(([x,z]):XY=>[x,-z])];
export const saddleOpening:XY[]=[[-60,-16.5],[-60,16.5],[-24,16.5],[-24,-16.5]];
function rounded<T extends Path>(path:T,points:XY[],radius:number):T {
  const corners=points.map((point,i)=>{
    const a=points[(i+points.length-1)%points.length]!,b=points[(i+1)%points.length]!;
    const before=Math.hypot(a[0]-point[0],a[1]-point[1]),after=Math.hypot(b[0]-point[0],b[1]-point[1]);
    const r=Math.min(radius,before*.45,after*.45);
    return {point,start:[point[0]+(a[0]-point[0])*r/before,point[1]+(a[1]-point[1])*r/before] as XY,
      end:[point[0]+(b[0]-point[0])*r/after,point[1]+(b[1]-point[1])*r/after] as XY};
  });
  path.moveTo(...corners[0]!.start);
  for(const c of corners) {path.lineTo(...c.start);path.quadraticCurveTo(...c.point,...c.end);}
  path.closePath();return path;
}
function saddleWidth(x:number) {
  const widths:XY[]=[[-126,38],[-116,59],[-85,70],[-47,51],[-24,36],[0,27],[103,22],[130,16]];
  const bounded=Math.max(widths[0]![0],Math.min(widths.at(-1)![0],x));
  const i=Math.max(0,widths.findIndex(p=>p[0]>=bounded)-1),a=widths[i]!,b=widths[i+1]!;
  return a[1]+(b[1]-a[1])*Math.max(0,Math.min(1,(x-a[0])/(b[0]-a[0])));
}
export function saddleHeight(x:number,z:number) {
  const across=Math.min(1,Math.abs(z)/saddleWidth(x));
  const kick=8*Math.exp(-(((x+111)/31)**2));
  const support=6.3*Math.exp(-(((x+73)/48)**2))*(1-.32*across*across);
  const nose=3.2*Math.exp(-(((x-91)/67)**2));
  // Raised rear shoulders fall into a lower waist; the narrower channel fades
  // gradually into the domed nose rather than ending in a flat front platform.
  const channel=10.5*Math.exp(-((z/11.5)**2))*Math.exp(-(((x+8)/77)**4));
  const noseTip=3*Math.exp(-(((x-132)/12)**2));
  const padding=2*Math.exp(-(((x+75)/68)**2))+1.2*Math.exp(-(((x-85)/55)**2));
  return 23+kick+support+nose+padding-channel-5.5*across**4-noseTip;
}
export function saddleUnderside(x:number,z:number) {
  const across=Math.min(1,Math.abs(z)/saddleWidth(x));
  // A separate shell contour allows substantial foam above the rear wings.
  return 11.5+7*Math.exp(-(((x+116)/32)**2))-1.5*Math.exp(-(((x+45)/48)**2))
    +2*Math.exp(-(((x-97)/48)**2))-1.6*across*across;
}
export function ergonSaddleGeometry(saddle:Saddle) {
  const shape=rounded(new Shape(),saddleOutline,10);
  shape.holes=[rounded(new Path(),saddleOpening,8)];
  // Large, nearly semicircular edge rolls replace the upright extrusion wall.
  // The thin straight section is only 17% of the physical padding thickness.
  const geometry=refineCaps(new ExtrudeGeometry(shape,{depth:.25,steps:1,curveSegments:12,bevelEnabled:true,
    bevelSize:saddle.layer==="cover"?3.8:2.5,bevelThickness:.6,bevelSegments:8}),3);
  const positions=geometry.getAttribute("position"),uv:number[]=[];
  for(let i=0;i<positions.count;i++) {
    const x=positions.getX(i),z=positions.getY(i),t=(positions.getZ(i)+.6)/1.45;
    const bottom=saddleUnderside(x,z),top=Math.max(bottom+4,saddleHeight(x,z));
    const y=saddle.layer==="cover"?bottom+(top-bottom)*t:bottom-.15-1.65*(1-t);
    uv.push((x+130)/260,(z+74)/148);
    positions.setXYZ(i,saddle.at[0]+x*saddle.scale,saddle.at[1]+y*saddle.scale,saddle.at[2]-z*saddle.scale);
  }
  geometry.setAttribute("uv",new Float32BufferAttribute(uv,2));geometry.deleteAttribute("normal");
  const smooth=mergeVertices(geometry,1e-6);geometry.dispose();smooth.computeVertexNormals();smooth.computeBoundingBox();smooth.computeBoundingSphere();return smooth;
}
function saddleTexture() {
  const canvas=document.createElement("canvas");canvas.width=1536;canvas.height=1024;
  const ctx=canvas.getContext("2d")!;
  ctx.fillStyle="#202425";ctx.fillRect(0,0,1536,1024);
  const p=(x:number,z:number)=>[(x+130)/260*1536,(z+74)/148*1024];
  // Shallow diagonal traction grooves on the two support lobes.
  ctx.lineCap="round";
  for(const side of [-1,1]) for(let x=-112;x<24;x+=5.5) {
    const width=x<-85?57:x<-24?65-(x+85)*.45:37-(x+24)*.32;
    const a=p(x,side*Math.max(20,width-20)),b=p(x+11,side*width);
    ctx.beginPath();ctx.moveTo(a[0]!,a[1]!);ctx.lineTo(b[0]!,b[1]!);
    ctx.strokeStyle="#121819";ctx.lineWidth=2.8;ctx.stroke();
  }
  for(let z=-52;z<=52;z+=3) {
    const a=p(-123,z),b=p(-114,z+2);
    ctx.beginPath();ctx.moveTo(a[0]!,a[1]!);ctx.lineTo(b[0]!,b[1]!);ctx.stroke();
  }
  ctx.save();const rear=p(-115,0);ctx.translate(rear[0]!,rear[1]!);ctx.rotate(-Math.PI/2);
  ctx.fillStyle="#41494a";ctx.font="600 19px Arial";ctx.textAlign="center";ctx.fillText("ERGON",0,0);ctx.restore();
  const model=p(2,0);ctx.fillStyle="#454d4e";ctx.font="15px Arial";ctx.textAlign="center";ctx.fillText("SMS Comp Men",model[0]!,model[1]!);
  const nose=p(108,0);ctx.strokeStyle="#121819";ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(nose[0]!,nose[1]!,31,.2,Math.PI*1.94);ctx.stroke();
  ctx.beginPath();ctx.arc(nose[0]!+13,nose[1]!-6,11,0,Math.PI*1.65);ctx.stroke();
  const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.anisotropy=4;return texture;
}
export function ErgonSaddle({shape,faded,statusColor}:{shape:Saddle;faded:boolean;statusColor?:string}) {
  const geometry=useMemo(()=>ergonSaddleGeometry(shape),[shape]);
  const texture=useMemo(()=>shape.layer==="cover"?saddleTexture():null,[shape.layer]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);useEffect(()=>()=>texture?.dispose(),[texture]);
  return <mesh geometry={geometry} castShadow={!faded}>
    {faded?<FadedMaterial/>:<meshPhysicalMaterial map={texture} bumpMap={texture} bumpScale={shape.scale*.25} color={statusColor??(texture?"#ffffff":shape.color)}
      roughness={shape.layer==="cover"?.64:.54} clearcoat={shape.layer==="cover"?.12:0} clearcoatRoughness={.55}
      metalness={0}/>}
  </mesh>;
}
export function saddleParts(at:Point):Primitive[] {
  const parts:Primitive[]=[{kind:"ergon-saddle",at,scale:1,layer:"cover",color:"#202425"},
    {kind:"ergon-saddle",at,scale:1,layer:"shell",color:"#171e20"}];
  for(const side of [-1,1]) {
    const path=[add(at,-94,16,side*43),add(at,-70,4,side*29),add(at,-42,-6,side*18),add(at,28,-6,side*18),add(at,73,5,side*12),add(at,103,17,side*9)];
    parts.push({...sweep(path,path.map(()=>3.5),3.5,"#7c807b"),circular:true,metalness:.83,roughness:.36});
    parts.push(tube(add(at,-94,15,side*43),add(at,-94,22,side*43),6.5,"#222a2d"),
      tube(add(at,103,16,side*9),add(at,103,22,side*9),5.3,"#222a2d"));
  }
  // Rail marks and a recessed nose fastener remain visible from underneath.
  for(const side of [-1,1]) for(const x of [-30,-23,-16,-9,5,12,19])
    parts.push(tube(add(at,x,-8.7,side*16.5),add(at,x,-8.7,side*19.5),.22,"#bdc1b7"));
  parts.push(tube(add(at,105,14,0),add(at,105,18,0),4.2,"#161e20"),
    {kind:"sleeve",from:add(at,105,13.8,0),to:add(at,105,14.4,0),innerRadius:1.1,outerRadius:2.5,color:"#414b4d"});
  return parts;
}
