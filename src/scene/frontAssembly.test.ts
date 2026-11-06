import { describe, expect, it } from "vitest";
import { CatmullRomCurve3, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import { createSeedData } from "../data/seed";
import { geometryAnchors, sceneScale } from "./geometry";
import { barAt, brakeOutlet, dustSealDistance, forkArch, forkParts, frontBrakeHose, handlebarParts, legAt, rearBrakeHose, stanchionTop, steeringAxis, stemParts } from "./frontAssembly";
import { proceduralModel } from "./model";
import { forkArchGeometry } from "./forkArchGeometry";
import { forkDecalGeometry } from "./forkDecal";
import { forkTopControls, forkCrownParts, crownArmRoot, crownArmSeat, crownSleeveTop, cockpitRise, headsetParts, barCenter, brakeControlParts } from "./frontAssembly";
import { profileGeometry } from "./profileGeometry";
import { sweptGeometry } from "./sweptGeometry";
import { headSection } from "./headTube";
import { mavenControlPoint } from "./mavenControls";

describe("connected front assembly", () => {
  it("retains 36 mm stanchions and 160 mm from crown sleeve to dust seals", () => {
    for (const side of [-1,1]) {
      const stanchion = forkParts().find(p => p.kind === "tube" && p.from.every((v,i) => v === legAt(-crownSleeveTop,side)[i]) && p.radius === 18);
      expect(stanchion).toBeDefined();
      expect(new Vector3(...legAt(24,side)).distanceTo(new Vector3(...legAt(dustSealDistance,side)))).toBeCloseTo(160, 6);
    }
  });
  it("leaves the tire opening clear beneath a solid curved fork arch", () => {
    const arch = forkArch();
    const geometry = forkArchGeometry(arch), material = new MeshBasicMaterial();
    const mesh = new Mesh(geometry, material);
    mesh.updateMatrixWorld();
    const root = legAt(dustSealDistance+8,0);
    for (const side of [-1,1]) {
      const hits = (y: number) => new Raycaster(new Vector3(arch.root[0]+30+side*100,y,0),new Vector3(-side,0,0)).intersectObject(mesh).length;
      expect(hits(root[1]+50)).toBe(0);
      expect(hits(root[1]+82)).toBeGreaterThan(0);
    }
    geometry.dispose(); material.dispose();
  });
  it("keeps the arch between the close and strongly flared reference poses", () => {
    const arch=forkArch(), geometry=forkArchGeometry(arch);
    const vertices=geometry.getAttribute("position");
    const center=(start:number) => {
      const result=new Vector3();
      for(let i=start;i<start+12;i++) result.add(new Vector3().fromBufferAttribute(vertices,i));
      return result.divideScalar(12);
    };
    const rise=center(40*12).sub(center(0));
    const down=new Vector3(...geometryAnchors().down), up=down.clone().negate();
    const forward=new Vector3(-down.y,down.x,0);
    expect(rise.x).toBeGreaterThan(0);
    expect(rise.x).toBeLessThan(20);
    expect(rise.dot(up)).toBeGreaterThan(60);
    expect(rise.dot(forward)/rise.dot(up)).toBeGreaterThan(.45);
    expect(rise.dot(forward)/rise.dot(up)).toBeLessThan(.7);
    geometry.dispose();
  });
  it("maps lettering left-to-right on the outward-facing decal skin", () => {
    const shape=forkParts().find(p => p.kind === "fork-decal")!;
    if(shape.kind !== "fork-decal") throw new Error("Missing decal");
    const geometry=forkDecalGeometry(shape), uv=geometry.getAttribute("uv");
    // Front camera's screen-right is negative Z; U must decrease with Z.
    expect(uv.getX(47)).toBeGreaterThan(uv.getX(49));
    const n=geometry.getAttribute("normal");
    expect(new Vector3(n.getX(48),n.getY(48),n.getZ(48)).dot(new Vector3(...shape.forward))).toBeGreaterThan(.99);
    geometry.dispose();
  });
  it("keeps both control assemblies above their crown sleeves", () => {
    const up=new Vector3(...geometryAnchors().down).negate();
    for(const side of [-1,1]) for(const part of forkTopControls(side)) {
      if(part.kind !== "tube") continue;
      for(const point of [part.from,part.to])
        expect(new Vector3(...point).sub(new Vector3(...legAt(0,side))).dot(up)).toBeGreaterThanOrEqual(crownSleeveTop-1e-8);
    }
  });
  it("uses the owner's 760 mm cut width in the model and instance record", () => {
    const bar = handlebarParts()[0]!;
    if (bar.kind !== "sweep") throw new Error("Expected a swept handlebar");
    expect(new Vector3(...bar.points[0]!).distanceTo(new Vector3(...bar.points.at(-1)!))).toBeCloseTo(760, 6);
    expect(barAt(-380)[1]).toBe(barAt(380)[1]);
    const data = createSeedData();
    expect(data.instances.find(instance => instance.slotId === "cockpit.handlebar")?.setup)
      .toEqual({ handlebarWidthMm: 760, originalHandlebarWidthMm: 800, source: "user-provided" });
  });
  it("carries a continuous steerer through the head and into the stem clamp", () => {
    const { head, headBottom } = geometryAnchors();
    const axis = new Vector3(...head).sub(new Vector3(...headBottom)).normalize();
    const tubes = forkParts().filter(part => part.kind === "tube").slice(0, 2);
    for (const part of tubes) for (const point of [part.from, part.to]) {
      expect(new Vector3(...point).sub(new Vector3(...head)).cross(axis).length()).toBeLessThan(1e-8);
    }
    expect(tubes[0]!.to).toEqual(tubes[1]!.from);
    expect(tubes[1]!.to).toEqual(steeringAxis(54+cockpitRise));
    const clamp = stemParts()[0]!;
    expect(clamp.kind).toBe("sleeve");
    if (clamp.kind !== "sleeve") return;
    expect(clamp.innerRadius).toBeGreaterThan(tubes[1]!.radius);
    expect(clamp.to).toEqual(steeringAxis(56+cockpitRise));
  });
  it("adds two matching spacers and raises the complete cockpit along the steerer",()=>{
    const spacers=headsetParts().filter(p=>p.kind==="sleeve" && p.outerRadius===17);
    expect(spacers).toHaveLength(3);
    expect(cockpitRise).toBe(18);
    const previous=new Vector3(...steeringAxis(38)).add(new Vector3(42,10,0));
    const shift=new Vector3(...barCenter).sub(previous);
    expect(shift.length()).toBeCloseTo(18,8);
    expect(shift.clone().normalize().dot(new Vector3(...geometryAnchors().down).negate())).toBeCloseTo(1,8);
  });
  it("renders the Maven cast bodies as solid top-facing shapes on both sides",()=>{
    for(const side of [-1,1]) {
      const parts=brakeControlParts(side);
      const body=parts.find(p=>p.kind==="profile")!;
      if(body.kind!=="profile") throw new Error("Expected cast body");
      const geometry=profileGeometry(body),material=new MeshBasicMaterial();
      const mesh=new Mesh(geometry,material);mesh.updateMatrixWorld();
      const origin=mavenControlPoint(barAt(side*233),side,25,-9,-25);
      for(const above of [-1,1]) {
        const ray=new Raycaster(new Vector3(origin[0],origin[1]+above*40,origin[2]),new Vector3(0,-above,0));
        expect(ray.intersectObject(mesh).length).toBeGreaterThan(0);
      }
      expect(parts.some(p=>p.kind==="tube" && p.to.every((v,i)=>v===brakeOutlet(side)[i]))).toBe(true);
      geometry.dispose();material.dispose();
    }
  });
  it("leaves a visible top-view gap between both reservoirs and the curved bar",()=>{
    const bar=handlebarParts()[0]!;
    if(bar.kind!=="sweep") throw new Error("Expected handlebar");
    const curve=new CatmullRomCurve3(bar.points.map(p=>new Vector3(...p)),false,"centripetal");
    const samples=curve.getPoints(800);
    for(const side of [-1,1]) {
      const parts=brakeControlParts(side);
      const clamp=parts[0]!;
      if(clamp.kind!=="sleeve") throw new Error("Expected bar clamp");
      expect(clamp.from).toEqual(barAt(side*227));
      expect(clamp.to).toEqual(barAt(side*240));
      for(const profile of parts.filter(p=>p.kind==="profile")) {
        const geometry=profileGeometry(profile),vertices=geometry.getAttribute("position");
        let gap=Infinity;
        for(let i=0;i<vertices.count;i++) for(const point of samples)
          gap=Math.min(gap,Math.hypot(vertices.getX(i)-point.x,vertices.getZ(i)-point.z)-Math.max(...bar.radii));
        expect(gap).toBeGreaterThan(2);
        geometry.dispose();
      }
    }
  });
  it("connects both crown branches to the leg tops", () => {
    const crowns = forkParts().filter(part => part.kind === "sweep");
    for (const side of [-1, 1]) {
      expect(crowns.some(part => JSON.stringify(part.points.at(-1)) === JSON.stringify(crownArmSeat(side)))).toBe(true);
    }
    const branches = crowns.filter(part => part.points[0]!.every((value, i) => value === crownArmRoot[i]));
    expect(branches).toHaveLength(2);
    expect(crowns.filter(part=>new Vector3(...part.points[0]!).distanceTo(new Vector3(...geometryAnchors().crown))<35)).toHaveLength(3);
  });
  it("raises slimmer crown arms into a round boss while keeping the adjusters clear",()=>{
    const crown=forkCrownParts(),boss=crown[0]!;
    expect(boss.kind).toBe("sweep");if(boss.kind!=="sweep") throw new Error("Expected round crown boss");
    expect(boss.circular).toBe(true);
    const bossGeometry=sweptGeometry(boss),positions=bossGeometry.getAttribute("position");
    const rimStart=4*10*(32+1),rimCenter=new Vector3(...boss.points.at(-1)!);
    for(let i=rimStart;i<rimStart+33;i++) expect(new Vector3().fromBufferAttribute(positions,i).distanceTo(rimCenter)).toBeCloseTo(headSection.bottomRadius,4);
    bossGeometry.dispose();
    const up=new Vector3(...geometryAnchors().down).negate();
    const top=new Vector3(...boss.points.at(-1)!);
    for(const side of [-1,1]) {
      expect(top.clone().sub(new Vector3(...crownArmSeat(side))).dot(up)).toBeGreaterThan(30);
      for(const part of forkTopControls(side)) {
        const points=part.kind==="tube"||part.kind==="sleeve"?[part.from,part.to]:[];
        for(const point of points) expect(top.clone().sub(new Vector3(...point)).dot(up)).toBeGreaterThan(12);
      }
    }
    for(const arm of crown.slice(1)) {
      if(arm.kind!=="sweep") throw new Error("Expected crown arm");
      expect(arm.depth*2).toBeLessThan(22);
      const geometry=sweptGeometry(arm);
      for(const attribute of ["position","normal"]) expect(Array.from(geometry.getAttribute(attribute).array).every(Number.isFinite)).toBe(true);
      geometry.dispose();
    }
  });
  it("keeps the crown close to the head while retaining parallel legs and the axle position", () => {
    const { crown, down, front } = geometryAnchors();
    const projection = (stanchionTop[0] - crown[0]) * -down[1] + (stanchionTop[1] - crown[1]) * down[0];
    expect(projection).toBeLessThanOrEqual(16);
    for (const side of [-1, 1]) {
      const direction = new Vector3(...legAt(400, side)).sub(new Vector3(...legAt(0, side))).normalize();
      expect(direction.dot(new Vector3(...down))).toBeCloseTo(1, 8);
      const dropout = forkParts().find(part => part.kind === "sweep" && part.points.at(-1)?.every((v, i) => v === [front[0], front[1], side * 66][i]));
      expect(dropout).toBeDefined();
    }
  });
  it("starts both hoses at the corresponding master-cylinder outlet", () => {
    for (const [hose, side] of [[frontBrakeHose(), -1], [rearBrakeHose(), 1]] as const) {
      if (hose.kind !== "sweep") throw new Error("Expected a routed hose");
      expect(hose.points[0]).toEqual(brakeOutlet(side));
    }
  });
  it("converts clamps to render units without changing their wall thickness", () => {
    const stem = proceduralModel.find(binding => binding.slotId === "cockpit.stem")!.primitives[0]!;
    if (stem.kind !== "sleeve") throw new Error("Expected hollow stem clamp");
    expect(stem.outerRadius - stem.innerRadius).toBeCloseTo((22 - 14.4) * sceneScale, 8);
    expect(new Vector3(...stem.from).distanceTo(new Vector3(...stem.to))).toBeCloseTo(36 * sceneScale, 8);
  });
});
