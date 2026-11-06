import { fitFrameProfile } from "./frameProfileFit";
import { framePaint } from "./frameColors";
import { add, frameDimensions, geometryAnchors } from "./geometry";
import { tube, type FrameAssembly, type Point, type Primitive } from "./primitives";
import { headPoint, headSection, headTubeDetails } from "./headTube";
import { topTubeMarkings } from "./frameMarkings";
import { downTubeDetails, downTubeLettering } from "./downTube";
import { upperLinkParts, upperLinkBridgeParts, linkBearing } from "./rearLink";
import { lowerLinkParts } from "./lowerLink";
import { rearCarbonParts, chainstayGuardParts } from "./rearTriangle";
import { frameAnchors, frameTrace, seatAxis } from "./frameCoordinates";
import { caliperSupportParts } from "./brakeGeometry";
export {frameAnchors,frameTrace} from "./frameCoordinates";

const { bb, rear } = geometryAnchors("low");
const paint = framePaint, black = "#142021", alloy = "#858e91";
type XY = [number, number];
const xy = (p: Point): XY => [p[0], p[1]];
const trace = (points: XY[]): XY[] => points.map(([x, y]) => xy(frameTrace(x, y)));
function circle(at: Point, radius: number): XY[] {
  return Array.from({ length: 32 }, (_, i) => [at[0] + Math.cos(i * Math.PI / 16) * radius, at[1] + Math.sin(i * Math.PI / 16) * radius]);
}
function profile(contour: XY[], holes: XY[][], depth: number, z: number, color = paint, bevel = 5, round = 16): Extract<Primitive, { kind: "profile" }> {
  return { kind: "profile", contour, holes, depth, z, color, bevel, round, roughness: color === paint ? 0.32 : 0.38, metalness: 0.12 };
}
const cross = (at: Point, width: number, radius: number, color = black) => tube(add(at, 0, 0, -width / 2), add(at, 0, 0, width / 2), radius, color);
export function sculptedFrame(): Primitive[] {
  const { upperPivot, rearPivot, lowerPivot, lowerRearPivot, shockRear, shockFront } = frameAnchors;
  const body = profile(trace([
    [681, 520], [709, 511], [729, 563], [747, 573], [1164, 325], [1182, 314],
    [1254, 416], [1229, 427], [1202, 443], [992, 788], [974, 817], [941, 838],
    [800, 909], [768, 917], [736, 924], [716, 913], [716, 885], [752, 825], [769, 769], [765, 725], [741, 712],
  ]), [trace([
    [756, 603], [1088, 400], [1117, 402], [1120, 427], [973, 751],
    [950, 785], [927, 788], [905, 779], [862, 739], [843, 726],
    [827, 731], [803, 753], [790, 780], [774, 796], [763, 783], [777, 722], [762, 653],
  ]), trace([[818, 772], [830, 775], [867, 807], [856, 819], [804, 836], [800, 824]]), circle(bb, 20)], 40, 0, paint, 5, 18);
  // Register the round neck to the photo collar and shared dropper axis;
  // the circular skin blends into the traced top-tube junction below it.
  const seatUp=seatAxis,seatRight:Point=[seatUp[1],-seatUp[0],0];
  const seatRadius=frameDimensions.seatCollarDiameter/2;
  body.contour[0] = xy(add(frameAnchors.seat,-seatRight[0]*seatRadius,-seatRight[1]*seatRadius));
  body.contour[1] = xy(add(frameAnchors.seat,seatRight[0]*seatRadius,seatRight[1]*seatRadius));
  body.contour[2] = xy(add(frameAnchors.seat,-seatUp[0]*60+seatRight[0]*19,-seatUp[1]*60+seatRight[1]*19));
  body.seatSection={top:frameAnchors.seat,axis:[-seatUp[0],-seatUp[1],0],radius:seatRadius,length:115};
  // A straight front wall follows the steering axis; the rear shoulders extend
  // 6 mm along it at each end, rather than flaring outward around the openings.
  body.contour.splice(4,4,...[
    headPoint(-6,-26),headPoint(0,26),headPoint(120,31),headPoint(126,-26),
  ].map(xy));
  body.headSection=headSection;
  // Painted carbon members have broad faces and narrow rolled highlights.
  // The steering shell and collar retain their separate circular sections.
  body.angularSpines=[0,1,2,3];
  // Give the downtube slightly broader rolled corners around its flat faces.
  body.spineCornerRadii=[[.28,.3,.3,.4],[.22,.22,.25,.35],
    [.4,.38,.38,.45,.45,.5],[.25,.25,.25,.3]];
  // These are paired moulded carbon cheeks, not round tubes. Keep their broad
  // faces flatter, with small rolled edges and soft transitions into the roof.
  body.flatSections=[
    {from:[-157,414,0],to:[-154,500,0],reach:37,cornerRadius:4,halfWidth:35},
    {from:[-146,492,0],to:[-30,452,0],reach:28,cornerRadius:4,halfWidth:35},
  ];
  body.holes[0]!.splice(1,3,...trace([[1092,400],[1120,400],[1125,420]]));
  // One continuous shoulder from the seat tube into the protective diagonal,
  // then a broad U-shaped cradle beneath the existing shock.
  body.holes[0]!.splice(5,12,[58,464],[30,445],[-5,445],[-43,466],
    [-115,503],[-148,547],[-158.61732298506936,603.7964365954334]);
  // The V4's paired lower windows are part of the stationary carbon cheeks,
  // not rear-triangle struts. Restore their tall rounded silhouette and retain
  // the longitudinal shock passage between them (manufacturer diagrams 1–2).
  body.holes[1]=[[-120,480],[-43,420],[-139,386]];
  body.holes.push(circle(lowerPivot,8.5));
  // Drill the shaped skin after lofting. Adding circular 2D holes against the
  // top-tube boundary makes overlapping path loops and pathological caps.
  body.bores=[{at:upperPivot,radius:8.5},{at:shockFront,radius:5.2}];
  // The two triangular cheeks continue behind the shock eyelet, with a
  // longitudinal opening to the lower rocker beneath their seat-tube roof.
  body.contour[16]=[-185,343];body.contour[17]=[-163,414];
  body.contour[18]=[-162,478];body.contour[19]=[-171,525];
  body.cradle={from:shockRear,to:shockFront,radius:27,cornerRadius:5,
    tunnel:{rearExtension:100,frontInset:24,halfWidth:27,halfHeight:42}};
  // The fixed lower-link bearing sits between the carbon cheeks. Continue
  // the shock tunnel down around the rocker while retaining the outer walls.
  body.pockets=[{contour:[
    [lowerRearPivot[0]-28,lowerRearPivot[1]-14],
    [lowerPivot[0]+28,lowerPivot[1]-30],[lowerPivot[0]+28,lowerPivot[1]+18],
    [shockRear[0]+25,shockRear[1]+28],[shockRear[0]-41,shockRear[1]+23],
    [lowerRearPivot[0]-28,lowerRearPivot[1]+28],
  // The squarer skin needs 3 mm more clearance on each inner face for the
  // flared rear arm. The bored carbon bosses still carry the fixed bearing.
  ],depth:60,round:12}];
  body.topSection={rear:[...body.contour[3]!,0],front:[...body.contour[4]!,0],
    innerRear:[...body.holes[0]![0]!,0],innerFront:[...body.holes[0]![1]!,0],rearWidth:18,frontWidth:25,cornerRadius:4};
  // Rounded rectangular sections already form rolled corners. An additional
  // spherical underside crown bowed the broad lower face and its protector.
  const depthPoint = (x: number, y: number, halfWidth: number): Point => {
    const p = frameTrace(x, y); return [p[0], p[1], halfWidth];
  };
  body.spines = [
    [depthPoint(695, 518, 18), depthPoint(757, 664, 22), depthPoint(765, 774, 29), depthPoint(750, 887, 36.5)],
    [depthPoint(753, 589, 18), depthPoint(955, 463, 19), depthPoint(1112, 371, 25), depthPoint(1182, 338, 28)],
    [depthPoint(1217, 392, 30), depthPoint(1134, 493, 32), depthPoint(1081, 588, 34), depthPoint(974, 776, 35), depthPoint(921, 820, 35), depthPoint(750, 887, 36.5)],
    [[-165,414,35],[-152,485,36],[-115,503,35],[-43,466,35]],
  ];
  fitFrameProfile(body);
  const frontTriangle:Primitive[]=[body,...headTubeDetails(),...topTubeMarkings(body),...downTubeDetails(body),...downTubeLettering(body)];
  const rearCarbon=rearCarbonParts(rear,rearPivot,lowerRearPivot);
  const rearTriangle:Primitive[]=[...rearCarbon,...chainstayGuardParts(rearCarbon[1]!,rear),
    ...caliperSupportParts("rear")],upperLink:Primitive[]=[],lowerLink:Primitive[]=[];
  for (const side of [-1, 1]) {
    upperLink.push(...upperLinkParts(upperPivot, rearPivot, side));
    lowerLink.push(...lowerLinkParts(lowerPivot,lowerRearPivot,shockRear,side));
    // Retain a bored carbon cheek around the internal bearing. The inner
    // shoulder meets the rocker barrel; the socket bolt stays on the outside.
    frontTriangle.push({...linkBearing(lowerPivot,side,32.5,20,8.5),
      color:paint,metalness:.12,roughness:.32});
    // Integral bored frame bosses, with a clear 40 mm space between supports.
    // Solid green cylinders previously obscured the front eyelet and bolt.
    frontTriangle.push({kind:"sleeve",from:add(shockFront,0,0,side*20),
      to:add(shockFront,0,0,side*35),innerRadius:5.2,outerRadius:11,color:paint,roughness:.32});
    frontTriangle.push({kind:"sleeve",from:add(upperPivot,0,0,side*17),
      to:add(upperPivot,0,0,side*25),innerRadius:8.5,outerRadius:15,color:paint,roughness:.32});
  }
  upperLink.push(...upperLinkBridgeParts(upperPivot,rearPivot),cross(upperPivot,78,8),cross(rearPivot,86,8));
  lowerLink.push(cross(lowerRearPivot,130,8),cross(lowerPivot,82,8),cross(shockRear,46,4));
  for(const side of [-1,1]) lowerLink.push({kind:"sleeve",from:add(lowerRearPivot,0,0,side*33),
    to:add(lowerRearPivot,0,0,side*49),innerRadius:8.15,outerRadius:10,color:black,metalness:.7,roughness:.28});
  frontTriangle.push({kind:"sleeve",from:add(bb,0,0,-36.5),to:add(bb,0,0,36.5),
    innerRadius:20,outerRadius:25,color:black,roughness:.38,metalness:.65});
  // The axle hardware is independent of the moving carbon in isolated views.
  rearTriangle.push({kind:"sleeve",from:add(rear,0,0,-81),to:add(rear,0,0,81),
    innerRadius:4,outerRadius:6,color:alloy});
  const tag=(parts:Primitive[],assembly:FrameAssembly)=>parts.map(part=>({...part,assembly}));
  return [...tag(frontTriangle,"front-triangle"),...tag(rearTriangle,"rear-triangle"),
    ...tag(upperLink,"upper-link"),...tag(lowerLink,"lower-link")];
}
