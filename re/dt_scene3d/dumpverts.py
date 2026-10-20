"""dumpverts.py PARAMS SPEED OFF T OUT.json : render one frame with the original and dump camera/object/vertex state (ground truth for the JS transform)."""
from lib import *
import sys,struct,json,numpy as np,math
params,sp,off,t,out=sys.argv[1],float(sys.argv[2]),float(sys.argv[3]),float(sys.argv[4]),sys.argv[5]
ev,st=init_scene(params); d=bufdesc('screen'); wr32(d+0x20,rd32(d+0x1c)); play(st,sp,off,0.0); render(st,t)
def F(a,n): return list(struct.unpack('<%df'%n,rd(a,4*n)))
cam=rd32(0x1f9da0); ob=rd32(0x1f9d98); nobj=rd32(0x1f9dc4)
J={'t':rdf(0x1d1b28),'cam':F(cam,0x128//4),'glob':F(0x1f9d20,16),'objs':[]}
for k in range(nobj):
    o=ob+k*0x36c; nv=rd32(o+0x10); ntri=rd32(o+0x1c); vp=rd32(o+8); pp=rd32(o+0x18)
    raw=np.frombuffer(rd(vp,nv*0x60),'<f4').reshape(nv,24)
    ints=np.frombuffer(rd(vp,nv*0x60),'<u4').reshape(nv,24)
    J['objs'].append({'f':F(o,0x36c//4),'nv':nv,'ntri':ntri,'verts':raw.tolist(),'vflags':ints[:,15].tolist()})
def clean(x):
    if isinstance(x,float): return None if (math.isnan(x) or math.isinf(x)) else x
    if isinstance(x,list): return [clean(i) for i in x]
    if isinstance(x,dict): return {k:clean(v) for k,v in x.items()}
    return x
json.dump(clean(J),open(out,'w'))
print('ok',nv,ntri)
