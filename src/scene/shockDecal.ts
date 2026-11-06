import { BufferGeometry, CanvasTexture, Float32BufferAttribute, SRGBColorSpace, Vector3 } from "three";
import type { Primitive } from "./primitives";
import { drawShockArtwork } from "./shockArtwork";
type Decal=Extract<Primitive,{kind:"shock-decal"}>;

export function shockDecalTexture(style:Decal["style"]):CanvasTexture {
  const canvas=document.createElement("canvas");
  canvas.width=style==="volume"?128:1024;
  canvas.height=style==="volume"||style==="air-can"?1024:800;
  drawShockArtwork(canvas.getContext("2d")!,style);
  const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.anisotropy=8;
  return texture;
}

export function shockDecalGeometry(shape:Decal):BufferGeometry {
  const start=new Vector3(...(shape.side>0?shape.from:shape.to));
  const end=new Vector3(...(shape.side>0?shape.to:shape.from));
  const axis=end.clone().sub(start), normal=new Vector3(0,0,shape.side);
  const up=normal.clone().cross(axis).normalize();
  const p:number[]=[],uv:number[]=[],indices:number[]=[];
  const rows=32,cols=12;
  for(let j=0;j<=rows;j++) for(let i=0;i<=cols;i++) {
    const u=i/cols,v=j/rows,a=(v-.5)*Math.PI;
    const at=start.clone().addScaledVector(axis,u).addScaledVector(normal,Math.cos(a)*shape.radius).addScaledVector(up,Math.sin(a)*shape.radius);
    p.push(at.x,at.y,at.z);uv.push(u,v);
    if(j<rows && i<cols) {const k=j*(cols+1)+i,n=k+cols+1;indices.push(k,k+1,n,k+1,n+1,n);}
  }
  const g=new BufferGeometry();g.setAttribute("position",new Float32BufferAttribute(p,3));
  g.setAttribute("uv",new Float32BufferAttribute(uv,2));g.setIndex(indices);
  g.computeVertexNormals();g.computeBoundingSphere();return g;
}
