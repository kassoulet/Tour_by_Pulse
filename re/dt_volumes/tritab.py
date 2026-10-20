"""Extract the 256-case triangle table of the original (0x1b340c + case*64: int32 vertex byte offsets relative to the
sample's slot (slot size 0x60), triples, terminated by -1) and print it as ';'-separated base-12 edge strings."""
import sys, re
sys.path.insert(0, '..')
from harness import *
import struct
EDGE_MAP = [0x0000, 0x1001, 0x0010, 0x1000, 0x0100, 0x1101, 0x0110, 0x1100, 0x2000, 0x2001, 0x2010, 0x2011]
code = lambda m: (m >> 12) * 4096 + ((m >> 8) & 15) * 256 + ((m >> 4) & 15) * 16 + (m & 15)
rev = {code(m): i for i, m in enumerate(EDGE_MAP)}
out = []
for c in range(256):
    row = struct.unpack('<16i', rd(0x1b340c + 64 * c, 64)); s = ''
    for v in row:
        if v == -1: break
        assert v % 0x60 == 0
        s += '0123456789ab'[rev[v // 0x60 + 273 - 273 + 0]] if False else ''
    out.append(row)
# slot delta relative to the cell origin: vertex = edi + off, edi = vb - 0x6660 + 0x60*n  => slot = n - 273 + off/0x60 ; sister: base=s-273, add code
res = []
for row in out:
    s = ''
    for v in row:
        if v == -1: break
        k = v // 0x60
        s += '0123456789ab'[rev[k]]
    res.append(s)
txt = ';'.join(res) + ';'
sis = open('../../../pls73ms/docs/js/fx/volumes.js').read()
m = re.search(r"TRI_EDGES = '([^']*)'", sis).group(1)
print(len(res), txt == m, sum(1 for a, b in zip(res, m.split(';')) if a != b))
open('tritab.txt', 'w').write(txt)
