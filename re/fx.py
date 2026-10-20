#!/usr/bin/env python3
"""fx.py            - list all effects: name, getDescriptor, init/run/free addresses (needs state.bin)
   fx.py NAME [which N] - disassemble function `which` (0 init,1 run,2 free) of effect NAME"""
import sys,struct
sys.argv_=sys.argv
from harness import *
import ds
TABLE=0x1b2cf8  # first record is fillbuffer (earlier versions wrongly started at 0x1b2d20 = scene)
def effects():
    out=[]
    for i in range(80):
        o=TABLE+i*20; name=rd(o,16).split(b'\0')[0].decode('latin1'); g=rd32(o+16)
        if not name or not (B<=g<B+0xb0000): break
        d=call(g); init,run,free=struct.unpack('<3I',rd(d,12)); out.append((name,g,init,run,free))
    return out
if __name__=='__main__':
    a=sys.argv
    if len(a)==1:
        for n,g,i,r,f in effects(): print('%-14s desc %x  init %x  run %x  free %x'%(n,g,i,r,f))
    else:
        e={n:(g,i,r,f) for n,g,i,r,f in effects()}[a[1].lower()]
        which=int(a[2]) if len(a)>2 else 1; n=int(a[3]) if len(a)>3 else 60
        print('; %s function %d at %x'%(a[1],which,e[1+which])); ds.dis(e[1+which],n)
