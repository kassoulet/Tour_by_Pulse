from lib import *
import sys,struct
params=sys.argv[1]; sp=float(sys.argv[2]); off=float(sys.argv[3]); t=float(sys.argv[4])
ev,st=init_scene(params); d=bufdesc('screen'); wr32(d+0x20,rd32(d+0x1c)); play(st,sp,off,0.0); render(st,t)
print('scene time',rdf(0x1d1b28))
def fl(a,n):
    r=rd(a,n); return [struct.unpack_from('<f',r,i)[0] for i in range(0,n,4)]
def show(a,n,lab,lim=1e6):
    r=rd(a,n); print(lab,hex(a))
    for i in range(0,n,4):
        v=struct.unpack_from('<I',r,i)[0]; f=struct.unpack_from('<f',r,i)[0]
        if v and abs(f)<lim and abs(f)>1e-9: print('  %03x %s'%(i,'%.6g'%f))
cam=rd32(0x1f9da0); show(cam,0x128,'camera')
ob=rd32(0x1f9d98); show(ob+0x1b4,0x100,'obj+1b4')
