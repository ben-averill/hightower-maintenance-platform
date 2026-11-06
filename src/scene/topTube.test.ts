import { describe,it,expect } from "vitest";
import { FrontSide,Ray,Vector3 } from "three";
import { MeshBVH } from "three-mesh-bvh";
import { sculptedFrame } from "./frameGeometry";
import { profileGeometry } from "./profileGeometry";

describe("moulded top tube and round seat neck",()=>{
  it("keeps continuous broad faces along the tapered top tube",()=>{
    const body=sculptedFrame()[0]!;if(body.kind!=="profile") throw new Error("Expected frame");
    const section=body.topSection!,geometry=profileGeometry(body),bvh=new MeshBVH(geometry);
    const rear=new Vector3(...section.rear),front=new Vector3(...section.front),axis=front.clone().sub(rear).normalize();
    const normal=new Vector3(-axis.y,axis.x,0),inner=new Vector3(...section.innerRear);
    const innerDelta=new Vector3(...section.innerFront).sub(inner);
    const heights:number[]=[];
    for(let i=0;i<=20;i++) {
      const t=.2+i*.03,crown=rear.clone().lerp(front,t);
      const innerT=crown.clone().sub(inner).dot(axis)/innerDelta.dot(axis);
      const depth=crown.clone().sub(inner.clone().addScaledVector(innerDelta,innerT)).dot(normal);
      const center=crown.addScaledVector(normal,-depth*.5);
      for(const side of [-1,1]) {
        const origin=center.clone();origin.z=side*80;
        const hit=bvh.raycastFirst(new Ray(origin,new Vector3(0,0,-side)),FrontSide);
        expect(hit).toBeTruthy();
        const expected=section.rearWidth+(section.frontWidth-section.rearWidth)*t*t*(3-2*t);
        expect(Math.abs(Math.abs(hit.point.z)-expected)).toBeLessThan(.4);
        for(const offset of [-.15,.15]) {
          const probe=center.clone().addScaledVector(normal,depth*offset);probe.z=side*80;
          const face=bvh.raycastFirst(new Ray(probe,new Vector3(0,0,-side)),FrontSide);
          expect(face).toBeTruthy();
          expect(Math.abs(face.point.z-hit.point.z)).toBeLessThan(.4);
        }
        if(side===1) heights.push(hit.point.z);
      }
    }
    for(let i=1;i<heights.length-1;i++) expect(Math.abs(heights[i+1]!-2*heights[i]!+heights[i-1]!)).toBeLessThan(.15);
    geometry.dispose();
  });
  it("forms a round seat-tube neck aligned with the dropper collar",()=>{
    const body=sculptedFrame()[0]!;if(body.kind!=="profile") throw new Error("Expected frame");
    const section=body.seatSection!,geometry=profileGeometry(body),bvh=new MeshBVH(geometry);
    const axis=new Vector3(...section.axis),across=new Vector3(-axis.y,axis.x,0);
    for(const h of [18,35]) for(const angle of [-65,-30,0,30,65]) {
      const theta=angle*Math.PI/180,normal=across.clone().multiplyScalar(Math.sin(theta));normal.z=Math.cos(theta);
      const center=new Vector3(...section.top).addScaledVector(axis,h);
      const hit=bvh.raycastFirst(new Ray(center.clone().addScaledVector(normal,60),normal.clone().negate()),FrontSide);
      expect(hit).toBeTruthy();expect(Math.abs(hit.point.distanceTo(center)-section.radius),JSON.stringify({h,angle,radius:hit.point.distanceTo(center)})).toBeLessThan(1);
    }
    geometry.dispose();
  });
});
