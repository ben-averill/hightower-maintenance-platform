import { describe,expect,it } from "vitest";
import { Mesh,MeshBasicMaterial,Raycaster,Vector3 } from "three";
import { sculptedFrame } from "./frameGeometry";
import { referenceInnerLower,referenceInnerUpper,referenceOuterLower,referenceOuterUpper } from "./frameProfileFit";
import { headPoint } from "./headTube";
import { downTubeDetails,downTubeFaces } from "./downTube";
import { profileGeometry } from "./profileGeometry";
import { MeshBVH } from "three-mesh-bvh";
import { surfaceShellGeometry } from "./surfaceShell";

describe("angular down tube and surface details",()=>{
  it("fits the registered shaft and keeps a smooth scooped head transition",()=>{
    const body=sculptedFrame()[0]!;if(body.kind!=="profile") throw Error("Expected frame");
    const {innerUpper,innerLower,outerUpper,outerLower}=downTubeFaces(body);
    expect(innerUpper.toArray()).toEqual(referenceInnerUpper);expect(innerLower.toArray()).toEqual(referenceInnerLower);
    expect(outerUpper.toArray()).toEqual(referenceOuterUpper);expect(outerLower.toArray()).toEqual(referenceOuterLower);
    const inner=innerUpper.clone().sub(innerLower).normalize(),outer=outerUpper.clone().sub(outerLower).normalize();
    expect(inner.dot(outer)).toBeGreaterThan(.995);
    const normal=new Vector3(inner.y,-inner.x,0);
    const depth=outerLower.clone().sub(innerLower).dot(normal);
    expect(depth).toBeGreaterThan(40);expect(depth).toBeLessThan(60);
    expect(body.contour[6]).toEqual(headPoint(120,31).slice(0,2));
    const curve=body.curves!.find(c=>c.edge===7)!;
    const tangent=new Vector3(...curve.control2,0).sub(outerUpper).normalize();
    expect(tangent.dot(outer)).toBeCloseTo(1,8);
    const from=new Vector3(...body.contour[7]!,0),to=outerUpper.clone();
    const middle=from.clone().multiplyScalar(.125).addScaledVector(new Vector3(...curve.control1,0),.375)
      .addScaledVector(new Vector3(...curve.control2,0),.375).addScaledVector(to,.125);
    expect(middle.distanceTo(from.clone().lerp(to,.5))).toBeGreaterThan(2);
  });
  it("has broad planar cheeks with a restrained width through the straight shaft",()=>{
    const body=sculptedFrame()[0]!;if(body.kind!=="profile") throw new Error("Expected frame");
    const {innerUpper,innerLower,outerUpper,outerLower}=downTubeFaces(body);
    const mesh=new Mesh(profileGeometry(body),new MeshBasicMaterial());mesh.updateMatrixWorld();
    for(const t of [.32,.5,.68]) {
      const inside=innerLower.clone().lerp(innerUpper,t),outside=outerLower.clone().lerp(outerUpper,t);
      const heights:number[]=[];
      for(const offset of [.34,.5,.66]) {
        const p=inside.clone().lerp(outside,offset);
        const hit=new Raycaster(new Vector3(p.x,p.y,100),new Vector3(0,0,-1)).intersectObject(mesh)[0];
        expect(hit).toBeDefined();heights.push(hit!.point.z);
      }
      expect(Math.max(...heights)-Math.min(...heights)).toBeLessThan(1.5);
      expect(heights[1]!*2).toBeGreaterThan(60);expect(heights[1]!*2).toBeLessThan(74);
    }
    mesh.geometry.dispose();mesh.material.dispose();
  });
  it("keeps the broad underside flat across its width",()=>{
    const body=sculptedFrame()[0]!;if(body.kind!=="profile") throw new Error("Expected frame");
    const {outerUpper,outerLower}=downTubeFaces(body);
    const material=new MeshBasicMaterial();
    const rounded=new Mesh(profileGeometry(body),material);
    rounded.updateMatrixWorld();
    const up=outerUpper.clone().sub(outerLower).normalize(),n=new Vector3(up.y,-up.x,0);
    for(const t of [.2,.5,.75]) {
      const center=outerLower.clone().lerp(outerUpper,t);
      const depth=(z:number)=>{
        const p=center.clone().addScaledVector(n,60);p.z=z;
        const hit=new Raycaster(p,n.clone().negate()).intersectObject(rounded)[0];
        expect(hit).toBeDefined();return hit!.point.clone().sub(center).dot(n);
      };
      expect(Math.abs(depth(0))).toBeLessThan(.4);
      expect(Math.abs(depth(0)-depth(20))).toBeLessThan(.4);
      expect(depth(20)).toBeCloseTo(depth(-20),1);
    }
    rounded.geometry.dispose();material.dispose();
  });
  it("joins the shaped shoulder to the flat shaft without a raised lip",()=>{
    const body=sculptedFrame()[0]!;if(body.kind!=="profile") throw new Error("Expected frame");
    const {outerUpper,outerLower}=downTubeFaces(body);
    const down=outerLower.clone().sub(outerUpper).normalize(),normal=new Vector3(-down.y,down.x,0);
    const mesh=new Mesh(profileGeometry(body),new MeshBasicMaterial());mesh.updateMatrixWorld();
    for(const side of [-1,1]) {
      const depths=[6,15,25,45,65].map(distance=>{
        const p=outerUpper.clone().addScaledVector(down,distance);p.z=side*18;
        const hit=new Raycaster(p.clone().addScaledVector(normal,60),normal.clone().negate()).intersectObject(mesh)[0];
        expect(hit).toBeDefined();return hit!.point.clone().sub(p).dot(normal);
      });
      expect(Math.max(...depths)-Math.min(...depths)).toBeLessThan(.8);
      expect(Math.max(...depths.map(Math.abs))).toBeLessThan(.4);
    }
    mesh.geometry.dispose();mesh.material.dispose();
  });
  it("keeps the lower run straight from the elbow toward the bottom bracket on both sides",()=>{
    const body=sculptedFrame()[0]!;if(body.kind!=="profile") throw new Error("Expected frame");
    const from=new Vector3(...body.contour[10]!,0),to=new Vector3(...body.contour[13]!,0);
    const axis=to.clone().sub(from).normalize(),outward=new Vector3(-axis.y,axis.x,0);
    const mesh=new Mesh(profileGeometry(body),new MeshBasicMaterial());mesh.updateMatrixWorld();
    for(const t of [.2,.35,.5,.65,.8]) for(const z of [-20,0,20]) {
      const p=from.clone().lerp(to,t);p.z=z;
      const hit=new Raycaster(p.clone().addScaledVector(outward,60),outward.clone().negate()).intersectObject(mesh)[0];
      expect(hit).toBeDefined();
      expect(Math.abs(hit!.point.clone().sub(p).dot(outward))).toBeLessThan(.6);
    }
    mesh.geometry.dispose();mesh.material.dispose();
  });
  it("keeps the storage door mounted on the unchanged inner face",()=>{
    const body=sculptedFrame()[0]!;if(body.kind!=="profile") throw new Error("Expected frame");
    const mesh=new Mesh(profileGeometry(body),new MeshBasicMaterial());mesh.updateMatrixWorld();
    const panels=downTubeDetails(body).filter(p=>p.kind==="profile"&&p.color==="#0e1719");
    expect(panels).toHaveLength(1);
    for(const panel of panels) {
      if(panel.kind!=="profile"||!panel.basis) throw new Error("Expected mounted panel");
      const {origin,right,up,normal}=panel.basis;const n=new Vector3(...normal);
      for(const x of [-18,0,18]) for(const y of [-65,0,65]) {
        const p=new Vector3(...origin).addScaledVector(new Vector3(...right),x).addScaledVector(new Vector3(...up),y);
        const hit=new Raycaster(p.clone().addScaledVector(n,20),n.clone().negate()).intersectObject(mesh)[0];
        expect(hit,`${panel.color}: ${x}, ${y}`).toBeDefined();expect(p.distanceTo(hit!.point)).toBeLessThan(1.5);
      }
    }
    mesh.geometry.dispose();mesh.material.dispose();
  });
  it("fits two curved closed guards to the carbon with only a small lower width increase",()=>{
    const body=sculptedFrame()[0]!;if(body.kind!=="profile") throw new Error("Expected frame");
    const geometry=profileGeometry(body),bvh=new MeshBVH(geometry);
    const guards=downTubeDetails(body).filter(p=>p.kind==="surface-shell");
    expect(guards).toHaveLength(2);
    const widths:number[]=[];
    for(const guard of guards) {
      const half=guard.vertices.length/2;
      for(let i=0;i<half;i+=17) {
        expect(bvh.closestPointToPoint(new Vector3(...guard.vertices[i]!))!.distance).toBeCloseTo(.3,1);
        const outside=bvh.closestPointToPoint(new Vector3(...guard.vertices[i+half]!))!.distance;
        expect(outside).toBeGreaterThan(1.5);expect(outside).toBeLessThan(2.8);
      }
      const mesh=surfaceShellGeometry(guard);
      expect(Array.from(mesh.getAttribute("normal").array).every(Number.isFinite)).toBe(true);
      widths.push(mesh.boundingBox!.max.z-mesh.boundingBox!.min.z);
      // Each mesh edge belongs to two triangles: no open underside or missing rim.
      const edges=new Map<string,number>();
      for(let i=0;i<guard.indices.length;i+=3) for(const [a,b] of [[0,1],[1,2],[2,0]]) {
        const x=guard.indices[i+a!]!,y=guard.indices[i+b!]!,key=[Math.min(x,y),Math.max(x,y)].join(":");
        edges.set(key,(edges.get(key)??0)+1);
      }
      expect([...edges.values()].every(count=>count===2)).toBe(true);
      mesh.dispose();
    }
    expect(widths[1]!).toBeGreaterThan(widths[0]!);
    expect(widths[1]!-widths[0]!).toBeLessThan(7);
    geometry.dispose();
  });
});
