from hx import *
lock()
rng=np.random.default_rng(1)
for src,dst in [('temp','screen'),('fears','temp'),('screen','title'),('temp8','lores'),('title','tempimages'),('temp','temp')]:
    d,w,h,b=buf(src); 
    t=rng.integers(0,2**(b),(h,w),dtype='<u4' if b==32 else '<u2' if b==16 else 'u1'); setbuf(src,t)
    D2,w2,h2,b2=buf(dst); o0=getbuf(dst)
    ev=mkev("addEvent blit bbb {%s} {%s} {}"%(src,dst)); runev(ev); s=getbuf(dst)
    print(src,dst,'changed',(s!=o0).mean(), hex(t[0,0]),hex(s[0,0]),hex(t[1,5]),hex(s[1,5]) if s.shape[1]>5 else '')
