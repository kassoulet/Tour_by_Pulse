import sys,struct; sys.path.insert(0,'..')
from harness import *
for i in (0,1):
    o=rd32(0x1f91e0+i*40+0x1c); print(hex(o)); 
    d=struct.unpack('<48I',rd(o,192)); print([hex(x) for x in d])
    vt=d[0]
    print([hex(x) for x in struct.unpack('<64I',rd(vt,256))])
