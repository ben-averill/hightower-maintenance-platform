import { framePaint } from "./frameColors";
import {describe,expect,it} from "vitest";
import {DoubleSide,Matrix4,Ray,Vector3} from "three";
import {MeshBVH} from "three-mesh-bvh";
import {frameAnchors,sculptedFrame} from "./frameGeometry";
import {profileGeometry} from "./profileGeometry";
import {visibleInInspection} from "./frameInspection";

describe("independent V4 frame structures",()=>{
  it("exposes only the requested structural assets",()=>{
    const parts=sculptedFrame();
    for(const assembly of ["front-triangle","rear-triangle","upper-link","lower-link"] as const)
      expect(parts.filter(part=>part.assembly===assembly).length).toBeGreaterThan(0);
    const shock={kind:"tube" as const,from:[0,0,0] as [number,number,number],to:[1,0,0] as [number,number,number],radius:1,color:"black"};
    expect(visibleInInspection("frame","suspension.shock",shock)).toBe(true);
    for(const view of ["front","rear","links"] as const)
      expect(visibleInInspection(view,"suspension.shock",shock)).toBe(false);
    expect(visibleInInspection("frame","drivetrain.crank",shock)).toBe(false);
    for(const part of parts) {
      expect(visibleInInspection("front","frame",part)).toBe(part.assembly==="front-triangle");
      expect(visibleInInspection("rear","frame",part)).toBe(part.assembly==="rear-triangle");
    }
  });
  it("opens the fixed attachment bores through the carbon skin",()=>{
    const body=sculptedFrame()[0]!;
    if(body.kind!=="profile") throw new Error("Expected front carbon");
    const g=profileGeometry(body),bvh=new MeshBVH(g);
    for(const at of [frameAnchors.upperPivot,frameAnchors.lowerPivot,frameAnchors.shockFront]) {
      const hit=bvh.raycastFirst(new Ray(new Vector3(at[0],at[1],120),new Vector3(0,0,-1)),DoubleSide);
      expect(hit,`open fixed bore at ${at}`).toBeNull();
    }
    // Sample well inside the expanded lower window, outside the axial tunnel.
    for(const side of [-1,1])
      expect(bvh.raycastFirst(new Ray(new Vector3(-108,413,side*120),new Vector3(0,0,-side)),DoubleSide)).toBeNull();
    g.dispose();
  },60000);
  it("keeps independent rear carbon clear of the stationary skin",()=>{
    const parts=sculptedFrame(),body=parts[0]!;
    if(body.kind!=="profile") throw new Error("Expected front carbon");
    const g=profileGeometry(body),bvh=new MeshBVH(g);
    for(const part of parts.filter(p=>p.assembly==="rear-triangle"&&p.color===framePaint&&p.kind==="profile")) {
      if(part.kind!=="profile") continue;
      const rear=profileGeometry(part),other=new MeshBVH(rear);
      const points:number[][]=[];
      bvh.bvhcast(other,new Matrix4(),{intersectsTriangles:(a,b)=>{
        if(!a.intersectsTriangle(b)) return false;
        points.push(a.getMidpoint(new Vector3()).toArray());
        return points.length>=3;
      }});
      expect(points,"stationary and moving carbon intersect").toEqual([]);
      rear.dispose();
    }
    g.dispose();
  },60000);
});

