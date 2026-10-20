import emucore as E,sys
from unicorn import *
E.mu.reg_write(E.R('ESP'),0x1fc000)
E.at(0x84ff,lambda:print('at 84ff ES',hex(E.ireg('ES')),hex(E.ireg('EBX')), E.mu.mem_read(0x1b9be4,4).hex()))
E.at(0x8506,lambda:print('at 8506 EBX',hex(E.ireg('EBX')), E.mu.reg_read(E.R('ES_BASE')) if 0 else ''))
E.run(0x108433,3000000)
