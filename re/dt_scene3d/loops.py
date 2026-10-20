from lib import *
import sys
from capstone import *
ALL=len(sys.argv)>6
md=Cs(CS_ARCH_X86,CS_MODE_32)
params,sp,off,a,b=sys.argv[1],float(sys.argv[2]),float(sys.argv[3]),int(sys.argv[4],16),int(sys.argv[5],16)
ev,st=init_scene(params); d=bufdesc('screen'); wr32(d+0x20,rd32(d+0x1c)); play(st,sp,off,0.0); render(st,100.0)
mem=rd(a,b-a)
# find 'jne rel8 back' followed by ret: 75 xx c3
for i in range(len(mem)-2):
    if mem[i] in (0x75,0x72) and mem[i+1]>0xb0 and (mem[i+2]==0xc3 or ALL):
        tgt=i+2+(mem[i+1]-256)
        if i-tgt<0x50 and tgt>=0:
            print('--- loop at %x'%(a+tgt))
            for ins in md.disasm(mem[tgt:i+3],a+tgt): print('  %x  %s %s'%(ins.address,ins.mnemonic,ins.op_str))
