import { frameAccent } from "./frameColors";
import { Vector3 } from "three";
import { label,tube,type Point,type Primitive } from "./primitives";
import { rockGuards } from "./rockGuards";

type Profile=Extract<Primitive,{kind:"profile"}>;
type XY=[number,number];
const v=(p:XY)=>new Vector3(p[0],p[1],0);
const point=(p:Vector3)=>p.toArray() as Point;

export function downTubeFaces(body:Profile) {
  const innerUpper=v(body.holes[0]![3]!),innerLower=v(body.holes[0]![4]!);
  const outerUpper=v(body.contour[8]!),outerLower=v(body.contour[9]!);
  return {innerUpper,innerLower,outerUpper,outerLower};
}

export function downTubeDetails(body:Profile):Primitive[] {
  const {innerUpper,innerLower}=downTubeFaces(body);
  const parts:Primitive[]=[];
  const mount=(lower:Vector3,upper:Vector3,t:number,outside:boolean)=>{
    const up=upper.clone().sub(lower).normalize();
    const right=new Vector3(0,0,outside?-1:1),normal=right.clone().cross(up);
    const origin=lower.clone().lerp(upper,t).addScaledVector(normal,.75);
    const basis={origin:point(origin),right:point(right),up:point(up),normal:point(normal)};
    const p=(x:number,y:number,z=0)=>point(origin.clone().addScaledVector(right,x).addScaledVector(up,y).addScaledVector(normal,z));
    const plate=(width:number,length:number,depth:number,z:number,color:string,round=5):Profile=>({
      kind:"profile",contour:[[-width/2,-length/2],[width/2,-length/2],[width/2,length/2],[-width/2,length/2]],
      holes:[],depth,z,bevel:.45,round,basis,color,roughness:.76,metalness:.03,
    });
    const bolt=(x:number,y:number,z:number,r=2.8)=>{
      parts.push(tube(p(x,y,z-.25),p(x,y,z+.45),r,"#42494a"),tube(p(x,y,z+.45),p(x,y,z+.6),r*.47,"#111619"));
    };
    return {p,plate,bolt,basis};
  };
  // Closed Glovebox door: long inner-face panel, perimeter seal, bottle-cage
  // bosses, and a compact side latch. No bottle is added over the reference.
  const door=mount(innerLower,innerUpper,.49,false);
  parts.push(door.plate(48,194,1.1,0,"#0e1719",8),door.plate(43,185,1.3,.9,"#282f31",7));
  door.bolt(0,-32,2.15,3.8);door.bolt(0,32,2.15,3.8);
  const latch=door.plate(12,29,1.8,1.8,"#101719",2);
  latch.contour=latch.contour.map(([x,y])=>[x+15,y]);parts.push(latch);
  const tab=door.plate(7.5,21,.8,2.9,"#707877",1);
  tab.contour=tab.contour.map(([x,y])=>[x+15,y]);parts.push(tab);
  parts.push({...label(door.p(15,0,3.5),"SC",5.5,3.3,0,"#242c2c",false,true),basis:{right:door.basis.right,normal:door.basis.normal}});

  // Separate upper shuttle/rock pad on the underside; leave exposed paint
  // between this pad and the lower piece that wraps the bend.
  parts.push(...rockGuards(body));
  return parts;
}

export function downTubeLettering(body:Profile):Primitive[] {
  const {innerUpper,innerLower,outerUpper,outerLower}=downTubeFaces(body);
  const upper=innerUpper.clone().add(outerUpper).multiplyScalar(.5),lower=innerLower.clone().add(outerLower).multiplyScalar(.5);
  const direction=upper.clone().sub(lower),length=direction.length();
  const angle=Math.atan2(direction.y,direction.x);
  const placementWidth=length*1.16;
  // Preserve the established center, then shrink both artwork dimensions by 10%.
  const bottom=lower.clone().lerp(upper,.0394);
  const center=bottom.addScaledVector(direction,placementWidth*.47/length);
  const width=placementWidth*.9;
  return [-1,1].map(side=>({...label([center.x,center.y,side*35.8],"SANTA CRUZ",width,width/8,angle,frameAccent,side<0),artwork:"santa-cruz" as const}));
}
