from lib import *
import json,struct
ev,st=init_scene("tentacle.exp 50.0 80.0"); d=bufdesc('screen'); wr32(d+0x20,rd32(d+0x1c)); play(st,50,80,0.0)
out=[]
for T in range(0,1250,60):
    render(st,float(T)); cam=rd32(0x1f9da0); out.append((rdf(0x1d1b28),list(struct.unpack('<3f',rd(cam+0x78,12)))))
json.dump(out,open('/tmp/camscan.json','w')); print(out[:3])
