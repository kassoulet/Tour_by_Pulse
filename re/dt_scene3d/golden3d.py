"""golden3d.py PARAMS SPEED OFFSET OUTDIR T0 T1 DT [bg]  -- render scene event (params e.g. 'tentacle.exp 50.0 80.0') with the ORIGINAL code at local times T0..T1 (centiseconds)
 writes OUTDIR/f<T>.png (and .raw = SCREEN 640x480 u32). bg = name of a 16/32 bit buffer to copy into SCREEN before each frame (default black)."""
import sys,os
from lib import *
params,speed,off,out,t0,t1,dt=sys.argv[1],float(sys.argv[2]),float(sys.argv[3]),sys.argv[4],int(sys.argv[5]),int(sys.argv[6]),int(sys.argv[7])
os.makedirs(out,exist_ok=True)
ev,st=init_scene(params)
d=bufdesc('screen'); p=rd32(d+0x1c); wr32(d+0x20,p)
play(st,speed,off,0.0)
for t in range(t0,t1+1,dt):
    wr(p,b'\0'*(640*480*4))
    render(st,float(t))
    im=dumpbuf('screen',f'{out}/f{t:05d}.png')
    open(f'{out}/f{t:05d}.raw','wb').write(rd(p,640*480*4))
