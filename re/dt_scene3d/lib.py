import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__))+'/..')
from harness import *
import emucore as E
from unicorn import UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EAX,UC_X86_REG_EIP,UC_X86_REG_EFLAGS
# the original dumps debug textures to 'chn.pic' (DOS create, int 21/3c): fake a successful create, swallow the writes
def _create(uc,a,sz,_):
    uc.reg_write(UC_X86_REG_EAX,0x20); uc.reg_write(UC_X86_REG_EFLAGS,uc.reg_read(UC_X86_REG_EFLAGS)&~1); uc.reg_write(UC_X86_REG_EIP,0x170c95)
E.mu.hook_add(UC_HOOK_CODE,_create,begin=0x170c93,end=0x170c93)
class _Q:
    def __init__(s,o): s.o=o
    def write(s,t):
        if not t.startswith('[write'): s.o.write(t)
    def flush(s): s.o.flush()
sys.stdout=_Q(sys.stdout)
def cs(s):
    p=alloc(len(s)+1); wr(p,s.encode()+b'\0'); return p
def mkev(inbuf='screen'):
    ev=alloc(0x80); wr(ev,b'\0'*0x80)
    wr(ev+0x40,b'')  # placeholder
    # input descriptor: pointer to the buffer descriptor (names copied 0x10 bytes from [ev+0x40])
    for i in range(16):
        if rd(0x1f91e0+i*0x28,16).split(b'\0')[0]==inbuf.encode(): wr32(ev+0x40,0x1f91e0+i*0x28)
    return ev
def init_scene(params,flag=0):
    ev=mkev(); p=cs(params)
    st=call(0x10edb8,p,ev)
    return ev,st
import struct
SCR=0x1f91e0
def bufdesc(name):
    for i in range(16):
        if rd(SCR+i*0x28,16).split(b'\0')[0]==name.encode(): return SCR+i*0x28
def play(st,speed,off,now=0.0):
    rec=rd32(st+0x18); wr32(rec+4,0x105e0c); wrf(rec+0x92,speed); wrf(rec+0x96,off); wrf(rec+0x9a,now); return rec
def render(st,now):
    wrf(0x1b28f8,now)
    return call(0x10ee10,st)
def dumpbuf(name,fn):
    from PIL import Image
    import numpy as np
    d=bufdesc(name); w,h,bpp,p=[rd32(d+k) for k in (0x10,0x14,0x18,0x1c)]
    raw=rd(p,w*h*bpp//8)
    if bpp==32:
        a=np.frombuffer(raw,'<u4').reshape(h,w); im=np.stack([(a>>16)&255,(a>>8)&255,a&255],-1).astype('u1')
    else:
        a=np.frombuffer(raw,'<u2').reshape(h,w).astype(np.uint32); im=np.stack([((a>>11)&31)<<3,((a>>5)&63)<<2,(a&31)<<3],-1).astype('u1')
    Image.fromarray(im).save(fn); return im
