import { BufferGeometry, CanvasTexture, Float32BufferAttribute, SRGBColorSpace } from "three";
import type { Point, Primitive } from "./primitives";
type Decal=Extract<Primitive,{kind:"tire-decal"}>;

export function tireDecals(at:Point,wheelRadius:number,model:"DHF"|"DHR II"):Decal[] {
  const scale=.85, centerRadius=wheelRadius-32, halfHeight=12*scale;
  return [-1,1].flatMap(side=>([model,"MAXXIS"] as const).map(artwork=>({
    kind:"tire-decal",at,majorRadius:wheelRadius-31,tubeRadius:29,
    innerRadius:centerRadius-halfHeight,outerRadius:centerRadius+halfHeight,
    angle:artwork==="MAXXIS"?-Math.PI/2:Math.PI/2,
    arc:(artwork==="MAXXIS"?.78:1.28)*scale,side,artwork,color:"#ecece5",
  })));
}

export function tireDecalTexture(artwork:Decal["artwork"]):CanvasTexture {
  const canvas=document.createElement("canvas");canvas.width=2048;canvas.height=256;
  const c=canvas.getContext("2d")!;
  c.textBaseline="middle";c.lineJoin="round";
  if(artwork==="MAXXIS") {
    // Broad italic block forms, including the distinctive wide Xs and open M.
    const letters=[
      "M0 100L13 0H42L53 52L73 0H103L90 100H64L73 40L53 83H36L25 40L19 100Z",
      "M0 100L44 0H76L104 100H75L71 79H37L27 100ZM47 58H67L61 23Z",
      "M0 0H34L53 28L75 0H110L72 47L110 100H73L52 67L29 100H-6L32 50Z",
      "M0 0H34L53 28L75 0H110L72 47L110 100H73L52 67L29 100H-6L32 50Z",
      "M17 0H46L31 100H2Z",
      "M94 14L78 34C65 22 39 20 34 30C30 38 48 40 62 44C89 51 96 70 82 87C62 110 20 105 0 88L15 67C31 81 54 84 61 75C68 65 46 64 32 59C5 50 2 31 18 14C37-6 73-3 94 14Z",
    ];
    c.save();c.translate(50,29);c.scale(2.93,1.98);c.fillStyle="#ffe000";
    for(const [i,path] of letters.entries()) {
      c.fill(new Path2D(path),"evenodd");c.translate(i===4?76:121,0);
    }
    c.restore();
  } else {
    const fitted=(text:string,x:number,y:number,width:number,font:string,fill:string,outline=false)=>{
      c.save();c.font=font;c.translate(x,y);c.scale(width/c.measureText(text).width,1);
      if(outline) {
        c.strokeStyle="#eceee9";c.lineWidth=13;c.strokeText(text,0,0);
        c.strokeStyle="#171a1b";c.lineWidth=7;c.strokeText(text,0,0);
      }
      c.fillStyle=fill;c.fillText(text,0,0);c.restore();
    };
    fitted(`MINION ${artwork}`,26,133,1235,"italic 900 156px Arial Black, Arial","#e6e9e3",true);
    // Reference-sheet technology badges are visual artwork, not setup records.
    fitted("3C",1320,114,128,"italic 900 116px Arial","#d66c35",true);
    fitted("MAXX",1470,91,169,"italic 900 49px Arial","#d36b39");
    fitted("TERRA",1459,145,199,"italic 900 72px Arial","#e6e8df");
    c.strokeStyle="#777e7d";c.lineWidth=3;c.strokeRect(1685,64,153,132);
    fitted("EXO",1699,113,127,"italic 900 82px Arial","#e6e9e3");
    fitted("PROTECTION",1697,169,131,"700 25px Arial","#ce7545");
    fitted("TR",1872,133,142,"italic 900 124px Arial","#15191a",true);
  }
  const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.anisotropy=8;
  return texture;
}

// Annular strip follows both the wheel arc and the curved rubber sidewall.
export function tireDecalGeometry(shape:Decal):BufferGeometry {
  const p:number[]=[],uv:number[]=[],indices:number[]=[];
  const rows=10,cols=96;
  for(let j=0;j<=rows;j++) for(let i=0;i<=cols;i++) {
    const u=i/cols,v=j/rows,r=shape.innerRadius+(shape.outerRadius-shape.innerRadius)*v;
    const angle=shape.angle-shape.side*(u-.5)*shape.arc;
    const z=Math.sqrt(Math.max(0,shape.tubeRadius**2-(r-shape.majorRadius)**2))+shape.tubeRadius*.008;
    p.push(shape.at[0]+r*Math.cos(angle),shape.at[1]+r*Math.sin(angle),shape.at[2]+shape.side*z);
    uv.push(u,v);
    if(j<rows && i<cols) {const k=j*(cols+1)+i,n=k+cols+1;indices.push(k,k+1,n,k+1,n+1,n);}
  }
  const g=new BufferGeometry();g.setAttribute("position",new Float32BufferAttribute(p,3));
  g.setAttribute("uv",new Float32BufferAttribute(uv,2));g.setIndex(indices);
  g.computeVertexNormals();g.computeBoundingSphere();return g;
}
