import {add,geometryAnchors} from "./geometry";
import {profileTrace} from "./frameProfileReference";
import type {Point} from "./primitives";

const {bb,rear,head}=geometryAnchors("low");
// Shared photo registration keeps carbon and attached hardware independent.
// Traced from complete-bike reference a0a9fc6b at 1856 × 1342; the BB, rear
// axle and steering head register that image to the existing MY25 anchors.
// Pivot coordinates and carbon angles remain photo estimates.
export function frameTrace(x:number,y:number):Point {
  const dx=x-750,dy=y-887;
  const ax=365-750,ay=858-887,bx=1182-750,by=323-887;
  const det=ax*by-ay*bx;
  const u=(dx*by-dy*bx)/det,v=(ax*dy-ay*dx)/det;
  return add(bb,u*(rear[0]-bb[0])+v*(head[0]-bb[0]),
    u*(rear[1]-bb[1])+v*(head[1]-bb[1]));
}
// Collar and four visible suspension axes share the isolated-frame registration.
// The kinked seat tube is not a straight BB-to-collar radial measurement.
export const seatAxis:Point=[-.32,Math.sqrt(1-.32**2),0];
export const frameAnchors={
  seat:profileTrace(632,378),
  upperPivot:profileTrace(770,492),rearPivot:profileTrace(820,670),
  lowerPivot:profileTrace(746,940),lowerRearPivot:profileTrace(640,989),
  shockFront:add(bb,245,138),shockRear:add(bb,245-Math.sqrt(230**2-22**2),116),
};
const supportTop=profileTrace(750,791),supportLength=Math.hypot(supportTop[0]-bb[0],supportTop[1]-bb[1]);
// Upward direction of the stationary leg below the seat tube.
export const seatSupportAxis:Point=[(supportTop[0]-bb[0])/supportLength,(supportTop[1]-bb[1])/supportLength,0];
