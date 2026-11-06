import { describe,expect,it } from "vitest";
import { Mesh,MeshBasicMaterial,Raycaster,Vector3 } from "three";
import { barCenter,stemParts } from "./frontAssembly";
import { profileGeometry } from "./profileGeometry";
import { createSeedData } from "../data/seed";

describe("Burgtec Enduro MK3 stem",()=>{
  it("leaves a clear 35 mm bore and exposes the bar between two faceplate straps",()=>{
    const profiles=stemParts().filter(p=>p.kind==="profile");
    const material=new MeshBasicMaterial(),meshes=profiles.map(p=>{
      const mesh=new Mesh(profileGeometry(p),material);mesh.updateMatrixWorld();return mesh;
    });
    for(const mesh of meshes) {
      const vertices=mesh.geometry.getAttribute("position");
      for(let i=0;i<vertices.count;i++) expect(Math.hypot(vertices.getX(i)-barCenter[0],vertices.getY(i)-barCenter[1])).toBeGreaterThan(17.5);
    }
    const ray=(z:number)=>new Raycaster(new Vector3(barCenter[0]+80,barCenter[1],z),new Vector3(-1,0,0)).intersectObjects(meshes);
    expect(ray(0)[0]!.point.x).toBeLessThan(barCenter[0]);
    for(const side of [-1,1]) expect(ray(side*15)[0]!.point.x).toBeGreaterThan(barCenter[0]+24);
    meshes.forEach(m=>m.geometry.dispose());material.dispose();
  });
  it("keeps side badges recessed but above the pocket floor and steerer shell",()=>{
    const parts=stemParts(),floors=parts.filter(p=>p.kind==="profile" && p.color==="#333b3f");
    expect(floors).toHaveLength(2);
    for(const floor of floors) {
      if(floor.kind!=="profile") throw new Error("Expected recessed pocket floor");
      const side=Math.sign(floor.z),skin=Math.abs(floor.z)+floor.depth/2+floor.bevel;
      expect(skin).toBeGreaterThan(22);
      const badge=parts.find(p=>p.kind==="label" && p.text==="BURGTEC" && Math.sign(p.at[2])===side)!;
      if(badge.kind!=="label") throw new Error("Missing side badge");
      expect(Math.abs(badge.at[2])).toBeGreaterThan(skin);
      expect(Math.abs(badge.at[2])).toBeLessThan(24);
    }
    const data=createSeedData();
    expect(data.components.find(c=>c.id==="product-cockpit.stem")?.model).toBe("Enduro MK3 Stem");
  });
});
