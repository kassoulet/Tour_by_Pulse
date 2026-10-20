import sys; sys.path.insert(0,'..')
from harness import *
n=rd32(0x1b7558); print('nbuf',n)
for i in range(n):
    b=rd(0x1f91e0+i*0x28,0x28); print(i,b[:16].split(b'\0')[0],[hex(int.from_bytes(b[k:k+4],'little')) for k in range(0x10,0x28,4)])
print('events',rd32(0x1b755c))
