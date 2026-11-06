import { add } from "./geometry";
import { seatAxis } from "./frameCoordinates";
import { tube, type Point, type Primitive } from "./primitives";

type XY=[number,number];
const up=seatAxis,right:Point=[up[1],-up[0],0];
const polygon=(at:Point,r:number,count=48):XY[]=>Array.from({length:count},(_,i)=>[
  at[0]+r*Math.cos(i*Math.PI*2/count),at[1]+r*Math.sin(i*Math.PI*2/count)]);
const plate=(contour:XY[],holes:XY[][],depth:number,z:number,color:string,round=2,bevel=.6):Primitive=>({
  kind:"profile",contour,holes,depth,z,color,round,bevel,metalness:.65,roughness:.3,
});

export function seatClampParts(seat:Point):Primitive[] {
  // A split annulus seats over the carbon rim, with two rearward pinch ears.
  const vertices:Point[]=[],indices:number[]=[],segments=72,gap=.09;
  for(let i=0;i<=segments;i++) {
    const angle=-Math.PI+gap+(Math.PI*2-gap*2)*i/segments;
    for(const [r,h] of [[18.22,-5],[20.7,-5],[20.7,8],[18.22,8]]) {
      vertices.push([seat[0]+right[0]*Math.cos(angle)*r!+up[0]*h!,
        seat[1]+right[1]*Math.cos(angle)*r!+up[1]*h!,Math.sin(angle)*r!]);
    }
  }
  for(let i=0;i<segments;i++) for(let j=0;j<4;j++) {
    const a=i*4+j,b=i*4+(j+1)%4,c=b+4,d=a+4;
    indices.push(a,b,c,a,c,d);
  }
  indices.push(0,2,1,0,3,2);
  const end=segments*4;indices.push(end,end+1,end+2,end,end+2,end+3);
  const parts:Primitive[]=[{kind:"surface-shell",vertices,indices,color:"#121719",metalness:.82,roughness:.2}];
  const p=(radial:number,h:number):XY=>[seat[0]+right[0]*radial+up[0]*h,seat[1]+right[1]*radial+up[1]*h];
  const bolt:Point=[...p(-25.2,1.5),0];
  for(const side of [-1,1]) {
    parts.push(plate([p(-15,-5),p(-27,-5),p(-31,0),p(-28,8),p(-15,8)],
      [polygon(bolt,2.7)],5.5,side*5,"#171e21",3,.7));
    const z=side*8.5;
    parts.push(plate(polygon(bolt,4.9),[polygon(bolt,2.1,6)],1.5,z,"#343d41",0,.35));
    parts.push(tube(add(bolt,0,0,side*6.5),add(bolt,0,0,side*7.4),2.2,"#080c0e"));
  }
  return parts;
}

