import sys, json, numpy as np, cv2
sys.path.insert(0, sys.argv[2]); from common import *
S=sys.argv[1]; photos=sys.argv[3].split(',')
V,UV,F=load_canonical(f'{S}/models/canonical_face_model.obj')
X=np.load(f'{S}/work/shape.npy')[:468]
D=json.load(open(f'{S}/work/landmarks.json'))
# orientation check
n=np.cross(X[F[:,1]]-X[F[:,0]],X[F[:,2]]-X[F[:,0]]); 
ci=[i for i,f in enumerate(F) if 1 in f][0]
if n[ci,2]<0: F=F[:,[0,2,1]]; n=-n
n/=np.linalg.norm(n,axis=1,keepdims=True)
T=1024
acc=np.zeros((T,T,3)); wacc=np.zeros((T,T))
uvp=np.c_[UV[:,0]*T, (1-UV[:,1])*T]
for ph in photos:
    k=[k for k in D if ph in k][0]; img=cv2.imread(k).astype(np.float32)
    L=np.array(D[k]['L']); P=np.c_[L[:,0],-L[:,1]][:468]
    Xh=np.c_[X,np.ones(468)]; sol=np.linalg.lstsq(Xh,P,rcond=None)[0]; A=sol[:3].T
    Uu,Sg,Vt=np.linalg.svd(A,full_matrices=False); R2=Uu@Vt; view=np.cross(R2[0],R2[1])
    print(ph,'view',view.round(2))
    fw=np.clip(n@view,0,1)**2
    for fi,f in enumerate(F):
        if fw[fi]<=0.01: continue
        src=L[f,:2].astype(np.float32); dst=uvp[f].astype(np.float32)
        x0,y0=np.floor(dst.min(0)).astype(int)-1; x1,y1=np.ceil(dst.max(0)).astype(int)+2
        x0,y0=max(x0,0),max(y0,0); x1,y1=min(x1,T),min(y1,T)
        M=cv2.getAffineTransform(src, (dst-[x0,y0]).astype(np.float32))
        patch=cv2.warpAffine(img,M,(x1-x0,y1-y0),flags=cv2.INTER_CUBIC,borderMode=cv2.BORDER_REFLECT)
        m=np.zeros((y1-y0,x1-x0),np.float32); cv2.fillConvexPoly(m,np.round((dst-[x0,y0])*16).astype(np.int32),1.0,lineType=cv2.LINE_AA,shift=4)
        sel=m>0
        cur=wacc[y0:y1,x0:x1]
        # write (max coverage per pixel per photo, avoid double-counting edges)
        acc[y0:y1,x0:x1][sel]+= patch[sel]*(fw[fi]*m[sel])[:,None]
        wacc[y0:y1,x0:x1][sel]+= fw[fi]*m[sel]
tex=acc/np.maximum(wacc,1e-6)[...,None]
cover=(wacc>0).astype(np.uint8)
np.save(f'{S}/work/face_w.npy',wacc)
cv2.imwrite(f'{S}/work/face_tex_raw.png',np.clip(tex,0,255).astype(np.uint8))
print('max w',wacc.max())
