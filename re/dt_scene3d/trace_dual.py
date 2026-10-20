from lib import *
import numpy as np
from unicorn import UC_HOOK_CODE
rec={}
d=bufdesc('screen'); base=rd32(d+0x1c)
def h(uc,a,sz,_):
    edi=E.ireg('EDI'); esi=E.ireg('ESI')   # dest = edi + esi*4 ; esi counts up to 0 (negative)
    ad=(edi+esi*4)&0xffffffff
    off=(ad-base)//4
    if 0<=off<640*480: rec[off]=(E.ireg('EBX')&0xffff,E.ireg('ECX')&0xffff)
E.mu.hook_add(UC_HOOK_CODE,h,begin=0x163644,end=0x163644)
ev,st=init_scene("tentacle.exp 50.0 80.0"); wr32(d+0x20,base); play(st,50,80,0.0); wr(base,b'\0'*(640*480*4)); render(st,100.0)
A=np.zeros((480*640,2),np.int32)-1
for k,(b,c) in rec.items(): A[k]=(b,c)
np.save('trace_dual.npy',A); print(len(rec))
