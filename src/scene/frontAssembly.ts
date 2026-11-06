import { burgtecStemParts } from "./burgtecStem";
import { gripBasis } from "./ergonGrip";
import { caliperHosePort, caliperHoseApproach } from "./brakeGeometry";
import { archForwardBow, archLocalPoint } from "./forkArchGeometry";
import { ownerCockpit, loamCarbon } from "../data/bikeSetup";
import { add, geometryAnchors } from "./geometry";
import { label, ring, sweep, tube, type Point, type Primitive } from "./primitives";
import { mavenControlParts, mavenControlPoint } from "./mavenControls";
import { flowingCable } from "./cables";
import { headCablePort, headCableApproach, headPoint, headSection } from "./headTube";

// Millimeters. Width is owner-measured; crown surfaces, stem length, rise,
// sweep, spacer stack and control placement are visual estimates from the photos.
const { head, headBottom, crown, down, front } = geometryAnchors();
const black = "#151a1d", metal = "#525c63";
export const steeringAxis = (height: number): Point => add(head, -down[0] * height, -down[1] * height);
export const spacerHeight = 9;
export const cockpitRise = 2 * spacerHeight;
const stemAxis = (height:number) => steeringAxis(height+cockpitRise);
export const barCenter = add(stemAxis(38), 42, 10);
// The axle offset is not all in the crown. Keep a compact crown, parallel
// stanchions/steerer, and carry the remaining offset in the lower dropout lugs.
// This 12 mm crown offset is a photo-based shape estimate, not a FOX dimension.
const forward: Point = [-down[1], down[0], 0];
export const stanchionTop = add(crown, down[0] * 12 + forward[0] * 12, down[1] * 12 + forward[1] * 12);
const legLength = (front[0] - stanchionTop[0]) * down[0] + (front[1] - stanchionTop[1]) * down[1];
export const legAt = (distance: number, side: number): Point => add(stanchionTop, down[0] * distance, down[1] * distance, side * 66);
const sleeve = (from: Point, to: Point, innerRadius: number, outerRadius: number, color = black): Primitive =>
  ({ kind: "sleeve", from, to, innerRadius, outerRadius, color });
const offsetAxis = (point: Point, distance: number) => add(point, -down[0] * distance, -down[1] * distance);
export const dustSealDistance = 184;
// Lower socket lips give the crown arms room to rise into the center boss.
export const crownSleeveTop = -6;

export function forkTopControls(side: number): Primitive[] {
  const top=legAt(0,side), damper=side>0;
  const at=(height:number) => offsetAxis(top,crownSleeveTop+(height-18)*.55);
  const blue="#227eb5", bright="#60b5e4";
  const parts:Primitive[]=[
    tube(at(18),at(20),17,"#10171c"),
    {...tube(at(20),at(21.5),16,"#4b5358"),metalness:.8,roughness:.24},
    {...tube(at(21.5),at(26.5),damper?16:14,blue,damper?16:10),metalness:.72,roughness:.25},
    tube(at(26.5),at(damper?30:29),damper?10:9,damper?"#202a31":blue,damper?9:3.5),
    tube(at(damper?30:29),at(damper?31:29.7),3,"#728b99"),
  ];
  for(let i=0;i<(damper?16:8);i++) {
    const a=i*Math.PI*2/(damper?16:8), r=damper?15.4:12;
    const p=add(at(24),forward[0]*Math.cos(a)*r,forward[1]*Math.cos(a)*r,Math.sin(a)*r);
    parts.push({...tube(offsetAxis(p,-1.8),offsetAxis(p,1.8),damper?1.8:1.5,bright),metalness:.65,roughness:.25});
  }
  if(damper) {
    // Smaller concentric compression dial, its grip notches and index mark.
    for(let i=0;i<10;i++) {
      const a=i*Math.PI/5, p=add(at(28.5),forward[0]*Math.cos(a)*9,forward[1]*Math.cos(a)*9,Math.sin(a)*9);
      parts.push(tube(offsetAxis(p,-1.1),offsetAxis(p,1.1),1,"#445966"));
    }
    parts.push(tube(add(at(30.4),forward[0]*4,forward[1]*4),add(at(30.4),forward[0]*8,forward[1]*8),.6,"#d4e6ed"));
  }
  return parts;
}

export function forkArch(): Extract<Primitive, { kind: "fork-arch" }> {
  return { kind: "fork-arch", root: legAt(dustSealDistance + 8, 0), scale: 1,
    color: black, roughness: .46, metalness: .22 };
}

export const crownArmRoot=add(crown,down[0]*3,down[1]*3);
export const crownArmSeat=(side:number):Point=>offsetAxis(legAt(0,side),crownSleeveTop-8);
export function forkCrownParts():Primitive[] {
  // Rounded central boss beneath the headset, with slimmer arms sweeping
  // down into the leg sockets. Keep the top face aligned with the crown race.
  const boss={...sweep([offsetAxis(crown,-18),offsetAxis(crown,-12),crown,offsetAxis(crown,6.5)],
    [24.5,27.5,headSection.bottomRadius,headSection.bottomRadius],headSection.bottomRadius,black),circular:true,roughness:.4,metalness:.24};
  const arms=[-1,1].map(side=>{
    const at=(height:number,advance:number,z:number):Point=>
      add(crown,down[0]*height+forward[0]*advance,down[1]*height+forward[1]*advance,side*z);
    return {...sweep([crownArmRoot,at(3.5,1.5,22),at(6,4,30),at(19,8,42),at(25,11,52),crownArmSeat(side)],
      [17.5,15.5,13.5,11.5,13,14],9.5,black),smoothFrame:true,roughness:.4,metalness:.24};
  });
  return [boss,...arms];
}

export function forkParts(): Primitive[] {
  const parts: Primitive[] = [
    // The one continuous steerer is hidden by the frame and hollow stem clamp.
    tube(steeringAxis(-140), steeringAxis(-75), 19, metal, 14.3),
    tube(steeringAxis(-75), stemAxis(54), 14.3, metal),
    ...forkCrownParts(),
    tube(add(front, 0, 0, -77), add(front, 0, 0, 77), 7.5, metal),
  ];
  for (const side of [-1, 1]) {
    const top = legAt(0, side);
    parts.push(

      tube(offsetAxis(top, -24), offsetAxis(top, crownSleeveTop), 23, black),
      { ...tube(offsetAxis(top,crownSleeveTop), legAt(198, side), 18, "#14191d"), metalness: 0.86, roughness: 0.12 },
      { ...tube(legAt(192, side), legAt(legLength - 18, side), 24, black, 20), roughness: 0.52, metalness: 0.2 },
      sleeve(legAt(dustSealDistance, side), legAt(198, side), 18.1, 25, "#25292b"),
      sleeve(legAt(dustSealDistance-3, side), legAt(dustSealDistance+2, side), 18, 22, "#101316"),
      sweep([legAt(legLength - 28, side), legAt(legLength - 8, side), add(front, 0, 0, side * 66)], [21, 20, 15], 17, black),
      sleeve(add(front, 0, 0, side * 60), add(front, 0, 0, side * 79), 7.6, 15, "#242b2f"),
      ring(add(front,0,0,side*80), 10, 1.3, "#687378"),
      tube(add(front,0,0,side*78), add(front,0,0,side*82), 6, "#101519"),
      ...forkTopControls(side),
    );
    // Pressure-release button behind each lower, and bottom foot hardware.
    const bleeder=legAt(225,side);
    parts.push(tube(add(bleeder,-forward[0]*20,-forward[1]*20),add(bleeder,-forward[0]*29,-forward[1]*29),7,"#252e33"));
    parts.push(tube(add(bleeder,-forward[0]*29,-forward[1]*29),add(bleeder,-forward[0]*31,-forward[1]*31),4.5,"#505a5f"));
    parts.push(tube(legAt(legLength-12,side),legAt(legLength+3,side),8,"#242d31"));
    parts.push(tube(legAt(legLength+3,side),legAt(legLength+7,side),side < 0 ? 5 : 7,side < 0 ? "#3b454b" : "#a62628"));
    const pinch=add(front,-9,-19,side*76);
    if (side > 0) parts.push(tube(add(pinch,0,0,-5),add(pinch,0,0,3),6,black),ring(add(pinch,0,0,4),3,1,"#8a9397"));
  }
  parts.push(forkArch());
  const root=legAt(dustSealDistance+8,0);
  for (const side of [-1,1]) {
    // Paired tapered fins merge into each shoulder of the casting.
    for (const inset of [-5, 5]) {
      parts.push(sweep([add(legAt(220,side),12,0,inset),
        add(root,...archLocalPoint(0,9,side*72+inset)),
        add(root,...archLocalPoint(32,archForwardBow(32)+10,side*62+inset))], [4,4,1.5], 3, black));
    }
  }
  // Small hose guide fixed to the left arch shoulder.
  const guide=(depth:number) => add(root,...archLocalPoint(30,archForwardBow(30)+depth,-68));
  parts.push(tube(guide(10),guide(19),5,black));
  parts.push(tube(guide(19),guide(21),2,"#9aa3a6"));
  // Sag indicator around the air-side stanchion.
  parts.push(sleeve(legAt(117,-1),legAt(119,-1),18,18.8,"#111619"));
  for (const side of [-1, 1]) {
    const radiusAt=(distance:number) => 24+(20-24)*(distance-192)/(legLength-18-192)+.18;
    parts.push({kind:"fork-decal",from:legAt(211,side),to:legAt(legLength-52,side),
      radius:radiusAt(211),endRadius:radiusAt(legLength-52),forward,side,color:"#d8dcdd"});
  }
  // Telescoping lowers retain their meshes; compression only moves their group.
  const axial=(p:Point)=>(p[0]-stanchionTop[0])*down[0]+(p[1]-stanchionTop[1])*down[1];
  return parts.map(part=>{
    const points=part.kind==="tube"||part.kind==="sleeve"||part.kind==="fork-decal"?[part.from,part.to]
      :part.kind==="sweep"?part.points:part.kind==="ring"?[part.at]:part.kind==="fork-arch"?[part.root]:[];
    return points.length && points.every(p=>axial(p)>=150)?{...part,motion:"fork-lowers" as const}:part;
  });
}

export function headsetParts(): Primitive[] {
  return [
    // Bearing cups sit in the carbon counterbores, with their rims flush.
    sleeve(headPoint(120-headSection.seatDepth,0), headBottom, 19.1, 27),
    sleeve(headPoint(headSection.seatDepth,0), head, 14.4, 22),
    sleeve(headBottom, headPoint(121.5,0), 19.1, 21.5),
    sleeve(steeringAxis(0), steeringAxis(10), 14.4, 19),
    ...[0,1,2].flatMap(i=>[
      sleeve(steeringAxis(10+i*spacerHeight), steeringAxis(18.5+i*spacerHeight), 14.4, 17),
      sleeve(steeringAxis(18.5+i*spacerHeight), steeringAxis(19+i*spacerHeight), 14.4, 16.7,"#394247"),
    ]),
  ];
}

export function stemParts(): Primitive[] {
  return burgtecStemParts(barCenter,stemAxis);
}

export function barAt(z: number): Point {
  const distance=Math.abs(z),half=ownerCockpit.handlebarWidthMm/2;
  const back=Math.tan(loamCarbon.backsweepDegrees*Math.PI/180),up=Math.tan(loamCarbon.upsweepDegrees*Math.PI/180);
  const outerY=(d:number)=>loamCarbon.riseMm-(half-d)*up;
  // Shorter low center section; the outer sweep and owner-measured grip positions stay fixed.
  const knots=[[0,0,0],[45,0,0],[95,-3,8],[155,-13,outerY(155)],[180,-15,outerY(180)],[half,-15-(half-180)*back,loamCarbon.riseMm]];
  const index=Math.min(knots.length-2,Math.max(0,knots.findIndex(k=>distance<=k[0]!)-1));
  const a=knots[index]!,b=knots[index+1]!,t=(distance-a[0]!)/(b[0]!-a[0]!);
  return add(barCenter,a[1]!+(b[1]!-a[1]!)*t,a[2]!+(b[2]!-a[2]!)*t,z);
}
export function handlebarParts(): Primitive[] {
  const half=ownerCockpit.handlebarWidthMm/2;
  const parts:Primitive[]=[{...sweep([-half,-245,-180,-155,-95,-45,0,45,95,155,180,245,half].map(barAt),
    [11.1,11.1,12,12.5,14,17.5,17.5,17.5,14,12.5,12,11.1,11.1],11.1,"#181d20"),circular:true,roughness:.48,metalness:.12}];
  for(const side of [-1,1]) {
    // Low-contrast diagonal Loam graphics follow the top of the tapered section.
    for(let d=140;d<232;d+=13) {
      const height=(z:number)=>z<180?14-(z-120)/30:12-(z-180)*.9/65;
      parts.push(sweep([add(barAt(side*d),-5,height(d)-.4),add(barAt(side*(d+6)),0,height(d+6)+.2),add(barAt(side*(d+10)),5,height(d+10)-.4)],
        [1.2,1.2,1],.3,"#34393d"));
    }
    parts.push({...label(add(barAt(side*204),0,12.2),"PNW",28,6.5,0,"#a1a6a5",false,true),basis:{right:[0,0,side],normal:[0,1,0]}});
    parts.push({...label(add(barAt(side*27),0,17.8),"LOAM CARBON",30,3,0,"#838a8c",false,true),basis:{right:[0,0,side],normal:[0,1,0]}});
    for(const d of [29,35,41]) parts.push(tube(add(barAt(side*d),-4,17.25),add(barAt(side*d),4,17.25),.22,"#71797b"));
  }
  return parts;
}
export function gripParts(): Primitive[] {
  const half=ownerCockpit.handlebarWidthMm/2;
  return [-1,1].flatMap(side=>{
    const at=(d:number)=>barAt(side*d),from=at(half-126),to=at(half);
    const {back,up}=gripBasis({from,to});
    const point=(d:number,b:number,u:number):Point=>{
      const p=at(d);return [p[0]+back.x*b+up.x*u,p[1]+back.y*b+up.y*u,p[2]+back.z*b+up.z*u];
    };
    const parts:Primitive[]=[
      {kind:"ergon-grip",from,to,radius:16,wing:14,color:"#242728"},
      sleeve(at(half-134),at(half-126),11.15,16.1,"#262c2e"),
      sleeve(at(half-126.7),at(half-125.7),11.2,16.2,"#11181a"),
      tube(point(half-130,1,15.6),point(half-130,1,17),2.3,"#151b1e"),
      tube(point(half-130,1,17),point(half-130,1,17.2),1,"#7d888a"),
    ];
    [..."ERGON GA3"].forEach((character,i)=>{
      if(character===" ") return;
      const angle=.12+i*.145;
      parts.push({...label(point(half-130,16.3*Math.cos(angle),16.3*Math.sin(angle)),character,1.8,3,0,"#c1c7c2",false,true),
        basis:{right:up.clone().multiplyScalar(Math.cos(angle)).addScaledVector(back,-Math.sin(angle)).toArray() as Point,
          normal:back.clone().multiplyScalar(Math.cos(angle)).addScaledVector(up,Math.sin(angle)).toArray() as Point}});
    });
    return parts;
  });
}

export const brakeOutlet = (side: number): Point => mavenControlPoint(barAt(side*233),side,27,-9,-63);
export function brakeControlParts(side: number): Primitive[] {
  return [sleeve(barAt(side*227),barAt(side*240),11.3,14.7,black),
    ...mavenControlParts(barAt(side*233),side,brakeOutlet(side))];
}
export function frontBrakeHose(): Primitive {
  return flowingCable([brakeOutlet(-1),add(brakeOutlet(-1),12,-9,40),
    add(barCenter,88,-32,-96),add(head,89,-77,-71),
    add(legAt(160,-1),24,7,-19),add(legAt(255,-1),4,0,-19),
    caliperHoseApproach("front"),caliperHosePort("front")]);
}
export function rearBrakeHose(): Primitive {
  return flowingCable([brakeOutlet(1),add(brakeOutlet(1),5,-2,-32),
    add(barCenter,94,-43,91),add(head,105,20,10),
    headCableApproach(-1),headCablePort(-1)]);
}
