import numpy as np, json
def load_canonical(path):
    V=[];VT=[];F=[];FT=[]
    for line in open(path):
        p=line.split()
        if not p: continue
        if p[0]=='v': V.append([float(x) for x in p[1:4]])
        elif p[0]=='vt': VT.append([float(x) for x in p[1:3]])
        elif p[0]=='f':
            F.append([int(x.split('/')[0])-1 for x in p[1:]]); FT.append([int(x.split('/')[1])-1 for x in p[1:]])
    V=np.array(V);VT=np.array(VT);F=np.array(F);FT=np.array(FT)
    uv=np.zeros((len(V),2)); 
    for f,ft in zip(F,FT): uv[f]=VT[ft]
    # consistency check
    chk=np.zeros(len(V)); 
    for f,ft in zip(F,FT):
        assert np.allclose(uv[f],VT[ft]), 'non-unique uv'
    return V,uv,F
def similarity(A,B):
    """find s,R,t minimizing |s R A + t - B|"""
    ma,mb=A.mean(0),B.mean(0); A0,B0=A-ma,B-mb
    U,Sg,Vt=np.linalg.svd(B0.T@A0); D=np.eye(3); D[2,2]=np.sign(np.linalg.det(U@Vt))
    R=U@D@Vt; s=(Sg*np.diag(D)).sum()/(A0**2).sum(); t=mb-s*R@ma
    return s,R,t
FACE_OVAL=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109]
