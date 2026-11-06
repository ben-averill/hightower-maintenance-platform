import { frameCableGasket,frameCableOutlet } from "./cableGasket";
import { add, geometryAnchors } from "./geometry";
import { label, type Point, type Primitive } from "./primitives";

const {head,headBottom,down}=geometryAnchors();
export const headSection={top:head,bottom:headBottom,topRadius:26,bottomRadius:31,waist:0,
  boreRadius:20,topSeatRadius:22.15,bottomSeatRadius:27.15,seatDepth:7};
// A straight taper keeps the bearing openings without radial flares at the rims.
export function headTubeRadius(section:{topRadius:number;bottomRadius:number;waist?:number},t:number):number {
  const along=Math.max(0,Math.min(1,t));
  return section.topRadius+(section.bottomRadius-section.topRadius)*along
    -4*(section.waist??0)*along*(1-along);
}
// The cubic front outline uses eight segments. Match its sampled radius so
// the two curved skins meet along the same front edge without a narrow seam.
export function headTubeOutlineRadius(section:{topRadius:number;bottomRadius:number;waist?:number},t:number):number {
  const segment=Math.max(0,Math.min(1,t))*8,index=Math.floor(segment),blend=segment-index;
  return headTubeRadius(section,index/8)*(1-blend)
    +headTubeRadius(section,Math.min(index+1,8)/8)*blend;
}
export const headForward:Point=[-down[1],down[0],0];
const up:Point=[-down[0],-down[1],0];
export function headPoint(height:number,forward:number,z=0):Point {
  return add(head,down[0]*height+headForward[0]*forward,down[1]*height+headForward[1]*forward,z);
}

// Opposite cheek entries let the hoses sweep across the front of the head.
// Placement is reconstructed from the reference photographs, not CAD data.
export function headCableSurface(side:number):Point { return headPoint(65,-9,side*(headTubeRadius(headSection,65/120)+.3)); }
export function headCableDirection(side:number):Point {
  return [headForward[0]*.8+up[0]*.35,headForward[1]*.8+up[1]*.35,side*Math.sqrt(.2375)];
}
export function headCablePort(side:number):Point { return frameCableOutlet(headCableSurface(side),headCableDirection(side)); }
export function headCableApproach(side:number):Point {
  const direction=headCableDirection(side);return add(headCablePort(side),direction[0]*42,direction[1]*42,direction[2]*42);
}

export function headBadgeParts():Primitive[] {
  const patch=(width:number,height:number,offset:number,color:string):Primitive=>{
    const rows=32,cols=28,corner=3,vertices:Point[]=[],indices:number[]=[];
    for(let row=0;row<=rows;row++) {
      const y=(row/rows-.5)*height,h=58-y,r=headTubeOutlineRadius(headSection,h/120);
      const cornerY=Math.max(0,Math.abs(y)-(height/2-corner));
      const halfWidth=width/2-corner+Math.sqrt(corner*corner-cornerY*cornerY);
      for(let col=0;col<=cols;col++) {
        const x=(col/cols*2-1)*halfWidth;
        vertices.push(headPoint(h,Math.sqrt(r*r-x*x)+offset,-x));
        if(row<rows && col<cols) {
          const a=row*(cols+1)+col,b=a+cols+1;indices.push(a,a+1,b,a+1,b+1,b);
        }
      }
    }
    return {kind:"surface-shell",vertices,indices,color,roughness:.53,metalness:.15};
  };
  const r=headTubeOutlineRadius(headSection,58/120);
  return [patch(28,31,.18,"#132b2b"),patch(25.5,28,.35,"#14191c"),
    {...label(headPoint(58,r+.55),"SANTA CRUZ",20.5,8.6,0,"#e4e8e7"),artwork:"santa-cruz-stacked",
      curvature:r,curvatureAxis:"x",basis:{right:[0,0,-1],normal:headForward}}];
}

export function headTubeDetails():Primitive[] {
  return [...headBadgeParts(),...[-1,1].map(side=>frameCableGasket(headCableSurface(side),headCableDirection(side)))];
}

