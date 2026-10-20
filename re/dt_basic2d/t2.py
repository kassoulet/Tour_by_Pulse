from hx import *
lock()
for n in D: print(n,[hex(x) if i else x for i,x in enumerate(buf(n)[1:])] , hex(rd32(D[n]+0x20)))
ev=mkev("addEvent blit bbb {TITLE} {SCREEN} {}")
print(hex(ev),rd(ev,0x4e).hex())
