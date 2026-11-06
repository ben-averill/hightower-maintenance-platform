import { profileGeometry } from "./profileGeometry";
import { tube, type Point, type Primitive } from "./primitives";

type XY=[number,number];
type Profile=Extract<Primitive,{kind:"profile"}>;
const smooth=(t:number)=>{const u=Math.max(0,Math.min(1,t));return u*u*(3-2*u);};
export const linkTopHalfSpan=35.5,linkBottomHalfSpan=25.5;
export const linkHalfSpan=(fraction:number)=>linkTopHalfSpan+(linkBottomHalfSpan-linkTopHalfSpan)*smooth(fraction);
function linkSpace(a:Point,b:Point) {
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  const dx=(b[0]-a[0])/length,dy=(b[1]-a[1])/length;
  return {length,dx,dy,p:(t:number,n:number,z=0):Point=>[a[0]+dx*t-dy*n,a[1]+dy*t+dx*n,z]};
}
const section=(contour:XY[],holes:XY[][],depth:number,z:number,round=3,bevel=.8):Profile=>({
  kind:"profile",contour,holes,depth,z,round,bevel,color:"#141a1d",metalness:.65,roughness:.32,
});
const circle=(t:number,r:number):XY[]=>Array.from({length:64},(_,i)=>[t+r*Math.cos(i*Math.PI/32),r*Math.sin(i*Math.PI/32)]);

// Section traced around the longitudinal pivot axis: bevelled barrel and bore.
export function linkBearing(at:Point,side:number,center:number,radius:number,bore:number):Primitive {
  const rings=[[radius-1,-5.5],[radius,-4],[radius,4.5],[radius-1.2,6],
    [bore+.7,6],[bore,5.3],[bore,-5.5]];
  const vertices:Point[]=[],indices:number[]=[],segments=64;
  for(const [r,z] of rings) for(let i=0;i<segments;i++) {
    const angle=i*Math.PI*2/segments;
    vertices.push([at[0]+r!*Math.cos(angle),at[1]+r!*Math.sin(angle),side*(center+z!)]);
  }
  for(let row=0;row<rings.length;row++) for(let i=0;i<segments;i++) {
    const a=row*segments+i,b=row*segments+(i+1)%segments;
    const c=((row+1)%rings.length)*segments+(i+1)%segments,d=((row+1)%rings.length)*segments+i;
    if(side>0) indices.push(a,b,c,a,c,d);else indices.push(a,c,b,a,d,c);
  }
  return {kind:"surface-shell",vertices,indices,color:"#14191c",metalness:.75,roughness:.27};
}

export function upperLinkParts(a:Point,b:Point,side:number):Primitive[] {
  const {length,p}=linkSpace(a,b);
  const center=(t:number)=>linkHalfSpan(t/length);
  // Long recessed channel, slender mid-span rails and flared bearing ends.
  const shell=section([[-15,9],[-17,0],[-15,-9],[-8,-16],[9,-16],[40,-14],
    [length-28,-14],[length-10,-18],[length+10,-16],[length+17,0],
    [length+10,16],[length-10,18],[length-28,14],[40,14],[9,16],[-8,16]],
    [[[23,8],[23,-8],[length-24,-9],[length-20,0],[length-24,9]],circle(0,9),circle(length,11)],7.5,0,4,1);
  const geometry=profileGeometry(shell),positions=geometry.getAttribute("position");
  const vertices:Point[]=[];
  for(let i=0;i<positions.count;i++) {
    const t=positions.getX(i),n=positions.getY(i);
    const thickness=1-.18*Math.sin(Math.PI*Math.max(0,Math.min(1,t/length)));
    vertices.push(p(t,n,side*center(t)+positions.getZ(i)*thickness));
  }
  const indices=Array.from(geometry.getIndex()!.array);geometry.dispose();
  const parts:Primitive[]=[{kind:"surface-shell",vertices,indices,color:"#171d20",metalness:.65,roughness:.34}];
  // The upper part of the channel has a recessed ribbed floor. The lower
  // portion stays open, revealing the opposite arm and the connecting web.
  const floor=section([[23,8],[23,-8],[46,-8.6],[52,8.6]],[],1.2,0,3,.35);
  const floorGeometry=profileGeometry(floor),floorPositions=floorGeometry.getAttribute("position");
  const floorVertices:Point[]=[];
  for(let i=0;i<floorPositions.count;i++) {
    const t=floorPositions.getX(i);
    floorVertices.push(p(t,floorPositions.getY(i),side*(center(t)+1.3)+floorPositions.getZ(i)));
  }
  parts.push({kind:"surface-shell",vertices:floorVertices,indices:Array.from(floorGeometry.getIndex()!.array),
    color:"#0b1012",roughness:.8,metalness:.1});
  floorGeometry.dispose();
  for(let i=0;i<22;i++) {
    const t=25+i;
    parts.push({...tube(p(t,-6.5,side*(center(t)+2.25)),p(t+3.5,6.5,side*(center(t+3.5)+2.25)),.18,"#222a2d"),roughness:.85,metalness:.05});
  }
  parts.push(linkBearing(a,side,linkTopHalfSpan,17,9),linkBearing(b,side,linkBottomHalfSpan,18,11));
  const cap=(at:Point,z:number,r:number):Primitive=>{
    const outer=Array.from({length:64},(_,i):XY=>[at[0]+r*Math.cos(i*Math.PI/32),at[1]+r*Math.sin(i*Math.PI/32)]);
    const socket=Array.from({length:6},(_,i):XY=>[at[0]+3.3*Math.cos(i*Math.PI/3),at[1]+3.3*Math.sin(i*Math.PI/3)]);
    return {...section(outer,[socket],1.7,side*z,0,.65),color:"#20282c",metalness:.8,roughness:.24};
  };
  parts.push(cap(a,linkTopHalfSpan+6.8,11.8),tube(p(0,0,side*(linkTopHalfSpan+4)),p(0,0,side*(linkTopHalfSpan+5)),3.6,"#080c0e"));
  // Lower cap sits outside the carbon stay's bearing boss.
  parts.push(cap(b,57.5,10.5),tube(p(length,0,side*55),p(length,0,side*56),3.6,"#080c0e"));
  return parts;
}

export function upperLinkBridgeParts(a:Point,b:Point):Primitive[] {
  const {length,dx,dy,p}=linkSpace(a,b);
  // The owner's straight-on photo shows a broad front web, with a deeply
  // bevelled rectangular window, and an open fork above the seat-tube pivot.
  const upperSpan=linkHalfSpan(45/length),lowerSpan=linkHalfSpan((length-12)/length);
  const pocketCenter=(59+length-24)/2,outerHalfHeight=(length-24-59)/2+6;
  const web=section([[-upperSpan,45],[upperSpan,45],[lowerSpan,length-12],[-lowerSpan,length-12]],
    [[[-17.5,pocketCenter-outerHalfHeight],[17.5,pocketCenter-outerHalfHeight],
      [17.5,pocketCenter+outerHalfHeight],[-17.5,pocketCenter+outerHalfHeight]]],6,0,6,.8);
  web.basis={origin:p(0,8),right:[0,0,1],up:[dx,dy,0],normal:[-dy,dx,0]};
  const barrel:Primitive={kind:"sleeve",from:p(length,0,-linkBottomHalfSpan-1),to:p(length,0,linkBottomHalfSpan+1),innerRadius:8,outerRadius:16,
    color:"#14191c",metalness:.7,roughness:.3};
  // Closed, sloped pocket wall: a broad mouth rolls inward to the smaller
  // through-opening, rather than leaving a flat plate with a sharp cutout.
  const vertices:Point[]=[],indices:number[]=[],count=64,rows=6;
  for(let back=0;back<2;back++) for(let row=0;row<rows;row++) {
    const u=row/(rows-1),w=17.5-6*u,h=outerHalfHeight-6*u,r=3.9;
    const n=11.8-8*smooth(u)-back*1.2;
    for(let corner=0;corner<4;corner++) for(let i=0;i<16;i++) {
      const angle=(corner+i/16)*Math.PI/2;
      const sx=corner===0||corner===3?1:-1,sy=corner<2?1:-1;
      const z=sx*(w-r)+r*Math.cos(angle),t=pocketCenter+sy*(h-r)+r*Math.sin(angle);
      vertices.push(p(t,n,z));
    }
  }
  for(let back=0;back<2;back++) for(let row=0;row<rows-1;row++) for(let i=0;i<count;i++) {
    const a=back*rows*count+row*count+i,b=back*rows*count+row*count+(i+1)%count,c=b+count,d=a+count;
    if(back===0) indices.push(a,b,c,a,c,d);else indices.push(a,c,b,a,d,c);
  }
  for(const row of [0,rows-1]) for(let i=0;i<count;i++) {
    const a=row*count+i,b=row*count+(i+1)%count,c=b+rows*count,d=a+rows*count;
    if(row===0) indices.push(a,c,b,a,d,c);else indices.push(a,b,c,a,c,d);
  }
  const pocket:Primitive={kind:"surface-shell",vertices,indices,color:"#171e21",metalness:.65,roughness:.3};
  return [web,barrel,pocket];
}
