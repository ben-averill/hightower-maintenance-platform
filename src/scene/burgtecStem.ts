import { add } from "./geometry";
import { label, sweep, tube, type Point, type Primitive } from "./primitives";

type XY=[number,number];
// Photo-derived machining details. The existing bar and steerer anchors define
// the installed pose; no unconfirmed stem-length variant is recorded.
export function burgtecStemParts(bar:Point,axis:(height:number)=>Point):Primitive[] {
  const black="#171c1f",edge="#30373b";
  const p=(x:number,y:number,z=0)=>add(bar,x,y,z);
  const plate=(outline:XY[],holes:XY[][],z:number,depth:number,color=black,bevel=.6,round=1):Primitive=>({
    kind:"profile",contour:outline.map(([x,y])=>[bar[0]+x,bar[1]+y]),
    holes:holes.map(loop=>loop.map(([x,y])=>[bar[0]+x,bar[1]+y])),z,depth,bevel,round,color,metalness:.65,roughness:.32,
  });
  const arc=(r:number,a:number,b:number):XY[]=>Array.from({length:41},(_,i)=>{
    const angle=a+(b-a)*i/40;return [r*Math.cos(angle),r*Math.sin(angle)];
  });
  const faceBolt=(y:number,z:number):Primitive[]=>{
    const contour:XY[]=Array.from({length:32},(_,i)=>[-z+3.6*Math.cos(i*Math.PI/16),bar[1]+y+3.6*Math.sin(i*Math.PI/16)]);
    const hex:XY[]=Array.from({length:6},(_,i)=>[-z+1.75*Math.cos(i*Math.PI/3),bar[1]+y+1.75*Math.sin(i*Math.PI/3)]);
    return [tube(p(-1,y,z),p(12.9,y,z),2,"#757f81"),
      {kind:"profile",plane:"zy",contour,holes:[hex],z:bar[0]+13,depth:1.3,bevel:.25,round:.15,color:"#b7bdb9",metalness:.9,roughness:.24},
      {kind:"profile",plane:"zy",contour:hex,holes:[],z:bar[0]+12.2,depth:.2,bevel:0,round:0,color:"#11181b"}];
  };
  const parts:Primitive[]=[
    {kind:"sleeve",from:axis(20),to:axis(56),innerRadius:14.4,outerRadius:22,color:black,metalness:.6,roughness:.3},
    // Rear half of the 35 mm bar cradle. Its bore remains open along the bar.
    plate([...arc(23.8,Math.PI/2,Math.PI*1.5),...arc(18.25,Math.PI*1.5,Math.PI/2)],[],0,43,black,.55,.35),
  ];
  const body:XY[]=[[-56,10],[-45,14],[-25,20],[-13,20],[-18,11],[-21,0],[-18,-12],[-13,-21],[-28,-20],[-48,-27],[-59,-22]];
  const pocket:XY[]=[[-46,5],[-32,8],[-26,4],[-26,-9],[-32,-14],[-47,-17],[-49,-5]];
  for(const side of [-1,1]) {
    // Separate cheek walls and recessed floors give the side engraving depth.
    parts.push(plate(body,[pocket],side*20.8,5.2,black,1.25,2.6));
    parts.push(plate(pocket,[],side*21.15,1.1,"#333b3f",.35,1.5));
    parts.push({...label(p(-37,-3,side*22.16),"BURGTEC",17.5,3.1,0,"#b4bcb8",false,true),
      basis:{right:[side,0,0],normal:[0,0,side]}});
    parts.push({...label(p(-37,-7,side*22.16),"ENDURO MK3",14,1.45,0,"#8b9592",false,true),
      basis:{right:[side,0,0],normal:[0,0,side]}});
    // Two independent curved faceplate straps, with the bar exposed centrally.
    parts.push(plate([...arc(25,-1.37,1.37),...arc(18.3,1.37,-1.37)],[],side*15,9,black,.3,.35));
    for(const y of [-22,22]) parts.push(...faceBolt(y,side*15));
    [..."BURGTEC"].forEach((character,i)=>{
      const angle=(i-3)*.18;
      parts.push({...label(p(25.45*Math.cos(angle),25.45*Math.sin(angle),side*15),character,3.8,5.3,0,"#d1d7d2",false,true),
        basis:{right:[-Math.sin(angle),Math.cos(angle),0],normal:[Math.cos(angle),Math.sin(angle),0]}});
    });
  }
  // Two small bridges tie the cheek walls to the back of the cradle.
  for(const y of [-16,14]) parts.push(sweep([p(-36,y, -16),p(-29,y,0),p(-36,y,16)],[3,3,3],3,black));
  // Rear pinch hardware and narrow black split line follow the steerer angle.
  for(const height of [28,47]) {
    const at=add(axis(height),-23,-11.2);
    parts.push(tube(add(at,0,0,-13),add(at,0,0,13),5.5,black),
      tube(add(at,0,0,-15),add(at,0,0,15),2.5,edge),
      {kind:"sleeve",from:add(at,0,0,15),to:add(at,0,0,17),innerRadius:1.5,outerRadius:4,color:"#b6bcb9",metalness:.9});
  }
  parts.push(sweep([add(axis(21),-19.5,-9.6),add(axis(55),-19.5,-9.6)],[.75,.75],.75,"#080d0f"));
  parts.push(tube(axis(56),axis(58.2),19.2,"#111719"),tube(axis(58.2),axis(59.4),18.3,"#323a3e"),
    {kind:"sleeve",from:axis(59.4),to:axis(60),innerRadius:1.7,outerRadius:3.6,color:"#7a8487",metalness:.8});
  return parts;
}
