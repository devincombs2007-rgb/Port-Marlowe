import sys, json, numpy as np, cv2, trimesh, scipy.sparse as sp, scipy.sparse.linalg as spl
sys.path.insert(0, sys.argv[2]); from common import *
S=sys.argv[1]
V,UV,F=load_canonical(f'{S}/models/canonical_face_model.obj')
X=np.load(f'{S}/work/shape.npy')[:468]
n=np.cross(X[F[:,1]]-X[F[:,0]],X[F[:,2]]-X[F[:,0]]); ci=[i for i,f in enumerate(F) if 1 in f][0]
if n[ci,2]<0: F=F[:,[0,2,1]]
face=trimesh.Trimesh(X,F,process=False)
C=np.array([0,-0.5,-3.0])
NC=288; NRH=176; NRN=34
th=np.radians(np.linspace(3,154,NRH)); ph=np.radians(np.linspace(-180,180,NC,endpoint=False))
TH,PH=np.meshgrid(th,ph,indexing='ij')
D=np.stack([np.sin(TH)*np.sin(PH),np.cos(TH),np.sin(TH)*np.cos(PH)],-1).reshape(-1,3)
# face hits: cast inward from far outside, first hit = outermost
org=C+D*60; inter=trimesh.ray.ray_triangle.RayMeshIntersector(face)
loc,ri,ti=inter.intersects_location(org,-D,multiple_hits=False)
ok=((loc-C)*D[ri]).sum(1)>0; loc,ri,ti=loc[ok],ri[ok],ti[ok]
P=np.zeros((NRH*NC,3)); fixed=np.zeros(NRH*NC,bool); isface=np.zeros(NRH*NC,bool); fuv=np.zeros((NRH*NC,2))
bary=trimesh.triangles.points_to_barycentric(face.triangles[ti],loc)
fuv[ri]=(UV[F[ti]]*bary[...,None]).sum(1)
# smooth surface: loop-subdivided face mesh, same rays -> positions
def loop_interp(Vv, Ff, iters):
    # Loop subdivision corrected to pass exactly through the input vertices (keeps jaw, cheekbones, nose bridge crisp)
    for _ in range(iters):
        nv, nf = trimesh.remesh.subdivide_loop(Vv, Ff, iterations=1)
        e = trimesh.Trimesh(Vv, Ff, process=False).edges_unique
        d = Vv - nv[:len(Vv)]
        nv = nv.copy(); nv[:len(Vv)] += d; nv[len(Vv):] += (d[e[:, 0]] + d[e[:, 1]]) / 2
        Vv, Ff = nv, nf
    return Vv, Ff
sv,sf=loop_interp(X,F,2)
smooth=trimesh.Trimesh(sv,sf,process=False); inter2=trimesh.ray.ray_triangle.RayMeshIntersector(smooth)
loc2,ri2,ti2=inter2.intersects_location(org[ri],-D[ri],multiple_hits=False)
ok2=((loc2-C)*D[ri][ri2]).sum(1)>0
Pr=loc.copy(); Pr[ri2[ok2]]=loc2[ok2]
P[ri]=Pr; isface[ri]=True
# skull ellipsoid
ec=np.array([0,3.0,-4.15]); er=np.array([7.7,9.9,9.45])
def ell_hit(o,d):
    o2=(o-ec)/er; d2=d/er; a=(d2**2).sum(1); b=2*(o2*d2).sum(1); c=(o2**2).sum(1)-1
    t=(-b+np.sqrt(np.maximum(b*b-4*a*c,0)))/(2*a); return o+d*t[:,None]
PS=ell_hit(np.tile(C,(len(D),1)),D)
phi=PH.reshape(-1)
yfix=3.0-8.0*np.clip((np.abs(np.degrees(phi))-95)/85,0,1)
fm=isface.reshape(NRH,NC).astype(np.uint8)
near=cv2.dilate(np.tile(fm,(1,3)),np.ones((9,9),np.uint8))[:,NC:2*NC].reshape(-1)>0
skull=(~isface)&(~near)&(PS[:,1]>yfix)
P[skull]=PS[skull]
core=cv2.erode(np.tile(fm,(1,3)),np.ones((9,9),np.uint8))[:,NC:2*NC].reshape(-1)>0
fixed=(isface&core)|skull
JAW=[136,150,149,176,148,152,377,400,378,379,365]
def neck_pt(p):  # nearest point on the neck surface at the same height, same azimuth
    y=p[1]; zc=-5.9+(-11.2-y)*0.10; a=np.arctan2(p[0],(p[2]-zc)/5.2*4.95)
    return np.array([4.95*np.sin(a),y,zc+5.2*np.cos(a)])
shelf=[]
JP=[]
for a_,b_ in zip(JAW[:-1],JAW[1:]):
    for t_ in (0,1/3,2/3): JP.append(X[a_]*(1-t_)+X[b_]*t_)
JP.append(X[JAW[-1]])
for J in JP:
    for frac,drop in ((0.55,0.6),(0.88,1.0)):
        q=J.copy(); q[1]-=drop; n_=neck_pt(q); q[0]=J[0]+(n_[0]-J[0])*frac; q[2]=J[2]+(n_[2]-J[2])*frac
        shelf.append(q)
shelf=np.array(shelf)
dirs=(shelf-C)/np.linalg.norm(shelf-C,axis=1,keepdims=True)
USE_SHELF=False
for q,dq in zip(shelf if USE_SHELF else [],dirs):
    k=int(np.argmax(D@dq))
    if not fixed[k] and not isface[k]: P[k]=q; fixed[k]=True
print('jaw shelf constraints',len(shelf),'applied',int(sum(1 for q in shelf)))
# neck rows
yn=np.linspace(-11.2,-30,NRN)
neck=[]
for y in yn:
    zc=-5.9+(-11.2-y)*0.10; rx,rz=4.95,5.2
    neck.append(np.stack([rx*np.sin(ph),np.full(NC,y),zc+rz*np.cos(ph)],-1))
neck=np.concatenate(neck)
NR=NRH+NRN
Pall=np.concatenate([P,neck]); fixall=np.concatenate([fixed,np.ones(len(neck),bool)])
pole=np.array([[0,ec[1]+er[1],ec[2]]])
Pall=np.concatenate([Pall,pole]); fixall=np.concatenate([fixall,[True]])
N=len(Pall); ipole=N-1
idx=lambda i,j: i*NC+(j%NC)
# grid laplacian
rows=[];cols=[]
for i in range(NR):
    for j in range(NC):
        a=idx(i,j)
        nb=[idx(i,j-1),idx(i,j+1)]
        if i>0: nb.append(idx(i-1,j))
        else: nb.append(ipole)
        if i<NR-1: nb.append(idx(i+1,j))
        for b in nb: rows.append(a); cols.append(b)
for j in range(NC): rows.append(ipole); cols.append(idx(0,j))
A=sp.csr_matrix((np.ones(len(rows)),(rows,cols)),shape=(N,N))
deg=np.array(A.sum(1)).ravel(); L=sp.diags(deg)-A; L=sp.diags(1/deg)@L
L2=(L@L).tocsr()
fr=np.where(~fixall)[0]; fx=np.where(fixall)[0]
Aff=L2[fr][:,fr]; Afc=L2[fr][:,fx]
# initialize free with skull/ellipsoid guess for sanity, then solve
for k in range(3):
    Pall[fr,k]=spl.spsolve(Aff.tocsc(),-Afc@Pall[fx,k])
# Taubin smoothing to remove facets inherited from the coarse face mesh
Lu=sp.diags(1/deg)@A  # averaging operator
mov=np.ones(N,bool); mov[NRH*NC:]=False; mov[ipole]=False; mov[:NRH*NC][fixed[:NRH*NC]&isface]=False
for it in range(6):
    for lam in (0.55,-0.58):
        Q=Lu@Pall; Pall[mov]+=lam*(Q[mov]-Pall[mov])
print('free verts',len(fr),'face',isface.sum(),'skull',skull.sum())
# faces (quads -> tris), with seam duplicate column for UV
Vg=Pall[:NR*NC].reshape(NR,NC,3); Vg=np.concatenate([Vg,Vg[:,:1]],1)  # NR x NC+1
pos=np.concatenate([Vg.reshape(-1,3),pole]); ip=len(pos)-1
W=NC+1
tris=[]
for i in range(NR-1):
    for j in range(NC):
        a=i*W+j;b=a+1;c=a+W;d=c+1
        tris+= [[a,c,b],[b,c,d]]
for j in range(NC): tris.append([ip,j,j+1])
tris=np.array(tris)
# orientation check: normal at front face should point +z
from glb import vertex_normals
# compute normals on wrapped topology: merge seam by averaging
nrm=vertex_normals(pos,tris)
g=nrm[:NR*W].reshape(NR,W,3); avg=g[:,0]+g[:,NC]; avg/=np.linalg.norm(avg,axis=1,keepdims=True); g[:,0]=avg; g[:,NC]=avg
nrm[:NR*W]=g.reshape(-1,3)
fr_i=idx(90,0); 
print('front normal', nrm[90*W+NC//2].round(2), 'pos', pos[90*W+NC//2].round(2))
if nrm[90*W+NC//2,2]<0: tris=tris[:,[0,2,1]]; nrm=-nrm
uvs=np.concatenate([np.stack(np.meshgrid(np.linspace(0,1,W),np.linspace(0,1,NR)),-1).reshape(-1,2)[:,[0,1]],[[0.5,0]]])
uvs=np.c_[uvs[:,0],uvs[:,1]]  # glTF: v=0 top -> row 0 at top
# texture bake (lat-long)
TW,TH_=2048,1024
fuvg=np.zeros((NR,W,3),np.float32)
fu=fuv.reshape(NRH,NC,2); fm_=isface.reshape(NRH,NC)
import scipy.ndimage as ndi
fm3=np.tile(fm_,(1,3)); _,(ii,jj)=ndi.distance_transform_edt(~fm3,return_indices=True)
ii=ii[:,NC:2*NC]; jj=jj[:,NC:2*NC]%NC
fu=fu[ii,jj]
fuvg[:NRH,:NC,0]=fu[...,0]; fuvg[:NRH,:NC,1]=fu[...,1]; fuvg[:NRH,:NC,2]=fm_
fuvg[:,NC]=fuvg[:,0]
gx,gy=np.meshgrid((np.arange(TW)+0.5)/TW*NC,(np.arange(TH_)+0.5)/TH_*(NR-1))
m=cv2.remap(fuvg,gx.astype(np.float32),gy.astype(np.float32),cv2.INTER_LINEAR)
valid=np.clip(m[...,2]*1.5,0,1)
ftex=cv2.imread(f'{S}/work/face_tex.png').astype(np.float32); fal=np.load(f'{S}/work/face_alpha.npy')
mx=(m[...,0]*1024).astype(np.float32); my=((1-m[...,1])*1024).astype(np.float32)
col=cv2.remap(ftex,mx,my,cv2.INTER_CUBIC,borderMode=cv2.BORDER_REPLICATE)
al=cv2.remap(fal,mx,my,cv2.INTER_LINEAR)*valid
skin=np.array(json.load(open(f'{S}/work/skin.json'))['skin_bgr'],np.float32)
# pick skin tone from the actual transition band (below brows) so the fade is continuous
band=(al>0.35)&(al<0.8)&(m[...,1]<0.62)
if band.sum()>500: skin=np.median(col[band],0)*0.6+skin*0.4
print('skin tone BGR',skin.round(1))
# 3D position per texel for regional effects
Pg=np.concatenate([Pall[:NR*NC].reshape(NR,NC,3),Pall[:NR*NC].reshape(NR,NC,3)[:,:1]],1).astype(np.float32)
PT=cv2.remap(Pg,gx.astype(np.float32),gy.astype(np.float32),cv2.INTER_LINEAR)
ss=lambda a,b,x: np.clip((x-a)/(b-a),0,1)**2*(3-2*np.clip((x-a)/(b-a),0,1))
stub=ss(-1.5,-5.5,PT[...,1])*ss(-14.5,-11.0,PT[...,1])*ss(-6.5,-2.0,PT[...,2])  # jaw / under-chin / upper throat
stub*=0.45
rng=np.random.default_rng(3)
noise=np.zeros((TH_,TW),np.float32)
for fq,amp,cnt in ((0.35,2.6,6),(1.6,0.9,8),(4.5,0.4,10)):   # isotropic noise from 3D position: no smearing where the texture is stretched
    for _ in range(cnt):
        dv=rng.normal(size=3); dv/=np.linalg.norm(dv)
        noise+=amp*np.sin(PT@dv*fq*2*np.pi/6+rng.uniform(0,6.3)).astype(np.float32)/np.sqrt(cnt)
base=skin[None,None,:]+noise[...,None]*np.array([0.9,1,1.1])
speck=np.zeros((TH_,TW),np.float32)
for _ in range(12):
    dv=rng.normal(size=3); dv/=np.linalg.norm(dv); speck+=np.sin(PT@dv*9.0+rng.uniform(0,6.3)).astype(np.float32)
speck=np.clip(speck/np.sqrt(12)*1.2,-1,1)
base=base*(1-stub[...,None]*(0.15+0.02*speck[...,None])*np.array([1.0,0.95,0.85]))
out=col*al[...,None]+base*(1-al[...,None])
cv2.imwrite(f'{S}/work/head_tex.jpg',np.clip(out,0,255).astype(np.uint8),[cv2.IMWRITE_JPEG_QUALITY,92])
np.savez(f'{S}/work/head.npz',pos=pos,tris=tris,nrm=nrm,uv=uvs,NR=NR,NC=NC,isface=isface)
json.dump({'skull_center':ec.tolist(),'skull_radii':er.tolist(),'C':C.tolist(),'skin_bgr':[float(v) for v in skin]},open(f'{S}/work/head_params.json','w'))
print('verts',len(pos),'tris',len(tris))
