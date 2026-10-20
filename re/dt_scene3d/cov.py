from lib import *
import collections, sys
from unicorn import UC_HOOK_CODE
cnt=collections.Counter(); fb=collections.Counter()
def h(uc,a,sz,_): cnt[E.ireg('ECX')]+=1; fb[rd32(0x1bdfb8)]+=1
E.mu.hook_add(UC_HOOK_CODE,h,begin=int(__import__("os").environ.get("HK","0x123440"),16),end=int(__import__("os").environ.get("HK","0x123440"),16))
params,speed,off=sys.argv[1],float(sys.argv[2]),float(sys.argv[3])
ev,st=init_scene(params)
d=bufdesc('screen'); p=rd32(d+0x1c); wr32(d+0x20,p)
play(st,speed,off,0.0)
for t in [int(x) for x in sys.argv[4:]]:
    render(st,float(t))
print({hex(k):v for k,v in cnt.items()}); print('0x1bdfb8',dict(list(fb.items())[:10]))
