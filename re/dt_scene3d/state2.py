from lib import *
import sys,struct
params=sys.argv[1]; sp=float(sys.argv[2]); off=float(sys.argv[3]); t=float(sys.argv[4])
ev,st=init_scene(params); d=bufdesc('screen'); wr32(d+0x20,rd32(d+0x1c)); play(st,sp,off,0.0); render(st,t)
print('scene time',rdf(0x1d1b28))
def show(a,n,lab):
    r=rd(a,n); print(lab,hex(a))
    for i in range(0,n,4):
        v=struct.unpack_from('<I',r,i)[0]; f=struct.unpack_from('<f',r,i)[0]
        if v and abs(f)<1e7 and abs(f)>1e-9: print('  %03x %.6g'%(i,f))
        elif v and v<0x10000: print('  %03x int %d'%(i,v))
ob=rd32(0x1f9d98); show(ob,0x36c,'obj')
print('M 214b70'); show(0x214b70,0x60,'m')
show(0x1f9d20,0x40,'glob 1f9d20')
