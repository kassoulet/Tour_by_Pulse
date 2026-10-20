from hx import *
lock()
rng=np.random.default_rng(1)
t=rng.integers(0,2**32,(480,640),dtype='<u4'); setbuf('temp',t)
o0=getbuf('screen'); 
ev=mkev("addEvent blit bbb {TEMP} {SCREEN} {}"); runev(ev)
s=getbuf('screen'); print((s!=o0).sum()); 
ys,xs=np.nonzero(s!=o0); print(ys[:5],xs[:5])
print((s==t).mean(), np.unique(s)[:5])
for n in D:
    b=getbuf(n)
    if b.dtype==t.dtype: print(n,(b==t).mean())
