import { describe, expect, it } from "vitest";
import { DoubleSide, Matrix4, Mesh, MeshBasicMaterial, Ray, Raycaster, Vector3 } from "three";
import { MeshBVH } from "three-mesh-bvh";
import { frameAnchors, sculptedFrame } from "./frameGeometry";
import { profileGeometry } from "./profileGeometry";
import { lowerLinkParts } from "./lowerLink";
import { surfaceShellGeometry } from "./surfaceShell";

describe("lower suspension rocker", () => {
  it("seats the fixed bearing inside the carbon cheeks and clears both frames", () => {
    const body=sculptedFrame()[0]!;
    if(body.kind!=="profile") throw new Error("Expected carbon body");
    const geometry=profileGeometry(body),bvh=new MeshBVH(geometry);
    const {lowerPivot,lowerRearPivot,shockRear}=frameAnchors;
    const arm=lowerLinkParts(lowerPivot,lowerRearPivot,shockRear,1)[0]!;
    if(arm.kind!=="surface-shell") throw new Error("Expected rocker arm");
    const fixedRegion=arm.vertices.filter(v=>Math.hypot(v[0]-lowerPivot[0],v[1]-lowerPivot[1])<18);
    expect(fixedRegion.length).toBeGreaterThan(0);
    expect(Math.max(...fixedRegion.map(v=>Math.abs(v[2])))).toBeLessThan(24);
    const bearing=lowerLinkParts(lowerPivot,lowerRearPivot,shockRear,1)[1]!;
    if(bearing.kind!=="surface-shell") throw new Error("Expected fixed bearing");
    expect(Math.max(...bearing.vertices.map(v=>v[2]))).toBeLessThanOrEqual(27);
    // The bearing shoulders meet bored carbon bosses on the two inner faces.
    const bosses=sculptedFrame().filter(p=>p.assembly==="front-triangle"&&p.kind==="surface-shell"
      &&p.vertices.every(v=>Math.hypot(v[0]-lowerPivot[0],v[1]-lowerPivot[1])<=20.01));
    expect(bosses).toHaveLength(2);
    for(const boss of bosses) {
      if(boss.kind!=="surface-shell") throw new Error("Expected carbon boss");
      const bossGeometry=surfaceShellGeometry(boss),bossBvh=new MeshBVH(bossGeometry);
      expect(bvh.bvhcast(bossBvh,new Matrix4(),{intersectsTriangles:(a,b)=>a.intersectsTriangle(b)}),
        "each bored cheek physically meets the front carbon").toBe(true);
      expect(bossBvh.raycastFirst(new Ray(new Vector3(lowerPivot[0],lowerPivot[1],100),new Vector3(0,0,-1)),DoubleSide),
        "carbon boss keeps the axle bore open").toBeNull();
      bossGeometry.dispose();
    }
    const overlaps:Vector3[]=[];
    for(const vertex of arm.vertices) {
      const point=new Vector3(...vertex);
      if(Math.hypot(point.x-lowerPivot[0],point.y-lowerPivot[1])<16) continue; // Bearing seat.
      const distances=bvh.raycast(new Ray(point,new Vector3(0,0,1)),DoubleSide).map(hit=>hit.distance).sort((a,b)=>a-b);
      const distinct=distances.filter((distance,index)=>index===0||distance-distances[index-1]!>1e-4);
      if(distinct.length%2) overlaps.push(point);
    }
    expect(overlaps).toHaveLength(0);
    const armGeometry=surfaceShellGeometry(arm),indices:number[]=[];
    for(let i=0;i<arm.indices.length;i+=3) {
      const triangle=arm.indices.slice(i,i+3);
      if(triangle.some(index=>Math.hypot(arm.vertices[index]![0]-lowerPivot[0],arm.vertices[index]![1]-lowerPivot[1])<16)) continue;
      indices.push(...triangle);
    }
    armGeometry.setIndex(indices);
    const armBvh=new MeshBVH(armGeometry);
    const collision=bvh.bvhcast(armBvh,new Matrix4(),{intersectsTriangles:(carbon,metal)=>{
      if(!carbon.intersectsTriangle(metal)) return false;
      return true;
    }});
    expect(collision,"arm faces clear the carbon outside the bearing seat").toBe(false);
    const rearCarbon=sculptedFrame().find(part=>part.kind==="profile"&&part.assembly==="rear-triangle"&&part.z>0)!;
    if(rearCarbon.kind!=="profile") throw new Error("Expected rear stay");
    const rearGeometry=profileGeometry(rearCarbon),rearBvh=new MeshBVH(rearGeometry);
    const rearIndices=indices.filter((_,i,all)=>{
      const start=i-i%3;
      return !all.slice(start,start+3).some(index=>Math.hypot(arm.vertices[index]![0]-lowerRearPivot[0],arm.vertices[index]![1]-lowerRearPivot[1])<20);
    });
    armGeometry.setIndex(rearIndices);
    const rearArmBvh=new MeshBVH(armGeometry);
    const rearCollision=rearBvh.bvhcast(rearArmBvh,new Matrix4(),{intersectsTriangles:(carbon,metal)=>{
      if(!carbon.intersectsTriangle(metal)) return false;
      return true;
    }});
    expect(rearCollision,"rocker arm clear of the rear stay outside its bearing seat").toBe(false);
    rearGeometry.dispose();
    armGeometry.dispose();geometry.dispose();
  },30000); // Includes the carbon pocket and both bored-cheek collision audits.
  it("keeps all three attachment bores open and leaves a real arm window", () => {
    const {lowerPivot,lowerRearPivot,shockRear}=frameAnchors;
    const material=new MeshBasicMaterial({side:DoubleSide});
    for(const side of [-1,1]) {
      const parts=lowerLinkParts(lowerPivot,lowerRearPivot,shockRear,side);
      const shells=parts.filter(part=>part.kind==="surface-shell");
      const meshes=shells.map(shell=>new Mesh(surfaceShellGeometry(shell),material));
      meshes.forEach(mesh=>mesh.updateMatrixWorld());
      const hits=(point:Vector3)=>new Raycaster(point,new Vector3(0,0,-side)).intersectObjects(meshes);
      for(const at of [lowerPivot,lowerRearPivot,shockRear]) {
        expect(hits(new Vector3(at[0],at[1],side*100)),"aligned transverse bearing bore").toHaveLength(0);
      }
      expect(hits(new Vector3(-181,378,side*100)),"open machined window").toHaveLength(0);
      expect(hits(new Vector3(-204,383,side*100)),"solid perimeter rail").not.toHaveLength(0);
      for(const mesh of meshes) {
        expect(Array.from(mesh.geometry.getAttribute("normal").array).every(Number.isFinite)).toBe(true);
        mesh.geometry.dispose();
      }
    }
    material.dispose();
  });
});
