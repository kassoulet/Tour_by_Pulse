"""Fast harness: `from harness import *` loads state.bin (run boot.py once, ~40 s) and exposes
 mu (Unicorn), call(fn, eax, edx, ebx, ecx, stack=[...]) (Watcom register convention; fn = LINEAR address e.g. 0x10e0c8),
 B (image base 0x100000: addresses in ds.py/image.bin are linear), rd/wr/rd32/wr32/rdf/wrf helpers,
 alloc(n) -> scratch memory (host bump allocator, same one the engine's malloc uses)."""
import struct
import emucore as E
from emucore import mu,B,ireg,w
E.install_heap()
E.load_snapshot(E.HERE+'/state.bin')
def rd(addr,n): return bytes(mu.mem_read(addr,n))
def wr(addr,b): mu.mem_write(addr,bytes(b))
def rd32(addr): return struct.unpack('<I',rd(addr,4))[0]
def wr32(addr,v): wr(addr,struct.pack('<I',v&0xffffffff))
def rdf(addr): return struct.unpack('<f',rd(addr,4))[0]
def wrf(addr,v): wr(addr,struct.pack('<f',v))
def alloc(n):
    p=(E.hp[0]+15)&~15; E.hp[0]=p+n+16; return p
_call=E.call
def call(fn,eax=0,edx=0,ebx=0,ecx=0,stack=(),n=2000000000):
    """call original function at linear address fn"""
    return _call(fn-B,eax,edx,ebx,ecx,stack=stack,n=n)
