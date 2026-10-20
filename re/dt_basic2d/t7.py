from hx import *
from unicorn import *
import emucore as E
lock()
rng=np.random.default_rng(1)
setbuf('temp',rng.integers(0,2**32,(480,640),dtype='<u4'))
ev=mkev("addEvent blit bbb {TEMP} {SCREEN} {}")
tr=[]
def h(uc,a,s,u): tr.append(a)
hk=mu.hook_add(UC_HOOK_CODE,h)
runev(ev)
mu.hook_del(hk)
seen=[];[seen.append(a) for a in tr if a not in seen]
print(len(tr)); print(" ".join("%x"%a for a in seen if not (0x1a4000<a<0x1a5000)))
import collections
c=collections.Counter(tr); print([(hex(a),n) for a,n in c.most_common(12)])
