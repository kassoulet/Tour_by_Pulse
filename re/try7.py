import emucore as E,sys,struct,collections
from unicorn import *
E.install_heap()
E.mu.reg_write(E.R('ESP'),0x3f0000)
pc=0x1084ac
for k in range(12):
    try: E.mu.emu_start(pc,0,timeout=10_000_000)
    except Exception as e: print('ERR',e); break
    pc=E.ireg('EIP'); print(k,hex(pc),hex(E.ireg('ESP')),dict(list(E.cnt.items())[-6:]),flush=True)
