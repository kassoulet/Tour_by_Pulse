"""obj_at.py T : dump scene object 0 (vertex positions, matrices) + camera of the ORIGINAL in the continuous run at time T (first frame >= T)"""
import sys; sys.path.insert(0,'.')
import golden as G, struct, json
from golden import *
T=float(sys.argv[1]); G.dt[0]=1/30; G.OUT[0]=None; done=[0]
def dump():
    if done[0] or G.t[0]<T: return
    done[0]=1; rd=lambda a,n: bytes(mu.mem_read(a,n))
    ob=struct.unpack('<I',rd(0x1f9d98,4))[0]; nv=struct.unpack('<I',rd(ob+0x10,4))[0]; vp=struct.unpack('<I',rd(ob+8,4))[0]
    cam=struct.unpack('<I',rd(0x1f9da0,4))[0]
    import numpy as np
    V=np.frombuffer(rd(vp,nv*0x60),'<f4').reshape(nv,24)[:,:12].tolist()
    json.dump({'t':G.t[0],'scene_t':struct.unpack('<f',rd(0x1d1b28,4))[0],'nv':nv,'V':V,'obj':list(struct.unpack('<%df'%(0x36c//4),rd(ob,0x36c))),'cam':list(struct.unpack('<74f',rd(cam,0x128)))},open('/tmp/obj_orig_%s.json'%sys.argv[1],'w')); print('dumped',G.t[0],flush=True)
G.at(0x10814d,dump)   # present hook: scene already rendered
G.WIN[:]=[(0,T+1)]; G.LEAD[0]=0.5
t1=T+0.1; G.t[0]=-G.dt[0]
def stop():
    if G.t[0]>=t1 or done[0]: mu.emu_stop()
G.at(0x101364,stop)
w('ESP',G.st['regs']['ESP'])
mu.emu_start(G.st['regs']['EIP'],0)
