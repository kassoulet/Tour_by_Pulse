"""bomb_at.py: dump the bomb state (per face spd, dist, g) of the original in the continuous run, at its first run"""
import sys; sys.path.insert(0,'.')
import golden as G, struct, json
from golden import *
G.dt[0]=1/30; G.OUT[0]=None
done=[0]
def at_run():
    if done[0]: return
    done[0]=1; st=E.ireg('EAX'); rd=lambda a,n: bytes(mu.mem_read(a,n))
    g=struct.unpack('<3f',rd(st+0x10,12)); faces=rd(st+0x1c,4); fp=struct.unpack('<I',faces)[0]; obj=struct.unpack('<I',rd(st,4))[0]; nt=struct.unpack('<I',rd(obj+0x1c,4))[0]
    fs=[struct.unpack('<17f',rd(fp+i*0x44+0x0,0x44))[:17] for i in range(nt)]
    json.dump({'t':G.t[0],'g':g,'nt':nt,'faces':[list(f) for f in fs[:300]],'start':struct.unpack('<f',rd(st+8,4))[0],'now':struct.unpack('<f',rd(0x1b28f8,4))[0]},open('/tmp/bomb_orig.json','w')); print('dumped',G.t[0],flush=True)
G.at(0x112ca8,at_run)
G.WIN[:]=[(0,75)]; G.LEAD[0]=0.5
t1=75; G.t[0]=-G.dt[0]
def stop():
    if G.t[0]>=t1 or done[0]: mu.emu_stop()
G.at(0x101364,stop)
w('ESP',G.st['regs']['ESP'])
mu.emu_start(G.st['regs']['EIP'],0)
