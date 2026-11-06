import { Euler,Matrix4,Vector3 } from "three";
import { add } from "./geometry";
import type { Point,Primitive } from "./primitives";

type Block=Extract<Primitive,{kind:"blocks"}>["blocks"][number];
// Distinct DHF directional center lugs and DHR II transverse braking paddles.
// Split top faces create actual sipes above a connected rubber base.
export function tireTread(at:Point,radius:number,width:number,model:"DHF"|"DHR II"):Primitive[] {
  const bases:Block[]=[],tops:Block[]=[];
  const knob=(angle:number,z:number,length:number,across:number,tilt:number,skew=0)=>{
    const tangent=new Vector3(Math.sin(angle),-Math.cos(angle),0);
    const normal=new Vector3(Math.cos(angle)*Math.cos(tilt),Math.sin(angle)*Math.cos(tilt),Math.sin(tilt));
    const lateral=new Vector3().crossVectors(tangent,normal);
    const x=tangent.clone().multiplyScalar(Math.cos(skew)).addScaledVector(lateral,Math.sin(skew));
    const zz=lateral.clone().multiplyScalar(Math.cos(skew)).addScaledVector(tangent,-Math.sin(skew));
    const rotation=new Euler().setFromRotationMatrix(new Matrix4().makeBasis(x,normal,zz)).toArray().slice(0,3) as Point;
    const r=radius-(Math.abs(z)>20?10:Math.abs(z)>12?5:2.4);
    const center=new Vector3(...add(at,Math.cos(angle)*r,Math.sin(angle)*r,z));
    const block=(offset:Vector3,size:Point):Block=>({at:center.clone().add(offset).toArray() as Point,size,rotation});
    bases.push(block(normal.clone().multiplyScalar(-1.5),[length,3.5,across]));
    // DHF has long split lugs; DHR's broader blocks get transverse sipes.
    for(const side of [-1,1]) {
      const split=model==="DHF"?zz:x,span=model==="DHF"?across:length;
      tops.push(block(normal.clone().multiplyScalar(1).addScaledVector(split,side*(span+.75)/4),
        model==="DHF"?[length,2.6,(across-.75)/2]:[(length-.75)/2,2.6,across]));
    }
  };
  const rows=64;
  for(let i=0;i<rows;i++) {
    const a=i*Math.PI*2/rows;
    for(const side of [-1,1]) {
      knob(a+(model==="DHF"&&i%2?side*.013:0),side*(model==="DHF"?7.1:7.8),
        model==="DHF"?(i%2?20:23):(i%2?13:16),model==="DHF"?9.5:12.5,side*.1,model==="DHF"?side*.12:0);
      knob(a+Math.PI/rows,side*width*.375,i%2?16:20,11,side*.65,side*(i%2?.17:-.12));
      if(i%2===0) knob(a+.038,side*16,11,7,side*.32,side*.2);
    }
  }
  return [{kind:"blocks",blocks:bases,color:"#202426",roughness:.94,metalness:0},
    {kind:"blocks",blocks:tops,color:"#262a2c",roughness:.96,metalness:0}];
}
