// png.js - minimal decoder for 8-bit paletted PNGs (colour type 3, non-interlaced): returns the palette INDICES, which canvas decoding loses.
// Works in browsers and node >= 18 (DecompressionStream). Used by assets.js / tools/render.mjs: assets.indexed(name) -> {w,h,data:Uint8Array,pal:Uint8Array(768) RGB}.
export async function decodeIndexedPng(u8) {
  const d = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let p = 8, w = 0, h = 0, ct = -1, bd = 0, il = 0, pal = null; const idat = [];
  while (p < u8.length) {
    const len = d.getUint32(p), t = String.fromCharCode(u8[p + 4], u8[p + 5], u8[p + 6], u8[p + 7]), b = u8.subarray(p + 8, p + 8 + len);
    if (t === 'IHDR') { w = d.getUint32(p + 8); h = d.getUint32(p + 12); bd = u8[p + 16]; ct = u8[p + 17]; il = u8[p + 20]; }
    else if (t === 'PLTE') { pal = new Uint8Array(768); pal.set(b); }
    else if (t === 'IDAT') idat.push(b);
    else if (t === 'IEND') break;
    p += 12 + len;
  }
  if (ct !== 3 || bd !== 8 || il !== 0) return null;
  const all = new Uint8Array(idat.reduce((s, c) => s + c.length, 0)); let o = 0; for (const c of idat) { all.set(c, o); o += c.length; }
  const raw = new Uint8Array(await new Response(new Blob([all]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
  const data = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) { // PNG filters 0..4, 1 byte per pixel
    const f = raw[y * (w + 1)], s = y * (w + 1) + 1, dst = y * w;
    for (let x = 0; x < w; x++) {
      const a = x ? data[dst + x - 1] : 0, b = y ? data[dst - w + x] : 0, c = x && y ? data[dst - w + x - 1] : 0; let v = raw[s + x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      data[dst + x] = v;
    }
  }
  return { w, h, data, pal };
}
