import emucore as E,struct
from unicorn import *
code=bytes.fromhex('66b82400 8ec0 268b055c000000'.replace(' ',''))
E.mu.mem_write(0x1fe000,code)
E.mu.reg_write(E.R('ESP'),0x1fc000)
try: E.mu.emu_start(0x1fe000,0x1fe000+len(code))
except Exception as e: print(e)
print(hex(E.ireg('EAX')),hex(E.ireg('ES')), E.mu.mem_read(E.PSP+0x5c,4).hex(), hex(E.LDT))
