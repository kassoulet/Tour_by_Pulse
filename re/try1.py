import emucore as E,sys
from unicorn import *
E.mu.reg_write(E.R('ESP'),0x1fc000)
E.at(0x26a2e,lambda:print('sbrk req eax',hex(E.ireg('EAX')),'edx',hex(E.ireg('EDX')),'lim',hex(int.from_bytes(E.mu.mem_read(0x1b9bd8,4),'little')),'top',hex(int.from_bytes(E.mu.mem_read(0x1b9bec,4),'little'))))
E.at(0x26a33,lambda:print('sbrk ret',hex(E.ireg('EAX'))))
E.run(0x1084ac,3000000)
