import { describe,expect,it } from "vitest";
import { Vector3 } from "three";
import { frameAnchors } from "./frameGeometry";
import { rearShockParts, shockPoint,shockVisualPoint,shockBodyScale } from "./rearShock";
import { shockDecalGeometry } from "./shockDecal";
import { proceduralModel } from "./model";
import { sceneScale } from "./geometry";

describe("reference rear shock",()=>{
  it("retains the frame mount centers and crosswise eyelet bores",()=>{
    expect(shockPoint(0)).toEqual(frameAnchors.shockRear);
    expect(new Vector3(...shockPoint(230)).distanceTo(new Vector3(...frameAnchors.shockFront))).toBeLessThan(1e-8);
    const eyelets=rearShockParts().filter(p=>p.kind==="sleeve" && p.outerRadius===15);
    expect(eyelets).toHaveLength(2);
    for(const p of eyelets) {
      if(p.kind!=="sleeve") throw new Error("Expected eyelet sleeve");
      expect(p.from[0]).toBe(p.to[0]);expect(p.from[1]).toBe(p.to[1]);
      expect(p.innerRadius).toBeGreaterThan(4);
    }
  });
  it("places the reservoir parallel to and clear of the main air can",()=>{
    const bodies=rearShockParts().filter(p=>p.kind==="tube");
    const main=bodies.find(p=>p.radius===25*shockBodyScale && p.from.every((v,i)=>v===shockVisualPoint(90)[i]))!;
    const reservoir=bodies.find(p=>p.radius===17*shockBodyScale)!;
    const axis=new Vector3(...main.to).sub(new Vector3(...main.from)).normalize();
    expect(new Vector3(...reservoir.to).sub(new Vector3(...reservoir.from)).normalize().dot(axis)).toBeCloseTo(1,8);
    const spacing=new Vector3(...reservoir.from).sub(new Vector3(...main.from)).cross(axis).length();
    expect(spacing-main.radius-reservoir.radius).toBeGreaterThan(2);
    expect(main.radius).toBeCloseTo(21.25,8);
    expect(new Vector3(...main.to).distanceTo(new Vector3(...main.from))).toBeCloseTo(92*.85,8);
    expect(spacing).toBeCloseTo(45*.85,8);
  });
  it("uses the manufacturer front 40x10 and rear 30x8 mounting hardware",()=>{
    const bolts=rearShockParts().filter(p=>p.kind==="tube"&&p.from[0]===p.to[0]&&p.from[1]===p.to[1]);
    for(const [at,width,radius] of [[frameAnchors.shockFront,40,5],[frameAnchors.shockRear,30,4]] as const) {
      expect(bolts.some(p=>p.kind==="tube"&&p.from[0]===at[0]&&p.from[1]===at[1]
        &&p.radius===radius&&Math.abs(p.to[2]-p.from[2])===width)).toBe(true);
    }
  });
  it("wraps readable outward-facing decals on both sides without moving their mounting axes",()=>{
    const decals=rearShockParts().filter(p=>p.kind==="shock-decal");
    expect(decals).toHaveLength(6);
    for(const decal of decals) {
      const g=shockDecalGeometry(decal), p=g.getAttribute("position"), n=g.getAttribute("normal"), uv=g.getAttribute("uv");
      expect(Array.from(p.array).every(Number.isFinite)).toBe(true);
      const center=16*13+6;
      expect(n.getZ(center)*decal.side).toBeGreaterThan(.99);
      expect(uv.getX(center+1)).toBeGreaterThan(uv.getX(center));
      expect((p.getX(center+1)-p.getX(center))*decal.side).toBeGreaterThan(0);
      g.dispose();
    }
    const rendered=proceduralModel.find(p=>p.slotId==="suspension.shock")!.primitives.filter(p=>p.kind==="shock-decal");
    expect(rendered[0]!.radius).toBeCloseTo(decals[0]!.radius*sceneScale,8);
  });
});
