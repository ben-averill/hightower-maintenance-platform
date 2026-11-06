// Offline inspection uses the exact procedural meshes when UI automation is unavailable.
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {CylinderGeometry,LatheGeometry,Quaternion,Vector2,Vector3} from 'three';
const server=await createServer({server:{middlewareMode:true}});
try {
  const {sculptedFrame}=await server.ssrLoadModule('/src/scene/frameGeometry.ts');
  const {profileGeometry}=await server.ssrLoadModule('/src/scene/profileGeometry.ts');
  const {surfaceShellGeometry}=await server.ssrLoadModule('/src/scene/surfaceShell.ts');
  const {sweptGeometry}=await server.ssrLoadModule('/src/scene/sweptGeometry.ts');
  const parts=sculptedFrame(),meshes=[];
  for(const p of parts) {
    let g;
    if(p.kind==='profile') g=profileGeometry(p);
    else if(p.kind==='surface-shell') g=surfaceShellGeometry(p);
    else if(p.kind==='sweep') g=sweptGeometry(p);
    else if(p.kind==='tube'||p.kind==='sleeve') {
      const a=new Vector3(...p.from),b=new Vector3(...p.to),length=a.distanceTo(b);
      g=p.kind==='tube'?new CylinderGeometry(p.endRadius??p.radius,p.radius,length,32):
        new LatheGeometry([new Vector2(p.innerRadius,-length/2),new Vector2(p.outerRadius,-length/2),
          new Vector2(p.outerRadius,length/2),new Vector2(p.innerRadius,length/2),new Vector2(p.innerRadius,-length/2)],40);
      g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0,1,0),b.clone().sub(a).normalize()));
      g.translate(...a.lerp(b,.5).toArray());
    }
    if(!g) continue;
    const positions=g.getAttribute('position'),normals=g.getAttribute('normal');
    meshes.push({assembly:p.assembly,color:p.color,
      positions:Array.from(positions.array),normals:Array.from(normals.array),
      indices:g.index?Array.from(g.index.array):Array.from({length:positions.count},(_,i)=>i)});
    g.dispose();
  }
  await mkdir('artifacts/rear-triangle-owner-photos',{recursive:true});
  await writeFile('artifacts/rear-triangle-owner-photos/meshes.json',JSON.stringify(meshes));
  console.log(`Exported ${meshes.length} actual frame meshes`);
} finally {await server.close();}
