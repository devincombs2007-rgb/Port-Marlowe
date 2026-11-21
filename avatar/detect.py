import sys, glob, json, numpy as np, cv2, mediapipe as mp
from mediapipe.tasks import python as mpt
from mediapipe.tasks.python import vision
S=sys.argv[1]
opts=vision.FaceLandmarkerOptions(base_options=mpt.BaseOptions(model_asset_path=f'{S}/models/face_landmarker.task'),
  output_facial_transformation_matrixes=True, num_faces=1)
det=vision.FaceLandmarker.create_from_options(opts)
files=sorted(glob.glob(f'{S}/vidA/*.jpg'))+sys.argv[2:]
out={}
for f in files:
    img=cv2.imread(f); h,w=img.shape[:2]
    r=det.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img,cv2.COLOR_BGR2RGB)))
    if not r.face_landmarks: print('none',f); continue
    L=np.array([[p.x*w,p.y*h,p.z*w] for p in r.face_landmarks[0]])
    M=np.array(r.facial_transformation_matrixes[0])
    R=M[:3,:3]/np.linalg.norm(M[:3,0])
    yaw=np.degrees(np.arctan2(R[0,2],R[2,2])); pitch=np.degrees(np.arcsin(-R[1,2])); roll=np.degrees(np.arctan2(R[1,0],R[0,0]))
    x0,y0=L[:,:2].min(0).astype(int); x1,y1=L[:,:2].max(0).astype(int)
    crop=cv2.cvtColor(img[max(y0,0):y1,max(x0,0):x1],cv2.COLOR_BGR2GRAY)
    sharp=cv2.Laplacian(cv2.resize(crop,(300,int(300*crop.shape[0]/crop.shape[1]))),cv2.CV_64F).var()
    out[f]=dict(L=L.tolist(),M=M.tolist(),yaw=float(yaw),pitch=float(pitch),roll=float(roll),sharp=float(sharp),size=[w,h],box=[int(x0),int(y0),int(x1),int(y1)])
    print(f.split('/')[-1][:30], f'yaw={yaw:6.1f} pitch={pitch:6.1f} roll={roll:6.1f} sharp={sharp:7.1f} facew={x1-x0}')
json.dump(out,open(f'{S}/work/landmarks.json','w'))
