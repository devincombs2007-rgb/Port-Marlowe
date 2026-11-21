import sys, json, numpy as np, cv2
sys.path.insert(0, sys.argv[2]); from common import *
S=sys.argv[1]
V,UV,F=load_canonical(f'{S}/models/canonical_face_model.obj')
T=1024
tex=cv2.imread(f'{S}/work/face_tex_raw.png').astype(np.float32)
w=np.load(f'{S}/work/face_w.npy')
uvp=np.c_[UV[:,0]*T,(1-UV[:,1])*T]
# region mask = union of all uv triangles
region=np.zeros((T,T),np.uint8)
for f in F: cv2.fillConvexPoly(region,np.round(uvp[f]*16).astype(np.int32),1,shift=4)
region=cv2.morphologyEx(region,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
holes=((region>0)&(w<0.02)).astype(np.uint8)
holes=cv2.dilate(holes,np.ones((5,5),np.uint8))
t8=np.clip(tex,0,255).astype(np.uint8)
t8=cv2.inpaint(t8,holes,7,cv2.INPAINT_TELEA)
tex=t8.astype(np.float32)
# darken nostril undersides a bit
hb=cv2.GaussianBlur(holes.astype(np.float32),(0,0),4)

# skin tone: sample cheeks + chin-side bands via landmarks
pts=[50,280,205,425,187,411,36,266,101,330]
samples=[]
for p in pts:
    x,y=uvp[p].astype(int); samples.append(tex[y-8:y+8,x-8:x+8].reshape(-1,3))
skin=np.median(np.concatenate(samples),0)
print('skin BGR',skin)
# fade near boundary + grazing views. Exclude the photo's dark right edge by luminance check
dist=cv2.distanceTransform(region,cv2.DIST_L2,5)
fade=np.clip(dist/55,0,1); fade=fade*fade*(3-2*fade)
wn=np.clip((w/np.maximum(w,1e-6).max()*0+np.clip(w,0,None))/0.35,0,1)  # w is per-pixel n.v^2 (approx, overlapping tri edges)
# normalize w by local coverage count
cnt=np.zeros((T,T),np.float32)
for f in F:
    m=np.zeros((T,T),np.uint8)
alpha=fade.copy()
lum=tex.mean(2); dark=np.clip((skin.mean()*0.55-lum)/30,0,1)  # suppress background bleed
dark=cv2.GaussianBlur(dark,(0,0),6)
band=np.clip(1-(dist-60)/60,0,1)
alpha*= (1-np.clip(dark*2,0,1)*band)
# smooth view-angle weight from the raw per-pixel n.v^2 map
nv=np.sqrt(np.clip(w/np.maximum(cv2.GaussianBlur((w>0).astype(np.float32),(0,0),1.5),1e-3)/np.maximum(cv2.GaussianBlur((w>0).astype(np.float32),(0,0),1.5),1e-3),0,1))
nv=cv2.GaussianBlur(np.where(region>0,np.sqrt(np.clip(w,0,1)),0).astype(np.float32),(0,0),18)/np.maximum(cv2.GaussianBlur((region>0).astype(np.float32),(0,0),18),1e-3)
outer=np.clip(1-(dist-90)/80,0,1)
alpha*= np.clip((nv-0.12)/0.20,0,1)*(1-outer) + np.clip((nv-0.32)/0.25,0,1)*outer
alpha=cv2.GaussianBlur(alpha,(0,0),3)*(region>0)
np.save(f'{S}/work/face_alpha.npy',alpha.astype(np.float32))
out=tex*alpha[...,None]+skin*(1-alpha[...,None])
cv2.imwrite(f'{S}/work/face_tex.png',np.clip(out,0,255).astype(np.uint8))
json.dump({'skin_bgr':skin.tolist()},open(f'{S}/work/skin.json','w'))
cv2.imwrite(f'{S}/work/face_tex_small.jpg',cv2.resize(np.clip(out,0,255).astype(np.uint8),(500,500)))
cv2.imwrite(f'{S}/work/face_alpha_small.jpg',cv2.resize((alpha*255).astype(np.uint8),(300,300)))
