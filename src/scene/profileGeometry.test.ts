import { describe, expect, it } from "vitest";
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import { frameAnchors, frameTrace } from "./frameGeometry";
import { sceneScale } from "./geometry";
import { proceduralModel } from "./model";
import { profileGeometry } from "./profileGeometry";
import { downTubeFaces } from "./downTube";

describe("sculpted frame geometry", () => {
  it("keeps the main opening and lower window open from both sides", () => {
    const body = proceduralModel.find(binding => binding.slotId === "frame")!.primitives[0]!;
    if (body.kind !== "profile") throw new Error("Expected a shaped frame body");
    const geometry = profileGeometry(body);
    const material = new MeshBasicMaterial({ side: DoubleSide });
    const mesh = new Mesh(geometry, material);
    mesh.updateMatrixWorld();
    for (const side of [-1, 1]) {
      const intersects = (x: number, y: number) => {
        const point = frameTrace(x, y);
        return new Raycaster(new Vector3(point[0] * sceneScale, point[1] * sceneScale, side),
          new Vector3(0, 0, -side)).intersectObject(mesh).length > 0;
      };
      expect(intersects(955, 545)).toBe(false); // Main frame opening.
      expect(intersects(820, 803)).toBe(false); // Small window above the BB.
      const {innerUpper,innerLower,outerUpper,outerLower}=downTubeFaces(body);
      const middle=innerUpper.add(innerLower).add(outerUpper).add(outerLower).multiplyScalar(.25);
      expect(new Raycaster(new Vector3(middle.x,middle.y,side),new Vector3(0,0,-side)).intersectObject(mesh).length).toBeGreaterThan(0);
    }
    geometry.dispose(); material.dispose();
  });
  // Whole-bike geometry audit runs alongside the other mesh suites. Keep the
  // explicit vertex budget below; wall time here isn't a rendering benchmark.
  it("builds finite, bounded meshes for every shaped part", () => {
    for (const binding of proceduralModel) for (const shape of binding.primitives) {
      if (shape.kind !== "profile") continue;
      const geometry = profileGeometry(shape);
      for (const attribute of ["position", "normal"]) {
        expect(Array.from(geometry.getAttribute(attribute).array).every(Number.isFinite)).toBe(true);
      }
      expect(geometry.getAttribute("position").count, `${binding.slotId} profile vertex budget`).toBeLessThan(150000);
      expect(geometry.boundingSphere!.radius).toBeGreaterThan(0);
      expect(geometry.boundingSphere!.radius).toBeLessThan(2);
      geometry.dispose();
    }
  }, 15000);
  it("retains the 230 mm shock envelope after relocating the visual mounts", () => {
    expect(Math.hypot(...frameAnchors.shockFront.map((value, i) => value - frameAnchors.shockRear[i]!))).toBeCloseTo(230, 6);
  });
  it("keeps the carbon cradle below the existing shock axis", () => {
    const body=proceduralModel.find(binding=>binding.slotId==="frame")!.primitives[0]!;
    if(body.kind!=="profile") throw new Error("Expected frame profile");
    const geometry=profileGeometry(body),material=new MeshBasicMaterial({side:DoubleSide});
    const mesh=new Mesh(geometry,material);mesh.updateMatrixWorld();
    const rear=new Vector3(...frameAnchors.shockRear).multiplyScalar(sceneScale);
    const front=new Vector3(...frameAnchors.shockFront).multiplyScalar(sceneScale);
    const axis=front.clone().sub(rear).normalize(),down=new Vector3(axis.y,-axis.x,0);
    for(const t of [.3,.5,.7]) {
      const hits=new Raycaster(rear.clone().lerp(front,t),down).intersectObject(mesh);
      expect(hits.length,`continuous cradle floor at ${t}`).toBeGreaterThan(0);
      expect(hits[0]!.distance/sceneScale).toBeGreaterThan(12);
      expect(hits[0]!.distance/sceneScale).toBeLessThan(100);
    }
    geometry.dispose();material.dispose();
  });
  it("opens a rear shock tunnel between two cheeks with a joined roof",()=>{
    const body=proceduralModel.find(binding=>binding.slotId==="frame")!.primitives[0]!;
    if(body.kind!=="profile") throw new Error("Expected frame profile");
    const geometry=profileGeometry(body),material=new MeshBasicMaterial({side:DoubleSide});
    const mesh=new Mesh(geometry,material);mesh.updateMatrixWorld();
    const rear=new Vector3(...frameAnchors.shockRear).multiplyScalar(sceneScale);
    const axis=new Vector3(...frameAnchors.shockFront).multiplyScalar(sceneScale).sub(rear).normalize();
    const start=rear.clone().addScaledVector(axis,-90*sceneScale);
    for(const z of [-12,0,12]) {
      const hits=new Raycaster(start.clone().add(new Vector3(0,0,z*sceneScale)),axis,0,285*sceneScale).intersectObject(mesh);
      expect(hits.length,`open axial passage at lateral ${z} mm`).toBe(0);
    }
    // The slimmer seat support leaves the rear approach exposed. The closed
    // protective cheeks and roof continue ahead of the rear shock eyelet.
    const inside=rear.clone().addScaledVector(axis,15*sceneScale);
    for(const side of [-1,1]) {
      const hits=new Raycaster(inside,new Vector3(0,0,side)).intersectObject(mesh);
      expect(hits.length,`protective cheek on side ${side}`).toBeGreaterThan(0);
      expect(hits[0]!.distance/sceneScale).toBeGreaterThan(24);
      expect(hits[0]!.distance/sceneScale).toBeLessThan(40);
    }
    const roof=new Raycaster(inside,new Vector3(-axis.y,axis.x,0)).intersectObject(mesh);
    expect(roof.length).toBeGreaterThan(0);
    expect(roof[0]!.distance/sceneScale).toBeGreaterThan(38);
    expect(roof[0]!.distance/sceneScale).toBeLessThan(50);
    geometry.dispose();material.dispose();
  });
  it("has outward-facing walls around every side of the downtube", () => {
    const body = proceduralModel.find(binding => binding.slotId === "frame")!.primitives[0]!;
    if (body.kind !== "profile") throw new Error("Expected frame profile");
    const geometry = profileGeometry(body);
    const material = new MeshBasicMaterial(); // FrontSide: missing/reversed walls must fail.
    const mesh = new Mesh(geometry, material);
    mesh.updateMatrixWorld();
    const {innerUpper,innerLower,outerUpper,outerLower}=downTubeFaces(body);
    const center=innerUpper.add(innerLower).add(outerUpper).add(outerLower).multiplyScalar(.25);
    for (const direction of [new Vector3(0,0,1), new Vector3(0,0,-1), new Vector3(0.88,-0.47,0), new Vector3(-0.88,0.47,0)]) {
      const hits = new Raycaster(center.clone().addScaledVector(direction, 0.5), direction.clone().negate()).intersectObject(mesh);
      expect(hits.length, `downtube wall facing ${direction.toArray()}`).toBeGreaterThan(0);
      expect(hits[0]!.distance).toBeLessThan(0.5);
    }
    geometry.dispose(); material.dispose();
  });
});
