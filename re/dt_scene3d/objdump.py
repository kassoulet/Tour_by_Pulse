from lib import *
import sys,struct
params=sys.argv[1]
ev,st=init_scene(params); rec=rd32(st+0x18); wr(0x1f9d90,rd(rec,0x9e))
ob=rd32(0x1f9d98)
print('obj',hex(ob))
raw=rd(ob,0x36c)
for i in range(0,0x36c,4):
    v=struct.unpack_from('<I',raw,i)[0]; f=struct.unpack_from('<f',raw,i)[0]
    tag=''
    if 0x1000000<v<0x8000000: tag='PTR'
    if (abs(f)>1e-6 and abs(f)<1e6): tag+=' f=%.4g'%f
    if v or tag: print('%03x %08x %s'%(i,v,tag))
