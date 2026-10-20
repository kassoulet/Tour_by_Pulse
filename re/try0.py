import emucore as E,sys
from unicorn import *
E.install_heap()
E.mu.reg_write(E.R('ESP'),0x3f0000)
E.run(0x1084ac,int(sys.argv[1]) if len(sys.argv)>1 else 30000000)
print('eip',hex(E.ireg('EIP')),dict(E.cnt))
import struct
esp=E.ireg('ESP'); ws=struct.unpack('<48I',bytes(E.mu.mem_read(esp,192)))
print([hex(x) for x in ws if 0x100000<=x<0x1b0000])
print({r:hex(E.ireg(r)) for r in ['EAX','EBX','ECX','EDX','ESI','EDI','EBP']})
print('modes asked',[hex(m) for m in E.modes_asked])
