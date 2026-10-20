# differential test, part 1: run the original cellrd init ("preinit grayscott ...") and dump its tables to /tmp-like dir
import sys,os
sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))
from harness import *
out=sys.argv[1]
s=alloc(256); wr(s,b'preinit grayscott 0.012 0.045 3.2 none\0')
st=call(0x1146a4,eax=s)
print('state',hex(st), 'flags',rd32(st),rd32(st+4),rd32(st+0x55))
def g(a): return rd32(a)
for name,ptr,n in (('t1',0x214280,0x184000),('t2',0x214284,0x8c000),('noise',0x214288,0x8000),('cop',0x21428c,0x400),('pal',0x214290,0x1000)):
    open(os.path.join(out,name+'.bin'),'wb').write(rd(g(ptr),n))
open(os.path.join(out,'blobs.bin'),'wb').write(b''.join(rd(g(0x2142dc+4*i),0x20) if g(0x2142dc+4*i) else b'\0'*0x20 for i in range(8)))
print('F,k,D',rdf(0x2142cc),rdf(0x2142c8),rdf(0x2142c4))
