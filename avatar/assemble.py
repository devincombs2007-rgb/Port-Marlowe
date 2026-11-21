import sys, json, numpy as np, cv2, os
sys.path.insert(0, sys.argv[2]); from glb import GLB, vertex_normals
S=sys.argv[1]; out=sys.argv[3]
SC=0.01
OFF=np.array([0,42.1,3.9])  # plinth bottom at y=0, centred
g=GLB()
H=np.load(f'{S}/work/head.npz')
tex=g.image(open(f'{S}/work/head_tex.jpg','rb').read(),'image/jpeg')
mskin=g.material('Skin',rough=0.55,tex=tex)
g.mesh('Head',[dict(pos=(H['pos']+OFF)*SC,nrm=H['nrm'],idx=H['tris'],uv=H['uv'],mat=mskin)])
parts=sys.argv[4].split(',') if len(sys.argv)>4 else []
for p in parts:
    if not p: continue
    d=np.load(f'{S}/work/{p}.npz',allow_pickle=True)
    meta=json.loads(str(d['meta']))
    m=g.material(meta['name'],color=meta.get('color',(1,1,1,1)),rough=meta.get('rough',0.6),metal=(meta.get('extras') or {}).get('metal',0.0),double=meta.get('double',False),extras=meta.get('extras'))
    prim=dict(pos=(d['pos']+OFF)*SC,nrm=d['nrm'],idx=d['tris'],mat=m)
    if 'col' in d: prim['col']=d['col']
    g.mesh(meta['name'],[prim])
print('GLB bytes',g.save(out))
