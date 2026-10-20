# differential test: original reebok (init 0x1170c8 with "picture.png", run 0x1172cc) on a 320x240 8 bit buffer with random content.
# usage: reebok_run.py OUTDIR [nframes]   writes tex.bin, in%02d.bin, out%02d.bin (the buffer before / after every frame), times.txt
import sys,os,random,struct
sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))
from harness import *
out=sys.argv[1]; nfr=int(sys.argv[2]) if len(sys.argv)>2 else 6
s=alloc(256); wr(s,b'picture.png\0')
buf=alloc(320*240); desc=alloc(0x40)
wr32(desc+0x10,320); wr32(desc+0x14,240); wr32(desc+0x18,8); wr32(desc+0x20,buf)
ev=alloc(0x100); wr32(ev+0x40,desc)
st=call(0x1170c8,eax=s,edx=ev)
open(os.path.join(out,'tex.bin'),'wb').write(rd(rd32(st+0x2c),65536))
random.seed(1)
times=[]
t=1234.0
for f in range(nfr):
    data=bytes(random.choice((0,0,0,40,120,200,255)) for _ in range(320*240)) if f==0 else rd(buf,320*240)
    wr(buf,data); open(os.path.join(out,'rin%02d.bin'%f),'wb').write(data)
    wrf(0x1b28f8,t); times.append(t)
    call(0x1172cc,eax=st,edx=ev)
    open(os.path.join(out,'rout%02d.bin'%f),'wb').write(rd(buf,320*240))
    t+= [3.0,4.5,16.0,1.0,0.0,7.25][f%6]
open(os.path.join(out,'rtimes.txt'),'w').write(' '.join(repr(x) for x in times))
print('ok',len(times))
