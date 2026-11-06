import { describe,expect,it } from "vitest";
import { CylinderGeometry,DoubleSide,Euler,Mesh,MeshBasicMaterial,Quaternion,Raycaster,Vector3 } from "three";
import { brakePose,rotorRadius,rearFrameBrakeHose } from "./brakeGeometry";
import { forkParts,frontBrakeHose,rearBrakeHose } from "./frontAssembly";
import { sculptedFrame } from "./frameGeometry";
import { profileGeometry } from "./profileGeometry";
import { tireTread } from "./tireTread";
import { oneUpRemoteParts } from "./thumbControls";

describe("bike clearances and refined surfaces",()=>{
  for(const end of ["front","rear"] as const) it(`${end}: puts the rotor inside the adjacent structural member`,()=>{
    const material=new MeshBasicMaterial({side:DoubleSide});
    const meshes=end==="rear"?sculptedFrame().filter(p=>p.kind==="profile").filter(p=>p.z<0).map(p=>new Mesh(profileGeometry(p),material)):
      forkParts().filter(p=>p.kind==="tube").filter(p=>p.from[2]<-40&&p.to[2]<-40).map(p=>{
        const a=new Vector3(...p.from),b=new Vector3(...p.to);
        const mesh=new Mesh(new CylinderGeometry(p.endRadius??p.radius,p.radius,a.distanceTo(b),32),material);
        mesh.quaternion.setFromUnitVectors(new Vector3(0,1,0),b.clone().sub(a).normalize());
        mesh.position.copy(a.add(b).multiplyScalar(.5));return mesh;
      });
    meshes.forEach(m=>m.updateMatrixWorld());
    const rotor=brakePose(end).rotor;let checks=0;
    for(const r of [35,60,rotorRadius]) for(let i=0;i<120;i++) {
      const angle=i*Math.PI/60;
      const hit=new Raycaster(new Vector3(rotor[0]+r*Math.cos(angle),rotor[1]+r*Math.sin(angle),0),new Vector3(0,0,-1)).intersectObjects(meshes)[0];
      if(hit) {checks++;expect(rotor[2]-1-hit.point.z).toBeGreaterThan(1);}
    }
    expect(checks).toBeGreaterThan(5);meshes.forEach(m=>m.geometry.dispose());material.dispose();
  });
  it("keeps flowing cables circular, continuous and free of sharp local turns",()=>{
    const cables=[frontBrakeHose(),rearBrakeHose(),rearFrameBrakeHose(),oneUpRemoteParts().at(-1)!];
    for(const cable of cables) {
      if(cable.kind!=="sweep") throw new Error("Expected cable");
      expect(cable.circular).toBe(true);
      for(let i=1;i<cable.points.length-1;i++) {
        const a=new Vector3(...cable.points[i]!).sub(new Vector3(...cable.points[i-1]!));
        const b=new Vector3(...cable.points[i+1]!).sub(new Vector3(...cable.points[i]!));
        expect(a.length()).toBeGreaterThan(.1);
        expect(a.normalize().dot(b.normalize()), JSON.stringify({cable:cables.indexOf(cable),i,points:cable.points.slice(i-1,i+2)})).toBeGreaterThan(.86);
      }
    }
  });
  it("builds distinct directional front lugs and transverse rear paddles with inset sipes",()=>{
    const [frontBase,frontTop]=tireTread([0,0,0],373,63.5,"DHF"),[rearBase,rearTop]=tireTread([0,0,0],373,60.96,"DHR II");
    if(frontBase?.kind!=="blocks"||rearBase?.kind!=="blocks"||frontTop?.kind!=="blocks"||rearTop?.kind!=="blocks") throw new Error("Expected tread instances");
    expect(frontBase.blocks[0]!.size[0]).toBeGreaterThan(rearBase.blocks[0]!.size[0]);
    expect(frontBase.blocks[0]!.size[2]).toBeLessThan(rearBase.blocks[0]!.size[2]);
    for(const [base,top] of [[frontBase,frontTop],[rearBase,rearTop]] as const) {
      expect(top.blocks.length).toBe(base.blocks.length*2);
      for(const block of [...base.blocks,...top.blocks]) {
        expect(block.at.every(Number.isFinite)).toBe(true);
        // Outward-facing radial thickness across the crown and shoulders.
        const q=new Quaternion().setFromEuler(new Euler(...block.rotation));
        const normal=new Vector3(0,1,0).applyQuaternion(q);
        expect(normal.dot(new Vector3(block.at[0],block.at[1],0).normalize())).toBeGreaterThan(.7);
      }
    }
  });
});

