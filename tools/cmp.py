#!/usr/bin/env python3
"""cmp.py A.png B.png [diff.png] - per-channel max/mean abs error and % identical pixels (diff.png = amplified |A-B|)."""
import sys,numpy as np
from PIL import Image
a=np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int); b=np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(int)
if a.shape!=b.shape: sys.exit('size mismatch %s vs %s'%(a.shape,b.shape))
d=np.abs(a-b)
print('max  R,G,B:',*d.max(axis=(0,1)))
print('mean R,G,B: %.3f %.3f %.3f'%tuple(d.mean(axis=(0,1))))
print('identical pixels: %.3f%%'%(100*(d.sum(axis=2)==0).mean()))
if len(sys.argv)>3: Image.fromarray(np.clip(d*8,0,255).astype('u1')).save(sys.argv[3])
