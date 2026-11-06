import { add, geometryAnchors, lerp } from "./geometry";
import { visualChainringOffset } from "./crankPedals";
import { label, ring, tube, type Point, type Primitive } from "./primitives";

type XY=[number,number];
const { rear,bb }=geometryAnchors();
export const chainPitch=12.7;
export const pitchRadius=(teeth:number)=>chainPitch/(2*Math.sin(Math.PI/teeth));
export const cassetteTeeth=[52,44,38,32,28,24,21,18,16,14,12,10];
export const cassettePlane=(index:number)=>24+index*3.65;
// A visible middle gear, with both jockey wheels aligned to that actual cog.
export const selectedGear=3;
export const ringCenter=add(bb,0,0,visualChainringOffset);
export const selectedCog=add(rear,0,0,cassettePlane(selectedGear));
export const upperPulley=add(selectedCog,32,-105);
export const lowerPulley=add(selectedCog,4,-190);
export type ChainWheel={center:Point;radius:number;turn:1|-1};
export const chainWheels:ChainWheel[]=[
  {center:selectedCog,radius:pitchRadius(cassetteTeeth[selectedGear]!),turn:-1},
  {center:ringCenter,radius:pitchRadius(32),turn:-1},
  {center:lowerPulley,radius:pitchRadius(14),turn:-1},
  {center:upperPulley,radius:pitchRadius(12),turn:1},
];
export type ChainSegment={length:number;at:(t:number)=>Point;wheel?:ChainWheel};

// Common tangents, including the internal tangents that create the pulley S-bend.
// Z interpolates only on the free runs; wraps stay in their sprocket's plane.
export function chainRoute(wheels:ChainWheel[]=chainWheels):ChainSegment[] {
  const tangents=wheels.map((a,i)=>{
    const b=wheels[(i+1)%wheels.length]!;
    const dx=b.center[0]-a.center[0],dy=b.center[1]-a.center[1],distance=Math.hypot(dx,dy);
    const angle=Math.atan2(dy,dx)+Math.acos((b.turn*b.radius-a.turn*a.radius)/distance);
    const nx=Math.cos(angle),ny=Math.sin(angle);
    return {from:add(a.center,-a.turn*a.radius*nx,-a.turn*a.radius*ny),
      to:add(b.center,-b.turn*b.radius*nx,-b.turn*b.radius*ny)};
  });
  return wheels.flatMap((wheel,i)=>{
    const entry=tangents[(i+wheels.length-1)%wheels.length]!.to;
    const exit=tangents[i]!.from;
    const a=Math.atan2(entry[1]-wheel.center[1],entry[0]-wheel.center[0]);
    const b=Math.atan2(exit[1]-wheel.center[1],exit[0]-wheel.center[0]);
    const sweep=wheel.turn*((wheel.turn*(b-a)+Math.PI*4)%(Math.PI*2));
    const {from,to}=tangents[i]!;
    return [{wheel,length:Math.abs(sweep)*wheel.radius,at:(t:number)=>
      add(wheel.center,wheel.radius*Math.cos(a+sweep*t),wheel.radius*Math.sin(a+sweep*t))},
    {length:Math.hypot(...to.map((v,j)=>v-from[j]!)),at:(t:number)=>lerp(from,to,t)}];
  });
}
export function chainJoints(wheels:ChainWheel[]=chainWheels,jointCount?:number,phase=0):Point[] {
  const route=chainRoute(wheels),length=route.reduce((sum,s)=>sum+s.length,0);
  // Even number closes the alternating inner/outer plates without a seam.
  const count=jointCount??2*Math.round(length/chainPitch/2);
  return Array.from({length:count},(_,i)=>{
    let distance=((i*length/count+phase)%length+length)%length;
    for(const segment of route) {
      if(distance<=segment.length) return segment.at(distance/segment.length);
      distance-=segment.length;
    }
    return route[0]!.at(0);
  });
}
export function chainParts():Primitive[] {
  return [{kind:"chain",joints:chainJoints(),pitch:chainPitch,color:"#a6aaa4",metalness:.82,roughness:.36}];
}

function circle(at:Point,r:number):XY[] {
  return Array.from({length:32},(_,i)=>[at[0]+r*Math.cos(i*Math.PI/16),at[1]+r*Math.sin(i*Math.PI/16)]);
}
export function sprocket(at:Point,teeth:number,color:string,style:"cassette"|"ring"|"pulley"="cassette"):Primitive[] {
  const radius=pitchRadius(teeth),count=style==="cassette"?Math.max(6,Math.round(teeth/3)):6;
  const polar=(r:number,a:number):XY=>[at[0]+r*Math.cos(a),at[1]+r*Math.sin(a)];
  const engaged=chainWheels.some(w=>w.center.every((v,i)=>Math.abs(v-at[i]!)<1e-6) && Math.abs(w.radius-radius)<1e-6);
  const seated=engaged?chainJoints().find(p=>Math.abs(p[2]-at[2])<1e-6 && Math.abs(Math.hypot(p[0]-at[0],p[1]-at[1])-radius)<.001):undefined;
  const phase=seated?Math.atan2(seated[1]-at[1],seated[0]-at[0]):0;
  const contour:XY[]=Array.from({length:teeth*6},(_,i)=>{
    // Tapered tooth shoulders, narrow tips and generous roller valleys.
    const radii=[-3.5,-2.5,2,2.3,-1.8,-3.5];
    return polar(radius+radii[i%6]!,phase+i*Math.PI*2/(teeth*6));
  });
  const holes:XY[][]=[circle(at,style==="ring"?12:style==="pulley"?4:8)];
  if(radius>28 || style!=="cassette") for(let i=0;i<count;i++) {
    const a=i*Math.PI*2/count,span=Math.PI*2/count;
    holes.push([polar(radius*.32,a+.12),
      ...Array.from({length:6},(_,j)=>polar(radius*.79,a+.11+(span-.25)*j/5)),polar(radius*.38,a+span-.12)]);
  }
  if(style==="cassette" && teeth>=24) {
    // Perforate the exposed annulus, outside the next smaller cog: holes deep
    // in the spider alone disappear visually behind the rest of the stack.
    const nextTeeth=cassetteTeeth[cassetteTeeth.indexOf(teeth)+1]!;
    const nextRadius=pitchRadius(nextTeeth),mid=(radius+nextRadius)/2;
    const half=Math.max(.9,Math.min(2,(radius-nextRadius-6)/2));
    for(let i=0;i<12;i++) {
      const a=i*Math.PI/6+.18;
      const center=polar(mid,a+.085);
      holes.push(Array.from({length:16},(_,j)=>{
        const t=j*Math.PI/8,radial=half*Math.cos(t),tangent=mid*.085*Math.sin(t);
        return [center[0]+radial*Math.cos(a+.085)-tangent*Math.sin(a+.085),
          center[1]+radial*Math.sin(a+.085)+tangent*Math.cos(a+.085)] as XY;
      }));
    }
  }
  const parts:Primitive[]=[{kind:"profile",contour,holes,z:at[2],depth:style==="pulley"?3:2.2,
    bevel:.22,round:style==="ring"?1.1:0,color,metalness:style==="pulley"?.15:.78,roughness:.4}];
  if(style==="cassette" && teeth>21) {
    // Small rivets/ramp lands on the exposed edge of the larger cogs.
    for(let i=0;i<6;i++) {
      const a=i*Math.PI/3+.12,p=polar(radius*.87,a);
      parts.push(tube([p[0],p[1],at[2]+1.15],[p[0],p[1],at[2]+1.5],1.1,"#40484b"));
    }
  }
  return parts;
}
export function chainringParts():Primitive[] {
  const radius=pitchRadius(32),angle=Math.PI/3;
  // A small etched tooth-count mark on a solid spider arm makes subtle crank
  // kickback readable without exaggerating the chainring's rotation.
  const marking=label(add(ringCenter,radius*.6*Math.cos(angle),radius*.6*Math.sin(angle),1.45),
    "32T",18,5,angle,"#c3cbc9",false,true);
  return [...sprocket(ringCenter,32,"#485054","ring"),marking];
}
export function cassetteParts():Primitive[] {
  return [
    ...cassetteTeeth.flatMap((teeth,i)=>sprocket(add(rear,0,0,cassettePlane(i)),teeth,i<2?"#171d20":"#40484b")),
    {kind:"sleeve",from:add(rear,0,0,63.5),to:add(rear,0,0,66),innerRadius:6.2,outerRadius:12,color:"#171d20"},
    ring(add(rear,0,0,66.2),10,.8,"#40484b"),
  ];
}

// Register the close-up's axle and pulley centers to the existing chain pose.
// The lower cage is allowed to articulate while the upper forged body stays rigid.
export function derailleurReferencePoint(x:number,y:number,z=80):Point {
  if(y<=434) {
    const t=(y-74)/360;
    return add(rear,.28*(x-260)+16.04*t,-105*t,z);
  }
  const t=(y-434)/330;
  return add(rear,.28*(x-317)+32-26.32*t,-105-85*t,z);
}
export const derailleurCagePivot=derailleurReferencePoint(430,498,selectedCog[2]);

export function derailleurParts():Primitive[] {
  const p=derailleurReferencePoint;
  const xy=(points:XY[]):XY[]=>points.map(([x,y])=>{const at=p(x,y);return [at[0],at[1]];});
  const plate=(outline:XY[],holes:XY[][],z:number,depth:number,color:string,bevel=1,round=1.8):Primitive=>({
    kind:"profile",contour:xy(outline),holes:holes.map(xy),z,depth,bevel,round,color,roughness:.43,metalness:.5,
  });
  const circleAt=(x:number,y:number,r:number):XY[]=>Array.from({length:36},(_,i)=>[x+r*Math.cos(i*Math.PI/18),y+r*Math.sin(i*Math.PI/18)]);
  const bolt=(x:number,y:number,z:number,r:number):Primitive[]=>{
    const at=p(x,y,z),hex:XY[]=Array.from({length:6},(_,i)=>[at[0]+r*.42*Math.cos(i*Math.PI/3),at[1]+r*.42*Math.sin(i*Math.PI/3)]);
    return [ring(add(at,0,0,-.3),r,.45,"#161d20"),
      {kind:"profile",contour:circle(at,r*.87),holes:[hex],z,depth:.65,bevel:.12,round:0,color:"#a3aaa6",metalness:.85,roughness:.32},
      {kind:"profile",contour:hex,holes:[],z:z-.65,depth:.15,bevel:0,round:0,color:"#121719"}];
  };
  const slot:XY[]=[[218,117],[269,128],[274,164],[200,151]];
  const mount:XY[]=[[204,63],[216,36],[240,24],[269,23],[295,38],[313,63],[320,211],[321,269],
    [286,318],[232,277],[183,237],[173,204]];
  const linkageWindows:XY[][]=[[[328,290],[361,315],[346,357],[319,341]],[[383,348],[425,366],[412,406],[370,384]]];
  const parts:Primitive[]=[
    // Separate battery shell, door, gasket and latch behind the forged axle link.
    plate([[178,124],[214,133],[247,185],[274,289],[313,346],[281,380],[200,344],[139,301],[76,263],[110,186],[150,140]],[],70,21,"#20272a",2.2,3),
    plate([[157,153],[190,143],[214,172],[226,217],[196,242],[123,217]],[],81.7,1.4,"#343b3e",.7),
    plate([[110,224],[170,235],[213,286],[281,343],[267,361],[196,329],[126,282],[85,259]],[],81.8,1,"#171e21",.5),
    plate([[186,253],[219,260],[282,320],[305,345],[286,361],[239,331],[175,280]],[],83,1.2,"#2c3437",.5),
    plate([[117,215],[149,203],[175,216],[158,237],[128,239]],[],84,1.2,"#171d20",.6),
    // Main casting has an actual top window and the through axle bore.
    plate(mount,[slot,circleAt(260,74,29)],82,8,"#626b70",1.8,2.5),
    plate([[205,157],[267,177],[276,210],[240,244],[198,223],[183,204]],[],87.1,1.4,"#151c20",.7),
    label(p(231,196,88.4),"GX",16.7,8.5,-.34,"#e0e3dd",false,true),
    label(p(229,215,88.4),"SRAM",12.6,3.5,-.34,"#cbd0c9",false,true),
    {kind:"sleeve",from:p(260,74,78),to:p(260,74,88),innerRadius:6.1,outerRadius:10.7,color:"#252d30",metalness:.8},
    ring(p(260,74,88.4),10.8,.55,"#a7aeab"),
    // Open parallelogram with two rails and two genuine linkage windows.
    plate([[312,236],[364,266],[491,379],[551,402],[571,442],[574,478],[551,510],[511,529],[428,530],
      [381,459],[300,415],[247,395],[225,378],[273,316]],linkageWindows,76,16,"#282f33",1.8,2.6),
    plate([[318,253],[366,280],[488,390],[474,412],[432,387],[369,329],[309,295]],[],85.1,2,"#535d62",.7),
    plate([[352,325],[389,337],[442,365],[429,405],[410,429],[370,408],[339,373]],
      [[[382,351],[422,368],[410,402],[371,382]]],86.7,1.8,"#657076",.75),
    plate([[237,379],[269,381],[344,420],[424,457],[420,467],[365,448],[292,414],[248,402]],[],86.5,2.3,"#3a4347",.8),
    plate([[444,379],[478,392],[458,431],[432,438],[430,420]],[],87,1.3,"#10171a",.5),
    // Beveled polygonal clutch cover, raised rim and recessed center emblem.
    plate([[494,398],[544,417],[567,444],[572,474],[550,501],[511,521],[466,518],[436,492],[441,454],[464,419]],[],87,4,"#454e52",1.5,2.5),
    plate([[498,414],[538,431],[553,450],[557,473],[539,490],[510,506],[477,502],[454,483],[457,456],[477,430]],[],90,1.2,"#30383c",.65),
    // Cage-lock button and its red annulus.
    tube(p(430,498,84),p(430,498,90),4.5,"#161d21"),
    ring(p(430,498,90.4),3.5,.65,"#873b3c"),
    label(p(456,542,selectedCog[2]+7.85),"A B",6,2.3,-1.02,"#9c4241",false,true),
    label(p(139,260,84),"AXS",6,2.1,-.9,"#aab2ad",false,true),
  ];
  parts.push(...bolt(260,74,89.6,7.8),...bolt(136,219,85.1,2.2),...bolt(191,252,84.7,1.8));
  for(const [x,y] of [[296,198],[279,260]]) {
    parts.push(tube(p(x!,y!,86.6),p(x!,y!,87.9),3.2,"#141c20"),ring(p(x!,y!,88),3.3,.35,"#939d9e"));
  }
  // Subtle geometric eagle feathers embossed into the clutch cover.
  for(let i=0;i<3;i++) for(const side of [-1,1]) {
    const x=509+side*(9+i*6),y=473-i*8;
    parts.push(tube(p(x,y,91),p(509,486-i*4,91),.38,"#11191c"));
  }
  parts.push(tube(p(506,476,91),p(513,483,91),.65,"#11191c"));
  // Two thin cage plates flank the chain, leaving the pulleys and long center open.
  const cage:XY[]=[[303,478],[349,487],[426,484],[466,515],[402,644],[346,744],[385,780],[432,816],
    [410,846],[334,896],[240,878],[179,831],[123,761],[133,728],[249,741],[279,657],[284,533]];
  const cageHoles:XY[][]=[
    [[312,541],[407,537],[348,647],[310,700],[301,653]],
    [[151,747],[200,753],[172,778]],
    [[207,779],[244,795],[263,814],[290,813],[303,831],[279,850],[241,838],[210,815],[185,787]],
    [[344,786],[371,795],[405,818],[385,838],[331,874],[296,863],[316,837]],
  ];
  const cageStart=parts.length;
  for(const side of [-1,1]) parts.push(plate(cage,cageHoles,selectedCog[2]+side*5.4,2.1,side>0?"#30393d":"#1a2225",.65,1.3));
  // Stiff raised spine follows the descending outer cage arm.
  parts.push(plate([[425,543],[447,545],[382,670],[337,747],[312,757],[309,735],[368,652]],[],selectedCog[2]+7.05,.9,"#4b5559",.35,1));
  // Tapered cross-axis boss joins the clutch housing to the cage assembly.
  parts.push(tube(p(430,498,75),p(430,498,selectedCog[2]+6.8),7,"#333d41",5.8));
  for(const [center,teeth,photo] of [[upperPulley,12,[317,434]],[lowerPulley,14,[311,764]]] as const) {
    parts.push(...sprocket(center,teeth,"#182023","pulley"));
    for(const face of [-1,1]) {
      parts.push(ring(add(center,0,0,face*1.9),pitchRadius(teeth)*.77,.7,"#424c50"),
        {kind:"sleeve",from:add(center,0,0,face*2),to:add(center,0,0,face*6.9),innerRadius:2,outerRadius:5.6,color:"#20292d"});
    }
    parts.push(...bolt(photo[0],photo[1],selectedCog[2]+7.65,3.8));
  }
  return parts.map((part,i)=>i>=cageStart?{...part,motion:"derailleur-cage" as const}:part);
}
