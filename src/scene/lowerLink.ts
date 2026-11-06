import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { profileGeometry, refineCaps } from "./profileGeometry";
import { linkBearing } from "./rearLink";
import type { Point, Primitive } from "./primitives";

type XY=[number,number];
const circle=(p:Point,r:number):XY[]=>Array.from({length:48},(_,i)=>
  [p[0]+r*Math.cos(i*Math.PI/24),p[1]+r*Math.sin(i*Math.PI/24)]);

// Visual reconstruction of the three attachment regions. These coordinates
// share the frame's estimated pivot axes; they are not a kinematic solution.
export function lowerLinkParts(fixed:Point,rear:Point,shock:Point,side:number):Primitive[] {
  const shape:Extract<Primitive,{kind:"profile"}>={kind:"profile",color:"#142021",metalness:.65,roughness:.32,
    contour:[[rear[0]-17,rear[1]-11],[fixed[0]+15,fixed[1]-16],[fixed[0]+17,fixed[1]+10],
      [fixed[0]-24,fixed[1]+26],[shock[0]-32,shock[1]-18],
      [shock[0]+13,shock[1]+10],[shock[0]+7,shock[1]+17],[shock[0]-14,shock[1]+14],[rear[0]-19,rear[1]+18]],
    holes:[circle(fixed,8),circle(rear,8),circle(shock,4.2),
      [[rear[0]+18,rear[1]+21],[fixed[0]-19,fixed[1]-13],
        [fixed[0]-30,fixed[1]+12],[rear[0]+8,rear[1]+32]]],
    depth:8,z:0,round:9,bevel:1.2};
  const blend=(distance:number,inner:number,outer:number)=>{
    const t=Math.max(0,Math.min(1,(distance-inner)/(outer-inner)));return 1-t*t*(3-2*t);
  };
  // Subdivide before bending: a single cap triangle across the whole arm
  // otherwise cuts through the carbon even when its endpoints clear it.
  const flat=profileGeometry(shape),expanded=flat.toNonIndexed();flat.dispose();
  const refined=refineCaps(expanded,6,()=>6),geometry=mergeVertices(refined);refined.dispose();
  const positions=geometry.getAttribute("position"),vertices:Point[]=[];
  for(let i=0;i<positions.count;i++) {
    const x=positions.getX(i),y=positions.getY(i);
    const center=20.5+6.5*blend(Math.hypot(x-rear[0],y-rear[1]),16,28)
      -blend(Math.hypot(x-shock[0],y-shock[1]),18,37);
    const shockBlend=Math.max(0,1-Math.hypot(x-shock[0],y-shock[1])/45);
    vertices.push([x,y,side*center+positions.getZ(i)*(.48-.05*shockBlend)]);
  }
  const arm:Primitive={kind:"surface-shell",vertices,indices:Array.from(geometry.getIndex()!.array),
    color:shape.color,roughness:shape.roughness,metalness:shape.metalness};
  geometry.dispose();
  const cap=(at:Point,z:number):Primitive=>({kind:"profile",contour:circle(at,10),
    holes:[Array.from({length:6},(_,i):XY=>[at[0]+3.1*Math.cos(i*Math.PI/3),at[1]+3.1*Math.sin(i*Math.PI/3)])],
    depth:1.8,z:side*z,round:0,bevel:.6,color:"#20282c",metalness:.8,roughness:.24});
  // The fixed bearing and arm live inside the carbon clevis; only the bolt
  // head remains outside. Rear and shock axes keep their existing registration.
  return [arm,linkBearing(fixed,side,21,14,8),linkBearing(rear,side,27,16,8),
    linkBearing(shock,side,21,12,4.2),cap(fixed,39.5),cap(rear,64)];
}
