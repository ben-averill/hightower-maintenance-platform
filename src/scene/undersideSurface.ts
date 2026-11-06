import { Path, Vector3 } from "three";
import type { Point } from "./primitives";

// Open version of the frame outline's rounded corners, shared by the belly
// deformation and the lower guard so their longitudinal bends coincide.
export function undersidePath(points:Point[],radius:number):Path {
  const path=new Path();path.moveTo(points[0]![0],points[0]![1]);
  for(let i=1;i<points.length-1;i++) {
    const p=new Vector3(...points[i]!),a=new Vector3(...points[i-1]!),b=new Vector3(...points[i+1]!);
    const r=Math.min(radius,p.distanceTo(a)*.4,p.distanceTo(b)*.4);
    a.sub(p).normalize().multiplyScalar(r).add(p);
    b.sub(p).normalize().multiplyScalar(r).add(p);
    path.lineTo(a.x,a.y);path.quadraticCurveTo(p.x,p.y,b.x,b.y);
  }
  const end=points.at(-1)!;path.lineTo(end[0],end[1]);return path;
}

export function undersideField(points:Point[],round:number) {
  const path=undersidePath(points,round),length=path.getLength();
  const samples=path.getSpacedPoints(96);
  const edges=samples.slice(0,-1).map((a,i)=>{
    const b=samples[i+1]!,dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy,l=Math.sqrt(l2);
    return {x:a.x,y:a.y,dx,dy,l2,nx:-dy/l,ny:dx/l,
      minX:Math.min(a.x,b.x),maxX:Math.max(a.x,b.x),minY:Math.min(a.y,b.y),maxY:Math.max(a.y,b.y)};
  });
  return (x:number,y:number)=>{
    let distance=Infinity,along=0,nx=0,ny=0,inside=0;
    for(let i=0;i<edges.length;i++) {
      const e=edges[i]!;
      if(Math.max(e.minX-x,0,x-e.maxX)**2+Math.max(e.minY-y,0,y-e.maxY)**2>=distance) continue;
      const t=Math.max(0,Math.min(1,((x-e.x)*e.dx+(y-e.y)*e.dy)/e.l2));
      const px=x-e.x-e.dx*t,py=y-e.y-e.dy*t,d=px*px+py*py;
      if(d<distance) {
        distance=d;nx=e.nx;ny=e.ny;
        inside=-(px*nx+py*ny);along=(i+t)/96*length;
      }
    }
    return {distance:Math.sqrt(distance),nx,ny,inside,along,length};
  };
}
