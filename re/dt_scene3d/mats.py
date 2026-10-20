from lib import *
import sys
for params in sys.argv[1:]:
    ev,st=init_scene(params); rec=rd32(st+0x18)
    # copy rec -> global as render does
    g=rd(rec,0x9e); wr(0x1f9d90,g)
    nm=rd32(0x1f9dd4); base=rd32(0x1f9da4)
    print(params,'nmat',nm,'nobj',rd32(0x1f9dc4),'ncam',rd32(0x1f9dc8),'nlight(?)',rd32(0x1f9dd0),'dur',rdf(0x1f9dd8))
    for i in range(nm):
        m=rd(base+i*0xf3,0xf3)
        print(' mat',i,'name',m[0x1:0x11].split(b'\0')[0], 'a5..a7',[hex(x) for x in m[0xa5:0xa8]])
        print('   ',m.hex())
