import sys, json, numpy as np, os
sys.path.insert(0, sys.argv[2]); from glb import GLB
S=sys.argv[1]; out=sys.argv[3]
parts=[p for p in (sys.argv[4].split(',') if len(sys.argv)>4 else []) if p]
yoff=float(sys.argv[5]) if len(sys.argv)>5 else 42.1      # cm: 42.1 puts the plinth on y=0, 164 puts the feet on y=0
SC=0.01
OFF=np.array([0,yoff,3.9])
BUST={'Hoodie','Drawstrings','Aglets','Plinth'}
g=GLB()
H=np.load(f'{S}/work/head.npz')
tex=g.image(open(f'{S}/work/head_tex.jpg','rb').read(),'image/jpeg')
mskin=g.material('Skin',rough=0.55,tex=tex)
g.mesh('Head',[dict(pos=(H['pos']+OFF)*SC,nrm=H['nrm'],idx=H['tris'],uv=H['uv'],mat=mskin)],extras={'group':'shared'})
for p in parts:
    d=np.load(f'{S}/work/{p}.npz',allow_pickle=True)
    meta=json.loads(str(d['meta'])); ex=dict(meta.get('extras') or {})
    ex.setdefault('group','bust' if meta['name'] in BUST else 'shared')
    m=g.material(meta['name'],color=meta.get('color',(1,1,1,1)),rough=meta.get('rough',0.6),metal=ex.get('metal',0.0),double=meta.get('double',False),extras=ex)
    prim=dict(pos=(d['pos']+OFF)*SC,nrm=d['nrm'],idx=d['tris'],mat=m)
    if 'col' in d: prim['col']=d['col']
    g.mesh(meta['name'],[prim],extras={'group':ex['group']})
print('GLB bytes',g.save(out))
