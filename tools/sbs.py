#!/usr/bin/env python3
"""sbs.py A B out.png  - side by side (+ amplified diff) of two images (ppm/png), downscaled 2x."""
import sys,numpy as np
from PIL import Image
a=Image.open(sys.argv[1]).convert('RGB'); b=Image.open(sys.argv[2]).convert('RGB')
d=np.abs(np.asarray(a).astype(int)-np.asarray(b).astype(int)); d=Image.fromarray(np.clip(d*4,0,255).astype('u1'))
w,h=a.size; W=Image.new('RGB',(w//2*3,h//2))
for i,im in enumerate((a,b,d)): W.paste(im.resize((w//2,h//2)),(i*(w//2),0))
W.save(sys.argv[3])
