import {frameAnchors} from "./frameCoordinates";
import {geometryAnchors} from "./geometry";
import {crankPoint} from "./crankPedals";
import {chainWheels,derailleurCagePivot,pitchRadius,type ChainWheel} from "./drivetrainGeometry";
import type {Point} from "./primitives";

export const suspensionTravel={rear:150,front:160} as const;
export type RigidPose={angle:number;offset:Point};
export type SuspensionPose={fraction:number;rearMm:number;frontMm:number;rear:RigidPose;rearWheel:RigidPose;
  derailleurCage:RigidPose;cassette:RigidPose;
  frontWheel:RigidPose;crank:RigidPose;pedalLeft:RigidPose;pedalRight:RigidPose;chainGrowth:number;
  upperLink:RigidPose;lowerLink:RigidPose;fork:RigidPose;shockBody:RigidPose;shockShaft:RigidPose;ground:RigidPose;shockLength:number};
export const restingPose:RigidPose={angle:0,offset:[0,0,0]};
const {rear:axle,front,down,wheelRadius,bb}=geometryAnchors();
const {upperPivot:a,rearPivot:b,lowerPivot:c,lowerRearPivot:d,shockRear,shockFront}=frameAnchors;
const distance=(p:Point,q:Point)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
const upperLength=distance(a,b),rearLength=distance(b,d);
const branch=Math.sign((d[0]-a[0])*(b[1]-a[1])-(d[1]-a[1])*(b[0]-a[0]));
const heading=(from:Point,to:Point)=>Math.atan2(to[1]-from[1],to[0]-from[0]);
export function movePoint(p:Point,pose:RigidPose):Point {
  const cos=Math.cos(pose.angle),sin=Math.sin(pose.angle);
  return [p[0]*cos-p[1]*sin+pose.offset[0],p[0]*sin+p[1]*cos+pose.offset[1],p[2]+pose.offset[2]];
}
export function anchoredPose(from:Point,to:Point,angle:number):RigidPose {
  const rotated=movePoint(from,{angle,offset:[0,0,0]});
  return {angle,offset:[to[0]-rotated[0],to[1]-rotated[1],to[2]-rotated[2]]};
}
// Four-bar closure uses the reconstructed pivot axes and the resting assembly
// branch. It is a visual reconstruction, not a manufacturer leverage curve.
function linkage(angle:number) {
  const lowerLink=anchoredPose(c,c,angle),lower=movePoint(d,lowerLink);
  const dx=lower[0]-a[0],dy=lower[1]-a[1],separation=Math.hypot(dx,dy);
  const along=(upperLength**2-rearLength**2+separation**2)/(2*separation);
  const square=upperLength**2-along**2;
  if(square<0) throw new Error("Suspension pivots cannot close at this angle");
  const perpendicular=Math.sqrt(square)*branch;
  const upper:Point=[a[0]+(dx*along-dy*perpendicular)/separation,a[1]+(dy*along+dx*perpendicular)/separation,0];
  const rear=anchoredPose(d,lower,heading(lower,upper)-heading(d,b));
  return {rear,lowerLink,upperLink:anchoredPose(a,a,heading(a,upper)-heading(a,b)),axle:movePoint(axle,rear)};
}
function rise(angle:number) {return linkage(angle).axle[1]-axle[1];}
let endAngle=-.02;
while(rise(endAngle)<suspensionTravel.rear && endAngle> -1.3) endAngle-=.02;
if(rise(endAngle)<suspensionTravel.rear) throw new Error("Rear linkage cannot reach the requested travel");
function travelAngle(mm:number) {
  let low=endAngle,high=0;
  for(let i=0;i<36;i++){const mid=(low+high)/2;if(rise(mid)>mm)low=mid;else high=mid;}
  return (low+high)/2;
}
export function suspensionChainWheels(pose:Pick<SuspensionPose,"rearWheel"|"derailleurCage">):ChainWheel[] {
  return chainWheels.map((wheel,i)=>({...wheel,center:i===1?wheel.center:movePoint(wheel.center,i===0?pose.rearWheel:pose.derailleurCage)}));
}
function extendedCage(body:RigidPose,chainGrowth:number):RigidPose {
  const pivot=movePoint(derailleurCagePivot,body);
  // Estimated spring-cage response to the reconstructed chain growth. About
  // 34° of opening at full travel leaves a visible forward swing after the
  // rear triangle's rotation; both pulley centers retain their rigid spacing.
  const opening=chainGrowth/pitchRadius(32)*1.8;
  return anchoredPose(derailleurCagePivot,pivot,body.angle+opening);
}
export function suspensionPose(percent:number,cassetteAngle=0):SuspensionPose {
  const fraction=Number.isFinite(percent)?Math.max(0,Math.min(100,percent))/100:0;
  if(fraction===0)return {fraction,rearMm:0,frontMm:0,rear:restingPose,rearWheel:restingPose,
    derailleurCage:restingPose,cassette:cassetteAngle===0?restingPose:anchoredPose(axle,axle,cassetteAngle),frontWheel:restingPose,crank:restingPose,pedalLeft:restingPose,pedalRight:restingPose,chainGrowth:0,
    upperLink:restingPose,lowerLink:restingPose,fork:restingPose,shockBody:restingPose,shockShaft:restingPose,
    ground:restingPose,shockLength:distance(shockRear,shockFront)};
  const rearMm=fraction*suspensionTravel.rear,frontMm=fraction*suspensionTravel.front;
  const rig=linkage(travelAngle(rearMm)),rearEyelet=movePoint(shockRear,rig.lowerLink);
  const shockAngle=heading(rearEyelet,shockFront)-heading(shockRear,shockFront);
  const fork:RigidPose={angle:0,offset:[-down[0]*frontMm,-down[1]*frontMm,0]};
  const frontAxle=movePoint(front,fork),groundAngle=-heading(rig.axle,frontAxle);
  const ground=anchoredPose(rig.axle,[axle[0],wheelRadius,0],groundAngle);
  // No-slip rolling uses the axle's floor displacement, including frame pitch.
  // Cancel the parent frame rotation so a stationary rear wheel does not spin.
  const frontDisplacement=movePoint(frontAxle,ground)[0]-front[0];
  const frontWheel=anchoredPose(front,frontAxle,-frontDisplacement/wheelRadius-groundAngle);
  const chainGrowth=Math.max(0,distance(bb,rig.axle)-distance(bb,axle));
  // Deliberately subtle visual kickback, driven by chain growth rather than a
  // linear slider angle. The 28% transfer is an artistic estimate, not a measured
  // freehub/chain compliance model or manufacturer pedal-kickback curve.
  const crank=anchoredPose(bb,bb,chainGrowth/pitchRadius(32)*.28);
  const pedal=(side:number)=>{
    const axle=crankPoint(side,170);
    // Pedal platforms pivot freely about their spindles and remain level.
    return anchoredPose(axle,movePoint(axle,crank),-groundAngle);
  };
  const rearWheel=anchoredPose(axle,rig.axle,-groundAngle);
  return {fraction,rearMm,frontMm,rear:rig.rear,rearWheel,cassette:anchoredPose(axle,rig.axle,-groundAngle+cassetteAngle),
    derailleurCage:extendedCage(rig.rear,chainGrowth),
    frontWheel,crank,pedalLeft:pedal(-1),pedalRight:pedal(1),chainGrowth,
    upperLink:rig.upperLink,lowerLink:rig.lowerLink,fork,
    shockBody:anchoredPose(shockFront,shockFront,shockAngle),shockShaft:anchoredPose(shockRear,rearEyelet,shockAngle),
    ground,shockLength:distance(rearEyelet,shockFront)};
}
