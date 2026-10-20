#!/usr/bin/env python3
"""TOUR.98 extractor.  usage: extract.py [TOUR.98] [outdir]   (defaults: ../TOUR.98 -> ../docs/assets)
Record: [u32 usize][u32 csize][u32 namelen][u32 dataofs][u32 nameofs][u32 dataend][u8 type][name\\0] data
Types: 0 stored | 1 byte RLE (0x129ea8) | 2 dlz LZ (0x129ed8) | 3 LZ + 5 adaptive-Huffman models (0x12a019) | 4 order-N PPM
+ arithmetic coder (0x12ffa6, unused) | b BWT block coder (0x130136) | t = TGA packed as dlz (written as PNG) | j,p raw JPEG/PNG.
Everything: python3 stdlib (+ Pillow for TGA->PNG).  Decoders are importable: decode_dlz, decode_1, decode_b, decode_3."""
import struct, sys, os, io

# ---------------------------------------------------------------- type 2 / t : dlz (TOUR.EXE 0x129ed8)
def decode_dlz(src):
    """src = record data incl. 17-byte header (ignored); LSB-first 16-bit bit words (PKLITE-like LZ)."""
    p = 0x11; out = bytearray()
    st = [struct.unpack_from('<H', src, p)[0], 16]; p += 2
    def gb():                              # shr bp,1 ; dec dl ; reload word when dl hits 0
        nonlocal p
        b = st[0] & 1; st[0] >>= 1; st[1] -= 1
        if st[1] == 0:
            st[1] = 16; st[0] = struct.unpack_from('<H', src, p)[0]; p += 2
        return b
    def copy(bh, bl, n):
        off = ((bh << 8) | bl) - 0x10000
        for _ in range(n): out.append(out[len(out) + off])
    while True:
        if gb(): out.append(src[p]); p += 1; continue          # literal
        b2 = gb(); bl = src[p]; p += 1; bh = 0xff
        if not b2:
            if gb():                                           # short match, 3 more offset bits
                for _ in range(3): bh = ((bh << 1) | gb()) & 255
                bh = (bh - 1) & 255
                copy(bh, bl, 2); continue
            if bl != 0xff: copy(bh, bl, 2); continue           # 2-byte match, 8-bit offset
            if gb(): continue                                  # 0xff escape: nop
            return bytes(out)                                  # 0xff escape: end
        bh = ((bh << 1) | gb()) & 255
        if not gb():
            dh = 2
            for _ in range(3):
                if gb(): break
                bh = ((bh << 1) | gb()) & 255; dh = (dh << 1) & 255
            bh = (bh - dh) & 255
        for cl in (3, 4, 5, 6):                                # unary length
            if gb(): break
        else:
            if gb(): cl = 8 if gb() else 7
            elif gb(): cl = src[p] + 0x11; p += 1
            else:
                c = 0
                for _ in range(3): c = (c << 1) | gb()
                cl = c + 9
        copy(bh, bl, cl)

# ---------------------------------------------------------------- type 1 : LZ + 5 adaptive Huffman models (0x12a019)
class _AH:
    """adaptive Huffman model of 256 symbols (0x12a154 init, 0x12a2ff decode+update, 0x12a1ee rescale).
    Tree stored sorted by weight in arrays indexed by byte offset/2: F weight, C children-or-symbol, P parent."""
    NL = 0x1ff   # F/C size in slots incl. sentinel
    def __init__(self, limit):
        self.limit = limit
        F = [0] * 0x200; C = [0] * 0x200; P = [0] * 0x400    # index = byte offset >> 1
        for i in range(256): F[i] = 1; C[i] = 0x3fe + 2 * i; P[0x1ff + i] = i * 2   # leaf i; P[0x1ff+sym] = leaf slot
        b, s = 0, 0x200
        while s <= 0x3fc:
            F[s >> 1] = F[b >> 1] + F[(b >> 1) + 1]; C[s >> 1] = b; P[b >> 1] = s; P[(b >> 1) + 1] = s
            b += 4; s += 2
        F[0x1ff] = 0xffff; P[0x1fe] = 0
        self.F, self.C, self.P = F, C, P
    def rescale(self):
        F, C, P = self.F, self.C, self.P
        s = 0
        for b in range(0, 0x3fe, 2):                  # keep leaves (C >= 0x3fe), halve weights
            if C[b >> 1] >= 0x3fe:
                F[s >> 1] = (F[b >> 1] + 1) >> 1; C[s >> 1] = C[b >> 1]; s += 2
        b = 0; s = 0x200
        while s < 0x3fe:                              # rebuild internal nodes, keep array sorted
            dx = F[b >> 1] + F[(b >> 1) + 1]; F[s >> 1] = dx
            e = s - 2
            if dx < F[e >> 1]:
                e -= 2
                while dx < F[e >> 1]: e -= 2
                e += 2
            else: e = s
            cnt = (s - e) >> 1
            for k in range(cnt, 0, -1):
                F[(e >> 1) + k] = F[(e >> 1) + k - 1]; C[(e >> 1) + k] = C[(e >> 1) + k - 1]
            F[e >> 1] = dx; C[e >> 1] = b
            b += 4; s += 2
        for b in range(0, 0x3fe, 2):
            e = C[b >> 1]; P[e >> 1] = b
            if e < 0x3fe: P[(e >> 1) + 1] = b
    def decode(self, br):
        F, C, P = self.F, self.C, self.P
        bx = C[0x3fc >> 1]
        while True:
            bx = C[(bx + br.bit() * 2) >> 1]
            if bx >= 0x3fe: break
        sym = (bx - 0x3fe) >> 1
        if F[0x3fc >> 1] == self.limit: self.rescale()
        a = P[0x1ff + sym]
        while True:
            F[a >> 1] += 1; cx = F[a >> 1]
            if cx > F[(a >> 1) + 1]:
                s = a + 2
                while True:
                    s += 2
                    if not cx > F[s >> 1]: break
                s -= 2
                F[a >> 1] = F[s >> 1]; F[s >> 1] = cx
                di = C[a >> 1]; P[di >> 1] = s
                if di < 0x3fe: P[(di >> 1) + 1] = s
                bx = C[s >> 1]; C[s >> 1] = di
                P[bx >> 1] = a
                if bx < 0x3fe: P[(bx >> 1) + 1] = a
                C[a >> 1] = bx; a = s
            a = P[a >> 1]
            if a == 0: break
        return sym

class _BitsMSB:
    """MSB-first byte bit reader (add al,al / carry)"""
    def __init__(s, d, p): s.d, s.p, s.v, s.n = d, p, 0, 0
    def bit(s):
        if s.n == 0: s.v = s.d[s.p]; s.p += 1; s.n = 8
        s.n -= 1; return (s.v >> s.n) & 1

def decode_3(src):
    usize = struct.unpack_from('<I', src, 0)[0]
    br = _BitsMSB(src, 4); out = bytearray()
    M = [_AH(0xe00), _AH(0x1c00), _AH(0x200), _AH(0x800), _AH(0x480)]   # length, dist-hi, dist-lo, literal-run, literal
    lit = True
    while True:
        if lit:
            n = M[3].decode(br)
            for _ in range(n): out.append(M[4].decode(br))
            if len(out) == usize: return bytes(out)
        ln = M[0].decode(br)
        if ln == 0: lit = True; continue
        hi = 0 if ln == 2 else M[1].decode(br)
        lo = M[2].decode(br)
        d = ((hi << 8) | lo) + 1
        for _ in range(ln): out.append(out[-d])
        if len(out) == usize: return bytes(out)
        lit = br.bit() == 1

# ---------------------------------------------------------------- type b : BWT + MTF + RLE + canonical Huffman (0x130136)
def decode_b(src):
    pos = 0; buf = 0; nb = 0
    def get(n):
        nonlocal pos, buf, nb
        while nb < n:
            buf = (buf << 8) | (src[pos] if pos < len(src) else 0); pos += 1; nb += 8
        nb -= n; v = buf >> nb; buf &= (1 << nb) - 1; return v
    def u32(): a = [get(8) for _ in range(4)]; return a[0] | a[1] << 8 | a[2] << 16 | a[3] << 24
    total = u32(); bsize = u32(); out = bytearray()
    RUN = {0x104: 256, 0x105: 128, 0x106: 64, 0x107: 32}
    while True:
        n = u32()
        if n == 0: break
        idx = u32()
        # code lengths (0x174088): 16-bit last-index, then 5-bit codes, 0=len0, 1..17=len+1, 18..23 repeat prev 2..7,
        # 24..29 zeros 2..7, 30: zeros 8+get4, 31: zeros 24+get5
        last = get(8) << 8 | get(8); L = [0] * 0x126; i = 0; prev = 0
        while i <= last:
            c = get(5)
            if c == 0: L[i] = 0
            elif c <= 0x11: L[i] = c + 1
            elif c <= 0x17:
                k = c - 0x10
                for j in range(k): L[i + j] = prev
                i += k - 1
            else:
                k = c - 0x16 if c <= 0x1d else (get(4) + 8 if c == 0x1e else get(5) + 0x18)
                i += k - 1                                                   # zeros already
            prev = L[i]; i += 1
        # canonical codes (deflate style) -> lookup table
        maxl = max(L); cnt = [0] * 20
        for l in L:
            if l: cnt[l] += 1
        nxt = [0] * 20; code = 0
        for b in range(1, 19): code = (code + cnt[b - 1]) << 1; nxt[b] = code
        tab = [0] * (1 << maxl)
        for s, l in enumerate(L):
            if l:
                c = nxt[l]; nxt[l] += 1; lo = c << (maxl - l)
                tab[lo:lo + (1 << (maxl - l))] = [(s << 5) | l] * (1 << (maxl - l))
        mtf = list(range(256)); cn = [0] * 256; Lb = bytearray(n); T = [0] * n; i = 0
        while i < n:
            while nb < maxl:
                buf = (buf << 8) | (src[pos] if pos < len(src) else 0); pos += 1; nb += 8
            e = tab[(buf >> (nb - maxl))]; l = e & 31; s = e >> 5
            nb -= l; buf &= (1 << nb) - 1
            if s < 0x100:
                c = mtf.pop(s); mtf.insert(0, c)
                Lb[i] = c; T[i] = cn[c]; cn[c] += 1; i += 1
            else:
                r = RUN.get(s) or (s - 0x106); c = mtf[0]
                for _ in range(r): Lb[i] = c; T[i] = cn[c]; cn[c] += 1; i += 1
        C = [0] * 256; a = 0
        for c in range(256): C[c] = a; a += cn[c]
        blk = bytearray(n); x = idx
        for k in range(n - 1, -1, -1):
            c = Lb[x]; blk[k] = c; x = T[x] + C[c]
        out += blk
    return bytes(out)

# ---------------------------------------------------------------- type 1 : byte RLE (0x129ea8)
def decode_1(src):
    """src: [u32 usize] then packets: signed byte b<0 -> copy -b literals; b>=0 -> repeat next byte b+3 times"""
    out = bytearray(); p = 4
    while p < len(src):
        b = src[p]; p += 1
        if b & 0x80: n = 256 - b; out += src[p:p + n]; p += n
        else: out += bytes([src[p]]) * (b + 3); p += 1
    return bytes(out)

# type 4 (order-N PPM + arithmetic coder, 0x12ffa6, streams from the FILE) exists in the executable but no record uses it.

# ---------------------------------------------------------------- archive
def parse(d):
    """-> [(type, name, usize, csize, payload)] ; header [6 x u32][u8 type][name\\0], offsets absolute"""
    p = 0; recs = []
    while p < len(d):
        us, cs, nl, do, no, de = struct.unpack_from('<6I', d, p)
        recs.append((chr(d[p + 24]), d[no:no + nl - 1].decode('latin1'), us, cs, d[do:de]))
        p = de
    return recs

def unpack(t, us, cs, data):
    """record payload -> file bytes (TGA still TGA)"""
    if t in 'jp0': return bytes(data)
    if t in '2t': out = decode_dlz(data) if cs < us else bytes(data)    # 0x107c8e: csize >= usize -> stored
    elif t == '1': out = decode_1(data)
    elif t == '3': out = decode_3(data)
    elif t == 'b': out = decode_b(data)
    else: raise ValueError('unsupported record type %r' % t)
    assert len(out) == us, (t, len(out), us)
    return out

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, '..', 'TOUR.98')
    dst = sys.argv[2] if len(sys.argv) > 2 else os.path.join(here, '..', 'docs', 'assets')
    os.makedirs(dst, exist_ok=True)
    recs = parse(open(src, 'rb').read()); n = 0
    for t, name, us, cs, data in recs:
        out = unpack(t, us, cs, data); name = name.lower()
        if t == 't':                                    # TGA -> PNG (Pillow)
            from PIL import Image
            im = Image.open(io.BytesIO(out)).convert('RGB'); b = io.BytesIO(); im.save(b, 'PNG')
            out = b.getvalue(); name = os.path.splitext(name)[0] + '.png'
        open(os.path.join(dst, name), 'wb').write(out); n += 1
    print('%d records -> %s' % (n, dst))

if __name__ == '__main__': main()
