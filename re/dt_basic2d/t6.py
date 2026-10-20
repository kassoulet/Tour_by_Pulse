from hx import *
from unicorn import *
import emucore as E
lock()
rng=np.random.default_rng(1)
setbuf('temp',rng.integers(0,2**32,(480,640),dtype='<u4'))
ev=mkev("addEvent blit bbb {TEMP} {SCREEN} {}")
tr=[]
def h(uc,a,s,u):
    if 0x1351ec<=a<0x1353d8 or a in (0x1a2ffc,0x1a44f4,0x1a443b,0x13484c) : tr.append(a)
hk=mu.hook_add(UC_HOOK_CODE,h)
runev(ev)
mu.hook_del(hk)
print(len(tr),[hex(x) for x in tr if x in(0x13520d,0x13525c,0x135298,0x1352c6,0x1353a0,0x1a2ffc,0x1a44f4,0x1353d2,0x13485c,0x13526a,0x13538a)])
print([hex(x) for x in tr[-8:]])
for n in ('temp','screen','title'):
    d=D[n]; o=rd32(d+0x1c); print(n,hex(rd32(d+0x20)),hex(call(0x13331c,o,1)),hex(call(0x13331c,o,1)), hex(rd32(o+0x74)), hex(rd32(o+0x20)))
