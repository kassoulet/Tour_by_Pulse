from hx import *
from unicorn import *
import emucore as E
lock()
s=alloc(200); wr(s,b"addEvent blit bbb {temp} {screen} {}\n\0")
tr=[]
hk=mu.hook_add(UC_HOOK_CODE,lambda uc,a,sz,u: tr.append(a))
try: r=call(0x104fd8,s,n=200000)
except Exception as e: print(e)
mu.hook_del(hk)
print(len(tr),[hex(a) for a in tr[-12:]], rd32(0x1b755c))
