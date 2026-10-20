import sys; sys.path.insert(0,'..')
from harness import *
import re
# scan all mapped memory for buffer names
from emucore import mu
for (b,e,p) in mu.mem_regions():
    if e-b>0x4000000: continue
    d=rd(b,e-b+1)
    for m in re.finditer(rb'(?i)(SCREEN|TITLE|CITYLIGHTS)\0',d):
        print(hex(b+m.start()),m.group(0))
