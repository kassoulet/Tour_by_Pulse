from hx import *
lock()
a=(np.arange(640*480)%65536).astype('<u2').reshape(480,640); setbuf('title',a)
ev=mkev("addEvent blit bbb {TITLE} {SCREEN} {}"); runev(ev)
s=getbuf('screen')
v=np.arange(65536); S=s.reshape(-1)[:65536]
R=(S>>16)&255;G=(S>>8)&255;B=S&255
rt=[int(R[i<<11]) for i in range(32)]; gt=[int(G[i<<5]) for i in range(64)]; bt=[int(B[i]) for i in range(32)]
print(rt);print(gt);print(bt)
print('A',set((S>>24).tolist()))
# channels independent?
print(all(R[x]==rt[x>>11] and G[x]==gt[(x>>5)&63] and B[x]==bt[x&31] for x in range(0,65536,7)))
for sh in (8,12,16):
  m=lambda k,mx: int(k*255/mx*(1<<sh))/(1<<sh)
  print(sh,[int(k*int(255/31*(1<<sh))>>sh) for k in range(32)]==rt,[int(k*int(255/63*(1<<sh))>>sh) for k in range(64)]==gt)
