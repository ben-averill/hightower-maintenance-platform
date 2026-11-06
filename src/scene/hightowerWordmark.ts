// Upright, squared lettering and the narrow blue rule from the frame reference.
const letters:Record<string,{width:number;path:string}>={
  H:{width:8,path:"M0 0H2.2V3.9H5.8V0H8V10H5.8V6.1H2.2V10H0Z"},
  I:{width:2.2,path:"M0 0H2.2V10H0Z"},
  G:{width:8,path:"M.9 0H8V2.1H2.2V7.9H5.8V6.2H4.3V4.2H8V9.1L7.1 10H.9L0 9.1V.9Z"},
  T:{width:8,path:"M0 0H8V2.2H5.1V10H2.9V2.2H0Z"},
  O:{width:8,path:"M.9 0H7.1L8 .9V9.1L7.1 10H.9L0 9.1V.9ZM2.2 2.1V7.9H5.8V2.1Z"},
  W:{width:12,path:"M0 0H2.3L3.2 7.1L4.9 0H7.1L8.8 7.1L9.7 0H12L10.2 10H7.7L6 3.9L4.3 10H1.8Z"},
  E:{width:7,path:"M0 0H7V2.1H2.2V3.9H6.2V6H2.2V7.9H7V10H0Z"},
  R:{width:8,path:"M0 0H7.1L8 .9V5L7.1 5.9L8.4 10H6L4.7 6H2.2V10H0ZM2.2 2.1V3.9H5.8V2.1Z"},
};
export function drawHightowerWordmark(context:CanvasRenderingContext2D,width:number,height:number,color:string) {
  const word="HIGHTOWER",gap=2.2;
  const total=[...word].reduce((sum,c)=>sum+letters[c]!.width+gap,0)-gap;
  const scale=Math.min(width/(total+4),height/14);
  context.save();context.translate((width-total*scale)/2,(height-14*scale)/2);context.scale(scale,scale);
  context.fillStyle="#164e70";context.fillRect(0,0,total,.9);
  context.translate(0,3.1);context.fillStyle=color;
  for(const c of word) {const glyph=letters[c]!;context.fill(new Path2D(glyph.path),"evenodd");context.translate(glyph.width+gap,0);}
  context.restore();
}
