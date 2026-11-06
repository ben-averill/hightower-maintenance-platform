import { framePaint } from "./frameColors";
import {describe,expect,it} from "vitest";
import {DoubleSide,Matrix4,Ray,Vector3} from "three";
import {MeshBVH} from "three-mesh-bvh";
import {frameAnchors,sculptedFrame} from "./frameGeometry";
import {geometryAnchors} from "./geometry";
import {rearCarbonParts,chainstayGuardParts} from "./rearTriangle";
import {profileGeometry} from "./profileGeometry";
import {surfaceShellGeometry} from "./surfaceShell";
import {sweptGeometry} from "./sweptGeometry";
import {caliperParts} from "./brakeGeometry";

describe("owner-photo rear triangle",()=>{
  const {rear}=geometryAnchors(),{rearPivot,lowerRearPivot}=frameAnchors;
  it("keeps both attached brake supports with the isolated rear carbon",()=>{
    const parts=sculptedFrame();
    const supports=parts.filter(p=>p.assembly==="rear-triangle"&&p.kind==="sweep"&&p.color===framePaint);
    expect(supports).toHaveLength(2);
    expect(caliperParts("rear").filter(p=>p.color===framePaint)).toEqual([]);
    const side=rearCarbonParts(rear,rearPivot,lowerRearPivot)[0]!;
    const carbon=profileGeometry(side),bvh=new MeshBVH(carbon);
    for(const support of supports) {
      if(support.kind!=="sweep") throw new Error("Expected carbon mounting post");
      const post=sweptGeometry(support),other=new MeshBVH(post);
      expect(bvh.bvhcast(other,new Matrix4(),{intersectsTriangles:(a,b)=>a.intersectsTriangle(b)}),
        "each brake post physically joins the left stay").toBe(true);
      post.dispose();
    }
    carbon.dispose();
  });
  it("gives the front strut the forward slope seen in the registered reference",()=>{
    const side=rearCarbonParts(rear,rearPivot,lowerRearPivot)[0]!;
    const bottom=side.contour[12]!,top=side.contour[11]!;
    const angle=Math.atan2(top[0]-bottom[0],top[1]-bottom[1])*180/Math.PI;
    expect(angle).toBeGreaterThan(10);expect(angle).toBeLessThan(25);
  });
  it("joins both sides only at a low tyre-clearing yoke",()=>{
    const [left,right,bridge]=rearCarbonParts(rear,rearPivot,lowerRearPivot);
    const geos=[left!,right!,bridge!].map(profileGeometry),bvhs=geos.map(g=>new MeshBVH(g));
    for(const side of [0,1]) expect(bvhs[side]!.bvhcast(bvhs[2]!,new Matrix4(),{
      intersectsTriangles:(a,b)=>a.intersectsTriangle(b),
    }),"the lower yoke physically joins each chainstay").toBe(true);
    const g=geos[2]!,positions=g.getAttribute("position");
    for(let i=0;i<positions.count;i++) {
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
      expect(y).toBeLessThan(350);
      expect(y,"bridge sits in front of the lower feet instead of below them").toBeGreaterThan(318);
      // Same torus envelope as the procedural rear tyre: 344 mm centreline,
      // 29 mm tube. This is a static-pose check, not full-travel clearance.
      const radius=Math.hypot(x-rear[0],y-rear[1]);
      expect(Math.hypot(radius-344,z),"yoke clears the rear tyre").toBeGreaterThan(30);
    }
    for(const at of [rearPivot,lowerRearPivot,rear]) for(const bvh of bvhs.slice(0,2))
      expect(bvh.raycastFirst(new Ray(new Vector3(at[0],at[1],120),new Vector3(0,0,-1)),DoubleSide)).toBeNull();
    geos.forEach(g=>g.dispose());
  });
  it("fits the guard crown to the carbon instead of floating above it",()=>{
    const side=rearCarbonParts(rear,rearPivot,lowerRearPivot)[1]!;
    const carbon=profileGeometry(side),bvh=new MeshBVH(carbon);
    const guard=chainstayGuardParts(side,rear)[0]!;
    if(guard.kind!=="surface-shell") throw new Error("Expected moulded rubber wrap");
    const stride=guard.vertices.length/49;
    // Centre of every interior section lies 2.4 mm above the actual stay skin.
    for(let row=2;row<47;row++) {
      const [x,y,z]=guard.vertices[row*stride+4]!;
      const hit=bvh.raycastFirst(new Ray(new Vector3(x,y+5,z+.15),new Vector3(0,-1,0)),DoubleSide);
      expect(hit,`rubber follows a real chainstay surface at row ${row}: ${[x,y,z]}`).not.toBeNull();
      expect(y-hit!.point.y).toBeGreaterThan(.5);
      expect(y-hit!.point.y).toBeLessThan(2.6);
    }
    carbon.dispose();
  });
  it("surrounds the stay with rubber on the top, bottom and both cheeks, with closed end rims",()=>{
    const side=rearCarbonParts(rear,rearPivot,lowerRearPivot)[1]!;
    const carbon=profileGeometry(side),carbonBvh=new MeshBVH(carbon);
    const guard=chainstayGuardParts(side,rear)[0]!;
    if(guard.kind!=="surface-shell")throw Error("Expected rubber sleeve");
    const rubber=surfaceShellGeometry(guard),rubberBvh=new MeshBVH(rubber),stride=guard.vertices.length/49;
    for(const row of [4,12,24,36,44]){
      const section=guard.vertices.slice(row*stride,(row+1)*stride);
      const center=section.reduce((sum,p)=>sum.add(new Vector3(...p)),new Vector3()).multiplyScalar(1/section.length);
      for(let i=0;i<8;i++){
        const angle=i*Math.PI/4,direction=new Vector3(0,Math.cos(angle),Math.sin(angle));
        const ray=new Ray(center,direction),skin=carbonBvh.raycastFirst(ray,DoubleSide);
        expect(skin).not.toBeNull();
        const walls=rubberBvh.raycast(ray,DoubleSide).map(hit=>hit.distance).sort((a,b)=>a-b)
          .filter((distance,j,all)=>j===0||distance-all[j-1]!>.0001);
        expect(walls).toHaveLength(2);
        expect(walls[0]!).toBeGreaterThan(skin!.distance+.1);
        expect(walls[1]!).toBeGreaterThan(walls[0]!+.5);
        expect(walls[1]!-skin!.distance).toBeLessThan(3);
      }
    }
    const edges=new Map<string,number>();
    for(let i=0;i<guard.indices.length;i+=3)for(const [a,b] of [[0,1],[1,2],[2,0]]){
      const x=guard.indices[i+a!]!,y=guard.indices[i+b!]!,key=[Math.min(x,y),Math.max(x,y)].join(":");
      edges.set(key,(edges.get(key)??0)+1);
    }
    expect([...edges.values()].every(uses=>uses===2)).toBe(true);
    carbon.dispose();rubber.dispose();
  });

});
