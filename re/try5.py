import emucore as E,sys
from unicorn import *
E.mu.reg_write(E.R('ESP'),0x3f0000)
def _lim():
    cur=int.from_bytes(E.mu.mem_read(0x1b9bd8,4),'little')
    E.w('EAX',0x500000-1 if cur<0x500000 else cur-1)
E.at(0x26a12,_lim)
pc=0x1084ac
for k in range(6):
    try: E.mu.emu_start(pc,0,timeout=1500000)
    except Exception as e: print('EXC',e); break
    pc=E.ireg('EIP'); print(k,hex(pc),hex(E.ireg('ESP')),dict(E.cnt))
esp=E.ireg('ESP'); import struct
ws=struct.unpack('<64I',bytes(E.mu.mem_read(esp,256)))
print([hex(x) for x in ws if 0x100000<=x<0x1ac000])
print('ecx',hex(E.ireg('ECX')),'esi',hex(E.ireg('ESI')),hex(struct.unpack('<I',bytes(E.mu.mem_read(0x1b3194,4)))[0]))
print(bytes(E.mu.mem_read(0x500000,64)).hex(' ',4))
print(bytes(E.mu.mem_read(0x1b3190,16)).hex(' ',4))
