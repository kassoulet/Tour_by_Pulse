# differential test, part 2: original cellrd (preinit + run) -> dump screen and A/B fields after each frame
import sys,os,struct
sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))
from harness import *
out=sys.argv[1]; nfr=int(sys.argv[2]) if len(sys.argv)>2 else 8
s=alloc(256); wr(s,b'preinit grayscott 0.012 0.045 3.2 none\0'); call(0x1146a4,eax=s)
wr(s,b'run\0'); st=call(0x1146a4,eax=s)
scr=alloc(640*480*4); wr(scr,bytes(640*480*4))
desc=alloc(0x40); wr32(desc+0x10,640); wr32(desc+0x14,480); wr32(desc+0x18,32); wr32(desc+0x20,scr)
ev=alloc(0x100); wr32(ev+0x40,desc)
for f in range(nfr):
    call(0x11480c,eax=st,edx=ev)
    if f%25==0 or f==nfr-1: open(os.path.join(out,'scr%03d.bin'%f),'wb').write(rd(scr,640*480*4))
    for nm,p in (('A',0x2142b8),('B',0x2142c0)):
        open(os.path.join(out,'%s%03d.bin'%(nm,f)),'wb').write(rd(rd32(p),264*144))
print('done')
