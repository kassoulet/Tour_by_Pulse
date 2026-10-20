from lib import *
import sys,struct
def dump(a,n,lab):
    raw=rd(a,n); print(lab,hex(a))
    for i in range(0,n,4):
        v=struct.unpack_from('<I',raw,i)[0]; f=struct.unpack_from('<f',raw,i)[0]
        tag=''
        if 0x1000000<v<0x8000000: tag='PTR'
        elif v and (abs(f)>1e-6 and abs(f)<1e6): tag='f=%.5g'%f
        if v: print('  %03x %08x %s'%(i,v,tag))
params=sys.argv[1]
ev,st=init_scene(params); rec=rd32(st+0x18); wr(0x1f9d90,rd(rec,0x9e))
ob=rd32(0x1f9d98)
dump(rd32(ob+8),0x70,'vert0'); dump(rd32(ob+8)+0x60,0x70,'vert1')
dump(rd32(ob+0x24),0x40,'arr24')
