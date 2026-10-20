import sys; from capstone import *
B=0x100000; img=open('/home/gautier/SynologyDrive/code/current/demoports/tour_by_pulse/re/image.bin','rb').read()
a=int(sys.argv[1],16); b=int(sys.argv[2],16)
md=Cs(CS_ARCH_X86,CS_MODE_32); o=a-B
while o+B<b:
    ins=list(md.disasm(img[o:o+16],o+B,1))
    if not ins: print('%x  db %02x'%(o+B,img[o])); o+=1; continue
    i=ins[0]; print('%x  %-14s %s %s'%(i.address,i.bytes.hex()[:14],i.mnemonic,i.op_str)); o+=i.size
