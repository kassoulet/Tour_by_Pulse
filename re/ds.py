#!/usr/bin/env python3
"""ds.py ADDR [N]  - disassemble N instructions (default 40) at linear ADDR (hex) of image.bin (base 0x100000)."""
import sys,os
from capstone import *
B=0x100000
img=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'image.bin'),'rb').read()
def dis(a,n=40):
    md=Cs(CS_ARCH_X86,CS_MODE_32); md.detail=False
    cnt=0; o=a-B
    while cnt<n:
        ins=list(md.disasm(img[o:o+16],o+B,1))
        if not ins: print('%x  db %02x'%(o+B,img[o])); o+=1; cnt+=1; continue
        i=ins[0]; print('%x  %-22s %s %s'%(i.address,i.bytes.hex(),i.mnemonic,i.op_str)); o+=i.size; cnt+=1
if __name__=='__main__':
    dis(int(sys.argv[1],16),int(sys.argv[2]) if len(sys.argv)>2 else 40)
