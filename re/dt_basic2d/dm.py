#!/usr/bin/env python3
"""dm.py ADDR [N]: disassemble from image.bin (>=0x100000) or obj2.bin (0x1b000..)"""
import sys,os
from capstone import *
H=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def src(a):
    if a>=0x100000: return open(H+'/image.bin','rb').read(),0x100000
    return open(H+'/obj2.bin','rb').read(),0x1b000
a=int(sys.argv[1],16); n=int(sys.argv[2]) if len(sys.argv)>2 else 40
d,b=src(a); o=a-b; md=Cs(CS_ARCH_X86,CS_MODE_32)
for _ in range(n):
    i=next(md.disasm(d[o:o+16],o+b,1),None)
    if not i: print('%x db %02x'%(o+b,d[o])); o+=1; continue
    print('%x  %-20s %s %s'%(i.address,i.bytes.hex(),i.mnemonic,i.op_str)); o+=i.size
