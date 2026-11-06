"""Software inspection renders of the exported Three.js meshes, not generated artwork."""
import json, math, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

root=Path(__file__).resolve().parents[1]/'artifacts/rear-triangle-owner-photos'
meshes=json.loads((root/'meshes.json').read_text())
font_path='C:/Windows/Fonts/segoeui.ttf'
def render(name,title,eye,center,span,assemblies):
    if len(sys.argv)>1 and name not in sys.argv[1:]:return
    width,height,ss=1440,1000,1
    eye,center=np.array(eye,dtype=float),np.array(center,dtype=float)
    forward=center-eye;forward/=np.linalg.norm(forward)
    right=np.cross(forward,np.array([0.,1.,0.]));right/=np.linalg.norm(right)
    up=np.cross(right,forward)
    basis=np.array([right,up,-forward]).T
    triangles=[]
    light=np.array([-.3,.75,1.]);light/=np.linalg.norm(light)
    for mesh in meshes:
        if mesh['assembly'] not in assemblies:continue
        p=np.array(mesh['positions']).reshape(-1,3)
        n=np.array(mesh['normals']).reshape(-1,3)
        faces=np.array(mesh['indices']).reshape(-1,3)
        projected=(p-center)@basis
        projected[:,:2]*=width/span
        projected[:,0]+=width/2;projected[:,1]=height/2-projected[:,1]
        coords=projected[faces]
        normal=n[faces].mean(axis=1);normal/=np.maximum(1e-9,np.linalg.norm(normal,axis=1))[:,None]
        # Render both faces for the underside and machined bore inspection.
        orient=normal@(-forward);normal=np.where((orient<0)[:,None],-normal,normal)
        diffuse=np.clip(normal@light,0,1)
        halfway=light-forward;halfway/=np.linalg.norm(halfway)
        gloss=np.maximum(0,normal@halfway)**24
        rgb=np.array([int(mesh['color'][i:i+2],16) for i in (1,3,5)],dtype=float)
        rgb=rgb*.85+np.array([25,40,43])
        keep=((coords[:,:,0].max(axis=1)>0)&(coords[:,:,0].min(axis=1)<width)&
              (coords[:,:,1].max(axis=1)>70)&(coords[:,:,1].min(axis=1)<height-55))
        if name=='guard-detail.png':keep&=(p[faces].mean(axis=1)[:,1]<393)
        for pts,ns in zip(coords[keep],n[faces][keep]):
            triangles.append((pts,ns,rgb))
    # Depth and interpolated vertex normals preserve overlaps and smooth skin;
    # centroid-sorted polygons hide parts of a fitted guard behind broad faces.
    pixels=np.empty((height,width,3),dtype=np.uint8);pixels[:]=[23,33,38]
    depth=np.full((height,width),-np.inf)
    for pts,ns,rgb in triangles:
        x0=max(0,int(math.floor(pts[:,0].min())));x1=min(width-1,int(math.ceil(pts[:,0].max())))
        y0=max(79,int(math.floor(pts[:,1].min())));y1=min(height-56,int(math.ceil(pts[:,1].max())))
        if x1<x0 or y1<y0:continue
        xx,yy=np.meshgrid(np.arange(x0,x1+1)+.5,np.arange(y0,y1+1)+.5)
        a,b,c=pts
        det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
        if abs(det)<1e-9:continue
        u=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/det
        v=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/det;w=1-u-v
        z=u*a[2]+v*b[2]+w*c[2]
        region=depth[y0:y1+1,x0:x1+1]
        mask=(u>=-1e-6)&(v>=-1e-6)&(w>=-1e-6)&(z>region)
        if not mask.any():continue
        normal=u[...,None]*ns[0]+v[...,None]*ns[1]+w[...,None]*ns[2]
        normal/=np.maximum(1e-9,np.linalg.norm(normal,axis=2))[...,None]
        normal=np.where((normal@(-forward)<0)[...,None],-normal,normal)
        shade=np.clip(rgb*(.38+np.maximum(0,normal@light)[...,None]*.85)+
            np.maximum(0,normal@halfway)[...,None]**24*80,0,255).astype(np.uint8)
        pixels[y0:y1+1,x0:x1+1][mask]=shade[mask];region[mask]=z[mask]
    image=Image.fromarray(pixels);draw=ImageDraw.Draw(image)
    draw.rectangle((0,0,width,78),fill='#202d31')
    draw.text((32,20),title,font=ImageFont.truetype(font_path,26),fill='#e7eddf')
    draw.rectangle((0,height-55,width,height),fill='#202d31')
    draw.text((32,height-40),'Actual procedural geometry · static pose · proportions estimated from owner photos',
        font=ImageFont.truetype(font_path,17),fill='#aab9b4')
    image.save(root/name)
    print(name)

render('rear-three-quarter.png','Rear triangle — brake mounting posts and forward-facing bridge',
       [400,760,850],[-365,434,0],720,{'rear-triangle'})
render('rear-side.png','Rear triangle — aligned front leg and forward pivot tips',
       [-365,434,1000],[-365,434,0],680,{'rear-triangle'})
render('rear-underneath.png','Rear triangle — forward-facing connection between the chainstays',
       [-150,-490,480],[-365,424,0],760,{'rear-triangle'})
render('frame-junction.png','Frame junction — lower rocker seated between the front carbon cheeks',
       [180,650,820],[-164,444,0],580,{'front-triangle','rear-triangle','upper-link','lower-link'})
render('brake-posts-detail.png','Rear brake posts — curved necks and broad roots into the stay',
       [-520,650,-800],[-557,421,-61],205,{'rear-triangle'})
render('lower-link-inside.png','Lower rocker — internal attachment between the stationary cheeks',
       [-470,235,720],[-165,409,0],270,{'front-triangle','rear-triangle','lower-link'})
render('seat-triangle-detail.png','Stationary carbon cheeks — flatter leg faces with rolled edges',
       [180,650,820],[-118,465,0],340,{'front-triangle','lower-link'})
render('guard-detail.png','Chainstay guard — 13 taller ribs leaning toward the front',
       [-210,780,480],[-390,353,63],460,{'rear-triangle'})
render('frame-surfaces.png','Carbon frame — broad front faces and softer rear edges',
       [90,760,1800],[-110,635,0],1190,{'front-triangle','rear-triangle','upper-link','lower-link'})
render('down-tube-detail.png','Lower down tube — straight underside into the bottom bracket',
       [100,650,950],[-15,430,0],490,{'front-triangle','lower-link'})
render('down-tube-side.png','Lower down tube — side profile',
       [-15,430,1200],[-15,430,0],490,{'front-triangle','lower-link'})
