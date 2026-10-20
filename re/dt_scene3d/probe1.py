from lib import *
ev,st=init_scene("tentacle.exp 50.0 80.0")
print(hex(st))
rec=rd32(st+0x18); print('rec',hex(rec), rd(rec,0x9e).hex())
