import sys
from capstone import *
img=open('obj2.bin','rb').read(); BASE=0x1b000
def dis(a,n):
    md=Cs(CS_ARCH_X86,CS_MODE_32); o=a-BASE; c=0
    for i in md.disasm(img[o:o+n*8],a):
        print('%x  %-22s %s %s'%(i.address,i.bytes.hex(),i.mnemonic,i.op_str)); c+=1
        if c>=n: break
if __name__=='__main__': dis(int(sys.argv[1],16),int(sys.argv[2]) if len(sys.argv)>2 else 40)
