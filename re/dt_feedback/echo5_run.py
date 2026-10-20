# differential test: original echo5 (init 0x11807c with "0.5*Frame", run 0x1180dc) on a 320x240 8 bit buffer.
# usage: echo5_run.py OUTDIR [nframes]  -> e5in%03d.bin / e5out%03d.bin (buffer before/after every frame), e5times.txt, e5seed.txt
import sys,os,random,struct
sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))
from harness import *
out=sys.argv[1]; nfr=int(sys.argv[2]) if len(sys.argv)>2 else 6
s=alloc(256); wr(s,b'0.5*Frame\0')
buf=alloc(320*240); desc=alloc(0x40); wr32(desc+0x10,320); wr32(desc+0x14,240); wr32(desc+0x18,8); wr32(desc+0x20,buf)
ev=alloc(0x100); wr32(ev+0x40,desc)
seed=rd32(0x1ba928)
st=call(0x11807c,eax=s,edx=ev)
open(os.path.join(out,'e5seed.txt'),'w').write(str(seed)+' '+str(rd32(0x1ba928)))
from unicorn import UC_HOOK_CODE
def hk(uc,addr,size,ud):
    if addr==0x183d34 and ud[0]%25==0: open(os.path.join(out,'e5pre%03d.bin'%ud[0]),'wb').write(rd(buf,320*240))   # picture just before the smear
cur=[0]
mu.hook_add(UC_HOOK_CODE,hk,cur,0x183d34,0x183d35)
random.seed(5); wr(buf,bytes(320*240))
t=2000.0; times=[]
for f in range(nfr):
    cur[0]=f; wrf(0x1b28f8,t); times.append(t)
    call(0x1180dc,eax=st,edx=ev)
    open(os.path.join(out,'e5out%03d.bin'%f),'wb').write(rd(buf,320*240))
    if True: open(os.path.join(out,'e5vert%03d.bin'%f),'wb').write(rd(rd32(0x261450),132*0x34)); open(os.path.join(out,'e5tex.bin'),'wb').write(rd(0x251450,65536))
    t+=[2.0,3.0,1.0,5.0,2.5][f%5]
open(os.path.join(out,'e5times.txt'),'w').write(' '.join(repr(x) for x in times))
print('ok',len(times),'seed',seed)
