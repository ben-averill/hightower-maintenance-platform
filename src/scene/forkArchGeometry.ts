import { BufferGeometry, Float32BufferAttribute } from "three";
import type { Primitive } from "./primitives";
import { geometryAnchors } from "./geometry";
import type { Point } from "./primitives";

const { down } = geometryAnchors();
export const archRise = 62;
export const archForwardBow = (height: number) => 37*Math.pow(Math.max(0,Math.min(1,height/archRise)),1.3);
// Express the arch and its fittings in the fork's own up/forward axes.
export function archLocalPoint(height: number, forward: number, lateral: number): Point {
  return [12-down[0]*height-down[1]*forward,
    8-down[1]*height+down[0]*forward, lateral];
}

// A continuous bowed casting, with a recessed front face between raised lips.
// Dimensions are photo-based estimates in mm, scaled with the rest of the bike.
export function forkArchGeometry(shape: Extract<Primitive,{kind:"fork-arch"}>): BufferGeometry {
  const positions:number[]=[], indices:number[]=[];
  // [radial offset, forward depth]. Rounded edge transitions and two face ribs.
  const section=[[-14,-5],[-12,-9],[11,-9],[14,-6],[14,7],[12,10],
    [9,10],[8,7],[-8,7],[-9,10],[-12,10],[-14,7]];
  const segments=80, count=section.length;
  for(let i=0;i<=segments;i++) {
    const a=Math.PI*i/segments, s=Math.sin(a), c=Math.cos(a);
    // Upper center lies approximately midway between the two previous poses.
    // Keep the attachment centers fixed while opening the stanchion clearance.
    const rise=archRise*s, bow=archForwardBow(rise), z=72*c;
    for(const [radial,depth] of section) {
      const p=archLocalPoint(rise+radial!*s,bow+depth!,z+radial!*c);
      positions.push(shape.root[0]+p[0]*shape.scale,
        shape.root[1]+p[1]*shape.scale,
        shape.root[2]+p[2]*shape.scale);
    }
    if(i<segments) for(let j=0;j<count;j++) {
      const p=i*count+j,q=i*count+(j+1)%count,r=p+count,t=q+count;
      indices.push(p,q,r,q,t,r);
    }
  }
  // Seal both shoulders; the feet overlap the lower-leg collars and gussets.
  for(const end of [0,segments]) for(let j=1;j<count-1;j++) {
    const p=end*count;
    indices.push(...(end===0?[p,p+j+1,p+j]:[p,p+j,p+j+1]));
  }
  const geometry=new BufferGeometry();
  geometry.setAttribute("position",new Float32BufferAttribute(positions,3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}
