import {describe,it,expect} from "vitest";
import {FrontSide,Ray,Vector3} from "three";
import {MeshBVH} from "three-mesh-bvh";
import {seatClampParts} from "./seatAssembly";
import {upperLinkParts,upperLinkBridgeParts} from "./rearLink";
import {frameAnchors,sculptedFrame} from "./frameGeometry";
import {surfaceShellGeometry} from "./surfaceShell";
import {profileGeometry} from "./profileGeometry";

describe("seat junction hardware",()=>{
  it("keeps the clamp hollow, with outward faces and a rear split",()=>{
    const shell=seatClampParts(frameAnchors.seat)[0]!;
    if(shell.kind!=="surface-shell") throw new Error("Expected split clamp shell");
    const geometry=surfaceShellGeometry(shell),bvh=new MeshBVH(geometry);
    const up=new Vector3(-.32,Math.sqrt(1-.32**2),0),right=new Vector3(up.y,-up.x,0);
    const center=new Vector3(...frameAnchors.seat).addScaledVector(up,1.5);
    for(const angle of [0,Math.PI/2,-Math.PI/2]) {
      const n=right.clone().multiplyScalar(Math.cos(angle));n.z=Math.sin(angle);
      const hit=bvh.raycastFirst(new Ray(center.clone().addScaledVector(n,60),n.clone().negate()),FrontSide);
      expect(hit).toBeTruthy();expect(hit.distance).toBeCloseTo(39.3,1);
    }
    expect(bvh.raycastFirst(new Ray(center.clone().addScaledVector(up,50),up.clone().negate()),FrontSide)).toBeNull();
    const split=bvh.raycastFirst(new Ray(center.clone().addScaledVector(right,-60),right),FrontSide);
    expect(split?.distance??120).toBeGreaterThan(60);
    geometry.dispose();
  });
  it("keeps each upper link window open below the solid recessed panel",()=>{
    const a=frameAnchors.upperPivot,b=frameAnchors.rearPivot;
    const axis=new Vector3(...b).sub(new Vector3(...a)).normalize();
    for(const side of [-1,1]) {
      const parts=upperLinkParts(a,b,side),shell=parts[0]!;
      if(shell.kind!=="surface-shell") throw new Error("Expected sculpted link arm");
      const geometry=surfaceShellGeometry(shell),bvh=new MeshBVH(geometry);
      const floor=parts[1]!;
      if(floor.kind!=="surface-shell") throw new Error("Expected recessed floor");
      const floorGeometry=surfaceShellGeometry(floor),floorBvh=new MeshBVH(floorGeometry);
      const hit=(t:number)=>{const p=new Vector3(...a).addScaledVector(axis,t);p.z=side*80;
        return bvh.raycastFirst(new Ray(p,new Vector3(0,0,-side)),FrontSide);};
      expect(hit(36)).toBeNull();expect(hit(77)).toBeNull();
      const p=new Vector3(...a).addScaledVector(axis,36);p.z=side*80;
      expect(floorBvh.raycastFirst(new Ray(p,new Vector3(0,0,-side)),FrontSide)).toBeTruthy();
      geometry.dispose();floorGeometry.dispose();
    }
  });
  it("joins the arms through a lower barrel and transverse web",()=>{
    const parts=upperLinkBridgeParts(frameAnchors.upperPivot,frameAnchors.rearPivot);
    const web=parts[0]!,barrel=parts[1]!;
    if(web.kind!=="profile"||barrel.kind!=="sleeve") throw new Error("Expected link bridge and barrel");
    const geometry=profileGeometry(web);
    expect(geometry.boundingBox!.min.z).toBeLessThan(-29);
    expect(geometry.boundingBox!.max.z).toBeGreaterThan(29);
    expect(barrel.from.slice(0,2)).toEqual(frameAnchors.rearPivot.slice(0,2));
    expect(barrel.from[2]).toBeLessThan(-25);expect(barrel.to[2]).toBeGreaterThan(25);
    expect(barrel.outerRadius).toBeGreaterThan(barrel.innerRadius);
    geometry.dispose();
  });
  it("faces both bearing housings outward and leaves the bearing bores open",()=>{
    const a=frameAnchors.upperPivot,b=frameAnchors.rearPivot;
    for(const side of [-1,1]) {
      const housings=upperLinkParts(a,b,side).filter(part=>part.kind==="surface-shell").slice(2);
      expect(housings).toHaveLength(2);
      for(const [i,housing] of housings.entries()) {
        const at=i===0?a:b,geometry=surfaceShellGeometry(housing),bvh=new MeshBVH(geometry);
        const ray=(x:number)=>new Ray(new Vector3(at[0]+x,at[1],side*80),new Vector3(0,0,-side));
        const hit=bvh.raycastFirst(ray(14),FrontSide);
        expect(hit).toBeTruthy();expect(hit.distance).toBeLessThan(50);
        expect(bvh.raycastFirst(ray(0),FrontSide)).toBeNull();
        expect(Array.from(geometry.getAttribute("normal").array).every(Number.isFinite)).toBe(true);
        geometry.dispose();
      }
    }
  });
  it("narrows toward the rear-triangle pivot on both sides",()=>{
    const a=frameAnchors.upperPivot,b=frameAnchors.rearPivot;
    const axis=new Vector3(...b).sub(new Vector3(...a)).normalize(),normal=new Vector3(-axis.y,axis.x,0);
    for(const side of [-1,1]) {
      const arm=upperLinkParts(a,b,side)[0]!;
      if(arm.kind!=="surface-shell") throw new Error("Expected arm");
      const geometry=surfaceShellGeometry(arm),bvh=new MeshBVH(geometry);
      const widths=[20,60,100].map(t=>{
        const point=new Vector3(...a).addScaledVector(axis,t).addScaledVector(normal,13);point.z=side*80;
        const hit=bvh.raycastFirst(new Ray(point,new Vector3(0,0,-side)),FrontSide);
        expect(hit).toBeTruthy();return Math.abs(hit.point.z);
      });
      expect(widths[0]!).toBeGreaterThan(widths[1]!);expect(widths[1]!).toBeGreaterThan(widths[2]!);
      expect(widths[0]!-widths[2]!).toBeGreaterThan(5);
      geometry.dispose();
    }
  });
  it("keeps the sloping front pocket open through its center",()=>{
    const a=frameAnchors.upperPivot,b=frameAnchors.rearPivot;
    const axis=new Vector3(...b).sub(new Vector3(...a)).normalize(),normal=new Vector3(-axis.y,axis.x,0);
    const length=new Vector3(...a).distanceTo(new Vector3(...b)),center=(59+length-24)/2;
    const parts=upperLinkBridgeParts(a,b);
    for(const part of [parts[0]!,parts[2]!]) {
      const geometry=part.kind==="profile"?profileGeometry(part):part.kind==="surface-shell"?surfaceShellGeometry(part):null;
      if(!geometry) throw new Error("Expected pocket surface");
      const bvh=new MeshBVH(geometry),origin=new Vector3(...a).addScaledVector(axis,center).addScaledVector(normal,60);
      expect(bvh.raycastFirst(new Ray(origin,normal.clone().negate()),FrontSide)).toBeNull();
      if(part.kind==="surface-shell") {
        origin.z=14;
        const hit=bvh.raycastFirst(new Ray(origin,normal.clone().negate()),FrontSide);
        expect(hit).toBeTruthy();expect(hit.distance).toBeGreaterThan(48);expect(hit.distance).toBeLessThan(57);
      }
      geometry.dispose();
    }
  });
  it("clears the carbon stay inside each lower bearing mount",()=>{
    const a=frameAnchors.rearPivot,parts=sculptedFrame();
    for(const side of [-1,1]) {
      const shell=parts.find(p=>p.kind==="profile"&&p.z===side*74)!;
      if(shell.kind!=="profile") throw new Error("Expected carbon stay");
      const geometry=profileGeometry(shell),bvh=new MeshBVH(geometry);
      for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]) {
        const origin=new Vector3(a[0]+14*Math.cos(angle),a[1]+14*Math.sin(angle),0);
        const hit=bvh.raycastFirst(new Ray(origin,new Vector3(0,0,side)),FrontSide);
        if(hit) expect(Math.abs(hit.point.z)).toBeGreaterThan(31.5);
      }
      geometry.dispose();
    }
  });
  it("joins the seat neck and top crown with tangential curve ends",()=>{
    const body=sculptedFrame()[0]!;if(body.kind!=="profile") throw new Error("Expected frame");
    const c=body.curves!.find(curve=>curve.edge===2)!;
    const start=body.contour[2]!,end=body.contour[3]!;
    const initial=new Vector3(c.control1[0]-start[0],c.control1[1]-start[1],0).normalize();
    const final=new Vector3(end[0]-c.control2[0],end[1]-c.control2[1],0).normalize();
    const top=new Vector3(body.contour[4]![0]-end[0],body.contour[4]![1]-end[1],0).normalize();
    expect(initial.dot(new Vector3(...body.seatSection!.axis))).toBeGreaterThan(.999);
    expect(final.dot(top)).toBeGreaterThan(.999);
  });
});
