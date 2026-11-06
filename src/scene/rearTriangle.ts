import { profileTrace } from "./frameProfileReference";
import { framePaint } from "./frameColors";
import { add, lerp } from "./geometry";
import { label, type Point, type Primitive } from "./primitives";
import { DoubleSide, Ray, Vector3 } from "three";
import { MeshBVH } from "three-mesh-bvh";
import { profileGeometry } from "./profileGeometry";
import { seatSupportAxis } from "./frameCoordinates";

type Profile=Extract<Primitive,{kind:"profile"}>;
type XY=[number,number];
const paint=framePaint;
const xy=(p:Point):XY=>[p[0],p[1]];
const circle=(p:Point,r:number):XY[]=>Array.from({length:32},(_,i)=>
  [p[0]+r*Math.cos(i*Math.PI/16),p[1]+r*Math.sin(i*Math.PI/16)]);

// IMG_3490–3495 show independent upper stays and a single low chainstay yoke.
// Pivot axes are the existing photo estimates, not a suspension-travel solve.
export function rearCarbonParts(axle:Point,upper:Point,lower:Point):Profile[] {
  const legX=(y:number)=>lower[0]+(y-lower[1])*seatSupportAxis[0]/seatSupportAxis[1];
  // Detached-part photos reveal straight rails, a smaller heel and a narrow
  // forward strut. The upper tip extends past the strut, not into a large bulb.
  // A short rising dropout shoulder leads into the long upper stay.
  const trace=(points:XY[]):XY[]=>points.map(([x,y])=>xy(profileTrace(x,y)));
  const contour=trace([[31,941],[69,905],[85,889],[124,883],[797,646],[821,645],[840,659],[842,678],[827,696],
    [786,711],[735,754],[720,795],[649,1028],[642,1056],[625,1069],[576,1067],[180,1007],[57,983],[31,970]]);
  // Keep a distinct angled dropout and a long bearing finger above a slim leg.
  const control=(x:number,y:number)=>xy(profileTrace(x,y));
  const curves=[{edge:2,control1:control(91,883),control2:control(109,888)},
    {edge:9,control1:control(760,722),control2:control(742,733)},
    {edge:10,control1:control(727,765),control2:control(724,780)}];
  const opening=trace([[112,920],[638,758],[665,761],[635,852],[606,961],[579,984],[550,990],[170,954],[96,940]]);
  const sides=[-1,1].map((side):Profile=>({kind:"profile",contour,holes:[opening,
    circle(axle,6),circle(upper,8.5),circle(lower,8.5)],depth:14,z:side*74,
    color:paint,bevel:2,round:7,curves,skinResolution:18,flatFaces:true,roughness:.32,metalness:.12,
    spines:[
      [add(axle,0,12,8),[...xy(profileTrace(350,815)),9],[...xy(profileTrace(665,711)),10],add(upper,0,0,9)],
      [add(axle,0,-11,8),[-385,350,9],[-260,339,9],[-225,335,7],
        add(lower,0,0,5.5),[legX(399),399,7],[legX(511),511,9]],
    ],
    zOrigin:axle[0],zSlope:side*(40-74)/(upper[0]-axle[0]),
    localOffset:{at:upper,radius:95,amount:side*5},
    localOffsets:[{at:lower,radius:160,amount:side*10},
      {at:[-163,475,0],radius:135,amount:side*13}],
  }));
  // A horizontal U faces the front of the bike. Its ends meet the stays behind
  // the lower pivot instead of dropping into a crosspiece beneath the feet.
  const bridge:Profile={kind:"profile",contour:[[-65,-45],[-66,-24],[-56,-10],
    [-35,-2],[0,0],[35,-2],[56,-10],[66,-24],[65,-45],
    [49,-44],[49,-26],[35,-12],[0,-6],[-35,-12],[-49,-26],[-49,-44]],
    holes:[],depth:14,z:0,color:paint,bevel:2,round:9,roughness:.32,metalness:.12,
    basis:{origin:[-210,330,0],right:[0,0,1],up:[1,0,0],normal:[0,1,0]}};
  return [...sides,bridge];
}

// A complete moulded sleeve around the drive-side chainstay, with the
// original forward-leaning fins retained on its upper face.
export function chainstayGuardParts(side:Profile,axle:Point):Primitive[] {
  const start:Point=[axle[0]+49,axle[1]-20,0],end:Point=[-232,339,0];
  const centerZ=(x:number,y:number)=>{
    const smooth=(at:Point,r:number,amount:number)=>{
      const t=Math.min(1,Math.hypot(x-at[0],y-at[1])/r);return amount*(1-t*t*(3-2*t));
    };
    return side.z+(x-side.zOrigin!)*side.zSlope!
      +smooth(side.localOffset!.at,side.localOffset!.radius,side.localOffset!.amount)
      +side.localOffsets!.reduce((sum,o)=>sum+smooth(o.at,o.radius,o.amount),0);
  };
  const rubber="#202728",parts:Primitive[]=[];
  const carbon=profileGeometry(side),bvh=new MeshBVH(carbon);
  const sectionBounds=(p:Point,z:number)=>{
    // Start outside the entire rear triangle: near the dropout/front bend a
    // short ray can start inside the carbon and mistake the underside for top.
    const hits=bvh.raycast(new Ray(new Vector3(p[0],p[1]+300,z),new Vector3(0,-1,0)),DoubleSide)
      .map(hit=>hit.point.y).sort((a,b)=>b-a).filter((y,i,all)=>i===0||Math.abs(y-all[i-1]!)>.0001);
    let best:{top:number;bottom:number;distance:number}|undefined;
    for(let i=0;i+1<hits.length;i+=2){
      const top=hits[i]!,bottom=hits[i+1]!,distance=Math.max(bottom-p[1],0,p[1]-top);
      if(!best||distance<best.distance)best={top,bottom,distance};
    }
    return best;
  };
  const top=(p:Point,z:number)=>sectionBounds(p,z+.15)?.top??p[1];
  // Sample a full cross-section of the actual carbon. Separate outer and
  // inner skins form a rubber sleeve with annular end caps, leaving the stay
  // inside it rather than closing a solid disc across the tube.
  const vertices:Point[]=[],indices:number[]=[];
  const sections=48,around=64,ringSize=around*2;
  for(let i=0;i<=sections;i++) {
    const t=i/sections,p=lerp(start,end,t),z=centerZ(p[0],p[1]);
    const bounds=sectionBounds(p,z);
    if(!bounds)throw new Error(`Missing chainstay cross-section ${i}`);
    const center=new Vector3(p[0],(bounds.top+bounds.bottom)/2,z);
    const roundEnd=Math.min(1,.45+Math.min(t,1-t)*12),skin:Point[][]=[[],[]];
    for(let j=0;j<around;j++) {
      // Keep sample four at the crown for the existing skin-clearance check.
      const angle=(j-4)*Math.PI*2/around,direction=new Vector3(0,Math.cos(angle),Math.sin(angle));
      const hit=bvh.raycastFirst(new Ray(center,direction),DoubleSide);
      if(!hit)throw new Error(`Chainstay sleeve misses the carbon at section ${i}, angle ${j}`);
      for(const [layer,offset] of [[0,2.4*roundEnd],[1,.25]] as const)
        skin[layer]!.push(hit.point.clone().addScaledVector(direction,offset).toArray() as Point);
    }
    vertices.push(...skin[0]!,...skin[1]!);
    if(i<sections)for(let layer=0;layer<2;layer++)for(let j=0;j<around;j++) {
      const a=i*ringSize+layer*around+j,b=a+ringSize,next=i*ringSize+layer*around+(j+1)%around;
      indices.push(...(layer===0?[a,next,b,b,next,next+ringSize]:[a,b,next,b,next+ringSize,next]));
    }
  }
  for(const row of [0,sections])for(let j=0;j<around;j++) {
    const a=row*ringSize+j,b=row*ringSize+(j+1)%around,c=a+around,d=b+around;
    indices.push(...(row===0?[a,c,b,b,c,d]:[a,b,c,b,d,c]));
  }
  parts.push({kind:"surface-shell",vertices,indices,color:rubber,roughness:.9,metalness:0});
  // Substantial transverse paddles with a sloped lead-in and rounded corners.
  for(const t of Array.from({length:13},(_,i)=>.08+.87*i/12)) {
    const p=lerp(start,end,t),z=centerZ(p[0],p[1]),height=top(p,z)+2;
    const half=7.5+2*t,h=5+3*t,lean=3;
    parts.push({kind:"profile",contour:[[p[0]-2.2,height-1],[p[0]+lean-.8,height+h],
      [p[0]+lean+.8,height+h],[p[0]+2.2,height-1]],holes:[],depth:half*2+2,z,
      bevel:.45,round:.65,color:"#2b3233",roughness:.91,metalness:0});
  }
  // Small cheek logo; lettering and guard proportions follow the owner's bike.
  const p=lerp(start,end,.78);
  const cheek=bvh.raycastFirst(new Ray(new Vector3(p[0],p[1]+1,centerZ(p[0],p[1])+35),new Vector3(0,0,-1)),DoubleSide);
  parts.push({...label([p[0],p[1]+1,(cheek?.point.z??centerZ(p[0],p[1])+10)+2.5],"SANTA CRUZ",40,5,
    Math.atan2(end[1]-start[1],end[0]-start[0]),"#454c4b",false,true),roughness:.9});
  carbon.dispose();
  return parts;
}
