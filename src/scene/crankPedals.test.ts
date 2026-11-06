import { describe,expect,it } from "vitest";
import { Mesh,MeshBasicMaterial,Raycaster,Vector3 } from "three";
import { crankArmParts,crankPoint,pedalParts } from "./crankPedals";
import { profileGeometry } from "./profileGeometry";
import { proceduralModel } from "./model";
import { geometryAnchors, sceneScale } from "./geometry";
import { barCenter } from "./frontAssembly";
import { ergonSaddleGeometry } from "./ergonSaddle";

describe("GX cranks and platform pedals",()=>{
  it("slims both forged arm sections while keeping the pedal spindles engaged",()=>{
    for(const side of [-1,1]) {
      const body=crankArmParts(side)[0]!;
      if(body.kind!=="profile") throw new Error("Expected crank arm");
      const geometry=profileGeometry(body);
      geometry.computeBoundingBox();
      expect(geometry.boundingBox!.max.z-geometry.boundingBox!.min.z).toBeCloseTo(13.05,3);
      const spindle=pedalParts(side).find(p=>p.kind==="tube")!;
      if(spindle.kind!=="tube") throw new Error("Expected pedal spindle");
      expect(Math.abs(spindle.from[2])).toBeLessThan(Math.abs(body.z)+body.depth/2);
      geometry.dispose();
    }
  });
  it("puts the unguarded chainring outside the frame and inside the drive-side crank",()=>{
    const shapes=proceduralModel.find(p=>p.slotId==="drivetrain.chainring")!.primitives;
    const profiles=shapes.filter(p=>p.kind==="profile");
    expect(profiles).toHaveLength(1); // No separate upper/lower guard sectors.
    const ring=profiles[0]!;
    const bb=new Vector3(...geometryAnchors().bb).multiplyScalar(sceneScale);
    let frameFront=-Infinity;
    for(const shape of proceduralModel.find(p=>p.slotId==="frame")!.primitives) {
      if(shape.kind!=="profile") continue;
      // Only triangulate members whose bounds can reach this BB clearance
      // region; collar/link/head details elsewhere cannot affect the result.
      if(!shape.basis&&(!shape.plane||shape.plane==="xy")&&!shape.curves?.length) {
        const xs=shape.contour.map(p=>p[0]),ys=shape.contour.map(p=>p[1]);
        const dx=Math.max(Math.min(...xs)-bb.x,0,bb.x-Math.max(...xs));
        const dy=Math.max(Math.min(...ys)-bb.y,0,bb.y-Math.max(...ys));
        if(Math.hypot(dx,dy)>66*sceneScale+shape.bevel) continue;
      }
      const geometry=profileGeometry(shape),vertices=geometry.getAttribute("position");
      for(let i=0;i<vertices.count;i++) {
        if(Math.hypot(vertices.getX(i)-bb.x,vertices.getY(i)-bb.y)<66*sceneScale)
          frameFront=Math.max(frameFront,vertices.getZ(i));
      }
      geometry.dispose();
    }
    expect(ring.z-ring.depth/2-ring.bevel-frameFront).toBeGreaterThan(2*sceneScale);
    const arm=crankArmParts(1)[0]!;
    if(arm.kind!=="profile") throw new Error("Expected crank arm");
    expect((arm.z-arm.depth/2-arm.bevel)*sceneScale-(ring.z+ring.depth/2+ring.bevel)).toBeGreaterThan(2*sceneScale);
  });
  it("leaves real pedal windows and solid perimeter rails on both sides",()=>{
    for(const side of [-1,1]) {
      const body=pedalParts(side)[0]!;
      if(body.kind!=="profile") throw new Error("Expected pedal platform");
      const geometry=profileGeometry(body),material=new MeshBasicMaterial();
      const mesh=new Mesh(geometry,material);mesh.updateMatrixWorld();
      const axle=crankPoint(side,170);
      for(const face of [-1,1]) {
        const hit=(x:number,z=145)=>new Raycaster(new Vector3(axle[0]+x,axle[1]+face*40,side*z),new Vector3(0,-face,0)).intersectObject(mesh).length;
        expect(hit(-23)).toBe(0);expect(hit(23)).toBe(0);
        expect(hit(-43)).toBeGreaterThan(0);expect(hit(43)).toBeGreaterThan(0);
        // Top reference: broad axle waist, inset rounded toe/heel corners.
        expect(hit(0,104)).toBeGreaterThan(0);
        expect(hit(46,104)).toBe(0);expect(hit(-46,104)).toBe(0);
        expect(hit(47,145)).toBeGreaterThan(0);
      }
      geometry.dispose();material.dispose();
    }
  });
  it("keeps the GX badge pocket recessed into the main forged arm",()=>{
    for(const side of [-1,1]) {
      const body=crankArmParts(side)[0]!;
      if(body.kind!=="profile") throw new Error("Expected forged arm");
      const geometry=profileGeometry(body),material=new MeshBasicMaterial();
      const mesh=new Mesh(geometry,material);mesh.updateMatrixWorld();
      const hit=(u:number,v:number)=>new Raycaster(new Vector3(...crankPoint(side,u,v,130)),new Vector3(0,0,-side)).intersectObject(mesh).length;
      expect(hit(70,0)).toBe(0);expect(hit(140,0)).toBeGreaterThan(0);
      const badge=crankArmParts(side).find(p=>p.kind==="label" && p.text==="GX")!;
      if(badge.kind!=="label") throw new Error("Expected GX badge");
      expect(Math.abs(badge.at[2])).toBeLessThan(Math.abs(body.z)+body.depth/2);
      geometry.dispose();material.dispose();
    }
  });
  it("brings the saddle top close to the central bar height",()=>{
    const saddle=proceduralModel.find(p=>p.slotId==="cockpit.saddle")!.primitives[0]!;
    if(saddle.kind!=="ergon-saddle") throw new Error("Expected saddle surface");
    const geometry=ergonSaddleGeometry(saddle);
    const top=geometry.boundingBox!.max.y/sceneScale;
    expect(Math.abs(top-barCenter[1])).toBeLessThan(5);
    geometry.dispose();
  });
});
