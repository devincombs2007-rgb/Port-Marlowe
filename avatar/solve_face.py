import sys, json, numpy as np, cv2
sys.path.insert(0, sys.argv[2]); from common import *
S=sys.argv[1]
V,UV,F=load_canonical(f'{S}/models/canonical_face_model.obj')
D=json.load(open(f'{S}/work/landmarks.json'))
vid=sorted(k for k in D if '/vidA/' in k)
def to3(L): L=np.array(L); return np.c_[L[:,0],-L[:,1],-L[:,2]]
# init: align each frame's network 3D to canonical, average
al=[]
for k in vid:
    P=to3(D[k]['L']); s,R,t=similarity(P[:468],V); al.append((s*(R@P.T)).T+t)
X0=np.mean(al,0); X=X0.copy()
obs=np.array([to3(D[k]['L'])[:,:2] for k in vid])  # Fn x N x 2
w=np.array([min(D[k]['sharp'],20)/20 for k in vid])
lam=0.15
for it in range(30):
    cams=[]
    for i in range(len(vid)):
        P=obs[i]; Xh=np.c_[X,np.ones(len(X))]
        sol,_,_,_=np.linalg.lstsq(Xh,P,rcond=None); A=sol[:3].T
        U_,Sg,Vt=np.linalg.svd(A,full_matrices=False); A=Sg.mean()*U_@Vt
        t=(P-X@A.T).mean(0); cams.append((A,t))
    # solve points
    M=np.zeros((3,3)); 
    Xn=np.zeros_like(X)
    AtA=sum(w[i]*cams[i][0].T@cams[i][0] for i in range(len(vid)))
    sc=np.mean([np.linalg.norm(c[0][0]) for c in cams])**2
    lhs=AtA+lam*sc*len(vid)*np.eye(3)
    rhs=sum(w[i]*(obs[i]-cams[i][1])@cams[i][0] for i in range(len(vid)))+lam*sc*len(vid)*X0
    X=np.linalg.solve(lhs,rhs.T).T
    s,R,t=similarity(X[:468],V); X=(s*(R@X.T)).T+t
    err=np.mean([np.linalg.norm(obs[i]-(X@cams[i][0].T+cams[i][1]),axis=1).mean() for i in range(len(vid))])
print('reproj err px',err)
# symmetrize using canonical mirror pairs
Vm=V*np.array([-1,1,1]); pair=np.array([np.argmin(np.linalg.norm(V-vm,axis=1)) for vm in Vm])
# iris pairs: 468-472 <-> 473-477
ip=np.arange(478); ip[:468]=pair; ip[468:473]=np.arange(473,478); ip[473:478]=np.arange(468,473)
# fix iris ordering by nearest mirrored
for a in range(468,478):
    cand=range(473,478) if a<473 else range(468,473)
    ip[a]=min(cand,key=lambda b: np.linalg.norm(X[b]*[-1,1,1]-X[a]))
# find symmetry plane: align X with its mirror
Xm=(X*[-1,1,1])[ip]; s,R,t=similarity(Xm[:468],X[:468])
# half-rotation to put plane at x=0: simple approach - average X and reflected-aligned mirror
Xs=(X+((s*(R@Xm.T)).T+t))/2
s2,R2,t2=similarity(Xs[:468],V); Xs=(s2*(R2@Xs.T)).T+t2
Xs2=(Xs+(Xs*[-1,1,1])[ip])/2
print('asym before', np.linalg.norm(X-(X*[-1,1,1])[ip],axis=1).mean(), 'shape diff from canonical', np.linalg.norm(Xs2[:468]-V,axis=1).mean())
np.save(f'{S}/work/shape.npy',Xs2); np.save(f'{S}/work/shape_raw.npy',X)
json.dump({'pair':ip.tolist()},open(f'{S}/work/pairs.json','w'))
for nm,idx in [('nose tip',1),('chin',152),('forehead',10),('L eye outer',33),('R eye outer',263),('cheek L',234),('cheek R',454)]:
    print(nm, Xs2[idx].round(2), 'canon', V[idx].round(2))
