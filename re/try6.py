import emucore as E,sys,struct
from unicorn import *
E.install_heap()
E.mu.reg_write(E.R('ESP'),0x3f0000)
E.on_setmode.append(lambda:E.mu.emu_stop())
E.run(0x1084ac,3000000000)
print('stopped at',hex(E.ireg('EIP')),flush=True)
ring=[]
def h(uc,a,sz,_):
    if a>=0x100000: ring.append(a); del ring[:-40]
    if 0x80000<a<0x100000: uc.emu_stop()
E.on_setmode.clear()
E.mu.hook_add(UC_HOOK_CODE,h)
try: E.mu.emu_start(E.ireg('EIP'),0,count=400000000)
except Exception as e: print('ERR',e)
print(' '.join('%x'%a for a in ring))
