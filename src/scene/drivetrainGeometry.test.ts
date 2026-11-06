import { describe,expect,it } from "vitest";
import { Mesh,MeshBasicMaterial,Raycaster,Vector3 } from "three";
import { chainJoints,chainRoute,chainWheels,chainPitch,cassetteParts,cassettePlane,selectedCog,upperPulley,lowerPulley,derailleurParts,derailleurReferencePoint } from "./drivetrainGeometry";
import { chainMatrices } from "./ChainMesh";
import { geometryAnchors } from "./geometry";
import { wheelHardware,hubFlanges } from "./wheelHardware";
import { brakePose } from "./brakeGeometry";
import { profileGeometry } from "./profileGeometry";

describe("connected drivetrain and inboard spoke flanges",()=>{
  it("registers the detailed derailleur to the existing axle and pulley centers",()=>{
    expect(derailleurReferencePoint(260,74,0)).toEqual(geometryAnchors().rear);
    for(const [x,y,center] of [[317,434,upperPulley],[311,764,lowerPulley]] as const)
      expect(new Vector3(...derailleurReferencePoint(x,y,center[2])).distanceTo(new Vector3(...center))).toBeLessThan(1e-8);
  });
  it("leaves the mount, linkage and cage open, with the upper pulley bolt exposed",()=>{
    const material=new MeshBasicMaterial(),meshes=derailleurParts().filter(p=>p.kind==="profile").map(p=>{
      const mesh=new Mesh(profileGeometry(p),material);mesh.updateMatrixWorld();return mesh;
    });
    const cast=(x:number,y:number)=>new Raycaster(new Vector3(...derailleurReferencePoint(x,y,120)),new Vector3(0,0,-1)).intersectObjects(meshes);
    for(const [x,y] of [[250,140],[339,322],[400,377],[348,596]]) expect(cast(x!,y!)).toHaveLength(0);
    const pulley=cast(317,434);
    expect(pulley.length).toBeGreaterThan(0);
    expect(pulley[0]!.point.z).toBeLessThan(selectedCog[2]+9);
    meshes.forEach(mesh=>mesh.geometry.dispose());material.dispose();
  });
  it("closes the chain with tangent runs and four real circular wraps",()=>{
    const route=chainRoute();
    expect(route).toHaveLength(8);
    route.forEach((segment,i)=>{
      const next=route[(i+1)%route.length]!;
      expect(new Vector3(...segment.at(1)).distanceTo(new Vector3(...next.at(0)))).toBeLessThan(1e-8);
      const finish=new Vector3(...segment.at(1)).sub(new Vector3(...segment.at(.999))).setZ(0).normalize();
      const start=new Vector3(...next.at(.001)).sub(new Vector3(...next.at(0))).setZ(0).normalize();
      expect(finish.dot(start)).toBeGreaterThan(.9999);
      if(segment.wheel) {
        for(let n=0;n<=20;n++) {
          const at=segment.at(n/20),wheel=segment.wheel;
          expect(Math.hypot(at[0]-wheel.center[0],at[1]-wheel.center[1])).toBeCloseTo(wheel.radius,8);
          expect(at[2]).toBe(wheel.center[2]);
        }
        expect(segment.length/segment.wheel.radius).toBeGreaterThan(1.8);
      }
    });
    expect(upperPulley[2]).toBe(selectedCog[2]);
    expect(lowerPulley[2]).toBe(selectedCog[2]);
  });
  it("keeps the free chain spans outside the sprockets and pulleys",()=>{
    for(const segment of chainRoute().filter(s=>!s.wheel)) for(let n=0;n<=50;n++) {
      const at=segment.at(n/50);
      for(const wheel of chainWheels)
        expect(Math.hypot(at[0]-wheel.center[0],at[1]-wheel.center[1])).toBeGreaterThanOrEqual(wheel.radius-1e-7);
    }
  });
  it("renders a closed alternating chain with pins at every joint, including the seam",()=>{
    const joints=chainJoints();
    expect(joints.length%2).toBe(0);
    joints.forEach((point,i)=>{
      const length=new Vector3(...point).distanceTo(new Vector3(...joints[(i+1)%joints.length]!));
      expect(length).toBeGreaterThan(chainPitch*.96);
      expect(length).toBeLessThan(chainPitch*1.02);
    });
    const matrices=chainMatrices({kind:"chain",joints,pitch:chainPitch,color:"#aaa"});
    expect(matrices.plates).toHaveLength(joints.length*2);
    expect(matrices.pins).toHaveLength(joints.length);
    matrices.pins.forEach((matrix,i)=>expect(new Vector3().setFromMatrixPosition(matrix).toArray()).toEqual(joints[i]));
    for(const matrix of [...matrices.plates,...matrices.rollers,...matrices.pins]) expect(matrix.elements.every(Number.isFinite)).toBe(true);
  });
  for(const end of ["front","rear"] as const) it(`${end}: attaches spokes to flanges inside the rotor and cassette`,()=>{
    const isRear=end==="rear",at=geometryAnchors()[end];
    const parts=wheelHardware(at,isRear?148:110,isRear);
    const spokes=parts.filter(p=>p.kind==="tube" && p.radius===.85);
    expect(spokes).toHaveLength(28);
    for(const spoke of spokes) {
      if(spoke.kind!=="tube") continue;
      expect(hubFlanges(isRear)).toContain(spoke.from[2]);
      expect(Math.hypot(spoke.from[0]-at[0],spoke.from[1]-at[1])).toBeCloseTo(25,8);
      const rimRadius=Math.hypot(spoke.to[0]-at[0],spoke.to[1]-at[1]);
      expect(Math.hypot(rimRadius-317,spoke.to[2])).toBeLessThan(10);
      for(let n=0;n<=10;n++) {
        const z=spoke.from[2]+(spoke.to[2]-spoke.from[2])*n/10;
        expect(z-spoke.radius).toBeGreaterThan(brakePose(end).rotor[2]+3);
        if(isRear) expect(z+spoke.radius).toBeLessThan(cassettePlane(0)-3);
      }
    }
  });
  it("leaves visible through-holes in the exposed outer annulus of the large cogs",()=>{
    const profiles=cassetteParts().filter(p=>p.kind==="profile");
    const material=new MeshBasicMaterial(),meshes=profiles.map(p=>{
      const mesh=new Mesh(profileGeometry(p),material);mesh.updateMatrixWorld();return mesh;
    });
    // The holes in the largest cog must also clear every smaller cog in front.
    const outer=profiles[0]!;
    for(const hole of outer.holes.slice(-12)) {
      const x=hole.reduce((sum,p)=>sum+p[0],0)/hole.length,y=hole.reduce((sum,p)=>sum+p[1],0)/hole.length;
      expect(new Raycaster(new Vector3(x,y,100),new Vector3(0,0,-1)).intersectObjects(meshes)).toHaveLength(0);
    }
    meshes.forEach(m=>m.geometry.dispose());material.dispose();
  });
});
