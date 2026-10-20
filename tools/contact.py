#!/usr/bin/env python3
"""contact.py OUT.png COLS THUMB_W img1.png img2.png ...  - contact sheet with file names."""
import sys,os
from PIL import Image,ImageDraw
out,cols,tw=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]); fs=sys.argv[4:]
ims=[Image.open(f).convert('RGB') for f in fs]; th=tw*ims[0].height//ims[0].width; rows=(len(ims)+cols-1)//cols
S=Image.new('RGB',(cols*tw,rows*(th+12)),(20,20,20)); d=ImageDraw.Draw(S)
for i,(f,im) in enumerate(zip(fs,ims)):
    x,y=(i%cols)*tw,(i//cols)*(th+12); S.paste(im.resize((tw,th)),(x,y)); d.text((x+2,y+th),os.path.basename(f)[:tw//6],fill=(255,255,255))
S.save(out)
