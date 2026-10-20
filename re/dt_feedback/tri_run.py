# differential test of the echo5 triangle pipeline: call the original front end 0x18337a on random triangles (additive, 8 bit 320x200)
# usage: tri_run.py OUTDIR [ntri] [seed]  -> tri.json (vertices), tex.bin, scr0.bin (initial), scr1.bin (after all triangles)
import sys,os,random,struct,json
sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))
from harness import *
out=sys.argv[1]; n=int(sys.argv[2]) if len(sys.argv)>2 else 60; random.seed(int(sys.argv[3]) if len(sys.argv)>3 else 7)
tex=bytes(random.randrange(256) for _ in range(65536)); scr0=bytes(random.choice((0,0,10,200)) for _ in range(64000))
pt=alloc(65536+64); ps=alloc(64000); wr(pt,tex); wr(ps,scr0)
wrf(0x1c4090,-0.625); wrf(0x1c4094,-0.390625)   # what echo5 init sets (0x1534c0)
vb=alloc(0x20*3)
tris=[]
for t in range(n):
    vs=[]
    zc=random.choice((200,500,1200,2500)); 
    for k in range(3):
        z=zc*random.uniform(0.6,1.4) if random.random()>0.12 else random.uniform(-300,300)
        sp=random.choice((0.5,1.2,2.5))
        x=random.uniform(-1,1)*abs(zc)*sp; y=random.uniform(-1,1)*abs(zc)*sp*0.75
        u=random.uniform(-1,1)*2e6; v=random.uniform(-1,1)*2e6
        vs.append([struct.unpack('<f',struct.pack('<f',a))[0] for a in (x,y,z,u,v)])
    tris.append(vs)
    for k,(x,y,z,u,v) in enumerate(vs):
        wr(vb+k*0x20,bytes(0x20)); wr(vb+k*0x20,struct.pack('<3f',x,y,z)); wr(vb+k*0x20+0x14,struct.pack('<2f',u,v))
    call(0x18337a,stack=[vb,vb+0x20,vb+0x40,0,pt,ps])
json.dump(tris,open(out+'/tri.json','w'))
open(out+'/tri_tex.bin','wb').write(tex); open(out+'/tri_scr0.bin','wb').write(scr0); open(out+'/tri_scr1.bin','wb').write(rd(ps,64000))
print('done',sum(1 for a,b in zip(scr0,rd(ps,64000)) if a!=b),'pixels changed')
