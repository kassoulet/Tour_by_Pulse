from lib import *
import sys
for params in sys.argv[1:]:
    ev,st=init_scene(params); rec=rd32(st+0x18); wr(0x1f9d90,rd(rec,0x9e))
    print(params,{hex(a):rd32(a) for a in (0x1f9dc4,0x1f9dc8,0x1f9dcc,0x1f9dd0,0x1f9dd4,0x1f9de4)}, 'ptrs',{hex(a):hex(rd32(a)) for a in (0x1f9d98,0x1f9d9c,0x1f9da0,0x1f9da4,0x1f9da8,0x1f9dac,0x1f9db0)})
