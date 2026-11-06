import { BufferGeometry, CanvasTexture, Float32BufferAttribute, SRGBColorSpace, Vector3 } from "three";
import type { Primitive } from "./primitives";

type ForkDecal = Extract<Primitive, {kind: "fork-decal"}>;

// Hand-drawn vector reconstruction of the supplied silver/gray FOX 36 kit.
// Transparent artwork is mapped onto a tapered cylindrical skin, not a board.
export function forkDecalTexture(side: number): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 2048;
  const c = canvas.getContext("2d")!;
  const silver = c.createLinearGradient(100,0,940,0);
  silver.addColorStop(0,"#83898c"); silver.addColorStop(.36,"#e1e3e2");
  silver.addColorStop(.6,"#f4f4ef"); silver.addColorStop(1,"#a5abad");
  const fill = (path: string, color: string | CanvasGradient) => { c.fillStyle=color; c.fill(new Path2D(path),"evenodd"); };
  const three = "M10 0H63L75 12V86L63 98H10L0 87V66H24V76H49V59H30V37H49V22H24V32H0V12Z";
  const six = "M12 0H64L76 12V30H51V22H25V40H64L76 52V86L64 98H12L0 86V12ZM25 60V77H51V60Z";
  function number36(x: number,y: number,scale: number,paint: string | CanvasGradient) {
    c.save(); c.translate(x,y); c.rotate(Math.PI/2); c.scale(scale,scale); c.translate(-80,-49);
    fill(three,paint); c.translate(85,0); fill(six,paint);
    // Diagonal breaks are transparent so the black lower shows through.
    c.globalCompositeOperation="destination-out";
    fill("M-95 72L83 -12L88 -3L-90 82Z", "#000"); c.restore();
  }
  // Upper, tall, angular 36 and narrow charcoal backing blocks.
  fill("M338 105L372 76H680L707 105V707L679 737H370L338 707Z", "#292e31");
  number36(523,402,3.65,silver);
  // Swept gray bands wrap around both front quarters of the casting.
  fill("M0 708L1024 1048V1210L0 870Z", "#454c50");
  fill("M0 678L1024 1018V1033L0 693Z", "#767d80");
  fill("M0 654L1024 994V1002L0 662Z", "#353c40");
  c.save(); c.translate(218,883); c.rotate(-.30);
  c.fillStyle="#20272b"; c.fillRect(-94,-90,188,180);
  number36(0,0,.97,"#899195"); c.restore();
  // Block-serif letters and a closed O with the attached fox-tail flourish.
  c.save(); c.translate(512,1510); c.rotate(side > 0 ? Math.PI/2 : -Math.PI/2);
  c.scale(4.25,4.25); c.translate(-119,-50);
  fill("M0 0H72V27H52V20H27V41H54V62H27V80H40V100H0V80H8V20H0Z",silver);
  c.translate(78,0);
  fill("M40 0C15 0 0 20 0 50C0 81 16 100 40 100C65 100 80 80 80 50C80 20 65 0 40 0ZM40 23C53 23 59 34 59 50C59 67 53 78 40 78C27 78 21 67 21 50C21 34 27 23 40 23Z",silver);
  // An outlined tail grows from the lower-left O, as in the flat decal kit.
  c.save(); c.strokeStyle="#171c1f"; c.lineWidth=2.5; c.lineJoin="round";
  const tail=new Path2D("M19 54C6 66 5 91 13 109C21 125 40 131 61 129C73 128 86 130 93 139C98 122 86 112 69 111C56 110 45 104 39 97C51 103 65 105 76 102C59 97 47 91 42 82C50 87 61 90 69 88C50 80 41 72 39 64C35 72 33 82 37 91C27 83 24 69 26 60C19 71 18 86 23 98C12 86 13 68 19 54Z");
  c.fillStyle=silver; c.fill(tail); c.stroke(tail); c.restore();
  c.translate(85,0);
  fill("M0 0H32V17L40 31L49 17V0H79V20H68L53 49L70 80H79V100H48V83L39 68L30 83V100H0V80H10L26 50L9 20H0Z",silver);
  c.restore();
  // Narrow longitudinal stripe and small stacked series marking.
  fill("M795 1120H814V1950H795Z", "#858c8f");
  fill("M821 1120H852V1950H821Z", "#444c50");
  c.save(); c.translate(900,1505); c.rotate(Math.PI/2);
  c.fillStyle="#c4c9ca"; c.textAlign="center"; c.font="700 28px Arial";
  c.fillText("PERFORMANCE",0,-9); c.fillText("ELITE",0,22); c.restore();
  const texture = new CanvasTexture(canvas); texture.colorSpace=SRGBColorSpace;
  texture.anisotropy=8;
  return texture;
}

export function forkDecalGeometry(shape: ForkDecal): BufferGeometry {
  const start=new Vector3(...shape.from), axis=new Vector3(...shape.to).sub(start);
  const forward=new Vector3(...shape.forward).normalize();
  const lateral=new Vector3(0,0,1);
  const positions:number[]=[],uv:number[]=[],indices:number[]=[];
  const rows=12, columns=96, arc=Math.PI*1.65;
  for(let row=0;row<=rows;row++) {
    const t=row/rows, radius=shape.radius*(1-t)+shape.endRadius*t;
    for(let col=0;col<=columns;col++) {
      const u=col/columns, a=(u-.5)*arc;
      const p=start.clone().addScaledVector(axis,t).addScaledVector(forward,Math.cos(a)*radius).addScaledVector(lateral,Math.sin(a)*radius);
      // Increasing world Z runs left when looking at the front of the fork.
      // Reverse U (not the mesh winding) so all lettering reads normally.
      positions.push(p.x,p.y,p.z); uv.push(1-u,1-t);
      if(row<rows && col<columns) {
        const i=row*(columns+1)+col, j=i+columns+1;
        indices.push(i,i+1,j,j,i+1,j+1);
      }
    }
  }
  const geometry=new BufferGeometry();
  geometry.setAttribute("position",new Float32BufferAttribute(positions,3));
  geometry.setAttribute("uv",new Float32BufferAttribute(uv,2)); geometry.setIndex(indices);
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}
