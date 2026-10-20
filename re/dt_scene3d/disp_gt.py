"""disp_gt.py LINE_SCENE LINE_FX NAME SPEED OFF T0 DT N OUT.json : ORIGINAL scene + mesh effect through the original script parser; dumps the object's vertex positions after each of N frames"""
from lib import *
import json,numpy as np,sys
sc,fxl,name,sp,off,t0,dt,n,out=sys.argv[1:10]; sp=float(sp); off=float(off); t0=float(t0); dt=float(dt); n=int(n)
def mk(line):
    call(0x104fd8,cs(line+'\n')); k=rd32(0x1b755c); return rd32(0x1f8c1c+k*4)
e1=mk(sc); e2=mk(fxl); st=rd32(e1+0x2c)
d=bufdesc('screen'); wr32(d+0x20,rd32(d+0x1c)); play(st,sp,off,t0)
res=[]
for i in range(n):
    t=t0+i*dt; wrf(0x1b28f8,t)
    p0=rd32(d+0x1c); wr(p0,b'\0'*(640*480*4))
    call(0x10ee10,st,e1)
    call(rd32(e2+0x24),rd32(e2+0x2c),e2)
    ob=rd32(0x1f9d98); nv=rd32(ob+0x10); vp=rd32(ob+8)
    res.append(np.frombuffer(rd(vp,nv*0x60),'<f4').reshape(nv,24)[:,:6].tolist())
open(out+'.raw','wb').write(rd(rd32(d+0x1c),640*480*4))
json.dump({'t0':t0,'dt':dt,'frames':res},open(out,'w')); print('ok',n)
