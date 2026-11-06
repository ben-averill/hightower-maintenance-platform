import {add,geometryAnchors} from './geometry';
import type {Point} from './primitives';
const {bb,rear,head}=geometryAnchors('low');
// Original supplied frame photo, measured in its 1582 x 1119 reference plane.
// Axle, BB and upper steering axis fix scale and alignment independently of the outlines.
export const profilePhoto={width:1582,height:1119,bb:[713,998],rear:[54,958],head:[1450,38]} as const;
export function profileTrace(x:number,y:number):Point {
  const dx=x-profilePhoto.bb[0],dy=y-profilePhoto.bb[1];
  const ax=profilePhoto.rear[0]-profilePhoto.bb[0],ay=profilePhoto.rear[1]-profilePhoto.bb[1];
  const bx=profilePhoto.head[0]-profilePhoto.bb[0],by=profilePhoto.head[1]-profilePhoto.bb[1],det=ax*by-ay*bx;
  const u=(dx*by-dy*bx)/det,v=(ax*dy-ay*dx)/det;
  return add(bb,u*(rear[0]-bb[0])+v*(head[0]-bb[0]),u*(rear[1]-bb[1])+v*(head[1]-bb[1]));
}
export function profilePixel(point:readonly number[]):[number,number] {
  const dx=point[0]!-bb[0],dy=point[1]!-bb[1],ax=rear[0]-bb[0],ay=rear[1]-bb[1],bx=head[0]-bb[0],by=head[1]-bb[1];
  const det=ax*by-ay*bx,u=(dx*by-dy*bx)/det,v=(ax*dy-ay*dx)/det;
  return [profilePhoto.bb[0]+u*(profilePhoto.rear[0]-profilePhoto.bb[0])+v*(profilePhoto.head[0]-profilePhoto.bb[0]),
    profilePhoto.bb[1]+u*(profilePhoto.rear[1]-profilePhoto.bb[1])+v*(profilePhoto.head[1]-profilePhoto.bb[1])];
}
