"""seed_at.py : value of the Watcom rand seed [0x1ba928] when bomb init (0x112868) / displace247 init run in the continuous original run"""
import sys; sys.path.insert(0,'.')
import golden as G
from golden import *
import emucore as E
G.dt[0]=1/30; G.OUT[0]=None
seeds=[]
def rec(name):
    return lambda: print(name,'t=%.3f'%G.t[0],'seed',hex(int.from_bytes(bytes(mu.mem_read(0x1ba928,4)),'little')),flush=True)
G.at(0x112868,rec('bomb init')); G.at(0x113288,rec('displace247 init'))
G.WIN[:]=[(0,75)]; G.LEAD[0]=0.0
t1=75; G.t[0]=-G.dt[0]
def stop():
    if G.t[0]>=t1: mu.emu_stop()
G.at(0x101364,stop)
w('ESP',G.st['regs']['ESP'])
mu.emu_start(G.st['regs']['EIP'],0)
