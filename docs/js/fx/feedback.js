// feedback.js - "feedback / simulation" effects of Tour, ported from the 1998 executable (see docs/notes/feedback-*.html).
//   reebok  0x1170c8 / 0x1172cc + cell filler 0x152f94   six additive rotozoom layers of a 256x256 picture (8 bit)
//   echo5   0x11807c / 0x1180dc + 0x155628               (see below)
import { FX, compileExpr } from '../core.js';
import { ex, mul, add, toF32 } from './x87.js';   // exact x87 extended-precision steps for the per-frame constants

const f32 = Math.fround;
const rint = (x) => { const r = Math.round(x); return (Math.abs(x % 1) === 0.5 && (r & 1)) ? r - 1 : r; };   // fist: round to nearest even
const rint32 = (x) => rint(x) | 0;

// ------------------------------------------------------------------------------------------------
// reebok   (script: `reebok reeb {} {TEMP8} {picture.png}`; TEMP8 = 320x240, 8 bit; palette comes later from `palette picture.pal`)
// ------------------------------------------------------------------------------------------------
// Six additive rotozoom layers.  The buffer is cut into 8x8 cells (41 x 31 grid corners); corner texture coordinates are computed per layer
// in floating point (rotation + zoom around (160,100)), converted to 16.16 fixed point with the 1.5*2^36 "magic number" trick (round to
// nearest even), and each cell is filled by bilinear interpolation in fixed point (0x152f94).  The texel goes through a 256 byte
// brightness table (one per layer) and is added to the destination with unsigned saturation.  bl/bh are the 8 bit texture coordinates
// (64K aligned texture => automatic wrap); esi/ebp hold the fractions, `adc` propagates the carries.  Quirk reproduced: ecx/edx still hold
// the destination pixel / integer steps in their low bytes and these are added to the fractions too.
const SIXTH = [0, 42, 84, 126, 168, 210];
FX.register('reebok', {
  init(params, ev, ctx) {
    const out = ev.outputs[0];
    const name = params.trim().split(/\s+/)[0];
    const tex = ctx.assets.indexed(name).data;
    return { w: out.w, h: out.h, gw: ((out.w / 8) | 0) + 1, gh: ((out.h / 8) | 0) + 1, tex, t0: null, prev: 0,
      ph: Float32Array.from(SIXTH), tbl: new Uint8Array(256),
      rowA: new Int32Array(2 * 64), rowB: new Int32Array(2 * 64) };
  },
  run(st, ev, ctx) {
    const out = ev.outputs[0]; if (!out) return;
    const fr = f32(ctx.frame); if (st.t0 === null) st.t0 = fr;
    const x0 = (fr - st.t0) * 0.6, e = f32(x0);     // x87: e is stored as float32 for the phases, but the angle uses the unrounded value
    const a = f32(x0 * 0.006);
    const de = f32(e - st.prev);
    for (let i = 0; i < 6; i++) { let p = f32(st.ph[i] - de); if (p < 0) p = f32(p + 256); st.ph[i] = p; }
    st.prev = f32(st.prev + de);
    const W = st.w, D = out.data, tex = st.tex, tbl = st.tbl;
    const cellsX = W >> 3, cellsY = out.h >> 3, sa = f32(Math.sin(a)), ca = f32(Math.cos(a));
    const cxg = f32(st.gw * 0.5), cyg = f32(st.gh * 0.5), kx = f32(320 / st.w), ky = f32(200 / st.h);
    // grid corner (u,v) in 16.16 (0x1171fc).  y*sin and y*cos are stored as float32, x is not (x87 stack), the magic-number add rounds to 2^-16
    const vertRow = (arr, r, scale) => {
      const y = f32(f32(r - cyg) * ky), ys = f32(y * sa), yc = f32(y * ca);
      for (let j = 0; j < st.gw; j++) {
        const x = (j - cxg) * kx;
        arr[2 * j] = rint32(((x * ca - ys) * scale + 160) * 65536);
        arr[2 * j + 1] = rint32(((x * sa + yc) * scale + 100) * 65536);
      }
    };
    for (let L = 0; L < 6; L++) {
      const ph = st.ph[L];
      const scale = f32((Math.sin(a) * 0.5 + 2.0) * (ph * 0.03125));
      const q = ph * (1 / 256);
      const g = f32(Math.sin(q * 0.9 * q + q * 2.24) * 0.7);
      for (let k = 0; k < 256; k++) tbl[k] = Math.trunc(k * g) & 255;
      let cur = st.rowA, nxt = st.rowB;
      vertRow(cur, 0, scale);
      for (let i = 0; i < cellsY; i++) {
        vertRow(nxt, i + 1, scale);
        for (let j = 0; j < cellsX; j++) cell(D, i * 8 * W + 8 * j, W, cur, nxt, j, tex, tbl);
        const t = cur; cur = nxt; nxt = t;
      }
    }
  },
});

// 8x8 cell filler (0x152f94). T = top corner row, Bt = bottom corner row (arrays of [u,v] int32 pairs), j = cell column.
function cell(D, dst, W, T, Bt, j, tex, tbl) {
  const tl = 2 * j, tr = tl + 2;
  let u0 = T[tl], v0 = T[tl + 1];
  let du = (T[tr] - T[tl]) >> 3, dv = (T[tr + 1] - T[tl + 1]) >> 3;
  const rdu = (Bt[tl] - T[tl]) >> 3, rdv = (Bt[tl + 1] - T[tl + 1]) >> 3;
  const ddu = ((((Bt[tr] - Bt[tl]) >> 3) - du) >> 3), ddv = ((((Bt[tr + 1] - Bt[tl + 1]) >> 3) - dv) >> 3);
  for (let r = 0; r < 8; r++) {
    let bl = (u0 >> 16) & 255, bh = (v0 >> 16) & 255;
    let esi = (u0 << 16) >>> 0, ebp = (v0 << 16) >>> 0;
    const ecxHi = (du << 16) >>> 0;                     // ecx = du<<16 | cl (cl = last written pixel)
    const dl = (du >> 16) & 255, dh = (dv >> 16) & 255;
    const edx = (((dv << 16) >>> 0) | (dh << 8) | dl) >>> 0;
    let cl = 0, texel = tex[(bh << 8) | bl], p = dst + r * W;
    for (let k = 0; k < 8; k++, p++) {
      let s = esi + ecxHi + cl; esi = s >>> 0; const c1 = s > 0xffffffff ? 1 : 0;
      bl = (bl + dl + c1) & 255;
      const al = tbl[texel], old = D[p];
      s = ebp + edx; ebp = s >>> 0; const c2 = s > 0xffffffff ? 1 : 0;
      bh = (bh + dh + c2) & 255;
      const sum = al + old; cl = sum > 255 ? 255 : sum;
      texel = tex[(bh << 8) | bl];
      D[p] = cl;
    }
    u0 = (u0 + rdu) | 0; v0 = (v0 + rdv) | 0; du = (du + ddu) | 0; dv = (dv + ddv) | 0;
  }
}

// ================================================================================================
// echo5: 3D cage of textured additive planes with glow trails.
// The triangle pipeline (clipper 0x182edc.. / front end 0x18337a / rasteriser) and the matrix helpers are the same library as the
// echo4/echo6 effects of the sister demo '73 million seconds' (../pls73ms, addresses there 0x8a69a/0x8985d); re-verified here against Tour's code.
// ================================================================================================
const ftol = (x) => Math.trunc(x);
const SCR_C14 = f32(-0.625), SCR_C18 = f32(-0.390625);   // projection scales 0x1c4090 / 0x1c4094, set by echo5's init (0x1534c0 -> 0x18231a); static default is 1.0
export class Vtx {
  constructor() { this.f = new Float32Array(6); this.s = new Int32Array(2); }   // f = x,y,z,u,v,w   s = sx,sy
  set(x, y, z, u, v, w = 0) { const f = this.f; f[0] = x; f[1] = y; f[2] = z; f[3] = u; f[4] = v; f[5] = w; return this; }
  copy(o) { this.f.set(o.f); this.s.set(o.s); return this; }
}
const negz = (v) => v < 0 || Object.is(v, -0);
// 0x8a1fc: clip against the plane (x - z < 0 is "inside").  Returns the number of triangles (0,1,2) and the vertices in r.
// r = [esi, edi, edx, ecx]; nb / nc are the scratch vertices (ebx / ecx).
function clipPlane(r, nb, nc) {
  const [s, e, d] = r;
  const a = f32(s.f[0] - s.f[2]), b = f32(e.f[0] - e.f[2]), c = f32(d.f[0] - d.f[2]);
  const code = (negz(c) ? 4 : 0) | (negz(b) ? 2 : 0) | (negz(a) ? 1 : 0);
  if (code === 0) return 0;
  if (code === 7) return 1;
  let tB, tC, S = s, E = e, D = d;
  if (code === 1 || code === 6) { tB = a / (a - b); tC = a / (a - c); }
  else if (code === 2 || code === 5) { tB = b / (b - a); tC = b / (b - c); S = e; E = s; }
  else { tB = c / (c - b); tC = c / (c - a); S = d; D = s; }   // codes 3, 4
  for (const k of [0, 1, 2, 3, 4, 5]) {     // x y z u v w  (offsets 0 4 8 0x14 0x18 0x1c)
    nb.f[k] = S.f[k] * (1 - tB) + E.f[k] * tB;
    nc.f[k] = D.f[k] * tC + S.f[k] * (1 - tC);
  }
  r[0] = S; r[1] = E; r[2] = D;
  if (code === 3 || code === 5 || code === 6) { r[0] = nb; r[3] = nc; return 2; }   // quad -> (nb,edi,edx) + (nb,ecx,edx)
  r[1] = nb; r[2] = nc; return 1;                                                    // (esi, nb, nc)
}
// the four clip stages: 0x8a69a (x<z)  ->  0x8a633 (-x<z)  ->  0x8a5c8 (y<z, x/y swapped)  ->  0x8a3d1 (-y<z) -> rasteriser
const stageBuf = [0, 1, 2, 3].map(() => [new Vtx(), new Vtx()]);   // [nb (ebx), nc (ecx)] of every stage
const flipX = (v) => { v.f[0] = -v.f[0]; };
const swapXY = (v) => { const t = v.f[0]; v.f[0] = v.f[1]; v.f[1] = t; };
const tmpV = [new Vtx(), new Vtx(), new Vtx()];

function stage(n, s, e, d, ctx) {
  // n: 0 = 0x8a69a (no transform), 1 = 0x8a633 (flip x), 2 = 0x8a5c8 (swap x,y), 3 = 0x8a3d1 (flip x, then rasterise)
  if (n === 1 || n === 3) { flipX(s); flipX(e); flipX(d); }
  if (n === 2) { swapXY(s); swapXY(e); swapXY(d); }
  const [nb, nc] = stageBuf[n], r = [s, e, d, nc];
  const cnt = clipPlane(r, nb, nc);
  if (cnt >= 1) {
    if (n === 3) {
      if (cnt === 2) rasterTri(r[2], r[1], r[0], ctx);          // first triangle: (esi,edi,edx) -> args (edx, edi, esi)
      const t2 = cnt === 2 ? [r[0], r[3], r[2]] : [r[0], r[1], r[2]];
      rasterTri(t2[2], t2[1], t2[0], ctx);
    } else {
      const sv = [r[0], r[3], r[2]];
      if (cnt === 2) stage(n + 1, r[0], r[1], r[2], ctx);
      if (cnt === 2) stage(n + 1, sv[0], sv[1], sv[2], ctx); else stage(n + 1, r[0], r[1], r[2], ctx);
    }
  }
  if (n === 1 || n === 3) { flipX(s); flipX(e); flipX(d); }
  if (n === 2) { swapXY(s); swapXY(e); swapXY(d); }
}
/** Draw one additive, perspective-correct textured triangle into an 8 bit 320x200 buffer (0x8a69a, mode 0).
 *  ctx = { screen: Uint8Array(64000), tex: Uint8Array(65536) }.  dest += texel (byte wrap, no saturation). */
export function drawTri(v1, v2, v3, ctx) {
  if (negz(v1.f[2]) && negz(v2.f[2]) && negz(v3.f[2])) return;      // 0x8a6c2: all three behind the camera
  stage(0, v1, v2, v3, ctx);
}

// ---- rasteriser (0x8985d): sub-pixel accurate scanline triangle, u/z v/z 1/z interpolated, texel lookup every pixel
// with a perspective correction every 8 pixels.  Globals of the original (0xcedb4 .. 0xcef14) are kept as locals.
const rpw = (x) => { // "fadd 1.5*2^60; fstp qword; low dword": x87 rounds to 1/8 (64 bit mantissa) then to a multiple of 256
  const r1 = rint(x * 8) / 8; return rint(r1 / 256) | 0; };
const INV8 = [0, 1, 0.5, f32(1 / 3), 0.25, f32(0.2), f32(1 / 6), f32(1 / 7)];   // table 0xced90 (entry 0 is 0)
const rv = [new Vtx(), new Vtx(), new Vtx(), new Vtx()];                         // copies of the three vertices + the pseudo vertex 0xcedfc
function edgeSetup(E, Tsx, osx, osy, F, T, withAttr, G) {          // 0x89665 (attributes) / 0x8982d (x only)
  const s = (osx / osy) * 65536;
  E.sl = f32(s); E.si = rint(s) | 0;
  E.x = rint(F * s + Tsx) | 0;
  if (!withAttr) return;
  const ip = E.si >> 16, xoff = f32((E.sl * F - (E.x & 0xffff)) / 65536);
  const one = (gx, gy, ta) => {
    const step = ip * gx + gy, us = (F * gy + ta) + xoff * gx;
    return [f32(step), f32(us + gx), f32(step + gx)];       // step, cur, step2
  };
  [E.su, E.cu, E.su2] = one(G.gxu, G.gyu, T.u);
  [E.sv, E.cv, E.sv2] = one(G.gxv, G.gyv, T.v);
  [E.sz, E.cz, E.sz2] = one(G.gxz, G.gyz, T.z);
}
const eL = {}, eR = {};
function rasterTri(p8, pC, p10, ctx) {
  const screen = ctx.screen, tex = ctx.tex, SW = 320;
  let esi = rv[0].copy(p8), edi = rv[1].copy(pC), ebx = rv[2].copy(p10);
  for (const v of [esi, edi, ebx]) {                         // perspective projection (see SCR_C14/18) and u/z, v/z, 1/z
    const rz = 16777216 / v.f[2];
    v.s[0] = rint(rz * v.f[1] * SCR_C14 + 0xa00000) | 0;      // screen x from field 1 (after the clip stages: -x), 160 px per unit
    v.s[1] = rint(rz * v.f[0] * SCR_C18 + 0x640000) | 0;      // screen y from field 0 (-y), 100 px per unit
    const inv = 1 / v.f[2];
    v.f[2] = inv; v.f[3] = v.f[3] * inv; v.f[4] = v.f[4] * inv;
  }
  let t;
  if (esi.s[1] > edi.s[1]) { t = esi; esi = edi; edi = t; }
  if (edi.s[1] > ebx.s[1]) { t = edi; edi = ebx; ebx = t; if (esi.s[1] > edi.s[1]) { t = esi; esi = edi; edi = t; } }
  let rowBase = (esi.s[1] >> 16) * SW;
  // absolute mid vertex (pseudo vertex 0xcedfc) and bottom y
  const M = { z: edi.f[2], sx: edi.s[0], sy: edi.s[1], u: edi.f[3], v: edi.f[4] }, botY = ebx.s[1];
  const rel = (a, b) => { a.s[0] = (a.s[0] - b.s[0]) | 0; a.s[1] = (a.s[1] - b.s[1]) | 0; a.f[2] = a.f[2] - b.f[2]; a.f[3] = a.f[3] - b.f[3]; a.f[4] = a.f[4] - b.f[4]; };
  rel(ebx, esi); rel(edi, esi);
  const dxm = edi.s[0], dym = edi.s[1], dxb = ebx.s[0], dyb = ebx.s[1];
  const det = dxm * dyb - dym * dxb, area = f32(det);
  if (det === 0) return;
  const k = 65536 / det, Dxm = dxm * k, Dym = dym * k, Dxb = dxb * k, Dyb = dyb * k;
  const gr = (am, ab) => [f32(am * Dyb - ab * Dym), f32(ab * Dxm - am * Dxb)];
  const G = {}; [G.gxu, G.gyu] = gr(edi.f[3], ebx.f[3]); [G.gxv, G.gyv] = gr(edi.f[4], ebx.f[4]); [G.gxz, G.gyz] = gr(edi.f[2], ebx.f[2]);
  const g8u = f32(G.gxu * 8), g8v = f32(G.gxv * 8), g8z = f32(G.gxz * 8);
  let F = ((~esi.s[1]) & 0xffff) / 65536;                   // [0xcee20]
  const Fm = ((~M.sy) & 0xffff) / 65536;                    // [0xcee24]
  const TOP = { u: esi.f[3], v: esi.f[4], z: esi.f[2] }, MID = { u: M.u, v: M.v, z: M.z };
  const neg = (area < 0 || Object.is(area, -0));
  let yStart, yEnd, seg2;                                   // seg2: 0 none, 1 = det>=0 style, 2 = det<0 style
  const midRel = { s0: 0 };
  if (!neg) {
    if (ebx.s[1] === 0) return;
    edgeSetup(eL, esi.s[0], ebx.s[0], ebx.s[1], F, TOP, true, G);                 // long edge = left, with attributes
    if (edi.s[1] !== 0) { edgeSetup(eR, esi.s[0], edi.s[0], edi.s[1], F, null, false, G); seg2 = 1; yStart = esi.s[1]; yEnd = M.sy; }
    else {
      rel(ebx, edi); F = Fm; if (ebx.s[1] === 0) return;
      edgeSetup(eR, M.sx, ebx.s[0], ebx.s[1], F, null, false, G); seg2 = 0; yStart = M.sy; yEnd = botY;
    }
  } else {
    if (ebx.s[1] === 0) return;
    edgeSetup(eR, esi.s[0], ebx.s[0], ebx.s[1], F, null, false, G);               // long edge = right (x only)
    if (edi.s[1] !== 0) { edgeSetup(eL, esi.s[0], edi.s[0], edi.s[1], F, TOP, true, G); seg2 = 2; yStart = esi.s[1]; yEnd = M.sy; }
    else {
      rel(ebx, edi); F = Fm; if (ebx.s[1] === 0) return;
      edgeSetup(eL, M.sx, ebx.s[0], ebx.s[1], F, MID, true, G); seg2 = 0; yStart = M.sy; yEnd = botY;
    }
  }
  for (;;) {
    let y = yStart >> 16, rows = Math.min(yEnd >> 16, 200) - y;
    while (rows > 0) {
      if (y >= 0) drawRow();
      // 0x8a14f: step the edges to the next scanline
      const nx = (eL.x + eL.si) | 0, carry = ((nx & 0xffff) < (eL.si & 0xffff)) ? 1 : 0;
      eL.x = nx; eR.x = (eR.x + eR.si) | 0;
      eL.cu = f32(eL.cu + (carry ? eL.su2 : eL.su)); eL.cv = f32(eL.cv + (carry ? eL.sv2 : eL.sv)); eL.cz = f32(eL.cz + (carry ? eL.sz2 : eL.sz));
      rowBase += SW; y++; rows--;
    }
    if (seg2 === 0) break;
    // second segment: bottom relative to the mid vertex, new short edge starting at the mid vertex
    rel(ebx, edi); F = Fm; if (ebx.s[1] === 0) return;
    if (seg2 === 1) edgeSetup(eR, M.sx, ebx.s[0], ebx.s[1], F, null, false, G);
    else edgeSetup(eL, M.sx, ebx.s[0], ebx.s[1], F, MID, true, G);
    seg2 = 0; yStart = M.sy; yEnd = botY;
  }
  function drawRow() {
    let L = eL.x >> 16, R = eR.x >> 16;
    if (R > 320) R = 320;
    if (L < 0) L = 0;                                       // (the original does not advance the attributes here)
    const cnt = R - L; if (cnt <= 0) return;
    const R0 = 1 / eL.cz, n = cnt - 1, m = n & 7;
    let groups = n >> 3, pos = rowBase + L + m;
    let Zm = f32(eL.cz + m * G.gxz), Um = f32(eL.cu + m * G.gxu), Vm = f32(eL.cv + m * G.gxv);
    const u0 = eL.cu * R0, v0 = eL.cv * R0, u0f = f32(u0), v0f = f32(v0);
    const Us = rpw(u0), Vs = rpw(v0);
    let R1 = 1 / Zm;
    const um = Um * R1, vm = Vm * R1;
    let prevU = rpw(um), prevV = rpw(vm);
    const stepV = rpw((vm - v0f) * INV8[m]), stepU = rpw((um - u0f) * INV8[m]);
    Um = f32(Um + g8u); Vm = f32(Vm + g8v); Zm = f32(Zm + g8z);
    let Rr = 1 / Zm;
    let eax = (((stepU << 16) | (stepV & 0xffff)) >>> 0);
    let b = (((Us << 16) | (Vs & 0xffff)) >>> 0);
    let q = pos - m;
    for (let i = 0; i <= m; i++, q++) {
      const edx = ((b >>> 24) | (((b >>> 8) & 255) << 8));
      b = (b + eax) >>> 0;
      screen[q] = (screen[q] + tex[edx]) & 255;
    }
    q = pos + 1;
    while (groups-- > 0) {
      const UE = rpw(Um * Rr), VE = rpw(Vm * Rr);
      Um = f32(Um + g8u); Vm = f32(Vm + g8v); Zm = f32(Zm + g8z); Rr = 1 / Zm;
      const du = (UE - prevU) | 0, dv = (VE - prevV) | 0;
      b = (((prevU << 16) | (prevV & 0xffff)) >>> 0);
      eax = ((((du >> 3) << 16) | ((dv >> 3) & 0xffff)) >>> 0);
      prevU = UE; prevV = VE;
      for (let i = 0; i < 8; i++, q++) {
        b = (b + eax) >>> 0;
        const edx = ((b >>> 24) | (((b >>> 8) & 255) << 8));
        screen[q] = (screen[q] + tex[edx]) & 255;
      }
    }
  }
}

// ================================================================================================
// ================================================================================================
const mIdent = (m) => { m.fill(0); m[0] = m[5] = m[10] = 1; };
// rotate two rows: a' = c*a - s*b ; b' = s*a + c*b   (rows given by their start index)
function mRot(m, ra, rb, ang) {
  const s = f32(Math.sin(ang)), c = f32(Math.cos(ang));
  for (let j = 0; j < 4; j++) {
    const a = m[ra + j], b = m[rb + j];
    m[ra + j] = c * a - s * b; m[rb + j] = s * a + c * b;
  }
}
const mRotX = (m, a) => mRot(m, 4, 8, a);     // 0x8b834
const mRotY = (m, a) => mRot(m, 8, 0, a);     // 0x8b734   (rows 0 and 2)
const mRotZ = (m, a) => mRot(m, 0, 4, a);     // 0x8b634   (rows 0 and 1)
const mScale = (m, sx, sy, sz) => { for (let j = 0; j < 4; j++) { m[j] *= sx; m[4 + j] *= sy; m[8 + j] *= sz; } };   // 0x8b5a8
const mTrans = (m, x, y, z) => { m[3] += x; m[7] += y; m[11] += z; };                                              // 0x8b938
// 0x8ba34: out = M * in for n vertices (stride 13 floats = 0x34 bytes, x y z at 0..2)
function mXform(m, vin, vout, n) {
  for (let i = 0, o = 0; i < n; i++, o += 13) {
    const x = vin[o], y = vin[o + 1], z = vin[o + 2];
    vout[o] = m[1] * y + m[0] * x + m[2] * z + m[3];
    vout[o + 1] = m[5] * y + m[4] * x + m[6] * z + m[7];
    vout[o + 2] = m[9] * y + m[8] * x + m[10] * z + m[11];
  }
}
const lcgNext = (st) => { st.s = (Math.imul(st.s, 0x41c64e6d) + 0x3039) >>> 0; return (st.s >>> 16) & 0x7fff; };   // Watcom rand()
/** 0x8b51c/0x8b380: 2500 soft round blobs (radius R, height A) added at random places of a 256x256 8 bit texture. */
function blobTexture(g, R, A) {                          // g = {s: rand() state}, advanced in place (rand() is a global of the original)
  const tex = new Uint8Array(65536);
  for (let n = 0; n < 2500; n++) {
    const be = lcgNext(g) % 255, ae = lcgNext(g) % 255;         // centre y, centre x
    const x0 = ftol(ae - R - 1), x1 = ftol(ae + R + 1), y0 = ftol(be - R - 1), y1 = ftol(be + R + 1);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const d = f32(Math.sqrt((x - ae) * (x - ae) + (y - be) * (y - be)));
      if (d >= R) continue;
      const i = (x + (y << 8)) & 0xffff, v = ftol(A * (Math.cos(d * Math.PI / R) * 0.5 + 0.5) + tex[i]);
      tex[i] = v > 255 ? 255 : v;
    }
  }
  return tex;
}
/** 0x35e2c + 0x35e82: recursive glow smear, first along the rows then down the columns: out = sat(in + T[previous out]),
 *  T[k] = round(k * gain) (the table is built by accumulating `gain`, like the FPU loop). */
function smear(buf, gain) {
  const T = new Uint8Array(256); let acc = 0;
  for (let k = 0; k < 256; k++, acc += gain) T[k] = rint(acc) & 255;
  for (let y = 0; y < 200; y++) { let p = 0; for (let x = y * 320, e = x + 320; x < e; x++) { const v = buf[x] + T[p]; p = v > 255 ? 255 : v; buf[x] = p; } }
  for (let x = 0; x < 320; x++) { let p = 0; for (let i = x; i < 64000; i += 320) { const v = buf[i] + T[p]; p = v > 255 ? 255 : v; buf[i] = p; } }
}

// ================================================================================================
// echo4   (script: `echo4 plani {SCREEN8} {SCREEN8} {Frame*0.8}`)
// ================================================================================================
// A "cage" of 3 x 6 translucent-looking planes (quads at +-100,+-60,+-20 along each axis, 36 triangles) is rotated by the
// accumulated value of the expression and every triangle is drawn *additively* (dest += texel, byte wrap) with a perspective

// ------------------------------------------------------------------------------------------------
// echo5   (script: `echo5 eko5 {TEMP8} {TEMP8} {0.5*Frame}`; TEMP8 = 320x240 8 bit, only the top 320x200 are used; palette comes later)
// ------------------------------------------------------------------------------------------------
// A cage of 33 square sheets (11 per axis, at -100..+100 step 20, 66 triangles, 132 vertices) is rotated by an angle that integrates the
// change of the expression, wobbled by three sine waves and drawn additively with a perspective correct texture mapper (texture = 2500
// random soft blobs, uv scrolls).  The picture is never cleared: it is smeared (0.65 x left neighbour, then 0.65 x upper neighbour) every frame,
// which turns the additive line crossings into glow trails.  Original: 0x11807c/0x1180dc, kernel 0x155628, mesh 0x154ee8, wave 0x1554dc,
// bucket sort 0x1535a8, polygon loop 0x153a8c, triangle pipeline 0x18337a, smear 0x183d34/0x183d8a.
const E5_K = 0.00025;                                  // 0x1b0968
function echo5Mesh() {
  const vin = new Float32Array(132 * 13), polys = [], corners = [[-100, 100], [100, 100], [100, -100], [-100, -100]];
  let nv = 0;
  for (let g = 0; g < 3; g++) for (let i = 0; i < 11; i++) {
    const c = -100 + 20 * i, base = nv;
    for (const [a, b] of corners) { vin.set(g === 0 ? [a, b, c] : g === 1 ? [a, c, b] : [c, a, b], nv * 13); nv++; }
    const uv = corners.map(([a, b]) => [f32((a + c) * E5_K), f32((b - c) * E5_K)]);
    polys.push({ v: [base, base + 1, base + 2], uv: [uv[0], uv[1], uv[2]] }, { v: [base, base + 2, base + 3], uv: [uv[0], uv[2], uv[3]] });
  }
  return { vin, polys, nv };
}
// the sine wobble of 0x1554dc: every transformed vertex is scaled by G = 0.3*(sin a + sin b + sin c) + 2 (a, b, c from the model coordinates), z += 1200
function echo5Wobble(vin, vout, nv, st) {
  const S = 1 / 51.398223876953125, C2 = 0.6666666666666666;   // 1/[0x1bde20] stays in extended precision
  const ttx = add(mul(ex(st.delta), ex(f32(0.03))), ex(st.tt));   // `fst` keeps the unrounded x87 value on the stack: the two phases use it, the memory copy is float32
  st.tt = toF32(ttx);
  const P1 = toF32(mul(ttx, ex(1.3))), P2 = toF32(mul(ttx, ex(0.8)));
  for (let i = 0, o = 0; i < nv; i++, o += 13) {
    const X = Math.trunc(vin[o]), Y = Math.trunc(vin[o + 1]), Z = Math.trunc(vin[o + 2]);   // int16 of the model coordinates
    const G = (0.3 * Math.sin(X * S + st.tt) + C2) + (0.3 * Math.sin(Y * S + P2) + C2) + (0.3 * Math.sin(Z * S + P1) + C2);
    vout[o] *= G; vout[o + 1] *= G; vout[o + 2] = vout[o + 2] * G + 1200;
  }
}
FX.register('echo5', {
  init(params, ev, ctx) {
    const g = { s: (ctx.randSeed ?? 0x565bb039) >>> 0 };   // rand() state: 0x565bb039 = after cellrd's preinit at script load
    const tex = blobTexture(g, 5, 4); ctx.randSeed = g.s;  // shared with cellrd (its noise / steps use the same rand())
    return { fexpr: (ctx.expr || compileExpr)(params.trim().split(/\s+/)[0]), t0: null, prev: 0, ang: 0, tt: 0, a2c: 0, delta: 0, tex, geo: echo5Mesh(),
      M: new Float32Array(12), vout: new Float32Array(132 * 13), verts: [new Vtx(), new Vtx(), new Vtx()] };
  },
  run(st, ev, ctx) {
    const out = ev.outputs[0]; if (!out) return;
    const fr = f32(ctx.frame); if (st.t0 === null) st.t0 = fr;
    const v = st.fexpr(f32(fr - st.t0));
    st.delta = f32(v - st.prev); st.prev = f32(st.prev + st.delta);
    echo5Frame(st, out.data);
  },
});
export function echo5Frame(st, screen) {
  const { M, vout, tex } = st, { vin, polys, nv } = st.geo;
  st.ang = toF32(add(mul(ex(st.delta), ex(0.00425)), ex(st.ang)));
  mIdent(M); mRotX(M, st.ang); mRotY(M, toF32(mul(ex(st.ang), ex(1.1)))); mRotZ(M, toF32(mul(ex(st.ang), ex(0.8)))); mScale(M, 2.0, f32(2.6), 2.0);
  mXform(M, vin, vout, nv);
  echo5Wobble(vin, vout, nv, st);
  st.a2c = f32(st.delta * 3000 + st.a2c);
  const ctx = { screen, tex }, [a, b, c] = st.verts;
  for (const f of polys) {
    const [i, j, k] = f.v, key = Math.trunc((vout[i * 13 + 2] + vout[j * 13 + 2] + vout[k * 13 + 2]) * 0.2);
    if (key >= 4096) continue;
    [a, b, c].forEach((vt, n) => { const o = f.v[n] * 13; vt.set(vout[o], vout[o + 1], vout[o + 2], f.uv[n][0] * 65536 * 256 + st.a2c, f.uv[n][1] * 65536 * 256); });
    drawTri(a, b, c, ctx);
  }
  if (!st.noSmear) smear(screen, f32(0.65));   // (noSmear: debugging aid of tools/test-feedback.mjs)
}
export const _fb = { echo5Mesh, mIdent, mRotX, mRotY, mRotZ, mScale, mXform, blobTexture, smear };
