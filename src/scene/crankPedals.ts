import { add, geometryAnchors } from "./geometry";
import { label, ring, tube, type Point, type Primitive } from "./primitives";

const { bb }=geometryAnchors();
type XY=[number,number];
const gray="#626a6d",black="#1a1e20";
// Visual clearance plane between the frame/stay and the existing right crank.
export const visualChainringOffset=70;
const circle=(x:number,y:number,r:number):XY[]=>Array.from({length:40},(_,i)=>[x+r*Math.cos(i*Math.PI/20),y+r*Math.sin(i*Math.PI/20)]);
// Retain the existing opposing crank pose and spindle locations.
export const crankPoint=(side:number,u:number,v=0,z=84):Point=>add(bb,side*u,v-side*u*10/170,side*z);

export function crankArmParts(side:number):Primitive[] {
  // Slim the lateral section about its existing center plane; keep pedal spacing.
  const thickness=.75;
  const faceZ=(z:number)=>84+(z-84)*thickness;
  const facePoint=(u:number,v:number,z:number)=>crankPoint(side,u,v,faceZ(z));
  const xy=(points:XY[]):XY[]=>points.map(([u,v])=>{const p=crankPoint(side,u,v);return [p[0],p[1]];});
  const pocket:XY[]=[[29,8],[49,12],[91,11],[115,6],[115,-9],[87,-13],[49,-13],[29,-8]];
  const contour:XY[]=[[-23,0],[-20,15],[-8,24],[15,24],[31,19],[65,16],[169,14],[181,10],
    [185,0],[181,-10],[170,-14],[65,-17],[30,-22],[12,-25],[-10,-23],[-21,-13]];
  const shape=(outline:XY[],holes:XY[][],z:number,depth:number,color:string,bevel:number):Primitive=>({
    kind:"profile",contour:xy(outline),holes:holes.map(xy),z:side*faceZ(z),depth:depth*thickness,bevel:bevel*thickness,round:3,
    color,roughness:.33,metalness:.65,
  });
  const parts:Primitive[]=[
    // Forged outline with genuine recessed face pocket and axle/pedal bores.
    shape(contour,[circle(0,0,10),circle(170,0,6.7),pocket],84,14,gray,1.7),
    shape(pocket,[],84,5,"#30383c",.5),
    // A raised narrow rim around the face recess catches the light.
    shape([[26,10],[48,15],[92,14],[119,8],[119,-12],[87,-16],[48,-16],[26,-10]],
      [pocket],92,1,"#788184",.6),
    {kind:"sleeve",from:facePoint(0,0,91.7),to:facePoint(0,0,94),innerRadius:9,outerRadius:16,color:"#969d9f",metalness:.85},
    {kind:"sleeve",from:facePoint(0,0,94),to:facePoint(0,0,95),innerRadius:6,outerRadius:10,color:"#151a1d"},
    ring(facePoint(170,0,93),8.5,.9,"#adb4b4"),
  ];
  const badge=(text:string,u:number,v:number,width:number,height:number)=>({
    ...label(facePoint(u,v,87.25),text,width,height,0,"#ced3d1",false,true),
    basis:{right:[side,-side*10/170,0] as Point,normal:[0,0,side] as Point},
  });
  parts.push(badge("GX",72,3,30,10),badge("SRAM",72,-6,20,3));
  for(let i=0;i<6;i++) {
    const a=i*Math.PI/3;
    parts.push(tube(facePoint(13*Math.cos(a),13*Math.sin(a),94),facePoint(13*Math.cos(a),13*Math.sin(a),94.7),.9,"#343c40"));
  }
  return parts;
}

export function pedalParts(side:number):Primitive[] {
  const axle=crankPoint(side,170);
  const p=(x:number,y:number,out:number)=>add(axle,x,y,side*(out-84));
  // Trace the supplied top view: the axle runs across the broad waist, while
  // the toe/heel edges narrow toward rounded corners (not a rectangular cage).
  const outline:XY[]=[
    [7,99],[21,101],[45,109],[51,117],[52,132],[52,169],[49,179],[43,183],
    [24,189],[10,191],[-10,191],[-25,188],[-44,183],[-49,179],[-52,169],
    [-52,119],[-48,113],[-44,109],[-21,102],[-7,99],
  ];
  const opening:XY[]=[[9,120],[9,173],[13,175],[31,169],[35,165],[35,125],[31,122],[13,116]];
  const windows:XY[][]=[opening.map(([x,z])=>[-x,z]),opening];
  const plan=(points:XY[]):XY[]=>points.map(([x,z])=>[axle[0]+x,side*z]);
  const platform:Primitive={kind:"profile",plane:"xz",contour:plan(outline),holes:windows.map(plan),
    z:-axle[1],depth:12,bevel:1.8,round:6,color:"#242729",roughness:.78,metalness:.05};
  const parts:Primitive[]=[platform,
    tube(p(0,0,88),p(0,0,189),5.1,"#82898b"),
    tube(p(0,0,102),p(0,0,185),6.6,black,6.3),
    tube(p(0,0,91),p(0,0,100),7,"#4e585c"),
    {kind:"sleeve",from:p(0,0,190),to:p(0,0,192),innerRadius:3.3,outerRadius:7,color:"#101517"},
    ring(p(0,0,192),5.5,.65,"#949c9c"),
  ];
  // Stepped spindle seal and machined collars next to the crank.
  for(const z of [92,95,98]) parts.push({kind:"sleeve",from:p(0,0,z),to:p(0,0,z+.8),
    innerRadius:5.1,outerRadius:7.4,color:z===98?"#111719":"#9ca3a3",metalness:.75,roughness:.3});
  const hex=Array.from({length:6},(_,i):XY=>[axle[0]+2.8*Math.cos(i*Math.PI/3),axle[1]+2.8*Math.sin(i*Math.PI/3)]);
  parts.push({kind:"profile",contour:hex,holes:[],z:side*191.3,depth:.6,bevel:.1,round:.1,color:"#414a4e"});
  // Molded side scallops and raised lips on the fore/aft edges.
  for(const edge of [-1,1]) {
    const cheek=(outline:XY[],offset:number,depth:number,color:string):Primitive=>({
      kind:"profile",plane:"zy",contour:outline.map(([z,y])=>[-side*z,axle[1]+y]),holes:[],
      z:axle[0]+edge*offset,depth,bevel:.35,round:1.6,color,roughness:.8,metalness:.05,
    });
    for(const [a,b] of [[119,134],[150,172]]) {
      parts.push(cheek([[a!,-3],[b!-2,-3],[b!,1],[b!-3,3],[a!+2,3]],53,.6,"#101517"));
      parts.push(cheek([[a!-2,4],[b!-2,4],[b!+1,2],[b!-1,5],[a!-1,5]],53,.8,"#3b4245"));
    }
  }
  // Ten traction pins on each face, with wider recessed bases.
  const pins:XY[]=[-1,1].flatMap(end=>[[end*38,122],[end*40,145],[end*38,170],[end*16,113],[end*16,179]] as XY[]);
  for(const face of [-1,1]) {
    for(const [x,z] of pins) {
      parts.push(tube(p(x,face*6,z),p(x,face*8.5,z),2.3,"#111719"));
      parts.push(tube(p(x,face*8.5,z),p(x,face*12,z),1.25,"#707879"));
      // Fine thread crests and a recessed mounting washer around every pin.
      parts.push({kind:"sleeve",from:p(x,face*7.7,z),to:p(x,face*8.3,z),innerRadius:1.35,outerRadius:2.5,color:"#50595c",metalness:.7});
      for(const height of [9,10,11]) parts.push({kind:"sleeve",from:p(x,face*height,z),to:p(x,face*(height+.3),z),
        innerRadius:1.2,outerRadius:1.55,color:"#969d9c",metalness:.8,roughness:.32});
    }
    // Flush outer hex fittings complement the ten pins around the openings.
    for(const [x,z] of [[47,131],[47,162],[30,110],[30,182],[-30,110],[-30,182],[-47,131],[-47,162]]) {
      const loop=(r:number):XY[]=>Array.from({length:6},(_,i)=>[axle[0]+x!+r*Math.cos(i*Math.PI/3),side*(z!+r*Math.sin(i*Math.PI/3))]);
      parts.push({kind:"profile",plane:"xz",contour:loop(2.6),holes:[loop(1.3)],
        z:-(axle[1]+face*8),depth:.7,bevel:.15,round:.1,color:"#777e7b",roughness:.45,metalness:.6});
    }
    // Diagonal molded grooves across the flat central bridge and two corners.
    for(let z=116;z<=175;z+=4)
      parts.push(tube(p(-5,face*7.9,z-1.7),p(5,face*7.9,z+1.7),.35,"#111719"));
    for(const end of [-1,1]) for(let z=120;z<=140;z+=4)
      parts.push(tube(p(end*43,face*7.9,z-1),p(end*50,face*7.9,z+1.8),.35,"#111719"));
    parts.push({...label(p(0,face*8.1,182),"RF",9,5,0,"#101719",false,true),
      basis:{right:[0,0,side] as Point,normal:[0,face,0] as Point}});
    parts.push({...label(p(-48,face*8.1,145),"RF",17,5,0,"#dddeda",false,true),
      basis:{right:[0,0,side] as Point,normal:[0,face,0] as Point}});
  }
  parts.push(label(p(0,0,193),"RACE FACE",52,6,0,"#dddeda",side<0,true));
  return parts;
}

export function gxCrankParts():Primitive[] {
  return [tube(add(bb,0,0,-85),add(bb,0,0,85),14,"#50585d"),
    ...[-1,1].flatMap(side=>[...crankArmParts(side),...pedalParts(side).map(part=>({...part,motion:side<0?"pedal-left" as const:"pedal-right" as const}))])];
}
