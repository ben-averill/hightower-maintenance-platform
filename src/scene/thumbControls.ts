import { Vector3 } from "three";
import { barAt } from "./frontAssembly";
import { gripBasis } from "./ergonGrip";
import { add,geometryAnchors } from "./geometry";
import { label,sweep,tube as rawTube,type Point,type Primitive } from "./primitives";
import { flowingCable } from "./cables";
import { headCablePort, headCableApproach } from "./headTube";

type XY=[number,number];
const black="#171d20",rubber="#252b2d",edge="#3c4447";
export const thumbControlScale=.8;
const tube=(from:Point,to:Point,radius:number,color:string,endRadius=radius)=>rawTube(from,to,radius*thumbControlScale,color,endRadius*thumbControlScale);
// Photo-based dimensions. Both thumb faces sit behind and below the bar,
// opposite the forward-facing brake reservoirs, with room beneath the GA3 wings.
export function thumbControlMount(side:number) {
  const {axis,back,up}=gripBasis({from:barAt(side*250),to:barAt(side*380)});
  const origin=new Vector3(...barAt(side*272)).addScaledVector(back,10).addScaledVector(up,-39);
  const right=axis.clone().multiplyScalar(side);
  const normal=back.clone().multiplyScalar(.72).addScaledVector(up,.694).normalize();
  const faceUp=new Vector3().crossVectors(normal,right).normalize();
  const p=(x:number,y:number,z=0):Point=>origin.clone().addScaledVector(right,x*thumbControlScale).addScaledVector(faceUp,y*thumbControlScale).addScaledVector(normal,z*thumbControlScale).toArray() as Point;
  const basis={origin:origin.toArray() as Point,right:right.toArray() as Point,up:faceUp.toArray() as Point,normal:normal.toArray() as Point};
  return {p,basis};
}
function controlBuilder(side:number) {
  const {p,basis}=thumbControlMount(side);
  const plate=(contour:XY[],z:number,depth:number,color:string,round=3):Primitive=>({
    kind:"profile",contour:contour.map(([x,y])=>[x*thumbControlScale,y*thumbControlScale]),holes:[],z:z*thumbControlScale,depth:depth*thumbControlScale,color,round:round*thumbControlScale,bevel:.55*thumbControlScale,basis,roughness:.64,metalness:.15,
  });
  const text=(words:string,x:number,y:number,z:number,width:number,height:number,color="#919a99"):Primitive=>({
    ...label(p(x,y,z),words,width*thumbControlScale,height*thumbControlScale,0,color,false,true),basis:{right:basis.right,normal:basis.normal},
  });
  const clamp:Primitive={kind:"sleeve",from:barAt(side*220),to:barAt(side*226),innerRadius:12,outerRadius:14.3,color:black};
  const arm:Primitive={...sweep([barAt(side*223),add(barAt(side*225),-3,-19),p(-side*20,13,-4)], [3.2,3.2,4],2.72,black),smoothFrame:true};
  const screw=(x:number,y:number,z:number,r=3.3):Primitive[]=>[
    tube(p(x,y,z-1),p(x,y,z+.4),r,edge),tube(p(x,y,z+.4),p(x,y,z+.55),r*.47,"#101619")];
  return {p,plate,text,clamp,arm,screw};
}
export function oneUpRemoteParts():Primitive[] {
  const {p,plate,text,clamp,arm,screw}=controlBuilder(-1);
  const parts:Primitive[]=[clamp,arm,
    // Pivot carrier, thin aluminium paddle, and inset ribbed rubber thumb pad.
    plate([[8,-8],[29,-6],[32,5],[20,15],[8,9]],-3,7,black),
    plate([[-27,-8],[-20,-15],[5,-11],[14,0],[7,11],[-17,13],[-28,5]],0,3,black,4),
    plate([[-24,-7],[-18,-12],[3,-9],[10,0],[5,8],[-16,10],[-25,4]],2,1.6,rubber,3),
    tube(p(19,5,-9),p(19,5,2),6.5,black),...screw(19,5,2),
    text("ONE",-6,-1,3.5,17,7,"#535d5e"),
    // Inline barrel adjuster and cable boot on the inboard side.
    tube(p(27,1,-4),p(42,1,-4),4.2,black),
    tube(p(42,1,-4),p(53,1,-4),4.8,edge,3.2),
    tube(p(53,1,-4),p(58,1,-4),2.8,black),
  ];
  for(let x=-21;x<=5;x+=2.6) {
    for(const [a,b] of [[-8,-5],[4,8]] as XY[]) parts.push(tube(p(x,a,3.15),p(x+.6,b,3.15),.38,"#444c4e"));
  }
  for(let i=0;i<10;i++) {
    const a=i*Math.PI/5;
    parts.push(tube(p(43,1+4.5*Math.cos(a),-4+4.5*Math.sin(a)),p(49,1+3.8*Math.cos(a),-4+3.8*Math.sin(a)),.42,black));
  }
  const {head}=geometryAnchors();
  parts.push(flowingCable([p(58,1,-4),p(83,1,-4),add(barAt(-135),-5,-52),add(head,104,18,0),headCableApproach(1),headCablePort(1)],1.6));
  return parts;
}
export function axsShifterParts():Primitive[] {
  const {p,plate,text,clamp,arm,screw}=controlBuilder(1);
  const parts:Primitive[]=[clamp,arm,
    // Two-button AXS Pod, matching the supplied GX control photographs.
    tube(p(-18,0,-11),p(-18,0,-2),11,black),
    tube(p(-18,0,-11.5),p(-18,0,-10.8),8.6,edge),
    plate([[-19,-23],[-12,-27],[12,-25],[19,-18],[19,19],[12,26],[-12,26],[-19,18]],-3,9,black,5),
    plate([[-16,-21],[-11,-23],[11,-22],[16,-17],[16,18],[11,22],[-11,22],[-16,17]],2,2.3,edge,4),
    // Recess between pads and the raised horizontal divider.
    plate([[-15,-20],[14,-20],[14,20],[-15,20]],3.4,1.2,"#111719",3),
    plate([[-14,-1.5],[14,-1.5],[14,2.5],[-14,2.5]],4.5,2,black,1),
    text("SRAM",0,.5,5.6,15,2.4,"#aab1ad"),
    ...screw(-20,15,-1,3),
  ];
  for(const cy of [-12,12]) {
    parts.push(plate([[-13,cy-7],[11,cy-7],[14,cy-3],[13,cy+6],[-10,cy+7],[-14,cy+3]],4.3,2.3,rubber,2.5));
    // Nested chevron ribs on each rubber button, leaving a clean perimeter.
    for(let line=-4;line<=4;line+=2) {
      const points=[p(-10,cy+line+2,5.8),p(-3,cy+line-1,5.8),p(3,cy+line+1,5.8),p(10,cy+line-2,5.8)];
      parts.push({...sweep(points,[.256,.256,.256,.256],.256,"#525b5c"),circular:true});
    }
  }
  for(const [x,y] of [[-24,-4],[-19,7],[-12,-4]]) parts.push(...screw(x!,y!,-11.6,1.2));
  return parts;
}
