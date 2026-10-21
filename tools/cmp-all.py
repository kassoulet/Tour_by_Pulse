#!/usr/bin/env python3
"""cmp-all.py GOLDEN_DIR REPLAY_DIR - compare every golden PNG with the port's PPM of the same name: mean abs error, % identical, % within 8 levels; summary per 10 s and the worst frames."""
import sys,os,numpy as np
from PIL import Image
g,r=sys.argv[1:3]; rows=[]
for f in sorted(os.listdir(g)):
    if not f.endswith('.png'): continue
    p=os.path.join(r,f[:-4]+'.ppm')
    if not os.path.exists(p): continue
    a=np.asarray(Image.open(os.path.join(g,f)).convert('RGB'),dtype=np.int16); b=np.asarray(Image.open(p).convert('RGB'),dtype=np.int16)
    d=np.abs(a-b); m=d.max(axis=2)
    rows.append((float(f[2:-4]),d.mean(),(m==0).mean()*100,(m<=8).mean()*100,f))
bins={}
for t,e,i,w,f in rows: bins.setdefault(int(t//10),[]).append((e,i,w))
print('  sec    mean_err  identical%  within8%')
for k in sorted(bins):
    v=np.array(bins[k]); print('%3d-%3d  %7.2f  %9.1f  %8.1f'%(k*10,k*10+10,*v.mean(axis=0)))
rows.sort(key=lambda x:-x[1]); print('worst:',[(x[4],round(x[1],1)) for x in rows[:8]])
print('overall mean err %.2f  identical %.1f%%  within8 %.1f%%'%tuple(np.mean([[x[1],x[2],x[3]] for x in rows],axis=0)))
