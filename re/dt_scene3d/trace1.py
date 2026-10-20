"""trace1.py PARAMS SPEED OFF T LOOPADDR OUT.json : record (pixel index, ecx&0xffff, ebx&0xffff) at the head of a filler loop (dest = edi+edx*4, edx counts to 0)"""
from lib import *
import sys,json
from unicorn import UC_HOOK_CODE
params,sp,off,t,loop,out=sys.argv[1],float(sys.argv[2]),float(sys.argv[3]),float(sys.argv[4]),int(sys.argv[5],16),sys.argv[6]
rec={}
d=bufdesc('screen'); base=rd32(d+0x1c)
def h(uc,a,sz,_):
    ad=(E.ireg('EDI')+E.ireg('EDX')*4)&0xffffffff; o=(ad-base)//4
    if 0<=o<640*480: rec[o]=(E.ireg('ECX')&0xffff,E.ireg('EBX'),E.ireg('ESI'))
E.mu.hook_add(UC_HOOK_CODE,h,begin=loop,end=loop)
ev,st=init_scene(params); wr32(d+0x20,base); play(st,sp,off,0.0); wr(base,b'\0'*(640*480*4)); render(st,t)
json.dump([[k,v[0],v[1],v[2]] for k,v in rec.items()],open(out,'w')); print(len(rec))
