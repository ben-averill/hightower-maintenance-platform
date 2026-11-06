import { describe,expect,it } from "vitest";
import { CatmullRomCurve3,Mesh,MeshBasicMaterial,Raycaster,Vector3 } from "three";
import { barAt,brakeControlParts,gripParts,handlebarParts } from "./frontAssembly";
import { sweptGeometry } from "./sweptGeometry";
import { profileGeometry } from "./profileGeometry";
import { axsShifterParts,oneUpRemoteParts,thumbControlMount } from "./thumbControls";
import { gripBasis } from "./ergonGrip";

describe("continuous bar and grip-aligned controls",()=>{
  it("maintains circular, untwisted sections across every handlebar bend",()=>{
    const bar=handlebarParts()[0]!;
    if(bar.kind!=="sweep") throw new Error("Expected handlebar");
    const g=sweptGeometry(bar),p=g.getAttribute("position"),n=g.getAttribute("normal");
    const curve=new CatmullRomCurve3(bar.points.map(p=>new Vector3(...p)),false,"centripetal");
    const steps=Math.max(20,bar.points.length*10),sides=32;
    let previous:Vector3|undefined;
    for(let i=0;i<=steps;i++) {
      const center=curve.getPoint(i/steps),radial=new Vector3().fromBufferAttribute(p,i*(sides+1)).sub(center);
      const radius=radial.length();
      expect(radius).toBeGreaterThan(11);expect(radius).toBeLessThan(17.51);
      for(let j=0;j<=sides;j++) expect(new Vector3().fromBufferAttribute(p,i*(sides+1)+j).distanceTo(center)).toBeCloseTo(radius,3);
      radial.normalize();if(previous) expect(radial.dot(previous)).toBeGreaterThan(.97);previous=radial;
      expect(new Vector3().fromBufferAttribute(n,i*(sides+1)).dot(new Vector3().fromBufferAttribute(n,i*(sides+1)+sides))).toBeGreaterThan(.999);
    }
    expect([...n.array].every(Number.isFinite)).toBe(true);g.dispose();
  });
  it("makes the finger sections parallel to their corresponding grips in 3D",()=>{
    for(const side of [-1,1]) {
      const blade=brakeControlParts(side).find(p=>p.kind==="sweep" && p.smoothFrame)!;
      if(blade.kind!=="sweep") throw new Error("Expected brake blade");
      const bladeDirection=new Vector3(...blade.points[3]!).sub(new Vector3(...blade.points[2]!)).normalize();
      const gripDirection=new Vector3(...barAt(side*380)).sub(new Vector3(...barAt(side*254))).normalize();
      expect(bladeDirection.dot(gripDirection)).toBeCloseTo(1,8);
      expect(blade.points[0]![0]-blade.points[2]![0]).toBeGreaterThan(10);
    }
  });
  it("mounts distinct thumb faces below the left and right grips, clear of the palm wings",()=>{
    const grips=gripParts().filter(p=>p.kind==="ergon-grip");
    for(const [side,parts] of [[-1,oneUpRemoteParts()],[1,axsShifterParts()]] as const) {
      const grip=grips.find(g=>Math.sign(g.to[2])===side)!,{up}=gripBasis(grip);
      const {p,basis}=thumbControlMount(side),material=new MeshBasicMaterial();
      const meshes=parts.filter(p=>p.kind==="profile").map(profile=>{
        const geometry=profileGeometry(profile),vertices=geometry.getAttribute("position");
        for(let i=0;i<vertices.count;i++) {
          const v=new Vector3().fromBufferAttribute(vertices,i);
          expect(Math.sign(v.z)).toBe(side);
          expect(v.sub(new Vector3(...barAt(side*272))).dot(up)).toBeLessThan(-18);
        }
        const mesh=new Mesh(geometry,material);mesh.updateMatrixWorld();return mesh;
      });
      for(const [x,y] of side<0?[[-8,0]]:[[0,-12],[0,12]]) {
        const ray=new Raycaster(new Vector3(...p(x!,y!,40)),new Vector3(...basis.normal).negate());
        expect(ray.intersectObjects(meshes).length).toBeGreaterThan(0);
      }
      meshes.forEach(m=>m.geometry.dispose());material.dispose();
    }
    expect(oneUpRemoteParts().some(p=>p.kind==="label" && p.text==="ONE")).toBe(true);
    expect(axsShifterParts().some(p=>p.kind==="label" && p.text==="SRAM")).toBe(true);
  });
});
