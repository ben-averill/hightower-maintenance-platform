import { describe,expect,it } from "vitest";
import { Vector3 } from "three";
import { barAt,barCenter,gripParts } from "./frontAssembly";
import { ergonGripGeometry,gripBasis,gripSurface } from "./ergonGrip";
import { createSeedData } from "../data/seed";

describe("Loam Carbon and GA3 cockpit",()=>{
  it("preserves the cut width with 50 mm rise and the specified outer sweep angles",()=>{
    for(const side of [-1,1]) {
      expect(barAt(side*380)[1]-barCenter[1]).toBeCloseTo(50,8);
      const delta=new Vector3(...barAt(side*380)).sub(new Vector3(...barAt(side*250)));
      expect(Math.atan2(-delta.x,Math.abs(delta.z))*180/Math.PI).toBeCloseTo(10,8);
      expect(Math.atan2(delta.y,Math.abs(delta.z))*180/Math.PI).toBeCloseTo(5,8);
    }
    expect(barAt(380)[2]-barAt(-380)[2]).toBe(760);
  });
  it("mirrors the palm wings rearward while keeping both grip meshes closed and outward-facing",()=>{
    const grips=gripParts().filter(p=>p.kind==="ergon-grip");expect(grips).toHaveLength(2);
    for(const grip of grips) {
      const {back,axis}=gripBasis(grip);
      const center=new Vector3(...grip.from).lerp(new Vector3(...grip.to),.8);
      expect(gripSurface(grip,.8,0).sub(center).dot(back)).toBeGreaterThan(grip.radius+12);
      expect(gripSurface(grip,.8,Math.PI).sub(center).length()).toBeCloseTo(grip.radius,3);
      const geometry=ergonGripGeometry(grip),positions=geometry.getAttribute("position"),normals=geometry.getAttribute("normal");
      expect([...positions.array].every(Number.isFinite)).toBe(true);
      expect(new Vector3().fromBufferAttribute(normals,38*65).dot(back)).toBeGreaterThan(.8);
      expect(new Vector3().fromBufferAttribute(normals,positions.count-1).dot(axis)).toBeGreaterThan(.99);
      geometry.dispose();
    }
    for(const t of [0,.25,.5,.8,1]) for(const angle of [0,.5,Math.PI]) {
      const left=gripSurface(grips[0]!,t,angle),right=gripSurface(grips[1]!,t,angle);
      expect(left.x).toBeCloseTo(right.x,8);expect(left.y).toBeCloseTo(right.y,8);expect(left.z).toBeCloseTo(-right.z,8);
    }
  });
  it("identifies both owner-selected products in the component list",()=>{
    const data=createSeedData(),bar=data.components.find(c=>c.id==="product-cockpit.handlebar")!,grip=data.components.find(c=>c.id==="product-cockpit.grips")!;
    expect(bar.manufacturerId).toBe("pnw");expect(bar.specifications.riseMm).toBe(50);
    expect(grip.manufacturerId).toBe("ergon");expect(grip.model).toBe("GA3");
    expect(data.manufacturers.some(m=>m.id===bar.manufacturerId)).toBe(true);
    expect(data.manufacturers.some(m=>m.id===grip.manufacturerId)).toBe(true);
  });
});
