// scene3d-fx.js - the three mesh-modifying effects that act on a named object of a named `scene` event:
//   displace247  (init 0x113288 run 0x113558)  radial wobble around the centroid:     v' = c + (v-c) * (1 + A*sin(|v-c|*F + Frame*S))
//   displacenorm (init 0x1136b0 run 0x1139dc)  same wave but along the vertex normal: v' = v0 + n * A*sin(|v0-c|*F + Frame*S)
//   bomb         (init 0x112868 run 0x112ca8)  explosion: every triangle is flown out of the object centre, speed random per face
// params "SCENE OBJECT e0 e1 e2" (A, S, F expressions of Frame) resp. "SCENE OBJECT expr" for bomb.  Frame = centiseconds since the first run of the effect.
import { FX } from '../core.js';
import { computeNormals } from './scene3d-scene.js';
import { sceneByName } from './scene3d.js';

const words = (s) => s.trim().split(/\s+/);
function target(ctx, p, who) {
  const st = sceneByName(ctx, p[0]); if (!st) throw new Error(who + ': Scene (' + p[0] + ') not found');
  const o = st.scene.getObject(p[1]); if (!o) throw new Error(who + ': Object (' + p[1] + ') not found');
  return o;
}
const f32 = Math.fround;

function centroidDist(o) {
  const P = o.P, n = P.length / 3; let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < n; i++) { cx = f32(cx + P[i * 3]); cy = f32(cy + P[i * 3 + 1]); cz = f32(cz + P[i * 3 + 2]); }
  cx = f32(cx / n); cy = f32(cy / n); cz = f32(cz / n);
  const rel = new Float32Array(n * 3), dist = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = f32(P[i * 3] - cx), y = f32(P[i * 3 + 1] - cy), z = f32(P[i * 3 + 2] - cz); rel[i * 3] = x; rel[i * 3 + 1] = y; rel[i * 3 + 2] = z; dist[i] = Math.sqrt(x * x + y * y + z * z); }
  return { c: [cx, cy, cz], rel, dist };
}

FX.register('displace247', {
  init(params, ev, ctx) {
    const p = words(params), o = target(ctx, p, 'Disp247'), g = centroidDist(o);
    return { o, ...g, e: [ctx.expr(p[2]), ctx.expr(p[3]), ctx.expr(p[4])] };
  },
  run(st, ev) {
    const F = ev.local, A = st.e[0](F), S = st.e[1](F), Fq = st.e[2](F), ph = Math.fround(F * S), n = st.dist.length, P = st.o.P, r = st.rel, d = st.dist, c = st.c;
    if (P.length !== n * 3) return;   // mesh was replaced (marching cubes): nothing to do
    for (let i = 0; i < n; i++) { const s = 1 + A * Math.sin(d[i] * Fq + ph); P[i * 3] = r[i * 3] * s + c[0]; P[i * 3 + 1] = r[i * 3 + 1] * s + c[1]; P[i * 3 + 2] = r[i * 3 + 2] * s + c[2]; }
    st.o.N = computeNormals(P, st.o.idx, false);
  },
});

FX.register('displacenorm', {
  init(params, ev, ctx) {
    const p = words(params), o = target(ctx, p, 'DispNorm'), g = centroidDist(o);
    return { o, dist: g.dist, base: Float32Array.from(o.P), nrm: Float32Array.from(o.N), e: [ctx.expr(p[2]), ctx.expr(p[3]), ctx.expr(p[4])] };
  },
  run(st, ev) {
    const F = ev.local, A = st.e[0](F), S = st.e[1](F), Fq = st.e[2](F), ph = Math.fround(F * S), n = st.dist.length, P = st.o.P, b = st.base, N = st.nrm;
    if (P.length !== n * 3) return;
    for (let i = 0; i < n; i++) { const s = A * Math.sin(st.dist[i] * Fq + ph); P[i * 3] = N[i * 3] * s + b[i * 3]; P[i * 3 + 1] = N[i * 3 + 1] * s + b[i * 3 + 1]; P[i * 3 + 2] = N[i * 3 + 2] * s + b[i * 3 + 2]; }
    st.o.N = computeNormals(P, st.o.idx, false);
  },
});

// Watcom rand(): seed = seed*0x41c64e6d + 0x3039, result (seed>>16)&0x7fff.  The seed (0x1ba928) holds 0x565bb039 when the script starts (rand is called during start-up).
function makeRand(seed) { return () => { seed = (Math.imul(seed, 0x41c64e6d) + 0x3039) >>> 0; return (seed >>> 16) & 0x7fff; }; }
// rand() on the SHARED state ctx.randSeed (echo5's texture, bomb's per-face speeds and cellrd's dither noise all draw from the one C seed 0x1ba928)
function sharedRand(ctx, fallback) { if (ctx.bombSeed !== undefined) ctx.randSeed = ctx.bombSeed; else if (ctx.randSeed === undefined) ctx.randSeed = fallback; return () => { ctx.randSeed = (Math.imul(ctx.randSeed, 0x41c64e6d) + 0x3039) >>> 0; return (ctx.randSeed >>> 16) & 0x7fff; }; }
// rand() state when `bomb` is created in the continuous 30 fps reference run (re/dt_scene3d/seed_at.py: cellrd's steps consumed rand() since 0x565bb039); the real value depends on how many frames cellrd ran
const RAND_SEED_AT_BOMB = 0xfc0b2df1;

FX.register('bomb', {
  init(params, ev, ctx) {
    const p = words(params), o = target(ctx, p, 'Bomb'), rnd = (ctx.dbgSeed && ctx.dbgSeed('bomb init'), sharedRand(ctx, RAND_SEED_AT_BOMB));
    // unshare the mesh: every triangle gets its own three vertices (0x112730); normals / uv follow
    const idx = o.idx, nt = idx.length / 3, P0 = o.P, N0 = o.N, P = new Float32Array(nt * 9), N = new Float32Array(nt * 9);
    for (let k = 0; k < nt * 3; k++) { const v = idx[k]; for (let c = 0; c < 3; c++) { P[k * 3 + c] = P0[v * 3 + c]; N[k * 3 + c] = N0[v * 3 + c]; } }
    if (o.UV && !o.UVc) { const UV = new Float32Array(nt * 6); for (let k = 0; k < nt * 3; k++) { UV[k * 2] = o.UV[idx[k] * 2]; UV[k * 2 + 1] = o.UV[idx[k] * 2 + 1]; } o.UV = UV; }
    const nidx = new Uint32Array(nt * 3); for (let k = 0; k < nidx.length; k++) nidx[k] = k;
    // per face: offsets from the face centroid, centroid, distance from the global centroid g, random speed
    const rel = new Float32Array(nt * 9), cen = new Float32Array(nt * 3), dir = new Float32Array(nt * 3), dist = new Float32Array(nt), spd = new Float32Array(nt);
    let gx = 0, gy = 0, gz = 0;
    for (let t = 0; t < nt; t++) {
      let sx = 0, sy = 0, sz = 0; for (let c = 0; c < 3; c++) { sx = f32(sx + P[(t * 3 + c) * 3]); sy = f32(sy + P[(t * 3 + c) * 3 + 1]); sz = f32(sz + P[(t * 3 + c) * 3 + 2]); }
      const cx = f32(sx / 3), cy = f32(sy / 3), cz = f32(sz / 3); cen[t * 3] = cx; cen[t * 3 + 1] = cy; cen[t * 3 + 2] = cz;
      for (let c = 0; c < 3; c++) { rel[t * 9 + c * 3] = f32(P[(t * 3 + c) * 3] - cx); rel[t * 9 + c * 3 + 1] = f32(P[(t * 3 + c) * 3 + 1] - cy); rel[t * 9 + c * 3 + 2] = f32(P[(t * 3 + c) * 3 + 2] - cz); }
      gx = f32(gx + cx); gy = f32(gy + cy); gz = f32(gz + cz);
    }
    gx = f32(gx / nt); gy = f32(gy / nt); gz = f32(gz / nt); let mx = 0;
    for (let t = 0; t < nt; t++) {
      const dx = f32(cen[t * 3] - gx), dy = f32(cen[t * 3 + 1] - gy), dz = f32(cen[t * 3 + 2] - gz), d = f32(Math.sqrt(dx * dx + dy * dy + dz * dz));
      dist[t] = d; if (d > mx) mx = d; dir[t * 3] = f32(dx / d); dir[t * 3 + 1] = f32(dy / d); dir[t * 3 + 2] = f32(dz / d);
    }
    for (let t = 0; t < nt; t++) spd[t] = f32(f32(1.2 - dist[t] / mx) * (rnd() * 3.0518509447574615e-05 + 0.3));
    o.P = P; o.N = N; o.idx = nidx; o.version++;
    return { o, g: [gx, gy, gz], rel, dir, dist, spd, e: ctx.expr(p[2]), nt };
  },
  run(st, ev) {
    const d = st.e(ev.local), o = st.o, P = o.P, nt = st.nt, rel = st.rel, dir = st.dir, g = st.g;
    if (P.length !== nt * 9) return;
    for (let t = 0; t < nt; t++) {
      const m = (1 + st.spd[t] * d) * st.dist[t], cx = dir[t * 3] * m + g[0], cy = dir[t * 3 + 1] * m + g[1], cz = dir[t * 3 + 2] * m + g[2];
      for (let c = 0; c < 3; c++) { P[(t * 3 + c) * 3] = rel[t * 9 + c * 3] + cx; P[(t * 3 + c) * 3 + 1] = rel[t * 9 + c * 3 + 1] + cy; P[(t * 3 + c) * 3 + 2] = rel[t * 9 + c * 3 + 2] + cz; }
    }
  },
});
