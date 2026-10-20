// scene3d.js - the `scene` effect of TOUR (Bscene1.c): .exp / .lwe scene loader, animation, software renderer (32 bit target), and the mesh-modifying
// effects `displace247`, `displacenorm` and `bomb`.  Everything is re-derived from TOUR.EXE; see re/scene3d.md and docs/notes/scene3d-*.html.
import { FX } from '../core.js';
import { loadScene, transformObject, computeNormals, SCENE_NEAR } from './scene3d-scene.js';
import { drawTriangle, T, fillENV32, fillENV8, fillLIT8, fillDUAL, fillGLASS } from './scene3d-raster.js';
import { displaceLWE } from './scene3d-disp.js';
import { prepareMaterial } from './scene3d-tex.js';

const f32 = new Float32Array(1), u32 = new Uint32Array(f32.buffer);
const A6 = new Float64Array(24);

/** radix-sort key of the original (0x181d5c + 0x107ebc): float32 bits of (z0+z1+z2)*2000, ordered, >> 12 (20 bits). Larger = farther = drawn first. */
function sortKey(zsum) {
  f32[0] = Math.fround(zsum) * 2000; const b = u32[0];
  return ((b & 0x80000000) ? (~b) >>> 0 : (b | 0x80000000) >>> 0) >>> 12;
}

function pickMode(S, o) { const m = S.materials[(o.tmat && o.tmat.length ? o.tmat[0] : 0)] || S.materials[0] || {}; return m; }

/** Draw all objects of scene S into the 32 bit buffer `buf`. */
export function renderScene(S, buf, ctx) {
  const W = buf.w, H = buf.h, dst = buf.data; if (buf.bpp !== 32) return;
  const polys = []; let seq = 0; lastPrep = null;
  for (const o of S.objects) {
    if (!o.visible || !o.P) continue;
    if (o.mod) displaceLWE(S, o, ctx);
    const V = transformObject(S, o), idx = o.idx, nt = idx.length / 3;
    const mat = pickMode(S, o); const prep = prepareMaterial(ctx, S, mat, o); o.prep = prep; const mode = prep.code;
    if (mode & 2 && (mode & 15) === 2) lightVertices(S, o, V, prep);
    for (let t = 0; t < nt; t++) {
      const a = idx[t * 3], b = idx[t * 3 + 1], c = idx[t * 3 + 2];
      const za = V.cz[a], zb = V.cz[b], zc = V.cz[c];
      if (za <= SCENE_NEAR && zb <= SCENE_NEAR && zc <= SCENE_NEAR) continue;
      // trivial reject against the four screen planes (all three vertices outside the same one)
      const sa = V.sx[a], sb = V.sx[b], sc = V.sx[c], ya = V.sy[a], yb = V.sy[b], yc = V.sy[c];
      if (za > SCENE_NEAR && zb > SCENE_NEAR && zc > SCENE_NEAR) {
        if ((sa >= W && sb >= W && sc >= W) || (sa < 0 && sb < 0 && sc < 0) || (ya >= H && yb >= H && yc >= H) || (ya < 0 && yb < 0 && yc < 0)) continue;
      }
      polys.push({ k: sortKey(za + zb + zc), s: seq++, o, V, a, b, c, prep, t });
    }
  }
  polys.sort((p, q) => q.k - p.k || p.s - q.s);
  for (const p of polys) drawPoly(dst, W, H, p);
}

function lightVertices(S, o, V, prep) { // mode 2: intensity = min((ambient + sum max(0, n.d/|d|)) * 230.77, 254)   (0x182187)
  const n = V.n, P = o.P, N = o.N, L = o.vtLights, li = V.li, amb = prep.amb, sc = prep.lscale, cap = prep.lmax;
  for (let i = 0; i < n; i++) {
    let a = amb; const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], nx = N[i * 3], ny = N[i * 3 + 1], nz = N[i * 3 + 2];
    for (let k = 0; k < L.length; k++) {
      const dx = L[k][0] - x, dy = L[k][1] - y, dz = L[k][2] - z, dot = dx * nx + dy * ny + dz * nz; if (dot < 0) continue;
      a += dot / Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    a *= sc; li[i] = a > cap ? cap : a;
  }
}

const NEARPLANE = SCENE_NEAR; let lastPrep = null;
const verts = [new Float64Array(16), new Float64Array(16), new Float64Array(16)];
const clipIn = [], clipOut = [];
for (let i = 0; i < 8; i++) { clipIn.push(new Float64Array(16)); clipOut.push(new Float64Array(16)); }

function drawPoly(dst, W, H, p) {
  const { V, o, prep } = p, ids = [p.a, p.b, p.c], hw = W * 0.5, hh = H * 0.5, S = prep.S;
  if (prep !== lastPrep) { prep.bind(); lastPrep = prep; }
  const na = prep.nattr, rl = 3 + na, zx = S.cam.zx, zy = S.cam.zy;
  for (let i = 0; i < 3; i++) { const j = ids[i], r = clipIn[i]; r[0] = V.cx[j]; r[1] = V.cy[j]; r[2] = V.cz[j]; setAttr(prep, o, V, j, r, 3, p.t * 3 + i); }
  let n = 3, poly = clipIn, need = false;
  for (let i = 0; i < 3 && !need; i++) { const r = clipIn[i]; if (outcode(r, zx, zy, hw, hh)) need = true; }
  if (need) { n = clipPoly(clipIn, clipOut, rl, zx, zy, hw, hh); poly = clipPoly.result; if (n < 3) return; }
  for (let i = 0; i < n; i++) { const r = poly[i]; const iz = 1 / r[2]; r[rl] = hw + r[0] * zx * iz; r[rl + 1] = hh + r[1] * zy * iz; }
  for (let i = 1; i + 1 < n; i++) {
    const a = poly[0], b = poly[i], c = poly[i + 1];
    for (let k = 0; k < na; k++) { A6[k * 3] = a[3 + k]; A6[k * 3 + 1] = b[3 + k]; A6[k * 3 + 2] = c[3 + k]; }
    drawTriangle(dst, W, H, a[rl], a[rl + 1], b[rl], b[rl + 1], c[rl], c[rl + 1], A6, na, prep.fill);
  }
}
// clip flags of the original (0x181d5c): 0x10 z < near, 2 left, 1 right, 8 top, 4 bottom (frustum planes through the screen rectangle 0..W, 0..H)
function outcode(r, zx, zy, hw, hh) {
  const X = r[0], Y = r[1], Z = r[2]; let f = 0;
  if (Z < NEARPLANE) f |= 0x10;
  if (X * zx + Z * hw < 0) f |= 2; if (Z * hw - X * zx < 0) f |= 1; if (Y * zy + Z * hh < 0) f |= 8; if (Z * hh - Y * zy < 0) f |= 4;
  return f;
}
const clipBufA = [], clipBufB = []; for (let i = 0; i < 16; i++) { clipBufA.push(new Float64Array(16)); clipBufB.push(new Float64Array(16)); }
// Sutherland-Hodgman against near, left, right, top, bottom in this order (0x158c30), new vertices = linear interpolation of ALL attributes in camera space (0x184c0c)
function clipPoly(src, _out, rl, zx, zy, hw, hh) {
  let cur = src, n = 3, buf = 0;
  for (let i = 0; i < 3; i++) { const t = clipBufA[i]; for (let k = 0; k < rl; k++) t[k] = src[i][k]; }
  cur = clipBufA; let nxt = clipBufB;
  const planes = [(r) => r[2] - NEARPLANE, (r) => r[0] * zx + r[2] * hw, (r) => r[2] * hw - r[0] * zx, (r) => r[1] * zy + r[2] * hh, (r) => r[2] * hh - r[1] * zy];
  for (const pl of planes) {
    let any = false; for (let i = 0; i < n; i++) if (pl(cur[i]) < 0) { any = true; break; }
    if (!any) continue;
    let m = 0;
    for (let i = 0; i < n; i++) {
      const a = cur[i], b = cur[(i + 1) % n], da = pl(a), db = pl(b), ia = da >= 0, ib = db >= 0;
      if (ia) { const o = nxt[m++]; for (let k = 0; k < rl; k++) o[k] = a[k]; }
      if (ia !== ib) { const t = da / (da - db), o = nxt[m++]; for (let k = 0; k < rl; k++) o[k] = a[k] + (b[k] - a[k]) * t; }
    }
    n = m; const tmp = cur; cur = nxt; nxt = tmp; if (n < 3) break;
  }
  clipPoly.result = cur; return n;
}

function setAttr(prep, o, V, j, r, off, corner) {
  const uvc = o.UVc, ui = uvc ? corner * 2 : j * 2, uv = uvc || o.UV;   // exp objects: uv per polygon corner; lwe: per vertex
  switch (prep.kind) {
    case 'env32': r[off] = uv[ui]; r[off + 1] = uv[ui + 1]; break;
    case 'env8': case 'glass': r[off] = V.u[j]; r[off + 1] = V.v[j]; break;
    case 'lit8': r[off] = uv[ui]; r[off + 1] = uv[ui + 1]; r[off + 2] = V.li[j]; break;
    case 'dual': r[off] = uv[ui]; r[off + 1] = uv[ui + 1]; r[off + 2] = V.u[j]; r[off + 3] = V.v[j]; break;
  }
}
// ----------------------------------------------------------------------------------------------- effect
FX.register('scene', {
  init(params, ev, ctx) {
    const w = params.trim().split(/\s+/), file = w[0];
    const S = loadScene(file, ctx.assets);
    const st = { scene: S, speed: parseFloat(w[1]) || 0, offset: parseFloat(w[2]) || 0, start: null, ev, flag: (w[3] || '')[0] || '' };
    // API for the volumes agent (re/volumes.md): marchingcubes replaces the mesh of a named object every frame
    st.getObjectNames = () => S.getObjectNames();
    st.getObjectBBox = (name) => { const o = S.getObject(name); return o ? o.bbox() : null; };
    st.setObjectMesh = (name, m) => { const o = S.getObject(name); if (!o) return false; o.setMesh(m.pos, m.idx, m.nrm, m.smooth); o.meshSet = true; return true; };
    st.getScene = () => S;
    return st;
  },
  play(st, ev, ctx) { st.start = ctx.frame; st.restart = true; },
  stop(st) { st.start = null; },
  run(st, ev, ctx) {
    if (st.start == null) return;               // not `play`ed: the original's render callback pointer is still 0
    const S = st.scene, buf = ev.outputs[0] || ev.inputs[0]; if (!buf) return;
    let x = (ctx.frame - st.start) * st.speed * 0.01;
    if (x > S.duration - 0.5) { st.start = ctx.frame; x = 0; }
    S.evaluate(x + st.offset, buf.w, buf.h);
    if (ctx.render === false) return;
    renderScene(S, buf, ctx);
  },
  free() {},
});

/** scene event state by its event name (the volumes / displace / bomb effects refer to the scene by name). */
export function sceneByName(ctx, name) {
  const evs = ctx.engine && ctx.engine.events; if (!evs) return null; name = name.toLowerCase();
  const e = evs.find((q) => q.name && q.name.toLowerCase() === name && q.state && q.state.scene);
  return e ? e.state : null;
}
export { computeNormals };
