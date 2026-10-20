#!/usr/bin/env python3
"""parse a whole XM module; fail if structure does not consume the file exactly. usage: xmcheck.py file.xm"""
import struct, sys
def parse(d):
    assert d[:17] == b'Extended Module: ', 'header'
    hs, = struct.unpack_from('<I', d, 60)
    ver, = struct.unpack_from('<H', d, 58)
    songlen, restart, nch, npat, ninst, flags, tempo, bpm = struct.unpack_from('<8H', d, 64)
    p = 60 + hs; stat = dict(name=d[17:37].decode('latin1').strip(), ver=hex(ver), songlen=songlen, nch=nch, npat=npat, ninst=ninst, tempo=tempo, bpm=bpm)
    orders = list(d[80:80 + songlen])
    for _ in range(npat):
        hl, pack, rows, psz = struct.unpack_from('<IBHH', d, p); p += hl; q = p; end = p + psz
        for _ in range(rows * nch if psz else 0):
            b = d[q]; q += 1
            if b & 0x80:
                for bit in range(5):
                    if b & (1 << bit): q += 1
            else: q += 4
        assert q == end, ('pattern', q, end); p = end
    ns = 0; sbytes = 0
    for _ in range(ninst):
        isz, = struct.unpack_from('<I', d, p); n, = struct.unpack_from('<H', d, p + 27); q = p + isz
        if n:
            shs, = struct.unpack_from('<I', d, p + 29); q = p + isz
            heads = []
            for _ in range(n):
                ln, = struct.unpack_from('<I', d, q); typ = d[q + 14]; heads.append((ln, typ)); q += shs
            for ln, typ in heads: q += ln; sbytes += ln; ns += 1
        p = q
    assert p == len(d), ('leftover bytes', p, len(d))
    stat.update(samples=ns, sample_bytes=sbytes, orders=orders)
    return stat
if __name__ == '__main__':
    for f in sys.argv[1:]:
        s = parse(open(f, 'rb').read()); o = s.pop('orders'); print(f, s, 'order list len', len(o), 'max pat', max(o))
