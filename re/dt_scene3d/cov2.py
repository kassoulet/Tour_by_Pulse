from lib import *
import collections, sys, re
from unicorn import UC_HOOK_CODE
c=collections.Counter()
for f in ('all.dis','hi.dis'):
    for l in open(f):
        m=re.search(r'\scall 0x([0-9a-f]+)$',l.strip())
        if m:
            a=int(m.group(1),16)
            if 0x118000<=a<0x180000 or 0x1b000<=a<0x26000: c[a]+=1
ents=sorted(c); print(len(ents),file=sys.stderr)
cnt=collections.Counter()
def h(uc,a,sz,_): cnt[a]+=1
for a in ents: E.mu.hook_add(UC_HOOK_CODE,h,begin=a,end=a)
params,speed,off=sys.argv[1],float(sys.argv[2]),float(sys.argv[3])
ev,st=init_scene(params)
d=bufdesc('screen'); p=rd32(d+0x1c); wr32(d+0x20,p)
play(st,speed,off,0.0)
cnt.clear()
for t in [int(x) for x in sys.argv[4:]]:
    render(st,float(t))
print(' '.join('%x:%d'%(k,v) for k,v in sorted(cnt.items())))
