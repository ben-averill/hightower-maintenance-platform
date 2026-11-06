import { describe, expect, it } from "vitest";
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import { brakePose, caliperHosePort, rearFrameHoseNormal, rearFrameHoseSurface, rearFrameHoseFitting, caliperMounts, caliperParts, rearFrameBrakeHose, rotorParts, type BrakeEnd } from "./brakeGeometry";
import { frontBrakeHose } from "./frontAssembly";
import { profileGeometry } from "./profileGeometry";
import { sculptedFrame } from "./frameGeometry";
import { geometryAnchors } from "./geometry";

describe("reference brake hardware", () => {
  it("routes the exposed rear hose entirely on the left and into the caliper inlet", () => {
    const hose = rearFrameBrakeHose();
    if (hose.kind !== "sweep") throw new Error("Expected rear hydraulic hose");
    expect(hose.points.every(point => point[2] < 0)).toBe(true);
    expect(hose.points.at(-1)).toEqual(caliperHosePort("rear"));
  });
  it("seats the rear hose fitting through the actual downtube skin",()=>{
    const body=sculptedFrame().find(shape=>shape.kind==="profile" && !!shape.headSection)!;
    if(body.kind!=="profile") throw Error("Expected front triangle");
    const geometry=profileGeometry(body),material=new MeshBasicMaterial();
    const mesh=new Mesh(geometry,material);mesh.updateMatrixWorld();
    const normal=new Vector3(...rearFrameHoseNormal),surface=new Vector3(...rearFrameHoseSurface);
    const hit=new Raycaster(surface.clone().addScaledVector(normal,40),normal.clone().negate()).intersectObject(mesh)[0];
    expect(hit).toBeDefined();
    const fitting=rearFrameHoseFitting(),hose=rearFrameBrakeHose();
    if(fitting.kind!=="sleeve" || hose.kind!=="sweep") throw Error("Expected hose and grommet");
    expect(new Vector3(...fitting.from).sub(hit!.point).dot(normal)).toBeLessThan(0);
    expect(new Vector3(...fitting.to).sub(hit!.point).dot(normal)).toBeGreaterThan(0);
    expect(hit!.point.distanceTo(surface)).toBeLessThan(1);
    expect(rearFrameHoseSurface[2]).toBeLessThan(-30);
    expect(hose.points[0]).toEqual(fitting.to);
    const exit=new Vector3(...hose.points[1]!).sub(new Vector3(...hose.points[0]!)).normalize();
    expect(exit.dot(new Vector3(...fitting.to).sub(new Vector3(...fitting.from)).normalize())).toBeGreaterThan(.95);
    geometry.dispose();material.dispose();
  });
  for(const end of ["front","rear"] as const) it(end+": aligns the hose with its silver fitting outside the casting",()=>{
    const {point:p,tangent}=brakePose(end),port=caliperHosePort(end),side=1;
    const hose=end==="front"?frontBrakeHose():rearFrameBrakeHose();if(hose.kind!=="sweep") throw Error("Expected hose");
    const direction=new Vector3(...hose.points.at(-2)!).sub(new Vector3(...port)).normalize();
    expect(direction.dot(new Vector3(...tangent,0).multiplyScalar(side))).toBeGreaterThan(.98);
    expect(new Vector3(...port).sub(new Vector3(...p(side*39,12,-17))).dot(new Vector3(...tangent,0).multiplyScalar(side))).toBeGreaterThan(0);
    expect(caliperParts(end).some(shape=>shape.kind==="tube" && shape.color==="#b9c2c6" && shape.to.every((value,i)=>value===port[i]))).toBe(true);
  });
  it("levels the rear body on a short forward platform and taller rear post", () => {
    const { tangent } = brakePose("rear");
    expect(Math.abs(Math.atan2(tangent[1], tangent[0]))).toBeLessThan(5 * Math.PI / 180);
    const [rearMount, forwardMount] = caliperMounts("rear");
    const rearHeight = rearMount!.top[1] - rearMount!.support[1];
    const forwardHeight = forwardMount!.top[1] - forwardMount!.support[1];
    expect(forwardHeight).toBeGreaterThan(0);
    expect(forwardHeight).toBeLessThan(15);
    expect(rearHeight).toBeGreaterThan(forwardHeight + 20);
  });
  it("aligns the front body to the fork with two compact mounting posts", () => {
    const { tangent } = brakePose("front");
    const { down } = geometryAnchors();
    expect(tangent[0]).toBeCloseTo(-down[0], 8);
    expect(tangent[1]).toBeCloseTo(-down[1], 8);
    for (const mount of caliperMounts("front")) {
      expect(new Vector3(...mount.top).distanceTo(new Vector3(...mount.support))).toBeLessThan(45);
    }
  });
  for (const end of ["front", "rear"] as BrakeEnd[]) {
    it(`${end}: reduces the casting dimensions by 25% without shrinking the rotor`, () => {
      const body = caliperParts(end)[0]!;
      if (body.kind !== "profile") throw new Error("Expected casting");
      const { tangent } = brakePose(end);
      const projected = body.contour.map(([x,y]) => x*tangent[0]+y*tangent[1]);
      expect(Math.max(...projected)-Math.min(...projected)).toBeCloseTo(81*0.75, 6);
      expect(body.depth).toBeCloseTo(16*0.75, 6);
      const rotor = rotorParts(end)[0]!;
      if (rotor.kind !== "profile") throw new Error("Expected rotor");
      expect(rotor.depth).toBe(1.8);
    });
    it(`${end}: keeps cooling slots, spider windows and bolt holes open through a solid rotor`, () => {
      const rotor = rotorParts(end)[0]!;
      if (rotor.kind !== "profile") throw new Error("Expected rotor profile");
      const geometry = profileGeometry(rotor);
      const material = new MeshBasicMaterial();
      const mesh = new Mesh(geometry, material);
      mesh.updateMatrixWorld();
      const [x,y,z] = brakePose(end).rotor;
      const hit = (r: number, angle: number, side: number) => new Raycaster(
        new Vector3(x + r * Math.cos(angle), y + r * Math.sin(angle), z + side * 30),
        new Vector3(0,0,-side)).intersectObject(mesh).length > 0;
      for (const side of [-1,1]) {
        expect(hit(0,0,side)).toBe(false); // Axle clearance.
        expect(hit(22,0,side)).toBe(false); // Six-bolt mounting circle.
        expect(hit(54,0.5,side)).toBe(false); // Spider window.
        expect(hit(82.75,0.0065,side)).toBe(false); // Diagonal cooling slot.
        expect(hit(83,0.15,side)).toBe(true); // Braking track between slots.
        expect(hit(48,0,side)).toBe(true); // Structural spider arm.
      }
      expect(geometry.boundingBox!.max.x - geometry.boundingBox!.min.x).toBeCloseTo(180.2, 1);
      geometry.dispose(); material.dispose();
    });
    it(`${end}: leaves a real rotor gap between the two caliper castings and pads`, () => {
      const [outer, inner] = caliperParts(end);
      if (outer?.kind !== "profile" || inner?.kind !== "profile") throw new Error("Expected castings");
      const z = brakePose(end).rotor[2];
      expect(outer.z + outer.depth / 2 + outer.bevel).toBeLessThan(z - 1);
      expect(inner.z - inner.depth / 2 - inner.bevel).toBeGreaterThan(z + 1);
      const pads = caliperParts(end).filter(p => p.kind === "profile" && p.color === "#a16e50");
      expect(pads).toHaveLength(2);
      for (const pad of pads) if (pad.kind === "profile") {
        expect(Math.abs(pad.z-z) - pad.depth/2 - pad.bevel).toBeGreaterThan(1);
      }
      expect(brakePose(end).point(0,0)[1]).toBeGreaterThan(brakePose(end).axle[1]);
    });
    it(`${end}: keeps all refined cutouts open and the coated diagonal braces solid`,()=>{
      const parts=rotorParts(end),body=parts[0]!;
      if(body.kind!=="profile") throw new Error("Expected rotor profile");
      // Center, twelve spider windows, six bolt bores, and thirty track cutouts.
      expect(body.holes).toHaveLength(49);
      const surfaces=parts.slice(0,13);
      const material=new MeshBasicMaterial();
      const meshes=surfaces.map(p=>{
        if(p.kind!=="profile") throw new Error("Expected rotor/coating surface");
        const mesh=new Mesh(profileGeometry(p),material);mesh.updateMatrixWorld();return mesh;
      });
      const mean=(points:[number,number][])=>points.reduce(([x,y],[px,py])=>[x+px/points.length,y+py/points.length],[0,0]);
      for(const side of [-1,1]) {
        const ray=(points:[number,number][])=>{
          const [x,y]=mean(points);
          return new Raycaster(new Vector3(x,y,body.z+side*20),new Vector3(0,0,-side));
        };
        for(const hole of body.holes) expect(ray(hole).intersectObjects(meshes).length).toBe(0);
        for(const coating of surfaces.slice(1)) {
          if(coating.kind!=="profile") continue;
          expect(ray(coating.contour).intersectObject(meshes[0]!).length).toBeGreaterThan(0);
        }
      }
      meshes.forEach(mesh=>mesh.geometry.dispose());material.dispose();
    });
  }
  it("terminates the front hydraulic hose at the new caliper inlet", () => {
    const hose = frontBrakeHose();
    if (hose.kind !== "sweep") throw new Error("Expected hydraulic hose");
    expect(hose.points.at(-1)).toEqual(caliperHosePort("front"));
  });
});

