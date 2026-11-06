import { describe,expect,it } from "vitest";
import { Mesh,MeshBasicMaterial,Raycaster,Vector3 } from "three";
import { ergonSaddleGeometry,saddleHeight,saddleUnderside,saddleParts } from "./ergonSaddle";
import { createSeedData } from "../data/seed";

describe("Ergon SMS Comp Men saddle",()=>{
  it("has deep rear padding, a raised rear crown and rolled shoulders",()=>{
    expect(saddleHeight(-82,35)-saddleUnderside(-82,35)).toBeGreaterThan(18);
    expect(saddleHeight(-108,25)-saddleHeight(0,20)).toBeGreaterThan(8);
    const geometry=ergonSaddleGeometry({kind:"ergon-saddle",at:[0,0,0],scale:1,layer:"cover",color:"#222"});
    const material=new MeshBasicMaterial(),mesh=new Mesh(geometry,material);mesh.updateMatrixWorld();
    const sideAt=(y:number)=>new Raycaster(new Vector3(-82,y,100),new Vector3(0,0,-1)).intersectObject(mesh)[0]?.point.z;
    const middle=sideAt(23),upper=sideAt(29),lower=sideAt(12);
    expect(middle).toBeDefined();expect(upper).toBeDefined();expect(lower).toBeDefined();
    expect(middle!).toBeGreaterThan(upper!+2);
    expect(middle!).toBeGreaterThan(lower!+1);
    geometry.dispose();material.dispose();
  });
  it("keeps a genuine relief opening through both the cover and shell",()=>{
    const material=new MeshBasicMaterial(),meshes=saddleParts([0,0,0]).filter(p=>p.kind==="ergon-saddle").map(p=>{
      const mesh=new Mesh(ergonSaddleGeometry(p),material);mesh.updateMatrixWorld();return mesh;
    });
    for(const side of [-1,1]) {
      const hit=(x:number,z:number)=>new Raycaster(new Vector3(x,side*100,z),new Vector3(0,-side,0)).intersectObjects(meshes);
      expect(hit(-42,0)).toHaveLength(0);
      expect(hit(-42,10)).toHaveLength(0);
      expect(hit(-80,38).length).toBeGreaterThan(0);
      expect(hit(100,0).length).toBeGreaterThan(0);
      expect(hit(100,36)).toHaveLength(0);
    }
    for(const mesh of meshes) {
      expect([...mesh.geometry.getAttribute("normal").array].every(Number.isFinite)).toBe(true);
      expect([...mesh.geometry.getAttribute("position").array].every(Number.isFinite)).toBe(true);
      mesh.geometry.dispose();
    }
    material.dispose();
  });
  it("recesses the center channel and retains two symmetric rail paths",()=>{
    expect(saddleHeight(0,0)).toBeLessThan(saddleHeight(0,18)-6);
    const rails=saddleParts([0,0,0]).filter(p=>p.kind==="sweep");expect(rails).toHaveLength(2);
    rails[0]!.points.forEach((point,i)=>{
      const other=rails[1]!.points[i]!;
      expect(point[0]).toBe(other[0]);expect(point[1]).toBe(other[1]);expect(point[2]).toBe(-other[2]);
    });
    expect(createSeedData().components.find(c=>c.id==="product-cockpit.saddle")?.model).toBe("SMS Comp Men");
  });
});
