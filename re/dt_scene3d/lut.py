from lib import *
import sys,struct,numpy as np
ev,st=init_scene("tentacle.exp 50.0 80.0"); d=bufdesc('screen'); wr32(d+0x20,rd32(d+0x1c)); play(st,50,80,0.0); render(st,100.0)
code=rd(0x163644,0x40); print(code.hex(' '))
tex1=struct.unpack_from('<I',code,2)[0]; tex2=struct.unpack_from('<I',code,0x0e+2)[0]  # mov al,[ebx+T] ; mov ah,[ecx+T2]
print(hex(tex1)); 
lut=struct.unpack_from('<I',code,0x1f+3)[0]; print('lut',hex(lut))
np.save('lut_tent.npy',np.frombuffer(rd(lut,65536*4),'<u4'))
np.save('tex1_tent.npy',np.frombuffer(rd(tex1,65536),'u1'))
