import { frameAnchors } from "./frameGeometry";
import { frameDimensions } from "./geometry";
import { label, sweep, tube, type Point, type Primitive } from "./primitives";

const { shockRear, shockFront }=frameAnchors;
const length=Math.hypot(...shockFront.map((v,i)=>v-shockRear[i]!));
const axis=shockFront.map((v,i)=>(v-shockRear[i]!)/length) as Point;
const up:Point=[-axis[1],axis[0],0];
// Distance along the eye-to-eye axis, height toward the reservoir, lateral side.
export const shockPoint=(distance:number,height=0,side=0):Point => [
  shockRear[0]+axis[0]*distance+up[0]*height,
  shockRear[1]+axis[1]*distance+up[1]*height,shockRear[2]+side];
const black="#191d20", blue="#208abb", silver="#b6bdbe";
const sleeve=(from:Point,to:Point,innerRadius:number,outerRadius:number,color:string):Primitive =>
  ({kind:"sleeve",from,to,innerRadius,outerRadius,color});
export const shockBodyScale=.85;
const center=shockPoint(length/2);
const scalePoint=(p:Point):Point=>p.map((value,i)=>center[i]!+(value-center[i]!)*shockBodyScale) as Point;
export const shockVisualPoint=(distance:number,height=0,side=0):Point=>scalePoint(shockPoint(distance,height,side));
function scaleBody(part:Primitive):Primitive {
  const s=shockBodyScale;
  switch(part.kind) {
    case "tube":return {...part,from:scalePoint(part.from),to:scalePoint(part.to),radius:part.radius*s,endRadius:(part.endRadius??part.radius)*s};
    case "sweep":return {...part,points:part.points.map(scalePoint),radii:part.radii.map(r=>r*s),depth:part.depth*s};
    case "shock-decal":return {...part,from:scalePoint(part.from),to:scalePoint(part.to),radius:part.radius*s};
    case "label":return {...part,at:scalePoint(part.at),width:part.width*s,height:part.height*s};
    default:throw new Error(`Unsupported shock-body primitive: ${part.kind}`);
  }
}

export function rearShockParts():Primitive[] {
  const axial=(a:number,b:number,r:number,end=r,height=0,color=black):Primitive =>
    ({...tube(shockPoint(a,height),shockPoint(b,height),r,color,end),roughness:.26,metalness:.65});
  const parts:Primitive[]=[
    // Glossy black shaft, travel O-ring and the stepped EVOL collar.
    axial(12,77,11.5), axial(39,41,12.4,12.4,0,"#101314"),
    axial(64,69,18,25), axial(69,74,27), axial(74,83,28),
    axial(83,90,28,25), axial(90,182,25),
    axial(182,185,25.8,25.8,0,"#111416"),
    // Sculpted front head and eyelet transition.
    axial(185,196,26.5),axial(196,208,26.5,22),axial(208,219,22,13),
    // Reservoir is parallel to the air can, connected at the front head.
    axial(98,102,18,18,45), axial(102,178,17,17,45),
    axial(178,181,18,18,45),axial(181,193,19,19,45),
    axial(193,204,19,11,45),axial(204,215,10,10,45),
    {...sweep([shockPoint(196,12),shockPoint(197,29),shockPoint(194,45)], [13,11,13],13,black),roughness:.5},
    axial(215,221,12,12,45,blue),axial(221,222,10,10,45,"#183441"),
    // Recessed reservoir end plug.
    axial(96.5,98,9,9,45,"#101416"),axial(96,97,3,3,45,"#746f59"),
  ];
  const mounts:Primitive[]=[];
  for(const [distance,width,bolt] of [[0,frameDimensions.rearShockWidth,frameDimensions.rearShockBolt],
    [frameDimensions.shockLength,frameDimensions.frontShockWidth,frameDimensions.frontShockBolt]]) {
    const start=mounts.length;
    mounts.push(sleeve(shockPoint(distance!,0,-10),shockPoint(distance!,0,10),7.5,15,black));
    mounts.push(sleeve(shockPoint(distance!,0,-11),shockPoint(distance!,0,11),bolt!/2,8,"#bcb389"));
    mounts.push(tube(shockPoint(distance!,0,-width!/2),shockPoint(distance!,0,width!/2),bolt!/2,"#5d6468"));
    for(const side of [-1,1]) mounts.push(sleeve(shockPoint(distance!,0,side*11),shockPoint(distance!,0,side*width!/2),bolt!/2+.1,6.8,"#8d9496"));
    for(let i=start;i<mounts.length;i++) mounts[i]={...mounts[i]!,motion:distance===0?"shock-shaft":"shock-body"};
  }
  // Compression dial's machined grip teeth around the shock axis.
  for(let i=0;i<18;i++) {
    const a=i*Math.PI/9;
    parts.push(tube(shockPoint(215.7,45+11.8*Math.cos(a),11.8*Math.sin(a)),
      shockPoint(220.3,45+11.8*Math.cos(a),11.8*Math.sin(a)),.9,"#66b6da"));
  }
  // One blue two-position lever on the right/drive side (positive Z).
  parts.push(tube(shockPoint(205,44,9),shockPoint(205,44,15),5.5,"#3c454b"));
  parts.push(sweep([shockPoint(205,44,16),shockPoint(196,32,18),shockPoint(184,25,18)], [5,3.8,2.3],2.6,blue));
  parts.push(tube(shockPoint(205,44,16),shockPoint(205,44,18),2.4,silver));
  // Red rebound control on the head, and a separate black air-valve cap.
  parts.push(tube(shockPoint(210,14,-20),shockPoint(210,14,-27),7,"#a63142"));
  for(let i=0;i<12;i++) {
    const a=i*Math.PI/6;
    parts.push(tube(shockPoint(210+6.6*Math.cos(a),14+6.6*Math.sin(a),-22),
      shockPoint(210+6.6*Math.cos(a),14+6.6*Math.sin(a),-27),.7,"#d36a78"));
  }
  parts.push(tube(shockPoint(196,-5,23),shockPoint(196,-5,30),5.5,"#101416"));
  for(const side of [-1,1]) {
    for(const [a,b,r,h,style] of [[96,179,25.16,0,"air-can"],[107,174,17.16,45,"reservoir"],[75,82,28.16,0,"volume"]] as const)
      parts.push({kind:"shock-decal",from:shockPoint(a,h),to:shockPoint(b,h),radius:r,side,style,color:silver});
    const mark=label(shockPoint(217,45,side*12.4),"10",4,3,Math.atan2(axis[1],axis[0]),"#dae6eb",side<0,true);
    parts.push(mark);
  }
  // Scale the visible shock uniformly, with short necks retaining the frame's
  // existing eyelet centers instead of leaving disconnected mounting hardware.
  return [...parts.map((part,i)=>({...scaleBody(part),motion:i<2?"shock-shaft" as const:"shock-body" as const})),...mounts,
    {...tube(shockPoint(10),shockVisualPoint(13),11.5*shockBodyScale,black),roughness:.26,metalness:.65,motion:"shock-shaft"},
    {...tube(shockVisualPoint(218),shockPoint(222),13*shockBodyScale,black,10),roughness:.26,metalness:.65,motion:"shock-body"},
  ];
}
