"""hx.py - differential-test helpers for basic2d (run from re/dt_basic2d). 
 buf(name) -> (desc,w,h,bpp); lock() = original lock loop 0x105d08 (fills desc+0x20 data ptrs);
 mkev(line) = original addEvent parser 0x104fd8 -> event ptr ; run(ev) calls effect run(eax=state,edx=ev)"""
import sys,os,struct; sys.path.insert(0,os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from harness import *
import numpy as np
def descs():
    n=rd32(0x1b7558); out={}
    for i in range(n):
        d=0x1f91e0+i*40; nm=rd(d,16).split(b'\0')[0].decode().lower()
        out[nm]=d
    return out
D=descs()
def lock(): call(0x105d08)
def buf(name):
    d=D[name.lower()]; return d,rd32(d+0x10),rd32(d+0x14),rd32(d+0x18)
def getbuf(name):
    d,w,h,b=buf(name); p=rd32(d+0x20); dt={8:'u1',16:'<u2',32:'<u4'}[b]
    return np.frombuffer(rd(p,w*h*b//8),dtype=dt).reshape(h,w).copy()
def setbuf(name,a):
    d,w,h,b=buf(name); p=rd32(d+0x20); wr(p,np.ascontiguousarray(a).tobytes())
def mkev(line):
    line=line+' {0 0}\n'  # original scans for a 4th '{' group without bound
    s=alloc(len(line)+1); wr(s,line.encode()+b'\0')
    call(0x104fd8,s)
    n=rd32(0x1b755c); return rd32(0x1f8c1c+n*4)
def runev(ev,n=2000000000):
    return call(rd32(ev+0x24),rd32(ev+0x2c),ev,n=n)
def freeev(ev): call(rd32(ev+0x28),rd32(ev+0x2c),ev)
