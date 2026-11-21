"""Minimal glTF 2.0 binary writer: meshes w/ POSITION/NORMAL/TEXCOORD_0/COLOR_0, PBR materials, embedded images."""
import json, struct, numpy as np
class GLB:
    def __init__(s):
        s.bin=bytearray(); s.g={'asset':{'version':'2.0','generator':'avatar-pipeline'},'scenes':[{'nodes':[]}],'scene':0,
            'nodes':[],'meshes':[],'materials':[],'accessors':[],'bufferViews':[],'buffers':[],'images':[],'textures':[],'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}]}
    def _view(s,data,target=None):
        while len(s.bin)%4: s.bin+=b'\0'
        off=len(s.bin); s.bin+=data
        v={'buffer':0,'byteOffset':off,'byteLength':len(data)}
        if target: v['target']=target
        s.g['bufferViews'].append(v); return len(s.g['bufferViews'])-1
    def _acc(s,arr,ctype,typ,target=None,normalized=False,minmax=False):
        bv=s._view(arr.tobytes(),target)
        a={'bufferView':bv,'componentType':ctype,'count':len(arr),'type':typ}
        if normalized: a['normalized']=True
        if minmax: a['min']=arr.min(0).tolist(); a['max']=arr.max(0).tolist()
        s.g['accessors'].append(a); return len(s.g['accessors'])-1
    def image(s,data,mime):
        bv=s._view(data); s.g['images'].append({'bufferView':bv,'mimeType':mime})
        s.g['textures'].append({'sampler':0,'source':len(s.g['images'])-1}); return len(s.g['textures'])-1
    def material(s,name,color=(1,1,1,1),rough=0.6,metal=0.0,tex=None,double=False,extras=None):
        m={'name':name,'pbrMetallicRoughness':{'baseColorFactor':list(color),'roughnessFactor':rough,'metallicFactor':metal}}
        if tex is not None: m['pbrMetallicRoughness']['baseColorTexture']={'index':tex}
        if double: m['doubleSided']=True
        if extras: m['extras']=extras
        s.g['materials'].append(m); return len(s.g['materials'])-1
    def mesh(s,name,prims,extras=None):
        """prims: list of dict(pos,nrm,idx,mat,uv=None,col=None)"""
        P=[]
        for p in prims:
            at={'POSITION':s._acc(np.asarray(p['pos'],np.float32),5126,'VEC3',34962,minmax=True),
                'NORMAL':s._acc(np.asarray(p['nrm'],np.float32),5126,'VEC3',34962)}
            if p.get('uv') is not None: at['TEXCOORD_0']=s._acc(np.asarray(p['uv'],np.float32),5126,'VEC2',34962)
            if p.get('col') is not None:
                c=np.clip(np.asarray(p['col'])*255+0.5,0,255).astype(np.uint8)
                if c.shape[1]==3: c=np.c_[c,np.full(len(c),255,np.uint8)]
                at['COLOR_0']=s._acc(c,5121,'VEC4',34962,normalized=True)
            idx=np.asarray(p['idx']).reshape(-1)
            if idx.max()<65536: ia=s._acc(idx.astype(np.uint16),5123,'SCALAR',34963)
            else: ia=s._acc(idx.astype(np.uint32),5125,'SCALAR',34963)
            P.append({'attributes':at,'indices':ia,'material':p['mat'],'mode':4})
        s.g['meshes'].append({'name':name,'primitives':P})
        nd={'name':name,'mesh':len(s.g['meshes'])-1}
        if extras: nd['extras']=extras
        s.g['nodes'].append(nd); s.g['scenes'][0]['nodes'].append(len(s.g['nodes'])-1)
    def save(s,path):
        while len(s.bin)%4: s.bin+=b'\0'
        s.g['buffers']=[{'byteLength':len(s.bin)}]
        for k in ['images','textures']:
            if not s.g[k]: del s.g[k]
        if 'textures' not in s.g: del s.g['samplers']
        j=json.dumps(s.g,separators=(',',':')).encode()
        while len(j)%4: j+=b' '
        out=struct.pack('<III',0x46546C67,2,12+8+len(j)+8+len(s.bin))+struct.pack('<II',len(j),0x4E4F534A)+j+struct.pack('<II',len(s.bin),0x004E4942)+bytes(s.bin)
        open(path,'wb').write(out); return len(out)
def vertex_normals(V,F):
    n=np.cross(V[F[:,1]]-V[F[:,0]],V[F[:,2]]-V[F[:,0]])
    N=np.zeros_like(V)
    for k in range(3): np.add.at(N,F[:,k],n)
    return N/np.maximum(np.linalg.norm(N,axis=1,keepdims=True),1e-12)
