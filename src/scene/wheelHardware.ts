import { add } from "./geometry";
import { ring, tube, type Point, type Primitive } from "./primitives";

// Flange planes differ from dropout spacing. The rear drive flange is dished
// inward to leave room for the cassette, while the left flange clears the rotor.
export const hubFlanges=(rear:boolean)=>rear?[-42,16]:[-32,32];
export function wheelHardware(at:Point,width:number,isRear:boolean):Primitive[] {
  const flanges=hubFlanges(isRear),parts:Primitive[]=[
    tube(add(at,0,0,flanges[0]),add(at,0,0,flanges[1]),16,"#30383b"),
    tube(add(at,0,0,-width/2),add(at,0,0,width/2),8,"#8e9797"),
  ];
  if(isRear) parts.push(tube(add(at,0,0,17),add(at,0,0,63),14,"#4c565b"));
  for(const [index,z] of flanges.entries()) {
    parts.push({kind:"sleeve",from:add(at,0,0,z-1.6),to:add(at,0,0,z+1.6),innerRadius:8,outerRadius:27,color:"#394347",metalness:.7},
      ring(add(at,0,0,z),25,1.5,"#697376"));
    for(let i=0;i<14;i++) {
      const a=(i*2+index)*Math.PI*2/28;
      const spokeAngle=a+(i%2?1:-1)*Math.PI*4/14;
      const from=add(at,Math.cos(spokeAngle)*25,Math.sin(spokeAngle)*25,z);
      const to=add(at,Math.cos(a)*310,Math.sin(a)*310,index?6:-6);
      parts.push(tube(from,to,.85,"#42494c"));
      const nipple=add(at,Math.cos(a)*306,Math.sin(a)*306,index?6:-6);
      parts.push(tube(nipple,to,1.5,"#a3abaa"));
    }
  }
  for(const side of [-1,1]) parts.push({kind:"sleeve",from:add(at,0,0,side*(width/2-7)),to:add(at,0,0,side*width/2),
    innerRadius:isRear?6:7.5,outerRadius:10,color:"#272e31"});
  return parts;
}
