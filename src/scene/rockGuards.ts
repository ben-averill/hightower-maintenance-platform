import { FrontSide,Ray,Vector3 } from "three";
import { MeshBVH } from "three-mesh-bvh";
import { profileGeometry } from "./profileGeometry";
import { undersidePath } from "./undersideSurface";
import { tube,type Point,type Primitive } from "./primitives";

type Profile=Extract<Primitive,{kind:"profile"}>;
let previousKey="",previousParts:Primitive[]=[];

// Sample the actual shaped carbon surface, rather than placing a flat plate
// against an assumed plane. Both faces of each closed rubber shell curve.
export function rockGuards(body:Profile):Primitive[] {
  const key=JSON.stringify(body);
  if(key===previousKey) return previousParts;
  const geometry=profileGeometry(body),bvh=new MeshBVH(geometry);
  const upper=new Vector3(...body.contour[8]!,0),lower=new Vector3(...body.contour[9]!,0);
  const direction=upper.clone().sub(lower).normalize(),length=upper.distanceTo(lower);
  const at=(t:number)=>lower.clone().lerp(upper,t).toArray() as Point;
  const parts:Primitive[]=[];
  const project=(center:Vector3,normal:Vector3,z:number)=>{
    const origin=center.clone().addScaledVector(normal,60);origin.z=z;
    const hit=bvh.raycastFirst(new Ray(origin,normal.clone().negate()),FrontSide);
    if(!hit) throw new Error("Rock guard sample missed the frame surface");
    return {point:hit.point,normal:hit.face!.normal.clone()};
  };
  const guard=(pathPoints:Point[],widthAt:(t:number)=>number,color:string)=>{
    const path=undersidePath(pathPoints,body.round),length=path.getLength();
    const rows=Math.ceil(length/5),columns=20,vertices:Point[]=[],indices:number[]=[];
    for(const layer of [0,1]) for(let i=0;i<=rows;i++) {
      const t=i/rows,p=path.getPointAt(t),d=path.getTangentAt(t);
      const normal=new Vector3(-d.y,d.x,0),center=new Vector3(p.x,p.y,0);
      const endDistance=Math.min(t,1-t)*length;
      const cornerInset=endDistance<5?5-Math.sqrt(25-(5-endDistance)**2):0;
      const half=widthAt(t)/2-cornerInset;
      for(let j=0;j<=columns;j++) {
        const z=(j/columns*2-1)*half,sample=project(center,normal,z);
        const rim=Math.min(j,columns-j,endDistance/2);
        const offset=layer===0?.3:1.7+.9*Math.min(1,rim);
        const vertex=sample.point.addScaledVector(sample.normal,offset);
        // Around the tighter lower U, a face normal can approach a neighboring
        // carbon face. Keep the shell's actual clearance through that bend.
        for(let pass=0;pass<3;pass++) {
          const nearest=bvh.closestPointToPoint(vertex)!;
          if(nearest.distance>=offset-.02) break;
          const outward=vertex.clone().sub(nearest.point).normalize();
          vertex.addScaledVector(outward,offset-nearest.distance);
        }
        vertices.push(vertex.toArray() as Point);
      }
    }
    const count=(rows+1)*(columns+1),stride=columns+1;
    for(let i=0;i<rows;i++) for(let j=0;j<columns;j++) {
      const a=i*stride+j,b=a+1,c=a+stride,d=c+1;
      indices.push(a,c,b,b,c,d,a+count,b+count,c+count,b+count,d+count,c+count);
    }
    const perimeter=[...Array.from({length:columns+1},(_,j)=>j),
      ...Array.from({length:rows},(_,i)=>(i+1)*stride+columns),
      ...Array.from({length:columns},(_,j)=>rows*stride+columns-j-1),
      ...Array.from({length:rows-1},(_,i)=>(rows-i-1)*stride)];
    for(let i=0;i<perimeter.length;i++) {
      const a=perimeter[i]!,b=perimeter[(i+1)%perimeter.length]!;
      indices.push(a,b,a+count,b,b+count,a+count);
    }
    parts.push({kind:"surface-shell",vertices,indices,color,roughness:.86,metalness:0});
  };
  guard([at(.58+83/length),at(.58-83/length)],t=>50-6*t,"#20282a");
  for(const y of [-68,68]) {
    const center=lower.clone().lerp(upper,.58).addScaledVector(direction,y);
    const sample=project(center,new Vector3(direction.y,-direction.x,0),0);
    const p=(d:number)=>sample.point.clone().addScaledVector(sample.normal,d).toArray() as Point;
    parts.push(tube(p(2.55),p(3),2.1,"#42494a"),tube(p(3),p(3.1),1,"#111619"));
  }
  guard([at(.15),...body.contour.slice(9,14).map(([x,y]):Point=>[x,y,0])],
    t=>52+2*Math.sin(Math.PI*t),"#1a2224");
  geometry.dispose();previousKey=key;previousParts=parts;return parts;
}
