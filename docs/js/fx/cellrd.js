// cellrd.js - "cellrd" of Tour: a table-driven Gray-Scott reaction-diffusion cellular automaton (see docs/notes/cellrd.html).
//   original: handlers 0x1146a4 (init) / 0x11480c (run), engine in the "blob.c" library 0x14e9xx-0x1508xx and the MMX-less
//   self-modifying kernel in object 2 (0x2073e).
// Script:  addEvent cellrd sellu  {} {}       {preinit grayscott 0.012 0.045 3.2 none}   builds the tables (global state)
//          addEvent cellrd sellu2 {} {SCREEN} {run}                                       2 simulation steps per frame + draw
// The field is 260 x 140 cells (stored in 264 x 144 bytes: 2 cell wide wrap-around border), two 5-bit species A, B (0..31).
// One step = two box blurs (A: 5x5, B: 3x3 sums) + a 16 bit lookup in a table indexed by (sum<<10 | B<<5 | A) that already
// contains the whole reaction term (floating point, computed once at init), + a dither noise byte added before the >>8.
import { FX } from '../core.js';
import { ex, rnd, X64, mul, add, neg, toF32, near32 } from './x87.js';

const f32 = Math.fround;
const W = 264, H = 144, NX = 260, NY = 140;          // array size, field size (data at x 2..261, y 2..141)
const C31 = f32(1 / 31);                              // 0x1b0438 / 0x1b04a8 : 0.032258064

// ---- C runtime rand(): LCG 0x41c64e6d / 0x3039, (seed >> 16) & 0x7fff, srand(0x3039) at init (0x14b34c) ----
const G = { ready: false };
function rand() { G.seed = (Math.imul(G.seed, 0x41c64e6d) + 0x3039) >>> 0; return (G.seed >>> 16) & 0x7fff; }

// ---- the reaction tables (0x14ed9c). v = 31 * ( D*reaction + mean-of-neighbourhood ), stored as floor(v*256) in 16 bit ----
// The original does the arithmetic on the x87 stack (64 bit mantissa) and stores v as a float32.  A few entries (v*256 an exact
// integer, e.g. S = 9k, B = 0 in table 2) sit exactly on a float32 rounding tie, where double arithmetic rounds the other way.
// Those few are recomputed with exact BigInt arithmetic rounded to 64 bits after every operation (the x87 extended format).
// (the extended-precision helpers live in x87.js)
function clampTab(v) {                                // v is a float32 value; clamp to [0,31]; floor(v*256)
  if (v > 31) v = 31; else if (!(v >= 0)) v = 0;
  return Math.floor(v * 256);
}
function buildTables(F, k, D) {
  const t1 = new Uint16Array(776 * 1024), t2 = new Uint16Array(280 * 1024);
  const eF = ex(F), eD = ex(D), eK = ex(k), e31 = ex(31), eC = ex(C31), eFk = add(eF, eK);
  for (let a = 0; a < 32; a++) {
    const aa = f32(a * C31), om = f32(1 - aa);
    for (let b = 0; b < 32; b++) {
      // constant parts (per a,b), exact x87 emulation
      const w = toF32(mul(ex(b * C31), ex(0.7))), ew = ex(w);
      const uvv = toF32(mul(mul(ex(aa), ew), ew)), euvv = ex(uvv);
      const XD = mul(add(mul(eF, ex(om)), neg(euvv)), eD);                    // D*(F(1-u) - u v^2)
      const YD = mul(add(euvv, neg(mul(eFk, ew))), eD);                       // D*(u v^2 - (F+k) v)
      const xd = Number(XD.m) * 2 ** XD.e, yd = Number(YD.m) * 2 ** YD.e;
      const o = (b << 5) | a;
      for (let S = 0; S < 776; S++) {
        let v = f32(31 * (xd + 0.04 * (S * C31)));
        if (near32(31 * (xd + 0.04 * (S * C31)))) {
          const sum = add(XD, mul(ex(0.04), mul(ex(S), eC)));
          v = toF32(mul(sum, e31));
        }
        t1[(S << 10) | o] = clampTab(v);
      }
      for (let S = 0; S < 280; S++) {
        const d = 31 * 1.4285714285714286 * (yd + 0.7 * (S * C31) * 0.11111111111111112);
        let v = f32(d);
        if (near32(d)) {
          const sum = add(YD, mul(mul(ex(0.7), mul(ex(S), eC)), ex(0.11111111111111112)));
          v = toF32(mul(mul(sum, ex(1.4285714285714286)), e31));
        }
        t2[(S << 10) | o] = clampTab(v);
      }
    }
  }
  return { t1, t2 };
}
// ---- the colour table, index (B<<5)|A -> 0x00RRGGBB (0x14f2c4) ----
function ch(x) {                                      // 255*m -> float32 -> clamp -> truncate
  if (x < 0) return 0;
  if (x > 255) return 255;
  return Math.trunc(f32(x));
}
function buildPal() {
  const pal = new Uint32Array(1024);
  for (let a = 0; a < 32; a++) {
    const aa = f32(a * C31);
    for (let b = 0; b < 32; b++) {
      const bb = b * C31, X = aa * bb * bb * 4.3, Sx = Math.sin(bb * 5.0) * 0.6;
      const R = ch(255 * (1.5 - 2 * aa));
      const G_ = ch(255 * f32(bb + X - 0.2));
      const B_ = ch(255 * f32(1 - (Sx + 1.2 * aa)));
      pal[(b << 5) | a] = (R << 16) | (G_ << 8) | B_;
    }
  }
  return pal;
}

// ---- global simulation state (the original keeps everything in globals shared by the 2 events) ----
const BLOB_PRESETS = [   // 0x114530: (t, dt, ax, bx, ay, by, level) ; the 8th argument of the original constructor is unused
  [0.5, 0.07, 0.2, 1, 0.3, 3, 0.15], [0.02, 0.064, 0.2, 3, 0.3, 2, 0.4], [0.4, 0.09, 0.6, 1.4, 0.2, 2, 0.35], [0.2, 0.024, 0.7, 2, 0.67, 3, 1],
  [0.55, 0.04, 0.2, 1, 0.3, 3, 0.15], [0.03, 0.0264, 0.2, 3, 0.3, 2, 0.4], [0.8, 0.049, 0.6, 1.4, 0.2, 2, 0.35], [0.567, 0.0124, 0.7, 2, 0.67, 3, 1],
];
function setup(F, k, D) {
  F = f32(F); k = f32(k); D = f32(D);
  G.seed = 0x3039;                                    // srand(12345)
  G.noise = new Uint8Array(0x8000);
  for (let i = 0; i < 0x8000; i++) G.noise[i] = (rand() >> 6) % 256;
  const t = buildTables(F, k, D); G.t1 = t.t1; G.t2 = t.t2; G.pal = buildPal();
  G.A = new Uint8Array(W * H); G.B = new Uint8Array(W * H); G.A2 = new Uint8Array(W * H); G.B2 = new Uint8Array(W * H);
  G.h5 = new Uint16Array(W * H); G.h3 = new Uint16Array(W * H); G.s5 = new Uint16Array(W * H); G.s3 = new Uint16Array(W * H);
  G.blobs = BLOB_PRESETS.map((p) => ({ t: f32(p[0]), dt: f32(p[1]), ax: f32(p[2]), bx: f32(p[3]), ay: f32(p[4]), by: f32(p[5]), v: Math.trunc(f32(p[6]) * 31) }));
  G.ready = true;
}

// 0x150550: 8 moving 3x3 blobs, then three fixed seed cells
function drawBlobs() {
  const { A, B } = G;
  for (const o of G.blobs) {
    const s1 = Math.sin(o.ax * o.t + o.bx), s2 = Math.sin(o.ay * o.t + o.by);
    const row = Math.trunc(63 * s2 + 70), col = Math.trunc(117 * s1 + 130), p = row * W + col;
    for (let dy = -W; dy <= W; dy += W) for (let dx = -1; dx <= 1; dx++) { A[p + dy + dx] = o.v; B[p + dy + dx] = o.v; }
    o.t = f32(o.t + o.dt);
  }
  A[0x3e8] = 30; A[0x7d0] = 30; B[0x640] = 30;
}
// 0x14fd28: periodic border (period 260 x 140)
function wrap(a) {
  for (let y = 0; y < H; y++) {
    const ys = y < 2 ? y + NY : y > 141 ? y - NY : y, inner = y >= 2 && y <= 141;
    for (let x = 0; x < W; x++) {
      if (inner && x >= 2 && x <= 261) continue;
      a[y * W + x] = a[ys * W + (x < 2 ? x + NX : x > 261 ? x - NX : x)];
    }
  }
}
// separable box sum over the interior (rows 2..141, cols 2..261); borders must be valid
function box(src, h, out, r) {
  for (let y = 0; y < H; y++) {
    const o = y * W;
    for (let x = 2; x < 262; x++) { let s = 0; for (let d = -r; d <= r; d++) s += src[o + x + d]; h[o + x] = s; }
  }
  for (let y = 2; y < 142; y++) {
    const o = y * W;
    for (let x = 2; x < 262; x++) { let s = 0; for (let d = -r; d <= r; d++) s += h[o + d * W + x]; out[o + x] = s; }
  }
}
// 0x14f8e4 + kernel 0x2073e
function step() {
  const { A, B, A2, B2, t1, t2, noise } = G;
  box(A, G.h5, G.s5, 2); box(B, G.h3, G.s3, 1);
  let bl = (rand() >> 6) % 256;
  let ep = (rand() >> 6) % 0x40000;
  rand(); rand();                                   // random step + sign: drawn but never used by the kernel (see below)
  const { s5, s3 } = G;
  for (let y = 2; y < 142; y++) {
    for (let x = 2, i = y * W + 2; x < 262; x++, i++) {
      const ab = (B[i] << 5) | A[i];
      bl = (bl + noise[ep]) & 255; ep = (ep + (65 - ((x - 2) >> 2))) & 0x7fff;   // sic: the original adds its loop counter (65..1 per group of 4 pixels), not the random step it pushed
      A2[i] = (t1[(s5[i] << 10) | ab] + bl) >> 8;
      B2[i] = (t2[(s3[i] << 10) | ab] + bl) >> 8;
    }
  }
  wrap(A2); wrap(B2);
  G.A = A2; G.A2 = A; G.B = B2; G.B2 = B;             // swap (0x14ff6c)
}
// 0x14fd48: the field is drawn twice into the 32 bit screen: at (0,195) and at (378,156) (the second one wraps into the next row)
function draw(out) {
  const { A, B, pal } = G, D = out.data, ow = out.w;
  const p1 = 195 * ow, p2 = 156 * ow + 378;
  for (let y = 0; y < NY; y++) {
    const i = (y + 2) * W + 2, q1 = p1 + y * ow, q2 = p2 + y * ow;
    for (let x = 0; x < NX; x++) {
      const c = pal[(B[i + x] << 5) | A[i + x]];
      D[q1 + x] = c; D[q2 + x] = c;
    }
  }
}

FX.register('cellrd', {
  init(params, ev, ctx) {
    const m = /^\s*(preinit\s+)?grayscott\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)/.exec(params);
    if (m) { setup(parseFloat(m[2]), parseFloat(m[3]), parseFloat(m[4])); if (ctx) ctx.randSeed = G.seed; return { pre: !!m[1] }; }   // ctx.randSeed: the C rand() state is shared by all effects (echo5's init draws from it too)
    if (/^\s*run\b/.test(params)) { if (ctx && ctx.dbgSeed) ctx.dbgSeed('cellrd run init'); if (!G.ready) setup(0.012, 0.045, 3.2); return { pre: false }; }
    console.error('cellrd: illegal args'); return { pre: true };
  },
  run(st, ev, ctx) {
    if (st.pre || !G.ready) return;
    if (ctx && ctx.randSeed !== undefined) G.seed = ctx.randSeed;
    const out = ev.outputs[0]; if (!out) return;
    for (let i = 0; i < 2; i++) { drawBlobs(); step(); }
    if (ctx) ctx.randSeed = G.seed;
    draw(out);
  },
  free() {},
});
export const _cellrd = { G, setup, step, drawBlobs, draw, buildTables, buildPal };   // for tools/test-feedback.mjs
