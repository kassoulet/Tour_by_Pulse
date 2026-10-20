from lib import *
import sys,numpy as np
from PIL import Image
ev,st=init_scene("box3.exp 20.0 0.0"); d=bufdesc('screen'); wr32(d+0x20,rd32(d+0x1c)); play(st,20,0,0.0); render(st,100.0)
t=np.frombuffer(rd(0x41ab238,1024),'<u4')
pal=np.array(Image.open('../../docs/assets/cityligh.png').getpalette()[:768]).reshape(-1,3)
print([hex(x) for x in t[:6]],pal[:6].tolist())
rgb=(t>>16&255,t>>8&255,t&255); P=np.stack(rgb,1)
k=pal.astype(float); 
print('ratio',(P[1:40].astype(float)/np.maximum(k[1:40],1)).mean(0))
print(np.abs(P-pal).max())
