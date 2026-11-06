import { add } from "./geometry";
import { Vector3 } from "three";
import { loamCarbon } from "../data/bikeSetup";
import { label, sweep, tube as rawTube, type Point, type Primitive } from "./primitives";

// Photo-based sizing and clearance from the unchanged bar clamp.
const reservoirScale=.8;
export const mavenControlPoint=(origin:Point,side:number,x:number,y:number,z:number):Point=>
  add(origin,24+x*reservoirScale,y*reservoirScale,z*side*reservoirScale);

// Photo-based Maven Bronze body and lever. Positive local Z points outboard.
export function mavenControlParts(origin:Point,side:number,outlet:Point):Primitive[] {
  const p=(x:number,y:number,z:number)=>mavenControlPoint(origin,side,x,y,z);
  const clamp=(x:number,y:number,z:number)=>add(origin,x,y,z*side);
  const tube=(from:Point,to:Point,radius:number,color:string,endRadius=radius)=>
    rawTube(from,to,radius*reservoirScale,color,endRadius*reservoirScale);
  // Keep blade reach and its grip-facing curve as the pivot moves forward.
  const outward=new Vector3(-Math.tan(loamCarbon.backsweepDegrees*Math.PI/180),Math.tan(loamCarbon.upsweepDegrees*Math.PI/180),side).normalize();
  const forward=new Vector3(1,0,0).addScaledVector(outward,-outward.x).normalize();
  const blade=(x:number,z:number):Point=>new Vector3(...p(29,-16,13))
    .addScaledVector(forward,x-29).addScaledVector(outward,z-13).toArray() as Point;
  const black="#171b1d",gray="#656968",steel="#b0b7b6";
  const plate=(outline:[number,number][],height:number,depth:number,color:string,bevel=1):Primitive=>({
    kind:"profile",plane:"xz",contour:outline.map(([x,z])=>{const point=p(x,0,z);return [point[0],point[2]];}),
    holes:[],z:-p(0,height,0)[1],depth:depth*reservoirScale,bevel:bevel*reservoirScale,round:2*reservoirScale,color,roughness:.5,metalness:.5,
  });
  const parts:Primitive[]=[
    // Long cast reservoir, widened at the pivot with tapered hose-end shoulders.
    plate([[15,-49],[33,-49],[42,-38],[41,-16],[36,7],[30,19],[16,15],[9,3],[11,-15]],-9,18,gray,2),
    plate([[14,-40],[29,-44],[34,-36],[32,-13],[16,-9]],1,2.4,black,.7),
    plate([[31,-38],[39,-33],[36,-12],[29,-5],[24,-8],[25,-31]],1.8,1.4,"#777b79",.5),
    // Clamping bridge and split-clamp ears, leaving an open center.
    sweep([clamp(0,-3,0),clamp(16,-5,0),p(17,-8,1)], [7,6,6.4],4.8,black),
    ...[-5,5].map(z=>sweep([clamp(-3,11,z),clamp(9,10,z),p(16,0,z)], [2.8,2.8,2.8],2.4,black)),
    rawTube(clamp(12,0,-7),clamp(12,0,7),3.8,"#353d40"),
    // Main blade pivot, steel cap and recessed center screw.
    tube(p(29,-21,13),p(29,2,13),6.5,"#373e40"),
    tube(p(29,2,13),p(29,3.4,13),4.1,steel),
    tube(p(29,3.4,13),p(29,3.7,13),1.8,"#252d30"),
    // Sweep back toward the grip, with the tip curling forward again.
    {...sweep([blade(29,13),blade(19,27),blade(9,49),blade(9,72),blade(17,86)], [5.2,4.8,4.6,4,3.1],2.8,black),smoothFrame:true},
    // Hose boot and the shared outlet used by the actual hose route.
    tube(p(26,-9,-42),p(27,-9,-56),8,black,6),
    tube(p(27,-9,-56),outlet,5.5,black,3.4),
    // Reach adjuster underneath the blade root.
    tube(p(37,-22,13),p(40,-26,7),3.5,"#32393c"),
    tube(p(40,-26,7),p(44,-29,0),4.4,black),
  ];
  // Bleed screw, cover screw and small pivot-side hardware.
  for(const [x,z,r] of [[29,-7,3.2],[18,6,2.1],[14,0,2.7]]) {
    parts.push(tube(p(x!,2.7,z!),p(x!,4,z!),r!,steel));
    parts.push(tube(p(x!,4,z!),p(x!,4.2,z!),r!*.45,"#252c2f"));
  }
  for(let i=0;i<10;i++) {
    const a=i*Math.PI/5;
    parts.push(tube(p(40+3.7*Math.cos(a),-26+3.7*Math.sin(a),6),
      p(43+3.7*Math.cos(a),-28+3.7*Math.sin(a),1),.65,"#465052"));
  }
  // Top-facing markings, kept on the cast badge rather than floating beside it.
  const badge=(text:string,x:number,z:number,w:number,h:number)=>({
    ...label(p(x,3.15,z),text,w*reservoirScale,h*reservoirScale,0,"#b7bbb7",false,true),
    basis:{right:[0,0,-side] as Point,normal:[0,1,0] as Point},
  });
  parts.push(badge("MAVEN",33,-24,26,5),badge("BRZ",29,-24,7,2),badge("SRAM",23,6,10,2.6));
  return parts;
}
