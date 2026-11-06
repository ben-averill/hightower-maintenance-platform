import { describe,expect,it } from "vitest";
import { DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3 } from "three";
import { sculptedFrame } from "./frameGeometry";
import { headBadgeParts,headCableSurface,headTubeDetails,headCablePort,headForward,headPoint,headSection,headTubeRadius } from "./headTube";
import { profileGeometry } from "./profileGeometry";
import { rearBrakeHose,headsetParts } from "./frontAssembly";
import { oneUpRemoteParts } from "./thumbControls";
import { proceduralModel } from "./model";
import { sceneScale } from "./geometry";

describe("head tube reference refinement",()=>{
  it("keeps the front shell round along the steering axis, with outward-facing skin",()=>{
    const body=sculptedFrame()[0]!;
    if(body.kind!=="profile") throw new Error("Expected main frame skin");
    const mesh=new Mesh(profileGeometry(body),new MeshBasicMaterial());
    mesh.updateMatrixWorld();
    for(const height of [5,25,60,95,115]) for(const angle of [-75,-40,0,40,75]) {
      const theta=angle*Math.PI/180;
      const direction=new Vector3(...headForward).multiplyScalar(Math.cos(theta));
      direction.z=Math.sin(theta);
      const center=new Vector3(...headPoint(height,0));
      const hit=new Raycaster(center.clone().addScaledVector(direction,100),direction.clone().negate()).intersectObject(mesh)[0];
      expect(hit,`shell at ${height} mm / ${angle} degrees`).toBeDefined();
      const expected=headTubeRadius(headSection,height/120);
      expect(Math.abs(hit!.point.distanceTo(center)-expected),`radius at ${height} mm / ${angle} degrees`).toBeLessThan(1);
    }
    mesh.geometry.dispose();mesh.material.dispose();
  });
  it("keeps the actual front shell on a straight taper between the bearing openings",()=>{
    const body=sculptedFrame()[0]!;
    if(body.kind!=="profile") throw new Error("Expected main frame skin");
    const mesh=new Mesh(profileGeometry(body),new MeshBasicMaterial());mesh.updateMatrixWorld();
    const direction=new Vector3(...headForward);
    const radius=(height:number)=>{
      const center=new Vector3(...headPoint(height,0));
      const hit=new Raycaster(center.clone().addScaledVector(direction,100),direction.clone().negate()).intersectObject(mesh)[0];
      expect(hit).toBeDefined();return hit!.point.distanceTo(center);
    };
    const upper=radius(5),lower=radius(115);
    for(const height of [25,45,65,85,105]) {
      const expected=upper+(lower-upper)*(height-5)/110;
      expect(Math.abs(radius(height)-expected),`straight wall at ${height} mm`).toBeLessThan(.3);
    }
    mesh.geometry.dispose();mesh.material.dispose();
  });
  it("opens the steering passage from both ends in native and rendered geometry",()=>{
    const native=sculptedFrame()[0]!,rendered=proceduralModel.find(binding=>binding.slotId==="frame")!.primitives[0]!;
    for(const [body,scale] of [[native,1],[rendered,sceneScale]] as const) {
      if(body.kind!=="profile") throw new Error("Expected main frame skin");
      const mesh=new Mesh(profileGeometry(body),new MeshBasicMaterial({side:DoubleSide}));mesh.updateMatrixWorld();
      const down=new Vector3(...headSection.bottom).sub(new Vector3(...headSection.top)).normalize();
      for(const side of [-1,1]) for(const offset of [0,13.5,19.5]) {
        const origin=new Vector3(...headPoint(side===1?-12:132,offset)).multiplyScalar(scale);
        const hits=new Raycaster(origin,down.clone().multiplyScalar(side),0,144*scale).intersectObject(mesh);
        expect(hits,`open passage / scale ${scale} / side ${side} / offset ${offset}`).toHaveLength(0);
      }
      mesh.geometry.dispose();mesh.material.dispose();
    }
  });
  it("has recessed bearing seats with both cups contained inside the shell",()=>{
    const body=sculptedFrame()[0]!;if(body.kind!=="profile") throw new Error("Expected main frame skin");
    const mesh=new Mesh(profileGeometry(body),new MeshBasicMaterial({side:DoubleSide}));mesh.updateMatrixWorld();
    const axis=new Vector3(...headSection.bottom).sub(new Vector3(...headSection.top)).normalize();
    const direction=new Vector3(...headForward);
    for(const [height,expected] of [[3,headSection.topSeatRadius],[60,headSection.boreRadius],[117,headSection.bottomSeatRadius]]) {
      const hit=new Raycaster(new Vector3(...headPoint(height!,0)),direction).intersectObject(mesh)[0];
      expect(hit).toBeDefined();expect(hit!.distance).toBeCloseTo(expected!,1);
    }
    const cups=headsetParts().slice(0,2);
    for(const cup of cups) {
      if(cup.kind!=="sleeve") throw new Error("Expected bearing cup");
      for(const p of [cup.from,cup.to]) {
        const along=new Vector3(...p).sub(new Vector3(...headSection.top)).dot(axis);
        expect(along).toBeGreaterThanOrEqual(-1e-8);expect(along).toBeLessThanOrEqual(120+1e-8);
      }
      const center=new Vector3(...cup.from).lerp(new Vector3(...cup.to),.5);
      const wall=new Raycaster(center,direction).intersectObject(mesh)[0];
      expect(wall).toBeDefined();expect(wall!.distance).toBeGreaterThan(cup.outerRadius);
    }
    mesh.geometry.dispose();mesh.material.dispose();
  });
  it("keeps the curved badge almost flush across its full footprint",()=>{
    const body=sculptedFrame()[0]!;if(body.kind!=="profile") throw Error("Expected frame");
    const geometry=profileGeometry(body),material=new MeshBasicMaterial();
    const mesh=new Mesh(geometry,material);mesh.updateMatrixWorld();
    const head=new Vector3(...headSection.top),axis=new Vector3(...headSection.bottom).sub(head).normalize();
    for(const badge of headBadgeParts().filter(p=>p.kind==="surface-shell")) {
      for(let i=0;i<badge.vertices.length;i+=48) {
        const point=new Vector3(...badge.vertices[i]!),center=head.clone().addScaledVector(axis,point.clone().sub(head).dot(axis));
        const radial=point.clone().sub(center).normalize();
        const hit=new Raycaster(point.clone().addScaledVector(radial,10),radial.clone().negate()).intersectObject(mesh)[0];
        expect(hit).toBeDefined();
        expect(hit!.distance-10).toBeGreaterThan(0);expect(hit!.distance-10).toBeLessThan(1);
      }
    }
    expect(geometry.getAttribute("position").count).toBeLessThan(150000);
    geometry.dispose();material.dispose();
  });
  it("seats both frame-bound cables at opposite surface-mounted entry ports",()=>{
    const body=sculptedFrame()[0]!;
    if(body.kind!=="profile") throw new Error("Expected main frame skin");
    const mesh=new Mesh(profileGeometry(body),new MeshBasicMaterial());mesh.updateMatrixWorld();
    for(const [side,cable] of [[-1,rearBrakeHose()],[1,oneUpRemoteParts().at(-1)!]] as const) {
      if(cable.kind!=="sweep") throw new Error("Expected cable");
      expect(cable.points.at(-1)).toEqual(headCablePort(side));
      const port=new Vector3(...headCableSurface(side));
      const hit=new Raycaster(port.clone().add(new Vector3(0,0,side*20)),new Vector3(0,0,-side)).intersectObject(mesh)[0];
      expect(hit).toBeDefined();
      expect(Math.abs(port.z-hit!.point.z)).toBeLessThan(1);
      const gasket=headTubeDetails().filter(p=>p.kind==="sleeve").find(p=>Math.sign(p.to[2])===side)!;
      expect((gasket.from[2]-hit!.point.z)*side).toBeLessThan(0);
      expect((gasket.to[2]-hit!.point.z)*side).toBeGreaterThan(0);
      expect(cable.points.at(-1)).toEqual(gasket.to);
    }
    mesh.geometry.dispose();mesh.material.dispose();
  });
});
