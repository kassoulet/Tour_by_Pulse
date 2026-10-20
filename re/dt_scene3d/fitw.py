import json,numpy as np,struct,sys
S='/tmp/claude-1000/-home-gautier-SynologyDrive-code-current-demoports/4a6b9f3e-e5e0-45de-8028-f20db5171c61/scratchpad'
def filepos(f):
    b=open('/home/gautier/SynologyDrive/code/current/demoports/tour_by_pulse/docs/assets/%s.exp'%f,'rb').read()
    nobj,ncam,nnull,nlight,npart,nmat=struct.unpack_from('<6I',b,4); p=32+121*nmat
    name=b[p:p+16]; nv,nuv,nt=struct.unpack_from('<3I',b,p+16); p+=16+12+16+4  # name,counts,k0..k3,flags
    flags=struct.unpack_from('<I',b,p-4)[0]
    if (flags>>8)&0x40: p+=16
    p+=4; tm=struct.unpack_from('<12f',b,p); p+=48; pv=struct.unpack_from('<3f',b,p); p+=12
    return np.frombuffer(b[p:p+nv*12],'<f4').reshape(nv,3).astype(float),tm,pv
for nm,f in [('tentacle_100','tentacle'),('tentacle_250','tentacle'),('box3_100','box3'),('box3_250','box3'),('hires_100','hires'),('camel8_250','camel8')]:
    g=json.load(open(S+'/gt/%s.json'%nm)); V=np.array(g['objs'][0]['verts'],dtype=float)
    fp,tm,pv=filepos(f)
    C=np.stack([V[:,6],V[:,7],V[:,10]],1); ok=np.isfinite(C).all(1)
    cm=np.array(g['cam']); R=np.array([cm[38:41],cm[42:45],cm[46:49]]); ct=cm[50:53]  # rows out0,out1,out2 coefficients
    # rows: out0 = [0x98,0xa8,0xb8]
    R=np.array([[cm[38],cm[42],cm[46]],[cm[39],cm[43],cm[47]],[cm[40],cm[44],cm[48]]])
    # world positions implied: w = R^T (C - ct)  (cam = R w + ct)
    W=(np.linalg.inv(R)@(C[ok]-ct).T).T
    d=W-fp[ok]
    print(nm,'t',g['t'],'implied world - file pos: mean',np.round(d.mean(0),4),'std',np.round(d.std(0),5),'| tm t',np.round(tm[9:],4),'pivot',np.round(pv,4),'|obj-space - file:',np.round((V[:,0:3]-fp)[0],4))
print('--- object space vs file space')
for nm,f in [('hires_100','hires'),('camel8_250','camel8'),('box3_100','box3'),('tentacle_100','tentacle')]:
    g=json.load(open(S+'/gt/%s.json'%nm)); V=np.array(g['objs'][0]['verts'],dtype=float)
    fp,tm,pv=filepos(f); P=V[:,0:3]
    A=np.hstack([fp,np.ones((len(fp),1))]); X=np.linalg.lstsq(A,P,rcond=None)[0]
    print(nm,np.round(X.T,4),'resid',np.abs(A@X-P).max(),'tm',np.round(tm,4))
    o=g['objs'][0]['f']; print('  obj bbox corner0',np.round(o[0x5c//4:0x5c//4+3],3),'obj+0x1f4',np.round(o[0x1f4//4:0x1f4//4+3],4), 'scale/others', np.round(o[0x174//4:0x174//4+3],3))
