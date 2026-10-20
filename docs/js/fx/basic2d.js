// basic2d.js - the simple 2D effects of TOUR: palette, doubleimage, blend, fade, mapimage (+ optional ones at the end, clearly marked).
// Every routine is a port of the original (TOUR.EXE addresses in comments) and was compared with the original running under Unicorn
// (re/dt_basic2d/gen.py + tools/test-basic2d.mjs). 'blit' / 'surfcopy' live in engfx.js (engine owner); their 16->32 tables are verified here too.
// Pixel formats: see re/formats.md (32 bit = 0x00RRGGBB, 16 bit = RGB565, 8 bit = index).
import { FX, compileExpr } from '../core.js';
import { blitBuf } from './engfx.js';

const f32 = Math.fround;
/** C `(int)` truncation = the 0x103d1a helper (FPU control word forced to round-toward-zero around frndint). */
const trunc = (x) => Math.trunc(x);

// ---------------------------------------------------------------------------------------------------------------- palette
// init 0x10f5b4: state = palette file (768 bytes, VGA 6-bit RGB triplets). run 0x10f5e4: output 16 bit -> 0x108dda, else 0x108e2d.
// The tables are rebuilt every frame in the original (256 entries); we build them once.
FX.register('palette', {
  init(params, ev, ctx) {
    const raw = ctx.assets.bin(params.trim());
    const t32 = new Uint32Array(256), t16 = new Uint16Array(256);
    for (let i = 0; i < 256; i++) {
      const r = raw[3 * i], g = raw[3 * i + 1], b = raw[3 * i + 2];
      t32[i] = (((r << 16) | (g << 8) | b) << 2) >>> 0;                    // 108e3d..108e4d: (r<<16|g<<8|b)<<2  (6 bit -> 8 bit by x4)
      t16[i] = ((r >> 1) << 11) | (g << 5) | (b >> 1);                      // 108de4..108dfc: RGB565 from 6-bit components
    }
    return { t32, t16 };
  },
  run(st, ev) {
    const src = ev.inputs[0].data, out = ev.outputs[0], dst = out.data, n = ev.inputs[0].w * ev.inputs[0].h;
    if (out.bpp === 16) { const t = st.t16; for (let i = 0; i < n; i++) dst[i] = t[src[i]]; }
    else { const t = st.t32; for (let i = 0; i < n; i++) dst[i] = t[src[i]]; }
  },
});

// ----------------------------------------------------------------------------------------------------------- doubleimage
// run 0x10fba0 + 0x1e896: 320x240x32 -> 640x480 pixel doubling (each pixel to 2x2, the destination pitch is hard-coded 0xa00 = 640*4).
// The vertical offset is |outH - 2*inH| / 2 rows (0 for 320x240 -> 640x480).
FX.register('doubleimage', {
  init: () => ({}),
  run(st, ev) {
    const si = ev.inputs[0], so = ev.outputs[0], s = si.data, d = so.data;
    let m = so.h - 2 * si.h; m = (m - (m >> 31)) >> 1;                       // 10fbb0..10fbbb: (x - (x>>31)) >> 1
    let o = m * so.w;                                                         // rows * pitch (32 bpp -> pixels)
    const w = 320, pitch = 640;
    for (let y = 0, p = 0; y < si.h; y++, o += 2 * pitch) {
      for (let x = 0; x < w; x++, p++) {
        const v = s[p], q = o + 2 * x;
        d[q] = v; d[q + 1] = v; d[q + pitch] = v; d[q + pitch + 1] = v;
      }
    }
  },
});

// ---------------------------------------------------------------------------------------------------------------- blend
// init 0x10f714: state = atoi(params) (mode). run 0x10f73c: dispatch on mode, bytes = w*h*bpp/8 of input 0 (MMX versions 0x1e7a8...).
// Modes seen in the code: 1 add (paddusb), 2 colour key 0, 3 sub (psubusb), 11 double add, 22 colour key = first pixel of input 1, 33 clears (psubusb mm0,mm0 !).
// Script uses only mode 1.  ponytail: modes != 1 are verified by the differential test too (see test-basic2d).
function addus(a, b, o, n) { // n dwords, SWAR saturating add per byte (paddusb)
  for (let i = 0; i < n; i++) {
    const x = a[i], y = b[i];
    const r = ((x & 0x7f7f7f7f) + (y & 0x7f7f7f7f)) ^ ((x ^ y) & 0x80808080);   // per-byte sum without carry out
    const c = ((x & y) | ((x | y) & ~r)) & 0x80808080;                         // bytes that overflowed
    o[i] = r | ((c >>> 7) * 255);
  }
}
function subus(a, b, o, n) { // psubusb: max(a-b,0) per byte
  for (let i = 0; i < n; i++) {
    const x = a[i], y = b[i];
    const t = ((x | 0x80808080) - (y & 0x7f7f7f7f)) ^ ((x ^ ~y) & 0x80808080);  // per-byte x-y (mod 256), borrow trick
    const bo = ((~x & y) | (~(x ^ y) & t)) & 0x80808080;                        // bytes that borrowed (x<y)
    o[i] = t & ~((bo >>> 7) * 255);
  }
}
FX.register('blend', {
  init(params) { return { mode: parseInt(params, 10) || 0 }; },
  run(st, ev) {
    const i0 = ev.inputs[0], i1 = ev.inputs[1], out = ev.outputs[0];
    const n = (i0.w * i0.h * i0.bpp) >> 5;                                    // dwords (all buffers are multiples of 4 bytes)
    const a = new Uint32Array(i0.data.buffer, i0.data.byteOffset, n), b = new Uint32Array(i1.data.buffer, i1.data.byteOffset, n),
      o = new Uint32Array(out.data.buffer, out.data.byteOffset, n);
    switch (st.mode) {
      case 1: addus(a, b, o, n); break;
      case 2: for (let i = 0; i < n; i++) { const y = b[i] & 0xffffff; o[i] = y === 0 ? a[i] : y; } break;
      case 3: subus(a, b, o, n); break;
      case 11: addus(a, b, o, n); addus(o, o, o, n); break;
      case 22: { // original bug: after the first non-key pixel the loop jumps back into the mode-2 loop (1e87c -> 1e833), i.e. key 0 from then on
        let key = b[0], i = 0;
        for (; i < n; i++) { const y = b[i] & 0xffffff; if (y !== key) break; o[i] = a[i]; }
        for (; i < n; i++) { const y = b[i] & 0xffffff; o[i] = y === 0 ? a[i] : y; }
        break; }
      case 33: o.fill(0, 0, n); break;
      default: break;                                                         // unknown mode: original does nothing (falls to 0x10fb02)
    }
  },
});

// ----------------------------------------------------------------------------------------------------------------- fade
// init 0x110f80: sscanf("%f %f %f %s") = colour r,g,b (0..1, float32) and an expression; state+0x10 = Frame at first run.
// run 0x111008: f = (int)(expr(Frame_local) * 255.0) (truncating); f <= 0 -> plain copy (blit); else (32 bit, 0x1111b8 / 0x14bc88 / 0x14bcd0):
//   out = A[f][src] + B[f][col]  per channel, A[f][v] = ((256-f)*v)>>8 , B[f][v] = (f*v)>>8, col = (int)(c*255) -> the image fades *towards the colour*.
// Output alpha byte is 0.
const fadeTab = new Uint8Array(256);
FX.register('fade', {
  init(params) {
    const m = /^\s*(\S+)\s+(\S+)\s+(\S+)\s+(\S+)/.exec(params);
    if (!m) throw new Error('fade: bad params ' + params);
    return { col: [f32(parseFloat(m[1])), f32(parseFloat(m[2])), f32(parseFloat(m[3]))], expr: compileExpr(m[4]), lastF: -1 };
  },
  run(st, ev) {
    const inp = ev.inputs[0], out = ev.outputs[0];
    let f = trunc(f32(st.expr(f32(ev.local))) * 255);                        // 11106e..11107e
    if (f <= 0) { if (inp !== out) blitBuf(inp, out); return; }
    if (f > 255) f = 255;                                                     // original would index past its tables
    if (out.bpp === 16) return fade16(st, inp, out, f);
    if (out.bpp !== 32) return;                                               // 8 bit: ponytail (not used by the script)
    const g = st.col, R = trunc(f32(f32(g[0]) * 255)), G = trunc(f32(g[1]) * 255), B = trunc(f32(g[2]) * 255);
    const t = fadeTab, k = 256 - f;
    for (let v = 0; v < 256; v++) t[v] = (k * v) >> 8;
    const col = ((((f * R) >> 8) << 16) | (((f * G) >> 8) << 8) | ((f * B) >> 8)) >>> 0;
    const s = inp.data, d = out.data, n = out.w * out.h;
    for (let i = 0; i < n; i++) { const p = s[i]; d[i] = ((t[(p >> 16) & 255] << 16) | (t[(p >> 8) & 255] << 8) | t[p & 255]) + col; }
  },
});
function fade16() { /* ponytail: 16-bit fade (0x111129) not ported, unused by the script */ }

// ------------------------------------------------------------------------------------------------------------- mapimage
// run 0x10fb2c: horizontal scroller of a 256-pixel-wide texture. The source buffer is treated as a linear array of 256-pixel rows
// (scroll.jpg is a 256x256 image stored linearly into the 640x480 buffer), rows 48..207 of it fill destination rows 160..319,
// each row wrapped to 640 pixels with (x + shift) & 255, shift = (int)global Frame (centiseconds of song time, NOT the event-local frame).
FX.register('mapimage', {
  init: () => ({}),
  run(st, ev, ctx) {
    const s = ev.inputs[0].data, d = ev.outputs[0].data, sh = trunc(f32(ctx.frame));
    for (let k = 0; k < 160; k++) {
      let sp = (48 + k) * 256, dp = (160 + k) * 640;
      for (let x = 0; x < 640; x++) d[dp + x] = s[sp + ((x + sh) & 255)];
    }
  },
});

// =====================================================================================================================
// OPTIONAL effects: not used by script.unr (ported because they are cheap; verified like the others).
// Not ported: zoom, colormap/colordistort, matrix, dither/ditherfs, edges, wave, partmag2d, interpolator, lowpass, grid, ...
// =====================================================================================================================

// xfade {A B} {OUT} {expr}: init 0x111284 (sscanf "%s"), run 0x111304. f = (int)(expr(local)*255);
// f <= 0 -> copy B, f >= 255 -> copy A, else out = B'[f][A] + A'[f][B]: out = ((f*a)>>8) + (((256-f)*b)>>8) on the 3 colour bytes, alpha byte untouched (0x14bd55).
const tabA = new Uint8Array(256), tabB = new Uint8Array(256);
function mix(f, a, b, o, n) { // 32 bit pixels, colour bytes only
  for (let v = 0; v < 256; v++) { tabA[v] = (f * v) >> 8; tabB[v] = ((256 - f) * v) >> 8; }
  for (let i = 0; i < n; i++) {
    const x = a[i], y = b[i];
    o[i] = (o[i] & 0xff000000) | (((tabA[(x >> 16) & 255] + tabB[(y >> 16) & 255]) & 255) << 16) | (((tabA[(x >> 8) & 255] + tabB[(y >> 8) & 255]) & 255) << 8) | ((tabA[x & 255] + tabB[y & 255]) & 255);
  }
}
FX.register('xfade', {
  init(params) { return { expr: compileExpr(params.trim().split(/\s+/)[0]) }; },
  run(st, ev) {
    const A = ev.inputs[0], B = ev.inputs[1], out = ev.outputs[0];
    const f = trunc(f32(st.expr(f32(ev.local))) * 255);
    if (f <= 0) { if (B !== out) blitBuf(B, out); return; }
    if (f >= 255) { if (A !== out) blitBuf(A, out); return; }
    if (out.bpp === 32) mix(f, A.data, B.data, out.data, out.w * out.h);
  },
});

// afade {A B MASK} {OUT} {}: init 0x111464, run 0x111484: like xfade but f is a per-pixel BYTE read from the third buffer (read as raw bytes, 1 byte/pixel).
FX.register('afade', {
  init: () => ({}),
  run(st, ev) {
    const A = ev.inputs[0].data, B = ev.inputs[1].data, M = ev.inputs[2], out = ev.outputs[0], o = out.data, n = out.w * out.h;
    if (out.bpp !== 32) return;
    const m = new Uint8Array(M.data.buffer, M.data.byteOffset, Math.min(n, M.data.byteLength));
    for (let i = 0; i < n; i++) {
      const f = m[i] | 0, x = A[i], y = B[i], k = 256 - f;
      o[i] = (o[i] & 0xff000000) | (((((f * ((x >> 16) & 255)) >> 8) + ((k * ((y >> 16) & 255)) >> 8)) & 255) << 16) |
        (((((f * ((x >> 8) & 255)) >> 8) + ((k * ((y >> 8) & 255)) >> 8)) & 255) << 8) | (((f * (x & 255)) >> 8) + ((k * (y & 255)) >> 8)) & 255;
    }
  },
});
