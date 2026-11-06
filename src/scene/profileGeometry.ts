import { BufferGeometry, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, Matrix4, Path, Shape, Vector3 } from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Primitive } from "./primitives";
import { undersideField } from "./undersideSurface";
import { headTubeOutlineRadius } from "./headTube";

type XY = [number, number];
type Profile = Extract<Primitive, { kind: "profile" }>;
type XYZ = [number, number, number];
// The same frame skin is sampled for guards and then rendered. Keep a small
// immutable cache; callers get their own disposable geometry.
const frameGeometryCache=new Map<string,BufferGeometry>();

export function refineCaps(source: BufferGeometry, maxEdge: number, localEdge?: (x:number,y:number)=>number): BufferGeometry {
  const points = source.getAttribute("position");
  const result: number[] = [];
  const distance = (a: XYZ, b: XYZ) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const split = (a: XYZ, b: XYZ, c: XYZ, level: number) => {
    const edges = [distance(a, b), distance(b, c), distance(c, a)];
    const largest = Math.max(...edges);
    const limit = localEdge ? Math.min(localEdge(a[0],a[1]),localEdge(b[0],b[1]),localEdge(c[0],c[1])) : maxEdge;
    if (largest <= limit ** 2 || level >= 14) { result.push(...a, ...b, ...c); return; }
    if (largest === edges[1]) { const previous = a; a = b; b = c; c = previous; }
    else if (largest === edges[2]) { const previous = c; c = b; b = a; a = previous; }
    const mid: XYZ = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    split(a, mid, c, level + 1); split(mid, b, c, level + 1);
  };
  const at = (index: number): XYZ => [points.getX(index), points.getY(index), points.getZ(index)];
  if(localEdge) {
    // Refine shared edges in rounds. Independent recursive cap splits create
    // T-junctions which open into cracks when the carbon skin is curved.
    let triangles:XYZ[][]=[];
    for(let i=0;i<points.count;i+=3) triangles.push([at(i),at(i+1),at(i+2)]);
    const mid=(a:XYZ,b:XYZ):XYZ=>[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2];
    for(let pass=0;pass<14;pass++) {
      const next:XYZ[][]=[];let changed=false;
      for(const triangle of triangles) {
        const [a,b,c]=triangle as [XYZ,XYZ,XYZ];
        const divide=(p:XYZ,q:XYZ)=>distance(p,q)>Math.min(localEdge(p[0],p[1]),localEdge(q[0],q[1]))**2;
        const ab=divide(a,b),bc=divide(b,c),ca=divide(c,a);
        const count=Number(ab)+Number(bc)+Number(ca);
        if(count===0) {next.push(triangle);continue;}
        changed=true;
        if(count===3) {
          const u=mid(a,b),v=mid(b,c),w=mid(c,a);
          next.push([a,u,w],[u,b,v],[w,v,c],[u,v,w]);
        } else if(count===1) {
          const [p,q,r]=ab?[a,b,c]:bc?[b,c,a]:[c,a,b];const u=mid(p!,q!);
          next.push([p!,u,r!],[u,q!,r!]);
        } else {
          const [p,q,r]=!ca?[a,b,c]:!ab?[b,c,a]:[c,a,b];
          const u=mid(p!,q!),v=mid(q!,r!);
          next.push([p!,u,r!],[u,v,r!],[u,q!,v]);
        }
      }
      triangles=next;if(!changed) break;
    }
    for(const triangle of triangles) for(const vertex of triangle) result.push(...vertex);
    const refined=new BufferGeometry();refined.setAttribute("position",new Float32BufferAttribute(result,3));
    source.dispose();return refined;
  }
  for (const group of source.groups) {
    for (let i = group.start; i < group.start + group.count; i += 3) {
      const a = at(i), b = at(i + 1), c = at(i + 2);
      if (group.materialIndex === 0) split(a, b, c, 0);
      else result.push(...a, ...b, ...c);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(result, 3));
  source.dispose();
  return geometry;
}

// Nearest-edge BVH keeps rounded skins inexpensive even around many cutouts.
function edgeDistanceField(loops: XY[][]): (x: number, y: number) => number {
  type Edge = { x: number; y: number; dx: number; dy: number; length2: number; minX: number; maxX: number; minY: number; maxY: number };
  type Node = { minX: number; maxX: number; minY: number; maxY: number; edges?: Edge[]; children?: Node[] };
  const edges: Edge[] = [];
  for (const loop of loops) for (let i = 0; i < loop.length; i++) {
    const a = loop[i]!, b = loop[(i + 1) % loop.length]!, dx = b[0] - a[0], dy = b[1] - a[1];
    const length2 = dx * dx + dy * dy;
    if (length2 > 1e-20) edges.push({ x: a[0], y: a[1], dx, dy, length2,
      minX: Math.min(a[0],b[0]), maxX: Math.max(a[0],b[0]), minY: Math.min(a[1],b[1]), maxY: Math.max(a[1],b[1]) });
  }
  const build = (items: Edge[]): Node => {
    const node: Node = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    for (const e of items) { node.minX=Math.min(node.minX,e.minX); node.maxX=Math.max(node.maxX,e.maxX); node.minY=Math.min(node.minY,e.minY); node.maxY=Math.max(node.maxY,e.maxY); }
    if (items.length <= 8) node.edges = items;
    else {
      const horizontal = node.maxX-node.minX > node.maxY-node.minY;
      items.sort((a,b) => horizontal ? (a.minX+a.maxX)-(b.minX+b.maxX) : (a.minY+a.maxY)-(b.minY+b.maxY));
      const half = Math.floor(items.length/2);
      node.children = [build(items.slice(0,half)),build(items.slice(half))];
    }
    return node;
  };
  const root = build(edges);
  return (x,y) => {
    let nearest = Infinity;
    const bound = (n: Node) => Math.max(n.minX-x,0,x-n.maxX)**2 + Math.max(n.minY-y,0,y-n.maxY)**2;
    const visit = (node: Node) => {
      if (bound(node) >= nearest) return;
      if (node.edges) for (const e of node.edges) {
        const t = Math.max(0,Math.min(1,((x-e.x)*e.dx+(y-e.y)*e.dy)/e.length2));
        nearest = Math.min(nearest,(x-e.x-e.dx*t)**2+(y-e.y-e.dy*t)**2);
      }
      if (node.children) {
        const [a,b] = node.children as [Node,Node];
        if (bound(a) < bound(b)) { visit(a); visit(b); } else { visit(b); visit(a); }
      }
    };
    visit(root);
    return Math.sqrt(nearest);
  };
}

function roundedPath<T extends Path>(path: T, points: XY[], radius: number, curves:Profile["curves"]=[]): T {
  if(radius<=0) {
    path.moveTo(...points[0]!);
    for(const point of points.slice(1)) path.lineTo(...point);
    path.closePath();
    return path;
  }
  const corners = points.map((p, i) => {
    const prev = points[(i + points.length - 1) % points.length]!;
    const next = points[(i + 1) % points.length]!;
    const before = Math.hypot(prev[0] - p[0], prev[1] - p[1]);
    const after = Math.hypot(next[0] - p[0], next[1] - p[1]);
    const curved=curves?.some(c=>c.edge===i||(c.edge+1)%points.length===i);
    const r = curved?0:Math.min(radius, before * 0.4, after * 0.4);
    return { p, start: [p[0] + (prev[0] - p[0]) * r / before, p[1] + (prev[1] - p[1]) * r / before] as XY,
      end: [p[0] + (next[0] - p[0]) * r / after, p[1] + (next[1] - p[1]) * r / after] as XY };
  });
  path.moveTo(...corners[0]!.start);
  for (const [index,c] of corners.entries()) {
    const curve=curves?.find(e=>(e.edge+1)%points.length===index);
    if(curve) path.bezierCurveTo(...curve.control1,...curve.control2,...c.start);
    else path.lineTo(...c.start);
    path.quadraticCurveTo(...c.p, ...c.end);
  }
  path.closePath();
  return path;
}

export function profileGeometry(profile: Profile): BufferGeometry {
  // Assembly/finish metadata do not change the mesh. A tagged carbon body
  // should reuse the same geometry sampled earlier by the rock guards.
  const {assembly:_assembly,color:_color,roughness:_roughness,metalness:_metalness,...geometryProfile}=profile;
  const cacheKey=profile.headSection||profile.skinResolution?JSON.stringify(geometryProfile):undefined;
  if(cacheKey) {
    const cached=frameGeometryCache.get(cacheKey);
    if(cached) return cached.clone();
  }
  const winding=(points:XY[],clockwise:boolean):XY[]=>{
    const area=points.reduce((sum,a,i)=>{const b=points[(i+1)%points.length]!;return sum+a[0]*b[1]-b[0]*a[1];},0);
    return (area<0)===clockwise?points:[...points].reverse();
  };
  // Explicitly orient every loop. ExtrudeGeometry only repairs hole winding
  // when it also reverses the outer loop; same-winding inputs invert openings.
  const outer=winding(profile.contour,true);
  const curves=outer===profile.contour?profile.curves:profile.curves?.map(c=>({
    edge:(profile.contour.length-2-c.edge+profile.contour.length)%profile.contour.length,
    control1:c.control2,control2:c.control1,
  }));
  const shape = roundedPath(new Shape(), outer, profile.round,curves);
  shape.holes = profile.holes.map(hole => roundedPath(new Path(), winding(hole,false), profile.round * 0.65));
  const sculpted = Boolean(profile.spines?.length)&&!profile.flatFaces;
  const loops: XY[][] = [shape, ...shape.holes].map(path => path.getPoints(8).map(p => [p.x, p.y]));
  const distanceToEdge = sculpted ? edgeDistanceField(loops) : () => 0;
  let extrusion:BufferGeometry = new ExtrudeGeometry(shape, {
    depth: profile.depth, steps: 1, curveSegments: 8,
    bevelEnabled: !sculpted && profile.bevel > 0, bevelSize: profile.bevel,
    bevelThickness: profile.bevel, bevelSegments: 4,
  });
  if(sculpted&&profile.skinResolution) {
    // The two rounded caps meet at their shared outline. Extruded side walls
    // have no width after shaping; subdividing them creates overlapping slivers
    // when the outline's lateral offset curves between its endpoints.
    const source=extrusion.getAttribute("position"),caps:number[]=[];
    for(const group of extrusion.groups) if(group.materialIndex===0) {
      for(let i=group.start;i<group.start+group.count;i++)
        caps.push(source.getX(i),source.getY(i),source.getZ(i));
    }
    extrusion.dispose();extrusion=new BufferGeometry();
    extrusion.setAttribute("position",new Float32BufferAttribute(caps,3));
  }
  // Interior cap vertices allow a rounded cross-section, not just a flat slab
  // with a beveled perimeter. The traced openings remain actual through-holes.
  const maxEdge = Math.max(profile.depth * 0.9, profile.bevel * 6);
  const head = profile.headSection;
  const axis = head ? new Vector3(...head.bottom).sub(new Vector3(...head.top)).normalize() : undefined;
  const headLength = head ? new Vector3(...head.bottom).distanceTo(new Vector3(...head.top)) : 0;
  const belly=profile.underside;
  const bellyField=belly?undersideField(belly.path,profile.round):undefined;
  const top=profile.topSection,seat=profile.seatSection;
  const cradle=profile.cradle;
  const cradleAxis=cradle?new Vector3(...cradle.to).sub(new Vector3(...cradle.from)).normalize():undefined;
  const cradleLength=cradle?new Vector3(...cradle.to).distanceTo(new Vector3(...cradle.from)):0;
  const topAxis=top?new Vector3(...top.front).sub(new Vector3(...top.rear)).normalize():undefined;
  const topLength=top?new Vector3(...top.front).distanceTo(new Vector3(...top.rear)):0;
  const smoothstep=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
  const flatBlend=(section:NonNullable<Profile["flatSections"]>[number],x:number,y:number)=>{
    const dx=section.to[0]-section.from[0],dy=section.to[1]-section.from[1];
    const t=Math.max(0,Math.min(1,((x-section.from[0])*dx+(y-section.from[1])*dy)/(dx*dx+dy*dy)));
    return 1-smoothstep(section.reach*.6,section.reach,
      Math.hypot(x-section.from[0]-t*dx,y-section.from[1]-t*dy));
  };
  const topCoordinates=(x:number,y:number)=>{
    if(!top||!topAxis) return {t:0,depth:Infinity,height:0};
    const along=(x-top.rear[0])*topAxis.x+(y-top.rear[1])*topAxis.y,t=along/topLength;
    const ix=top.innerFront[0]-top.innerRear[0],iy=top.innerFront[1]-top.innerRear[1];
    const innerT=(along-(top.innerRear[0]-top.rear[0])*topAxis.x-(top.innerRear[1]-top.rear[1])*topAxis.y)/(ix*topAxis.x+iy*topAxis.y);
    const height=-(top.innerRear[0]+ix*innerT-top.rear[0])*(-topAxis.y)-(top.innerRear[1]+iy*innerT-top.rear[1])*topAxis.x;
    return {t,depth:(x-top.rear[0])*topAxis.y-(y-top.rear[1])*topAxis.x,height};
  };
  const nearUpper=(x:number,y:number)=>{
    const p=topCoordinates(x,y);
    return (top&&p.t>-.05&&p.t<1.03&&p.depth>-profile.depth&&p.depth<p.height+profile.depth)
      ||(seat&&Math.hypot(x-seat.top[0],y-seat.top[1])<seat.length*1.4);
  };
  const nearBelly=(x:number,y:number)=>belly?.path.slice(1).some((b,i)=>{
    const a=belly.path[i]!,dx=b[0]-a[0],dy=b[1]-a[1];
    const t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
    return (x-a[0]-dx*t)**2+(y-a[1]-dy*t)**2<(belly.reach*1.5)**2;
  });
  const lowerBlend=(x:number,y:number)=>{
    if(!cradle||!cradleAxis) return 0;
    const dx=x-cradle.from[0],dy=y-cradle.from[1];
    const t=(dx*cradleAxis.x+dy*cradleAxis.y)/cradleLength;
    const height=-dx*cradleAxis.y+dy*cradleAxis.x;
    return smoothstep(-.35,-.05,t)*(1-smoothstep(.9,1.25,t))
      *smoothstep(-cradle.radius*5,-cradle.radius*3,height)*(1-smoothstep(cradle.radius*2.5,cradle.radius*4.5,height));
  };
  const nearHeadRim=(x:number,y:number)=>{
    if(!head||!axis) return false;
    const dx=x-head.top[0],dy=y-head.top[1];
    const along=dx*axis.x+dy*axis.y,front=-dx*axis.y+dy*axis.x;
    return front>0 && along>-profile.depth*.1 && along<headLength+profile.depth*.1
      && Math.min(Math.abs(along),Math.abs(along-headLength))<profile.depth*.4;
  };
  const nearHeadBadge=(x:number,y:number)=>{
    if(!head||!axis) return false;
    const dx=x-head.top[0],dy=y-head.top[1],along=(dx*axis.x+dy*axis.y)/headLength;
    const front=-dx*axis.y+dy*axis.x;
    return along>.345 && along<.62 && front>headTubeOutlineRadius(head,along)*.8;
  };
  // Refine the small badge footprint so its thin curved patch sits against the actual skin.
  // Extra samples at the flared openings keep the round rim from faceting.
  let geometry = profile.spines?.length ? refineCaps(extrusion, maxEdge, head ? (x,y) =>
    nearHeadBadge(x,y)?profile.depth*.065:nearHeadRim(x,y)?profile.depth*.1:nearUpper(x,y)?profile.depth*.21:lowerBlend(x,y)>.05?profile.depth*.2:
      Math.hypot(x-head.top[0],y-head.top[1]) < headLength*2.3 || nearBelly(x,y)
        ? profile.depth*.26 : profile.angularSpines?.length ? profile.depth*.45 : maxEdge : profile.skinResolution?()=>profile.skinResolution!:undefined) : extrusion;
  if(head) {
    // Shared vertices only need one expensive surface-field evaluation.
    const indexed=mergeVertices(geometry,0.000001);geometry.dispose();geometry=indexed;
  }
  const positions = geometry.getAttribute("position");
  const baseHalf = profile.depth / 2 + (sculpted ? 0 : profile.bevel);
  const sectionRadii = profile.spines?.map(spine => spine.slice(0, -1).map((a, k) => {
    const b = spine[k + 1]!;
    return Array.from({ length: 17 }, (_, i) => Math.max(baseHalf * 0.4,
      distanceToEdge(a[0] + (b[0] - a[0]) * i / 16, a[1] + (b[1] - a[1]) * i / 16)));
  }));
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i);
    let halfWidth = baseHalf;
    let nearestSpine = Infinity, sectionRadius = baseHalf, angularBlend=0, cornerFactor=.38;
    if (profile.spines?.length) {
      let total = 0, weightTotal = 0, radiusTotal=0, angularWeight=0, cornerTotal=0;
      for (const [spineIndex, spine] of profile.spines.entries()) {
        for (let k = 0; k < spine.length - 1; k++) {
          const a = spine[k]!, b = spine[k + 1]!;
          const dx = b[0] - a[0], dy = b[1] - a[1];
          const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
          const distance = Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t);
          const samples = sectionRadii![spineIndex]![k]!;
          const index = Math.min(15, Math.floor(t * 16)), blend = t * 16 - index;
          const localRadius=samples[index]! * (1 - blend) + samples[index + 1]! * blend;
          if (distance < nearestSpine) {
            nearestSpine = distance;
            sectionRadius = localRadius;
          }
          const weight = 1 / (distance + baseHalf * 0.3) ** 4;
          total += (a[2] + (b[2] - a[2]) * t) * weight;
          radiusTotal+=localRadius*weight;
          weightTotal += weight;
          if(profile.angularSpines?.includes(spineIndex)) {
            angularWeight+=weight;
            const corners=profile.spineCornerRadii?.[spineIndex];
            cornerTotal+=((corners?.[k]??.38)*(1-t)+(corners?.[k+1]??.38)*t)*weight;
          }
        }
      }
      if (weightTotal > 0) halfWidth = total / weightTotal;
      if (angularWeight > 0) cornerFactor=cornerTotal/angularWeight;
      angularBlend=Math.max(0,Math.min(1,(angularWeight/weightTotal-.12)/.76));
      angularBlend=angularBlend*angularBlend*(3-2*angularBlend);
      if(head && weightTotal>0) {
        const blend=Math.max(0,Math.min(1,(headLength*2.6-Math.hypot(x-head.top[0],y-head.top[1]))/(headLength*.5)));
        sectionRadius=sectionRadius*(1-blend)+radiusTotal/weightTotal*blend;
      }
    }
    const offsets=[...(profile.localOffset?[profile.localOffset]:[]),...(profile.localOffsets??[])];
    const localShift=offsets.reduce((sum,offset)=>sum+offset.amount*(1-smoothstep(0,offset.radius,Math.hypot(x-offset.at[0],y-offset.at[1]))),0);
    const center = profile.z + (x - (profile.zOrigin ?? 0)) * (profile.zSlope ?? 0)+localShift;
    // Front/back skins meet at the silhouette, forming a full rounded section.
    // The old constant-depth extrusion made wide tubes read as flat blades.
    const sampledEdgeDistance=sculpted?distanceToEdge(x,y):0;
    // Float32 extrusion coordinates can drift a few microns from the outline.
    // Keep the refined rear skin closed there instead of leaving tiny doubled
    // walls whose normals produce speckled highlights around the pivot holes.
    const edgeDistance=profile.skinResolution&&sampledEdgeDistance<profile.depth*.00001
      ?0:sampledEdgeDistance;
    const inset = sculpted ? Math.min(1, edgeDistance / sectionRadius) : 1;
    const camber = sculpted ? Math.sqrt(Math.max(0, 1 - (1 - inset) ** 2)) : 1;
    let skin = halfWidth * camber;
    if(angularBlend>0) {
      // Rounded rectangular section: planar cheeks and broad inner/outer
      // faces joined by a small corner radius, rather than an oval balloon.
      const radius=Math.min(halfWidth*.65,baseHalf*cornerFactor);
      const insetCorner=Math.min(radius,edgeDistance);
      const angular=halfWidth-radius+Math.sqrt(Math.max(0,radius*radius-(radius-insetCorner)**2));
      skin=skin*(1-angularBlend)+angular*angularBlend;
    }
    if(head && axis) {
      const dx=x-head.top[0],dy=y-head.top[1];
      const h=dx*axis.x+dy*axis.y, n=-dx*axis.y+dy*axis.x;
      const t=Math.max(0,Math.min(1,h/headLength));
      const radius=headTubeOutlineRadius(head,t);
      // A round front face, fading into the existing carbon shoulders behind
      // the steering axis. Both halves remain one continuous frame mesh.
      const blend=Math.max(0,Math.min(1,(n+radius)/(radius*.8)));
      const edgeBlend=n<0?Math.min(1,edgeDistance/(radius*.35)):1;
      const fade=blend*blend*(3-2*blend)*edgeBlend*edgeBlend*(3-2*edgeBlend);
      const endFade=Math.max(0,Math.min(1,1-Math.max(-h,h-headLength,0)/(radius*.65)));
      const circular=Math.sqrt(Math.max(0,radius*radius-Math.max(n,0)**2));
      skin=skin*(1-fade*endFade)+circular*fade*endFade;
    }
    if(top) {
      const {t,depth,height}=topCoordinates(x,y);
      if(t>0&&t<1&&height>0&&depth>=0&&depth<height+profile.depth*.5) {
        const width=top.rearWidth+(top.frontWidth-top.rearWidth)*smoothstep(0,1,t);
        // Follow the real rounded opening at the junctions. Extending the
        // straight inner edge there pinches the skin along an imaginary seam.
        const inset=Math.min(1,edgeDistance/(height*.5));
        const ellipse=width*Math.sqrt(Math.max(0,1-(1-inset)**2));
        const radius=Math.min(width*.65,top.cornerRadius??width);
        const cornerInset=Math.min(radius,edgeDistance);
        const rectangular=width-radius+Math.sqrt(Math.max(0,radius*radius-(radius-cornerInset)**2));
        const section=top.cornerRadius===undefined?ellipse:rectangular;
        const blend=smoothstep(.03,.18,t)*(1-smoothstep(.84,.99,t))
          *(1-smoothstep(height,height+profile.depth*.5,depth));
        skin=skin*(1-blend)+section*blend;
      }
    }
    if(seat) {
      const dx=x-seat.top[0],dy=y-seat.top[1],h=dx*seat.axis[0]+dy*seat.axis[1];
      const cross=-dx*seat.axis[1]+dy*seat.axis[0];
      if(h>=-profile.depth*.1&&h<seat.length) {
        const radius=seat.radius*(1+.1*smoothstep(25/115,1,h/seat.length));
        const circular=Math.sqrt(Math.max(0,radius**2-cross**2));
        const blend=(1-smoothstep(.45,1,h/seat.length))*(1-smoothstep(radius,radius*1.5,Math.abs(cross)));
        skin=skin*(1-blend)+circular*blend;
      }
    }
    if(seat&&top&&topAxis) {
      const jx=top.rear[0]-topAxis.x*24*(profile.depth/40);
      const jy=top.rear[1]-topAxis.y*24*(profile.depth/40);
      const along=(x-seat.top[0])*seat.axis[0]+(y-seat.top[1])*seat.axis[1];
      const blend=(1-smoothstep(seat.radius*1.7,seat.radius*4.2,Math.hypot(x-jx,y-jy)))
        *smoothstep(.32,.5,along/seat.length);
      const inset=Math.min(1,edgeDistance/seat.radius);
      const junction=(seat.radius*1.06)*Math.sqrt(Math.max(0,1-(1-inset)**2));
      skin=skin*(1-blend)+junction*blend;
    }
    if(cradle) {
      // Stable rounded-rectangle skin across the lower junction removes the
      // nearest-spine ridges while retaining the broad carbon cheeks.
      const blend=lowerBlend(x,y),radius=cradle.cornerRadius??profile.depth*.35;
      const inset=Math.min(radius,edgeDistance);
      const rounded=halfWidth-radius+Math.sqrt(Math.max(0,radius*radius-(radius-inset)**2));
      skin=skin*(1-blend)+Math.max(0,rounded)*blend;
    }
    for(const section of profile.flatSections??[]) {
      const blend=flatBlend(section,x,y);
      const radius=Math.min(section.halfWidth*.65,section.cornerRadius);
      const inset=Math.min(radius,edgeDistance);
      const flat=section.halfWidth-radius+Math.sqrt(Math.max(0,radius*radius-(radius-inset)**2));
      skin=skin*(1-blend)+flat*blend;
    }
    const z = center + (positions.getZ(i) - profile.depth / 2) * skin / baseHalf;
    if (profile.plane === "zy") positions.setXYZ(i, z, y, -x);
    else if (profile.plane === "xz") positions.setXYZ(i, x, -z, y);
    else {
      let px=x,py=y;
      if(belly && bellyField) {
        const surface=bellyField(x,y);
        const across=Math.min(Math.abs(z-center),belly.radius*.95);
        const sag=belly.radius-Math.sqrt(belly.radius**2-across**2);
        const edgeFade=Math.max(0,1-surface.distance/belly.reach);
        const endFade=Math.max(0,Math.min(1,surface.along/belly.fade,(surface.length-surface.along)/belly.fade));
        const amount=sag*edgeFade*edgeFade*endFade*endFade*(3-2*endFade);
        px-=surface.nx*amount;py-=surface.ny*amount;
      }
      if(cradle&&cradleAxis&&!cradle.tunnel) {
        const dx=px-cradle.from[0],dy=py-cradle.from[1];
        const t=(dx*cradleAxis.x+dy*cradleAxis.y)/cradleLength;
        const h=-dx*cradleAxis.y+dy*cradleAxis.x;
        const r=cradle.radius*(.52+.48*smoothstep(.18,.42,t));
        // A parabolic bowl avoids the vertical tangent of a clipped circle
        // where the trough blends into the protective cheeks.
        const across=Math.abs(z-center),floor=-r+across*across/r;
        const fade=smoothstep(.05,.15,t)*(1-smoothstep(.83,.96,t))
          *(1-smoothstep(r,r+cradle.radius*.45,across))
          *(1-smoothstep(cradle.radius*2.3,cradle.radius*3.5,h));
        if(h>floor-cradle.radius) {
          const softness=cradle.radius*.18;
          const drop=softness*Math.log1p(Math.exp(Math.min(80,(h-floor)/softness)))*fade;
          px+=cradleAxis.y*drop;py-=cradleAxis.x*drop;
        }
      }
      positions.setXYZ(i,px,py,z);
    }
  }
  // ExtrudeGeometry is non-indexed. Weld coincident vertices after shaping to
  // keep the beveled carbon surfaces smooth, rather than shading each triangle.
  geometry.deleteAttribute("normal");
  geometry.deleteAttribute("uv");
  let smooth = mergeVertices(geometry, 0.000001);
  geometry.dispose();
  // Rounded skins meet at the outline; discard the collapsed extrusion walls.
  if (sculpted) {
    const indices = smooth.getIndex()!;
    const retained: number[] = [];
    for (let i = 0; i < indices.count; i += 3) {
      const a = indices.getX(i), b = indices.getX(i + 1), c = indices.getX(i + 2);
      if (a !== b && b !== c && c !== a) retained.push(a, b, c);
    }
    smooth.setIndex(retained);
  }
  if(profile.basis) {
    const {origin,right,up,normal}=profile.basis;
    smooth.applyMatrix4(new Matrix4().makeBasis(new Vector3(...right),new Vector3(...up),new Vector3(...normal)).setPosition(...origin));
  }
  smooth.computeVertexNormals();
  if(seat&&top&&topAxis) {
    // Irregular cap triangles concentrate specular noise at the tight concave
    // seat junction. Relax the shading normals locally without moving the skin.
    const points=smooth.getAttribute("position"),normals=smooth.getAttribute("normal");
    const indices=smooth.getIndex()!,neighbors=new Map<number,Set<number>>();
    const cx=top.rear[0]-topAxis.x*profile.depth*.6,cy=top.rear[1]-topAxis.y*profile.depth*.6;
    const weights=new Map<number,number>();
    for(let i=0;i<points.count;i++) {
      const w=Math.max(1-smoothstep(seat.radius*2,seat.radius*4.5,Math.hypot(points.getX(i)-cx,points.getY(i)-cy)),
        lowerBlend(points.getX(i),points.getY(i))*.8);
      if(w>0) {neighbors.set(i,new Set());weights.set(i,w);}
    }
    for(let i=0;i<indices.count;i+=3) {
      const tri=[indices.getX(i),indices.getX(i+1),indices.getX(i+2)];
      for(const a of tri) for(const b of tri) if(a!==b) neighbors.get(a)?.add(b);
    }
    for(let pass=0;pass<5;pass++) {
      const updates=new Map<number,Vector3>();
      for(const [i,adjacent] of neighbors) {
        const n=new Vector3(normals.getX(i),normals.getY(i),normals.getZ(i)),sum=n.clone();
        for(const j of adjacent) sum.add(new Vector3(normals.getX(j),normals.getY(j),normals.getZ(j)));
        updates.set(i,n.lerp(sum.normalize(),weights.get(i)!*.65).normalize());
      }
      for(const [i,n] of updates) normals.setXYZ(i,n.x,n.y,n.z);
    }
  }
  if(cradle) {
    // Average shading over physical distance, so densely sampled cutout edges
    // do not receive a different smoothing radius from the broad carbon faces.
    const points=smooth.getAttribute("position"),normals=smooth.getAttribute("normal");
    const cell=profile.depth*.25,radius=cell*2;
    const bins=new Map<string,{point:Vector3;normal:Vector3;count:number}>();
    const selected:number[]=[];
    for(let i=0;i<points.count;i++) {
      if(lowerBlend(points.getX(i),points.getY(i))<.001) continue;
      selected.push(i);
      const p=new Vector3(points.getX(i),points.getY(i),points.getZ(i));
      const key=p.toArray().map(v=>Math.floor(v/cell)).join(",");
      const bin=bins.get(key)??{point:new Vector3(),normal:new Vector3(),count:0};
      bin.point.add(p);bin.normal.add(new Vector3(normals.getX(i),normals.getY(i),normals.getZ(i)));bin.count++;
      bins.set(key,bin);
    }
    for(const bin of bins.values()) {bin.point.divideScalar(bin.count);bin.normal.normalize();}
    const neighborhoods=new Map<string,Array<{point:Vector3;normal:Vector3}>>();
    for(const key of bins.keys()) {
      const [x,y,z]=key.split(",").map(Number),nearby:Array<{point:Vector3;normal:Vector3}>=[];
      for(let dx=-2;dx<=2;dx++) for(let dy=-2;dy<=2;dy++) for(let dz=-2;dz<=2;dz++) {
        const bin=bins.get(`${x!+dx},${y!+dy},${z!+dz}`);
        if(bin) nearby.push(bin);
      }
      neighborhoods.set(key,nearby);
    }
    for(const i of selected) {
      const p=new Vector3(points.getX(i),points.getY(i),points.getZ(i));
      const n=new Vector3(normals.getX(i),normals.getY(i),normals.getZ(i)),sum=new Vector3();
      const key=p.toArray().map(v=>Math.floor(v/cell)).join(",");
      for(const bin of neighborhoods.get(key)!) {
        if(bin.normal.dot(n)<.25) continue;
        const weight=Math.max(0,1-p.distanceToSquared(bin.point)/(radius*radius));
        sum.addScaledVector(bin.normal,weight*weight);
      }
      if(sum.lengthSq()>0) n.lerp(sum.normalize(),lowerBlend(p.x,p.y)*.92).normalize();
      normals.setXYZ(i,n.x,n.y,n.z);
    }
  }
  if(cradle?.tunnel&&cradleAxis) {
    const tunnel=cradle.tunnel;
    const rear=new Vector3(...cradle.from).addScaledVector(cradleAxis,-tunnel.rearExtension);
    const front=new Vector3(...cradle.to).addScaledVector(cradleAxis,-tunnel.frontInset);
    const cutter=new CylinderGeometry(1,1,1,64,1);
    cutter.scale(tunnel.halfWidth,rear.distanceTo(front),tunnel.halfHeight);
    cutter.applyMatrix4(new Matrix4().makeBasis(new Vector3(0,0,1),cradleAxis,new Vector3(-cradleAxis.y,cradleAxis.x,0))
      .setPosition(rear.clone().lerp(front,.5)));
    const source=new Brush(smooth),tool=new Brush(cutter);
    source.updateMatrixWorld();tool.updateMatrixWorld();
    const evaluator=new Evaluator();evaluator.attributes=["position","normal"];evaluator.useGroups=false;
    const result=evaluator.evaluate(source,tool,SUBTRACTION);
    smooth.dispose();cutter.dispose();
    const compact=mergeVertices(result.geometry,0.000001);result.geometry.dispose();smooth=compact;
  }
  for(const pocket of profile.pockets??[]) {
    const cutter=profileGeometry({kind:"profile",contour:pocket.contour,holes:[],
      depth:pocket.depth,z:0,round:pocket.round,bevel:0,color:profile.color});
    const source=new Brush(smooth),tool=new Brush(cutter);
    source.updateMatrixWorld();tool.updateMatrixWorld();
    const evaluator=new Evaluator();evaluator.attributes=["position","normal"];evaluator.useGroups=false;
    const result=evaluator.evaluate(source,tool,SUBTRACTION);
    smooth.dispose();cutter.dispose();
    smooth=mergeVertices(result.geometry,0.000001);result.geometry.dispose();
  }
  for(const bore of profile.bores??[]) {
    const cutter=new CylinderGeometry(bore.radius,bore.radius,profile.depth*6,32,1);
    cutter.rotateX(Math.PI/2);cutter.translate(...bore.at);
    const source=new Brush(smooth),tool=new Brush(cutter);
    source.updateMatrixWorld();tool.updateMatrixWorld();
    const evaluator=new Evaluator();evaluator.attributes=["position","normal"];evaluator.useGroups=false;
    const result=evaluator.evaluate(source,tool,SUBTRACTION);
    smooth.dispose();cutter.dispose();
    smooth=mergeVertices(result.geometry,0.000001);result.geometry.dispose();
  }
  if(head?.boreRadius && axis) {
    // Drill the steering passage through the shaped carbon, then recess the
    // two bearing seats. The bores share the fork's actual steering axis.
    const cut=(from:number,to:number,radius:number)=>{
      const cutter=new CylinderGeometry(radius,radius,to-from,64,1);
      const center=new Vector3(...head.top).addScaledVector(axis,(from+to)/2);
      cutter.applyMatrix4(new Matrix4().makeBasis(new Vector3(0,0,1),axis,new Vector3(-axis.y,axis.x,0)).setPosition(center));
      const source=new Brush(smooth),tool=new Brush(cutter);
      source.updateMatrixWorld();tool.updateMatrixWorld();
      const evaluator=new Evaluator();evaluator.attributes=["position","normal"];evaluator.useGroups=false;
      const result=evaluator.evaluate(source,tool,SUBTRACTION);
      smooth.dispose();cutter.dispose();
      smooth=mergeVertices(result.geometry,0.000001);result.geometry.dispose();
    };
    cut(-profile.depth,headLength+profile.depth,head.boreRadius);
    if(head.seatDepth && head.topSeatRadius) cut(-profile.depth*.1,head.seatDepth,head.topSeatRadius);
    if(head.seatDepth && head.bottomSeatRadius) cut(headLength-head.seatDepth,headLength+profile.depth*.1,head.bottomSeatRadius);
  }
  // Keep broad planar cheek normals planar without losing the rolled-edge
  // smoothing above. Do not project the internal pocket walls or transition.
  if(profile.flatSections?.length) {
    const points=smooth.getAttribute("position"),normals=smooth.getAttribute("normal");
    for(let i=0;i<points.count;i++) for(const section of profile.flatSections) {
      const x=points.getX(i),y=points.getY(i),z=points.getZ(i);
      if(flatBlend(section,x,y)>.999 && Math.abs(Math.abs(z-profile.z)-section.halfWidth)<profile.depth*.0001
        && distanceToEdge(x,y)>section.cornerRadius*1.1)
        normals.setXYZ(i,0,0,z>profile.z?1:-1);
    }
  }
  if(head && axis) {
    // Shade the tapered front shell with its surface normal, rather than
    // letting irregular cap triangles create ripples in the gloss finish.
    const points=smooth.getAttribute("position"),normals=smooth.getAttribute("normal");
    for(let i=0;i<points.count;i++) {
      const dx=points.getX(i)-head.top[0],dy=points.getY(i)-head.top[1],z=points.getZ(i)-profile.z;
      const h=dx*axis.x+dy*axis.y,n=-dx*axis.y+dy*axis.x,t=h/headLength;
      if(t<=0||t>=1||n<=0) continue;
      const radius=headTubeOutlineRadius(head,t);
      if(Math.abs(Math.hypot(n,z)-radius)>profile.depth*.03) continue;
      const slope=(head.bottomRadius-head.topRadius-4*(head.waist??0)*(1-2*t))/headLength;
      const normal=new Vector3(-axis.y*n/radius,axis.x*n/radius,z/radius).addScaledVector(axis,-slope).normalize();
      const existing=new Vector3(normals.getX(i),normals.getY(i),normals.getZ(i));
      const blend=smoothstep(0,radius*.25,n)*smoothstep(0,profile.depth*.05,h)
        *(1-smoothstep(headLength-profile.depth*.05,headLength,h));
      existing.lerp(normal,blend).normalize();normals.setXYZ(i,existing.x,existing.y,existing.z);
    }
  }
  if(head?.boreRadius && axis) {
    // Leave the exterior paint intact; the recessed bore reads as dark carbon.
    const points=smooth.getAttribute("position"),colors=new Float32Array(points.count*3);
    for(let i=0;i<points.count;i++) {
      const dx=points.getX(i)-head.top[0],dy=points.getY(i)-head.top[1],z=points.getZ(i)-profile.z;
      const h=dx*axis.x+dy*axis.y,n=-dx*axis.y+dy*axis.x;
      const seat=h<(head.seatDepth??0)?head.topSeatRadius:h>headLength-(head.seatDepth??0)?head.bottomSeatRadius:undefined;
      const radius=seat??head.boreRadius;
      const inside=h>=-profile.depth*.001&&h<=headLength+profile.depth*.001
        && Math.hypot(n,z)<=radius+profile.depth*.005;
      colors.set(inside?[.18,.22,.20]:[1,1,1],i*3);
    }
    smooth.setAttribute("color",new Float32BufferAttribute(colors,3));
  }
  smooth.computeBoundingBox();
  smooth.computeBoundingSphere();
  if(cacheKey) {
    if(frameGeometryCache.size>=4) {
      const oldest=frameGeometryCache.keys().next().value!;
      frameGeometryCache.get(oldest)!.dispose();frameGeometryCache.delete(oldest);
    }
    frameGeometryCache.set(cacheKey,smooth.clone());
  }
  return smooth;
}



