# differential test of the 3x4 matrix helpers used by echo5 (0x184610 identity, 0x1848d4 rotX, 0x1847d4 rotY, 0x1846d4 rotZ, 0x184648 scale)
# and the vertex transform 0x184ad4: random angles / vertices -> mat.json
import sys,os,random,struct,json
sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))
from harness import *
f2b=lambda x: struct.unpack('<I',struct.pack('<f',x))[0]
random.seed(3); m=alloc(0x40); res=[]
for t in range(200):
    a=struct.unpack('<f',struct.pack('<f',random.uniform(0,0.2)*random.choice((1,1,10,30))))[0]   # the angle is a float32 in the original
    call(0x184610,eax=m); 
    call(0x1848d4,eax=m,stack=[f2b(a)])
    call(0x1847d4,eax=m,stack=[f2b(a*1.1)])
    call(0x1846d4,eax=m,stack=[f2b(a*0.8)])
    call(0x184648,eax=m,stack=[f2b(2.0),f2b(2.6),f2b(2.0)])
    M=list(struct.unpack('<12f',rd(m,48)))
    vi=alloc(13*4*16); vo=alloc(13*4*16)
    verts=[[random.choice((-100,-80,-20,0,20,60,100)) for _ in range(3)] for _ in range(16)]
    for i,v in enumerate(verts): wr(vi+i*52,struct.pack('<3f',*v)+bytes(40))
    call(0x184ad4,eax=m,ecx=16,ebx=vo,edx=vi)
    out=[struct.unpack('<3f',rd(vo+i*52,12)) for i in range(16)]
    res.append({'a':struct.unpack('<f',struct.pack('<f',a))[0],'M':M,'v':verts,'o':out})
json.dump(res,open(sys.argv[1]+'/mat.json','w')); print('ok')
