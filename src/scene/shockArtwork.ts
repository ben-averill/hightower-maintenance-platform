// Vector reconstruction from the owner's flat decal sheet. These are artwork
// silhouettes, not font substitutions or manufacturer-supplied logo files.
const glyphs:Record<string,string>={
  F:"M0 0H58V16H18V27H48V43H18V64H0Z",
  L:"M0 0H18V47H58V64H0Z",
  O:"M12 0H46L58 12V52L46 64H12L0 52V12ZM18 17V47H40V17Z",
  A:"M16 0H43L61 64H41L38 49H21L18 64H0ZM25 17L23 34H35L32 17Z",
  T:"M0 0H60V17H39V64H21V17H0Z",
  X:"M0 0H21L31 19L42 0H63L43 32L63 64H42L31 45L20 64H0L20 32Z",
  E:"M0 0H58V16H18V24H48V40H18V48H58V64H0Z",
  V:"M0 0H20L31 43L42 0H62L43 64H19Z",
};

export function angularWord(c:CanvasRenderingContext2D,text:string,x:number,y:number,width:number,height:number,color:string,background:string,outlineFirst=false) {
  c.save();c.translate(x,y);c.scale(width/(text.length*68-10),height/64);
  for(const [index,letter] of [...text].entries()) {
    const path=new Path2D(glyphs[letter]);
    c.save();c.translate(index*68,0);c.fillStyle=color;c.strokeStyle=color;c.lineWidth=2;
    if(outlineFirst && index===0) c.stroke(path); else c.fill(path,"evenodd");
    // The angular cuts in the factory-style block lettering.
    c.clip(path,"evenodd");c.fillStyle=background;
    c.fill(new Path2D(index%2?"M5 -3H10L62 67H57Z":"M-2 11V5L64 55V61Z"));
    c.restore();
  }
  c.restore();
}

// Unrotated FOX wordmark with connected O and an outlined, swept tail.
export function foxMark(c:CanvasRenderingContext2D,x:number,y:number,width:number,color:string,background:string) {
  c.save();c.translate(x,y);c.scale(width/242,width/242);c.fillStyle=color;
  const fill=(d:string)=>c.fill(new Path2D(d),"evenodd");
  fill("M0 0H72V27H52V20H27V41H54V62H27V80H40V100H0V80H8V20H0Z");
  c.translate(78,0);
  fill("M40 0C15 0 0 20 0 50C0 81 16 100 40 100C65 100 80 80 80 50C80 20 65 0 40 0ZM40 23C53 23 59 34 59 50C59 67 53 78 40 78C27 78 21 67 21 50C21 34 27 23 40 23Z");
  c.save();c.translate(85,0);
  fill("M0 0H32V17L40 31L49 17V0H79V20H68L53 49L70 80H79V100H48V83L39 68L30 83V100H0V80H10L26 50L9 20H0Z");
  c.restore();
  // The black interior remains connected to the O's counter; gray outlines
  // trace the tail and its individual swept tufts instead of a floating swoosh.
  const tail=new Path2D("M33 45C15 58 10 79 18 98C29 120 47 126 69 125C82 124 92 129 96 139C105 117 90 103 70 104C54 104 43 93 40 80C48 88 59 93 71 92C55 83 49 73 50 64C55 71 63 77 73 78C55 58 48 44 33 45Z");
  c.fillStyle=background;c.fill(tail);c.strokeStyle=color;c.lineWidth=3;c.lineJoin="round";c.stroke(tail);
  c.stroke(new Path2D("M21 73C20 93 34 108 50 113L38 98C49 110 63 115 78 115M40 80C38 67 35 63 33 60"));
  c.restore();
}

export function drawShockArtwork(c:CanvasRenderingContext2D,style:"air-can"|"reservoir"|"volume") {
  const black="#101214",gray="#797d7e",darkGray="#555b5e";
  const w=c.canvas.width,h=c.canvas.height;
  c.fillStyle=black;c.fillRect(0,0,w,h);
  c.textAlign="center";c.textBaseline="middle";
  if(style==="air-can") {
    // Large broken X motifs continue beyond the printable bounds, like the
    // repeating wrap on the supplied sheet. No rectangular title panel.
    const motif=(x:number,y:number,angle:number,scale:number)=>{
      c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);c.fillStyle=gray;
      c.fill(new Path2D("M-470 -440L-130 -440L0 -164L144 -440L470 -440L180 -12L480 440H148L0 155L-160 440H-478L-186 -12Z"));
      c.fillStyle=black;c.fill(new Path2D("M-540 -76L530 -170V-116L-530 -22ZM-70 -520H-23V520H-70Z"));c.restore();
    };
    motif(648,515,.24,.98);motif(-170,-240,.24,.85);
    for(const [x,y,angle,size] of [[85,704,-1.03,650],[884,20,-1.03,540]] as const) {
      c.save();c.translate(x,y);c.rotate(angle);
      c.fillStyle=black;c.fillRect(-20,-18,size+40,size*.64);
      foxMark(c,0,0,size,gray,black);c.restore();
    }
    for(const [x,y,angle] of [[550,290,-.88],[847,908,-.88]] as const) {
      c.save();c.translate(x,y);c.rotate(angle);c.fillStyle=black;c.fillRect(-265,-59,530,118);
      angularWord(c,"FLOAT",-230,-39,460,78,gray,black);c.restore();
    }
  } else if(style==="reservoir") {
    // Stacked horizontal layout reads correctly with the shock installed.
    c.fillStyle=darkGray;c.fill(new Path2D("M55 115H970L924 199H55Z"));
    c.fillStyle="#b1b5b5";c.font="700 29px Arial";
    c.fillText("PERFORMANCE",460,142);c.fillText("ELITE",460,176);
    angularWord(c,"FLOATX",132,221,754,100,gray,black);
    foxMark(c,130,355,760,gray,black);
    c.fillStyle=darkGray;c.fillRect(59,213,11,515);
    c.save();c.translate(957,470);c.rotate(-Math.PI/2);c.fillStyle="#697072";
    c.font="22px Arial";c.fillText("FLOAT X • PERFORMANCE ELITE",0,0);c.restore();
  } else {
    // The collar is narrow along the shock axis; text travels around its rim.
    c.save();c.translate(w/2,h/2);c.rotate(Math.PI/2);
    angularWord(c,"EVOL",-456,-43,395,86,gray,black,true);
    c.fillStyle=gray;c.font="900 35px Arial";c.fillText("EXTRA",223,-20);
    c.font="30px Arial";c.fillText("VOLUME",223,20);c.restore();
  }
}
