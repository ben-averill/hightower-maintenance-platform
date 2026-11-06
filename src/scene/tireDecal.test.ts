import { describe,expect,it } from "vitest";
import { proceduralModel } from "./model";
import { geometryAnchors } from "./geometry";
import { tireDecals,tireDecalGeometry } from "./tireDecal";

describe("tire sidewall markings",()=>{
  it("assigns DHF to the front and DHR II to the rear with opposite MAXXIS arcs",()=>{
    for(const [slot,model] of [["wheel.front","DHF"],["wheel.rear","DHR II"]]) {
      const decals=proceduralModel.find(p=>p.slotId===slot)!.primitives.filter(p=>p.kind==="tire-decal");
      expect(decals).toHaveLength(4);
      for(const side of [-1,1]) {
        const name=decals.find(p=>p.side===side && p.artwork===model)!;
        const brand=decals.find(p=>p.side===side && p.artwork==="MAXXIS")!;
        expect(Math.abs(name.angle-brand.angle)).toBeCloseTo(Math.PI,8);
      }
    }
  });
  it("keeps the entire decal just above the curved rubber on either side",()=>{
    const {front,wheelRadius}=geometryAnchors();
    for(const decal of tireDecals(front,wheelRadius,"DHF")) {
      const g=tireDecalGeometry(decal),p=g.getAttribute("position"),n=g.getAttribute("normal");
      for(let i=0;i<p.count;i++) {
        const r=Math.hypot(p.getX(i)-front[0],p.getY(i)-front[1]);
        const rubberZ=Math.sqrt(decal.tubeRadius**2-(r-decal.majorRadius)**2);
        const clearance=(p.getZ(i)-front[2])*decal.side-rubberZ;
        expect(clearance).toBeGreaterThan(.2);expect(clearance).toBeLessThan(.3);
        expect(n.getZ(i)*decal.side).toBeGreaterThan(.85);
      }
      g.dispose();
    }
  });
  it("preserves left-to-right reading at the top on both sidewalls",()=>{
    const {front,wheelRadius}=geometryAnchors();
    for(const shape of tireDecals(front,wheelRadius,"DHF").filter(p=>p.artwork==="DHF")) {
      const g=tireDecalGeometry(shape),p=g.getAttribute("position"),uv=g.getAttribute("uv");
      const center=5*97+48;
      expect((p.getX(center+1)-p.getX(center))*shape.side).toBeGreaterThan(0);
      expect(uv.getX(center+1)).toBeGreaterThan(uv.getX(center));g.dispose();
    }
  });
});
