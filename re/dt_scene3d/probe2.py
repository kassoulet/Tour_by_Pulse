from lib import *
import sys
ev,st=init_scene("tentacle.exp 50.0 80.0")
d=bufdesc('screen'); print([hex(rd32(d+k)) for k in range(0,0x28,4)])
wr32(d+0x20,rd32(d+0x1c))
rec=play(st,50.0,80.0,0.0)
r=render(st,100.0); print('ret',r)
dumpbuf('screen','/tmp/claude-1000/-home-gautier-SynologyDrive-code-current-demoports/4a6b9f3e-e5e0-45de-8028-f20db5171c61/scratchpad/t0.png')
