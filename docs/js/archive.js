// archive.js - TOUR.98 reader. Pure ES module (node 22 + browser). Ported from tools/extract.py (see re/archive.md).
// parseArchive(ArrayBuffer) -> [{type,name,usize,csize,data(Uint8Array raw payload), unpack()->Uint8Array}]
const u32 = (b, p) => (b[p] | b[p + 1] << 8 | b[p + 2] << 16 | b[p + 3] << 24) >>> 0;

// type 2 / t : PKLITE-like LZ, 16-bit LSB-first bit words (TOUR.EXE 0x129ed8). src includes the 17-byte header.
export function decodeDlz(src) {
  let p = 0x11, w = src[p] | src[p + 1] << 8, n = 16; p += 2;
  let out = new Uint8Array(1 << 16), o = 0;
  const put = (v) => { if (o === out.length) { const t = new Uint8Array(o * 2); t.set(out); out = t; } out[o++] = v; };
  const gb = () => { const b = w & 1; w >>= 1; if (--n === 0) { n = 16; w = src[p] | src[p + 1] << 8; p += 2; } return b; };
  const copy = (bh, bl, len) => { const off = ((bh << 8) | bl) - 0x10000; for (let i = 0; i < len; i++) put(out[o + off]); };
  for (;;) {
    if (gb()) { put(src[p++]); continue; }
    const b2 = gb(), bl = src[p++]; let bh = 0xff;
    if (!b2) {
      if (gb()) { for (let i = 0; i < 3; i++) bh = ((bh << 1) | gb()) & 255; bh = (bh - 1) & 255; copy(bh, bl, 2); continue; }
      if (bl !== 0xff) { copy(bh, bl, 2); continue; }
      if (gb()) continue;
      return out.slice(0, o);
    }
    bh = ((bh << 1) | gb()) & 255;
    if (!gb()) {
      let dh = 2;
      for (let i = 0; i < 3; i++) { if (gb()) break; bh = ((bh << 1) | gb()) & 255; dh = (dh << 1) & 255; }
      bh = (bh - dh) & 255;
    }
    let cl = 3;
    for (; cl <= 6; cl++) if (gb()) break;
    if (cl > 6) {
      if (gb()) cl = gb() ? 8 : 7;
      else if (gb()) cl = src[p++] + 0x11;
      else { let c = 0; for (let i = 0; i < 3; i++) c = (c << 1) | gb(); cl = c + 9; }
    }
    copy(bh, bl, cl);
  }
}

// type 1 : byte RLE (0x129ea8)
export function decode1(src) {
  const out = []; let p = 4;
  while (p < src.length) {
    const b = src[p++];
    if (b & 0x80) { for (let n = 256 - b; n > 0; n--) out.push(src[p++]); }
    else { const v = src[p++]; for (let n = b + 3; n > 0; n--) out.push(v); }
  }
  return Uint8Array.from(out);
}

// type 3 : LZ + five adaptive Huffman models (0x12a019). Tree arrays are indexed by byte offset >> 1.
class AH {
  constructor(limit) {
    this.limit = limit;
    const F = this.F = new Int32Array(0x200), C = this.C = new Int32Array(0x200), P = this.P = new Int32Array(0x400);
    for (let i = 0; i < 256; i++) { F[i] = 1; C[i] = 0x3fe + 2 * i; P[0x1ff + i] = i * 2; }
    for (let b = 0, s = 0x200; s <= 0x3fc; b += 4, s += 2) {
      F[s >> 1] = F[b >> 1] + F[(b >> 1) + 1]; C[s >> 1] = b; P[b >> 1] = s; P[(b >> 1) + 1] = s;
    }
    F[0x1ff] = 0xffff; P[0x1fe] = 0;
  }
  rescale() {
    const { F, C, P } = this;
    let s = 0;
    for (let b = 0; b < 0x3fe; b += 2) if (C[b >> 1] >= 0x3fe) { F[s >> 1] = (F[b >> 1] + 1) >> 1; C[s >> 1] = C[b >> 1]; s += 2; }
    let b = 0; s = 0x200;
    while (s < 0x3fe) {
      const dx = F[b >> 1] + F[(b >> 1) + 1]; F[s >> 1] = dx;
      let e = s;
      if (dx < F[(s - 2) >> 1]) { e = s - 4; while (dx < F[e >> 1]) e -= 2; e += 2; }
      for (let k = (s - e) >> 1; k > 0; k--) { F[(e >> 1) + k] = F[(e >> 1) + k - 1]; C[(e >> 1) + k] = C[(e >> 1) + k - 1]; }
      F[e >> 1] = dx; C[e >> 1] = b; b += 4; s += 2;
    }
    for (let q = 0; q < 0x3fe; q += 2) { const e = C[q >> 1]; P[e >> 1] = q; if (e < 0x3fe) P[(e >> 1) + 1] = q; }
  }
  decode(br) {
    const { F, C, P } = this;
    let bx = C[0x3fc >> 1];
    do { bx = C[(bx + br.bit() * 2) >> 1]; } while (bx < 0x3fe);
    const sym = (bx - 0x3fe) >> 1;
    if (F[0x3fc >> 1] === this.limit) this.rescale();
    let a = P[0x1ff + sym];
    for (;;) {
      const cx = ++F[a >> 1];
      if (cx > F[(a >> 1) + 1]) {
        let s = a + 2;
        do { s += 2; } while (cx > F[s >> 1]);
        s -= 2;
        F[a >> 1] = F[s >> 1]; F[s >> 1] = cx;
        const di = C[a >> 1]; P[di >> 1] = s; if (di < 0x3fe) P[(di >> 1) + 1] = s;
        const bb = C[s >> 1]; C[s >> 1] = di; P[bb >> 1] = a; if (bb < 0x3fe) P[(bb >> 1) + 1] = a;
        C[a >> 1] = bb; a = s;
      }
      a = P[a >> 1];
      if (a === 0) break;
    }
    return sym;
  }
}
export function decode3(src) {
  const usize = u32(src, 0); let p = 4, v = 0, n = 0;
  const br = { bit() { if (n === 0) { v = src[p++]; n = 8; } n--; return (v >> n) & 1; } };
  const M = [0xe00, 0x1c00, 0x200, 0x800, 0x480].map((l) => new AH(l));   // len, dist hi, dist lo, literal-run, literal
  const out = new Uint8Array(usize); let o = 0, lit = true;
  for (;;) {
    if (lit) {
      for (let k = M[3].decode(br); k > 0; k--) out[o++] = M[4].decode(br);
      if (o === usize) return out;
    }
    const ln = M[0].decode(br);
    if (ln === 0) { lit = true; continue; }
    const hi = ln === 2 ? 0 : M[1].decode(br), lo = M[2].decode(br), d = ((hi << 8) | lo) + 1;
    for (let k = 0; k < ln; k++, o++) out[o] = out[o - d];
    if (o === usize) return out;
    lit = br.bit() === 1;
  }
}

// type b : BWT + MTF + RLE + canonical Huffman blocks (0x130136), MSB-first bit stream
export function decodeB(src) {
  let pos = 0, buf = 0, nb = 0;          // buf holds nb (<= 31) pending bits
  const need = (k) => { while (nb < k) { buf = ((buf << 8) | (pos < src.length ? src[pos] : 0)) >>> 0; pos++; nb += 8; } };
  const get = (k) => { need(k); nb -= k; const r = buf >>> nb; buf = nb ? (buf & ((1 << nb) - 1)) >>> 0 : 0; return r; };
  const g32 = () => { const a = get(8), b = get(8), c = get(8), d = get(8); return (a | b << 8 | c << 16 | d << 24) >>> 0; };
  g32(); const bsize = g32();
  const blocks = []; let total = 0;
  const L = new Uint8Array(0x126), cnt = new Int32Array(20), nxt = new Int32Array(20), mtf = new Uint8Array(256), cn = new Int32Array(256), C = new Int32Array(256);
  const Lb = new Uint8Array(bsize), T = new Int32Array(bsize);
  for (;;) {
    const n = g32(); if (n === 0) break;
    const idx = g32();
    const last = (get(8) << 8) | get(8); L.fill(0); let i = 0, prev = 0;
    while (i <= last) {
      const c = get(5);
      if (c === 0) L[i] = 0;
      else if (c <= 0x11) L[i] = c + 1;
      else if (c <= 0x17) { const k = c - 0x10; for (let j = 0; j < k; j++) L[i + j] = prev; i += k - 1; }
      else { i += (c <= 0x1d ? c - 0x16 : c === 0x1e ? get(4) + 8 : get(5) + 0x18) - 1; }
      prev = L[i]; i++;
    }
    let maxl = 0; cnt.fill(0);
    for (const l of L) { if (l) cnt[l]++; if (l > maxl) maxl = l; }
    let code = 0; for (let b = 1; b < 19; b++) { code = (code + cnt[b - 1]) << 1; nxt[b] = code; }
    const tab = new Int32Array(1 << maxl);
    for (let s = 0; s < 0x126; s++) {
      const l = L[s]; if (!l) continue;
      const lo = nxt[l]++ << (maxl - l); tab.fill((s << 5) | l, lo, lo + (1 << (maxl - l)));
    }
    for (let k = 0; k < 256; k++) mtf[k] = k;
    cn.fill(0); i = 0;
    while (i < n) {
      need(maxl); const e = tab[buf >>> (nb - maxl)], l = e & 31, s = e >> 5;
      nb -= l; buf = nb ? (buf & ((1 << nb) - 1)) >>> 0 : 0;
      if (s < 0x100) {
        const c = mtf[s]; mtf.copyWithin(1, 0, s); mtf[0] = c;
        Lb[i] = c; T[i++] = cn[c]++;
      } else {
        const r = s === 0x104 ? 256 : s === 0x105 ? 128 : s === 0x106 ? 64 : s === 0x107 ? 32 : s - 0x106, c = mtf[0];
        for (let k = 0; k < r; k++) { Lb[i] = c; T[i++] = cn[c]++; }
      }
    }
    let a = 0; for (let c = 0; c < 256; c++) { C[c] = a; a += cn[c]; }
    const blk = new Uint8Array(n); let x = idx;
    for (let k = n - 1; k >= 0; k--) { const c = Lb[x]; blk[k] = c; x = T[x] + C[c]; }
    blocks.push(blk); total += n;
  }
  const out = new Uint8Array(total); let o = 0;
  for (const b of blocks) { out.set(b, o); o += b.length; }
  return out;
}

export function parseArchive(ab) {
  const d = new Uint8Array(ab), recs = []; let p = 0;
  while (p < d.length) {
    const usize = u32(d, p), csize = u32(d, p + 4), nl = u32(d, p + 8), dofs = u32(d, p + 12), nofs = u32(d, p + 16), dend = u32(d, p + 20);
    const type = String.fromCharCode(d[p + 24]);
    let name = ''; for (let i = 0; i < nl - 1; i++) name += String.fromCharCode(d[nofs + i]);
    const data = d.subarray(dofs, dend);
    recs.push({ type, name, usize, csize, data, unpack() { return unpack(type, usize, csize, data); } });
    p = dend;
  }
  return recs;
}
export function unpack(type, usize, csize, data) {
  switch (type) {
    case 'j': case 'p': case '0': return data;
    case '2': case 't': return csize < usize ? decodeDlz(data) : data;   // t = TGA (still a TGA file)
    case '1': return decode1(data);
    case '3': return decode3(data);
    case 'b': return decodeB(data);
  }
  throw new Error('unsupported record type ' + type);
}
