import { frameCableGasket,frameCableOutlet } from "./cableGasket";
import { referenceInnerLower,referenceInnerUpper } from "./frameProfileFit";
import { framePaint } from "./frameColors";
import { add, geometryAnchors, lerp } from "./geometry";
import { frameAnchors, frameTrace } from "./frameCoordinates";
import { label, ring, sweep, tube, type Point, type Primitive } from "./primitives";
import { flowingCable } from "./cables";

export type BrakeEnd = "front" | "rear";
type XY = [number, number];
const { front, rear, down, crown } = geometryAnchors();
const silver = "#b9c2c6", casting = "#a7b2b8", dark = "#242d31";
// The 180 mm reference rotors are retained. Exterior casting, pad and mounting
// details are reconstructed from the owner's close-up, not manufacturing data.
export const rotorRadius = 90;
export const caliperScale = 0.75;
export function brakePose(end: BrakeEnd) {
  const axle = end === "front" ? front : rear;
  // Inside the fork lower / rear stay, while remaining outside spoke flanges.
  const z = end === "front" ? -39 : -50;
  // Body orientation is independent of its position around the rotor. The
  // reference rear body is almost level; the front follows the fork axis.
  const angle = end === "front" ? Math.atan2(-down[0], down[1]) : Math.PI / 2 - 4 * Math.PI / 180;
  const n: XY = [Math.cos(angle), Math.sin(angle)];
  const tangent: XY = [n[1], -n[0]];
  const rotor = add(axle, 0, 0, z);
  const center = end === "front" ? add(rotor, -94, 11) : add(rotor, 36, 74);
  const point = (u: number, v: number, depth = 0): Point =>
    add(center, (n[0] * v + tangent[0] * u) * caliperScale,
      (n[1] * v + tangent[1] * u) * caliperScale, depth * caliperScale);
  return { axle, rotor, angle, tangent, point };
}
// Each hose enters the same end of the casting: upper on the fork, forward on the rear stay.
export const caliperHosePort = (end: BrakeEnd) => brakePose(end).point(46, 12, -17);
export const caliperHoseApproach = (end: BrakeEnd) => brakePose(end).point(78, 12, -17);
// Lower entry on the non-drive side, just around the inner/top corner below the door.
const innerLower=referenceInnerLower,innerUpper=referenceInnerUpper;
const innerLength=Math.hypot(innerUpper[0]-innerLower[0],innerUpper[1]-innerLower[1]);
const innerNormal:Point=[-(innerUpper[1]-innerLower[1])/innerLength,(innerUpper[0]-innerLower[0])/innerLength,0];
export const rearFrameHoseNormal:Point=[0,0,-1];
export const rearFrameHoseSurface:Point=add(lerp(innerLower,innerUpper,.15),-innerNormal[0]*4,-innerNormal[1]*4,-33.5);
export const rearFrameHoseDirection:Point=[-.75,-.12,-Math.sqrt(1-.75**2-.12**2)];
export const rearFrameHosePort:Point=frameCableOutlet(rearFrameHoseSurface,rearFrameHoseDirection);
export function rearFrameHoseFitting():Primitive {
  return frameCableGasket(rearFrameHoseSurface,rearFrameHoseDirection);
}

// Matching gasket on the underside/non-drive cheek of the rear stay. Its
// base is seated on the carbon skin, with the hose entering the open bore.
export const rearTriangleHoseSurface:Point=add(frameAnchors.rearPivot,-55,-19,-42.65);
export const rearTriangleHoseDirection:Point=[.78,-.12,-Math.sqrt(1-.78**2-.12**2)];
export const rearTriangleHosePort:Point=frameCableOutlet(rearTriangleHoseSurface,rearTriangleHoseDirection);
export function rearTriangleHoseFitting():Primitive {
  return {...frameCableGasket(rearTriangleHoseSurface,rearTriangleHoseDirection),motion:"rear"};
}

export function rearFrameBrakeHose(): Primitive {
  const { axle } = brakePose("rear");
  const port = caliperHosePort("rear");
  // Left / non-drive side is negative Z. One continuous exposed run joins
  // the frame exit, suspension loop, seatstay and rear caliper inlet.
  const rearEntry=rearTriangleHosePort;
  const points = [
    rearFrameHosePort,add(rearFrameHosePort,rearFrameHoseDirection[0]*22,rearFrameHoseDirection[1]*22,rearFrameHoseDirection[2]*22),
    // A relaxed U below the entry-to-entry chord, instead of an upward kink.
    add(lerp(rearFrameHosePort,rearEntry,.32),0,-28,-16),
    add(lerp(rearFrameHosePort,rearEntry,.65),0,-32,-10),
    add(rearEntry,...rearTriangleHoseDirection.map(v=>v*14) as Point),rearEntry,
    add(rearTriangleHoseSurface,...rearTriangleHoseDirection.map(v=>-v*16) as Point),
    // Ease the buried run into the stay instead of turning directly after the seal.
    add(rearTriangleHoseSurface,-55,-13.75,9),
    add(axle,125,90,-59),caliperHoseApproach("rear"),port,
  ];
  const hose=flowingCable(points);
  const entryIndex=hose.points.reduce((closest,point,i)=>
    Math.hypot(...point.map((v,j)=>v-rearEntry[j]!))<Math.hypot(...hose.points[closest]!.map((v,j)=>v-rearEntry[j]!))?i:closest,0);
  // Keep a sampled point exactly in the gasket bore, with a straight local
  // approach through the seal even when the rest of the hose is resampled.
  hose.points[entryIndex]=rearEntry;
  for(const offset of [-1,1]){
    const i=entryIndex+offset;
    if(i>0&&i<hose.points.length-1){
      const length=Math.hypot(...hose.points[i]!.map((v,j)=>v-rearEntry[j]!));
      hose.points[i]=add(rearEntry,...rearTriangleHoseDirection.map(v=>-offset*v*length) as Point);
    }
  }
  // Flex only the exposed bridge. From the rear-frame entry onward the hose
  // follows the rear triangle, retaining its route to the caliper.
  return {...hose,flexEnd:entryIndex/(hose.points.length-1)};
}

export function caliperMounts(end: BrakeEnd) {
  const { point: p, axle } = brakePose(end);
  return [-46, 46].map(u => {
    const foot = p(u,-7,-10);
    let support: Point;
    if (end === "rear") {
      // Land on the seatstay's upper shoulder, not its centerline. This gives
      // the forward ear a low platform and the dropout-side ear a taller post.
      const start = frameTrace(373,827), finish = frameTrace(805,678);
      const t = Math.max(0, Math.min(1, (foot[0]-start[0])/(finish[0]-start[0])));
      support = add(lerp(start, finish, t), 0, -5, -74 + t * 34);
    } else {
      // Same axis as the fork lower. The two cast posts meet a separate
      // adapter, rather than suspending the caliper on a long floating rod.
      const y = Math.max(axle[1] + 6, foot[1]);
      const legTop = add(crown, down[0]*12-down[1]*12, down[1]*12+down[0]*12);
      const x = legTop[0] + (y-legTop[1]) * down[0]/down[1];
      support = [x-12, y, -66];
    }
    const top = p(u,-15,-10);
    const shoulder = lerp(support, top, 0.72);
    return { u, foot, support, shoulder, top };
  });
}

function disc(center: Point, radius: number, sides = 48): XY[] {
  return Array.from({ length: sides }, (_, i) => [center[0] + Math.cos(i * Math.PI * 2 / sides) * radius,
    center[1] + Math.sin(i * Math.PI * 2 / sides) * radius]);
}
// Rear carbon posts belong to the moving frame; front posts stay with the fork
// brake assembly. The adapter, mounting bolts and casting are separate parts.
export function caliperSupportParts(end:BrakeEnd):Primitive[] {
  return caliperMounts(end).map(({support,shoulder,top})=> {
    if(end==="front") return sweep([support,shoulder,top],
      [9*caliperScale,8*caliperScale,7*caliperScale],8*caliperScale,"#151a1d");
    // Follow the stay before turning up into the post. The buried, broad root
    // rolls into a narrower neck instead of meeting the stay at a sharp elbow.
    const root=add(support,-5,-8,2),rise=lerp(support,top,.35);
    return {...sweep([root,support,rise,lerp(support,top,.78),top],
      [8.5,8,6.8,5.8,5.25],5.5,framePaint),roughness:.32,metalness:.12};
  });
}
function capsule(a: XY, b: XY, radius: number): XY[] {
  const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
  return [b, a].flatMap((p, end) => Array.from({ length: 9 }, (_, i) => {
    const theta = angle - Math.PI / 2 + (i / 8 + end) * Math.PI;
    return [p[0] + radius * Math.cos(theta), p[1] + radius * Math.sin(theta)] as XY;
  }));
}
function plate(contour: XY[], holes: XY[][], z: number, depth: number, color: string, bevel = 0.25, round = 0): Primitive {
  return { kind: "profile", contour, holes, z, depth, color, bevel, round,
    metalness: 0.48, roughness: 0.34 };
}
function socketBolt(at: Point, radius: number, scale = 1): Primitive[] {
  radius *= scale;
  const recess = Array.from({ length: 36 }, (_, i) => {
    const a = i * Math.PI / 18, r = radius * (0.38 + 0.09 * Math.cos(a * 6));
    return [at[0] + Math.cos(a) * r, at[1] + Math.sin(a) * r] as XY;
  });
  return [
    ring(at, radius * 0.96, radius * 0.13, dark),
    plate(disc(at, radius * 0.83, 32), [recess], at[2] - 0.8*scale, 1.5*scale, "#c3c6bc", 0.3*scale),
    plate(disc(at, radius * 0.52, 24), [], at[2] + 0.05*scale, 0.25*scale, "#303735", 0),
  ];
}
export function rotorParts(end: BrakeEnd): Primitive[] {
  const { rotor } = brakePose(end);
  const polar = (r: number, a: number): XY => [rotor[0] + Math.cos(a) * r, rotor[1] + Math.sin(a) * r];
  const arc = (radius:number,a:number,b:number,steps=12):XY[] =>
    Array.from({length:steps+1},(_,i)=>polar(radius,a+(b-a)*i/steps));
  const mix = (a:XY,b:XY,t:number):XY => [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  // Six rounded mounting ears surround a scalloped, star-shaped center opening.
  const center:XY[] = Array.from({length:6},(_,i)=>{
    const a=i*Math.PI/3;
    return [polar(15,a-.19),polar(15,a+.19),polar(27.3,a+.39),polar(27.3,a+.66)];
  }).flat();
  const holes:XY[][]=[center], coatings:XY[][]=[];
  for(let i=0;i<6;i++) {
    const a=i*Math.PI/3;
    const inner=polar(33,a+.22),outer=polar(74,a+.08);
    const low=mix(inner,outer,.27),high=mix(inner,outer,.39);
    const tipLow=polar(74,a+.70),tipHigh=polar(74,a+.77);
    // Each large swept window has a narrow diagonal steel brace. Separate
    // through-cutouts keep the brace physically part of the one-piece rotor.
    holes.push([high,...arc(74,a+.08,a+.70)]);
    holes.push([inner,low,...arc(74,a+.77,a+.99),polar(34,a+.88)]);
    coatings.push([low,high,tipLow,tipHigh]);
    holes.push(disc([...polar(22,a),rotor[2]],2.6,24));
  }
  // Long, swept track slots with three small round witness holes.
  for(let i=0;i<30;i++) {
    const a=i*Math.PI/15;
    holes.push(i%10===5 ? disc([...polar(82.8,a),rotor[2]],1.65,20)
      : capsule(polar(80.8,a-.047),polar(85.2,a+.047),1.15));
  }
  // Subtle sixfold reliefs in an otherwise circular steel braking edge.
  const edge=Array.from({length:240},(_,i)=>{
    const a=i*Math.PI/120;
    return polar(rotorRadius-.65*Math.pow((1-Math.cos(a*6))/2,8),a);
  });
  const parts:Primitive[]=[{...plate(edge,holes,rotor[2],1.8,"#bfc3bf",.1,1.25),metalness:.82,roughness:.43}];
  // Black heat-management strips follow the solid diagonal braces on both faces.
  for(const coating of coatings) for(const side of [-1,1])
    parts.push({...plate(coating,[],rotor[2]+side*1.025,.025,"#252827",0,.7),metalness:.25,roughness:.65});
  for(let i=0;i<6;i++) parts.push(...socketBolt([...polar(22,i*Math.PI/3),rotor[2]-1.6],4));
  // Compact laser-etched markings follow the braces, rather than the openings.
  for(const [index,text,width] of [[1,"SRAM  HS2 180mm",27],[3,"MIN.TH 1.7mm",23],[5,"ROTATION",19]] as const) {
    const strip=coatings[index]!;
    const from=mix(strip[0]!,strip[1]!, .5),to=mix(strip[2]!,strip[3]!, .5);
    const middle=mix(from,to,.53),direction=Math.atan2(to[1]-from[1],to[0]-from[0]);
    parts.push({...label([...middle,rotor[2]-1.075],text,width,1.55,0,"#d0d3cc",false,true),
      basis:{right:[-Math.cos(direction),-Math.sin(direction),0],normal:[0,0,-1]}});
  }
  return parts;
}

export function caliperParts(end: BrakeEnd): Primitive[] {
  const { point: p, tangent } = brakePose(end);
  const s = caliperScale;
  const bodyPlate = (points: XY[], z: number, depth: number, color: string, bevel: number, round: number) =>
    plate(points, [], z, depth*s, color, bevel*s, round*s);
  const outline: XY[] = [[-39,-10],[-42,8],[-33,18],[-23,19],[-20,30],[-6,32],
    [2,24],[13,25],[16,34],[29,31],[37,18],[39,1],[32,-17],[16,-24],[-11,-26],[-28,-21]];
  const face: XY[] = [[-29,-12],[-20,0],[1,8],[31,4],[31,-12],[15,-21],[-10,-22]];
  const mapped = (points: XY[]) => points.map(([u,v]) => { const q = p(u,v); return [q[0],q[1]] as XY; });
  const parts: Primitive[] = [
    bodyPlate(mapped(outline), p(0,0,-15)[2], 16, casting, 2.5, 4),
    bodyPlate(mapped(outline), p(0,0,13)[2], 14, "#6b777d", 2.5, 4),
    bodyPlate(mapped(face), p(0,0,-24.1)[2], 2, "#87969d", 1, 4),
    label(p(2,-10,-26.4), "MAVEN", 80*s, 16*s, Math.atan2(tangent[1], tangent[0]), "#edf0ec", true),
  ];
  // Two sides straddle the rotor; bridges remain outside the braking track.
  for (const u of [-24, 21]) {
    parts.push(tube(p(u,25,-15), p(u,25,13), 9*s, casting));
  }
  for (const depth of [-3, 3]) parts.push(bodyPlate(mapped([[-25,-12],[25,-12],[25,6],[-25,6]]), p(0,0,depth)[2], 1.1, "#a16e50", 0.5, 2));
  for (const [u,v] of [[-30,-10],[-17,8],[6,13],[29,10]]) parts.push(...socketBolt(p(u!,v!,-26.2), 5.4, s));
  parts.push(...socketBolt(p(-3,6,-26.4), 2.7, s));
  // Cast mounting ears and visible bolts. Rear supports are rendered by frame.
  for (const { u, foot } of caliperMounts(end)) {
    parts.push(tube(p(u > 0 ? 30 : -30,-7,-10), foot, 8*s, casting));
    parts.push(tube(p(u,-15,-10), p(u,-4,-10), 8*s, silver), tube(p(u,-5,-10), p(u,2,-10), 5*s, "#cbd0cc"));
  }
  if (end === "front") {
    parts.push(...caliperSupportParts(end));
    // A slim, bowed adapter ties the two fork posts together behind the body.
    parts.push(sweep([p(-46,-17,-10), p(0,-23,-10), p(46,-17,-10)], [4,4,4], 4, "#252c30"));
  }
  const port = caliperHosePort(end);
  parts.push(tube(p(32,12,-17), port, 4.5*s, silver), ...socketBolt(p(32,12,-24), 3.5, s));
  // Both hose ends get the same compression collar and rubber strain relief.
  parts.push(tube(p(37,12,-17),p(41,12,-17),5*s,dark),
    tube(p(41,12,-17),port,3.2*s,dark));
  return parts;
}

export const brakeHardware = (end: BrakeEnd): Primitive[] => [...rotorParts(end), ...caliperParts(end)];


