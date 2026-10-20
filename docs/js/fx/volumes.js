// volumes.js - the "blob.c" effects of tour.exe: 16x16x16 float scalar fields (volume3D, clearvolume, copyvolume,
// metaballs, morphvolume, addvolume, subvolume, mulvolume, fadevolume, plasma1volume) and the marching-cubes
// polygoniser (marchingcubes).  Ported from the TOUR disassembly (effect functions 0x115688-0x116830, kernels
// 0x152160-0x152349, metaball renderer 0x114ee8, marching cubes core 0x151ab8) and verified against the original
// in the Unicorn harness (re/dt_volumes/gen.py + tools/test-volumes.mjs).  Notes: re/volumes.md, docs/notes/volumes-*.html.
// volumesprites (0x1168ac, not used by the script) is not ported.
import { FX, compileExpr } from '../core.js';

const N = 16, NN = 4096;                 // volume = 16^3 floats, index = x + 16*y + 256*z (the original: 0x4000 bytes)
const f32 = Math.fround;
/** the original keeps a table of 32 volume pointers at 0x2041f0 (name stored in the volume record); here a Map in ctx */
const volsOf = (ctx) => ctx.volumes || (ctx.volumes = new Map());

function findVolume(ctx, name, who) {
  const v = volsOf(ctx).get(name.toLowerCase());
  if (!v) throw new Error(who + ': Volume not found (' + name + ')');   // original: puts(msg) + exit
  return v;
}
const words = (s) => s.trim().split(/\s+/);
const expr = (ctx, src) => (ctx && ctx.expr ? ctx.expr(src) : compileExpr(src));

// ---------------------------------------------------------------- volume3D / clear / copy
FX.register('volume3D', {
  init(params, ev, ctx) {
    const p = words(params), name = p[0], data = new Float32Array(NN);
    if (p.length > 1) { const b = ctx.assets.bin(p[1]); data.set(new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + NN * 4))); }
    const vols = volsOf(ctx); if (vols.size >= 32) throw new Error('Too many volumes!!!');
    vols.set(name.toLowerCase(), data); return { name, data };
  },
  run() {},                                   // the original run function is a bare ret
  free(st, ev, ctx) { volsOf(ctx).delete(st.name.toLowerCase()); },
});
FX.register('clearvolume', {
  init(params, ev, ctx) { return { v: findVolume(ctx, words(params)[0], 'ClearVolume') }; },
  run(st) { st.v.fill(0); },
});
FX.register('copyvolume', {                   // copyvolume DEST SRC
  init(params, ev, ctx) { const p = words(params); return { dst: findVolume(ctx, p[0], 'CopyVolume dest'), src: findVolume(ctx, p[1], 'CopyVolume src') }; },
  run(st) { st.dst.set(st.src); },
});

// ---------------------------------------------------------------- whole-volume arithmetic (kernels 0x1521bd/0x1521f2/0x152227/0x15218c/0x15225c: x87, 4 floats per iteration)
function binop(name, who, f) {
  FX.register(name, {                         // name DST A B : DST = A op B
    init(params, ev, ctx) { const p = words(params); return { d: findVolume(ctx, p[0], who), a: findVolume(ctx, p[1], who), b: findVolume(ctx, p[2], who) }; },
    run(st) { const { d, a, b } = st; for (let i = 0; i < NN; i++) d[i] = f(a[i], b[i]); },
  });
}
binop('addvolume', 'AddVolume', (a, b) => a + b);
binop('subvolume', 'SubVolume', (a, b) => a - b);
binop('mulvolume', 'MulVolume', (a, b) => a * b);
FX.register('fadevolume', {                    // fadevolume DST SRC expr : DST = SRC * expr(Frame)
  init(params, ev, ctx) { const p = words(params); return { d: findVolume(ctx, p[0], 'FadeVolume'), s: findVolume(ctx, p[1], 'FadeVolume'), f: expr(ctx, p[2]) }; },
  run(st, ev) { const f = f32(st.f(f32(ev.local))), { d, s } = st; for (let i = 0; i < NN; i++) d[i] = s[i] * f; },
});
FX.register('morphvolume', {                   // morphvolume DST A B t : DST = A*t + B*(1-t)   (0x15225c; t is not rounded to float)
  init(params, ev, ctx) { const p = words(params); return { d: findVolume(ctx, p[0], 'MorphVolume'), a: findVolume(ctx, p[1], 'MorphVolume'), b: findVolume(ctx, p[2], 'MorphVolume'), f: expr(ctx, p[3]) }; },
  run(st, ev) { const t = f32(st.f(f32(ev.local))), u = 1 - t, { d, a, b } = st; for (let i = 0; i < NN; i++) d[i] = a[i] * t + b[i] * u; },
});

// ---------------------------------------------------------------- plasma1volume (init 0x116634, run 0x1167b4, kernel 0x1522af)
// table of distances to the volume centre (built by the init function, 16^3 floats at 0x2001f0)
const PLASMA_TAB = new Float32Array(NN);
for (let i = 0; i < NN; i++) {
  const x = (i & 15) - 7.5, y = ((i >> 4) & 15) - 7.5, z = ((i >> 8) & 15) - 7.5;
  PLASMA_TAB[i] = Math.sqrt(x * x + y * y + z * z);
}
/** v = a + b*sin(dist + phase), computed for one octant (8x8x8 sines) and mirrored in x,y (4 stores per sine), then plane z is copied to 15-z. */
export function plasma(vol, a, b, phase) {
  for (let z = 0; z < 8; z++) for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const v = f32(a + b * Math.sin(PLASMA_TAB[x + 16 * y + 256 * z] + phase));
    const x2 = 15 - x, y2 = 15 - y, o = 256 * z;
    vol[o + x + 16 * y] = v; vol[o + x2 + 16 * y] = v; vol[o + x + 16 * y2] = v; vol[o + x2 + 16 * y2] = v;
  }
  for (let z = 0; z < 8; z++) vol.copyWithin(256 * (15 - z), 256 * z, 256 * z + 256);
}
FX.register('plasma1volume', {                 // plasma1volume DST a(Frame) b(Frame)
  init(params, ev, ctx) { const p = words(params); return { v: findVolume(ctx, p[0], 'Plasma1Volume'), a: expr(ctx, p[1]), b: expr(ctx, p[2]) }; },
  run(st, ev) { const F = f32(ev.local); plasma(st.v, f32(st.a(F)), f32(st.b(F)), F * 0.02); },   // arguments are stored as floats
});

// ---------------------------------------------------------------- metaballs (init 0x1158e4, run 0x115b04, ball set 0x114e4c, renderer 0x114ee8)
// x87 emulation for the one place where extended precision shows in the result (A = C/(R*R*R2) of a ball: product kept with a 64 bit mantissa, divided, stored as float).
const _d = new DataView(new ArrayBuffer(8));
const big = (x) => { _d.setFloat64(0, x); const hi = _d.getUint32(0), lo = _d.getUint32(4), ex = (hi >>> 20) & 0x7ff; return [(BigInt(hi & 0xfffff | (ex ? 0x100000 : 0)) << 32n) | BigInt(lo), (ex || 1) - 1075]; };
const blen = (m) => m.toString(2).length;
function rne(m, e, bits, sticky) {                           // round m*2^e to 'bits' mantissa bits, nearest even
  const len = blen(m); if (len <= bits) return [m, e];
  const sh = BigInt(len - bits); let q = m >> sh; const rem = m & ((1n << sh) - 1n), half = 1n << (sh - 1n);
  if (rem > half || (rem === half && (sticky || (q & 1n)))) q++;
  return [q, e + Number(sh)];
}
function ballA(C, R, R2) {                                   // float(C / ext(R*R*R2)), R2 = float(R*R)
  if (R2 === 0 || C === 0) return 0;
  const [m1, e1] = big(R), [m2, e2] = big(R2), [mc, ec] = big(Math.abs(C));
  const [pm, pe] = rne(m1 * m1 * m2, 2 * e1 + e2, 64, false);
  const num = mc << 130n, q = num / pm, [em, ee] = rne(q, ec - pe - 130, 64, num % pm !== 0n), [fm, fe] = rne(em, ee, 24, false);
  return (C < 0 ? -1 : 1) * Number(fm) * 2 ** fe;
}
/** Add one metaball to the volume. Grid point i sits at (i-8)*0.25; falloff is the quartic (A d2 + B) d2 + C, zero (value and slope) at d2=R^2. */
export function addBall(vol, X, Y, Z, R, C, dx2, dy2, dz2) {
  X = f32(X); Y = f32(Y); Z = f32(Z); R = f32(R); C = f32(C);
  const R2 = f32(R * R), A = ballA(C, R, R2), B = f32(-2 * C / R2);
  for (let i = 0; i < N; i++) {
    const p = (i - 8) * 0.25;
    let d = p - X; dx2[i] = d * d; d = p - Y; dy2[i] = d * d; d = p - Z; dz2[i] = d * d;     // float stores
  }
  let x0 = 0, y0 = 0, z0 = 0, x1 = 15, y1 = 15, z1 = 15;               // bounding box of the sphere of radius R in grid units
  while (x0 !== N && dx2[x0] > R2) x0++;
  while (y0 !== N && dy2[y0] > R2) y0++;
  while (z0 !== N && dz2[z0] > R2) z0++;
  while (x1 !== -1 && dx2[x1] > R2) x1--;
  while (y1 !== -1 && dy2[y1] > R2) y1--;
  while (z1 !== -1 && dz2[z1] > R2) z1--;
  for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {      // y outer, z inner, x innermost
    const t = f32(dy2[y] + dz2[z]);
    if (t > R2) continue;
    let p = x0 + 16 * y + 256 * z;
    for (let x = x0; x <= x1; x++, p++) {
      const d2 = f32(dx2[x] + t);
      if (d2 < R2) vol[p] += (d2 * A + B) * d2 + C;                    // Float32Array store = fstp dword
    }
  }
}
const _dx = new Float32Array(N), _dy = new Float32Array(N), _dz = new Float32Array(N);
FX.register('metaballs', {                     // metaballs VOLUME file.mbs : file = 8 lines "X Y Z R C" (expressions of Frame, no spaces), added to the volume every frame
  init(params, ev, ctx) {
    const p = words(params), v = findVolume(ctx, p[0], 'MetaBalls');
    const lines = ctx.assets.text(p[1]).split(/\r?\n/), balls = [];
    for (let i = 0; i < 8; i++) {
      const t = words(lines[i] || '@');
      if (t.length < 5) throw new Error('MetaBalls: Wrong param at config file line ' + (i + 2));
      balls.push(t.slice(0, 5).map((e) => expr(ctx, e)));
    }
    return { v, balls };
  },
  run(st, ev) {
    const F = f32(ev.local);
    for (const [x, y, z, r, c] of st.balls) {                          // evaluation order of the original: C R Z Y X (irrelevant: pure functions)
      addBall(st.v, f32(x(F)), f32(y(F)), f32(z(F)), f32(r(F)), f32(c(F)), _dx, _dy, _dz);
    }
  },
});

// ---------------------------------------------------------------- marching cubes (core 0x151ab8, hand-written asm; static vertex fill 0x106e54)
// 1/sqrt mantissa table (128 bytes at 0x1b7414, identical to what this formula generates): top 8 bits of the mantissa of 1/sqrt(0.5 + i/256)
const RSQRT = new Uint8Array(128);
{
  const f = new Float32Array(1), u = new Uint32Array(f.buffer);
  for (let i = 0; i < 128; i++) { u[0] = 0x3f000000 | (i << 17); const r = new Float32Array([1 / Math.sqrt(f[0])]); u[0] = new Uint32Array(r.buffer)[0]; RSQRT[i] = ((u[0] + 0x2000) >>> 15) & 0xff; }
  RSQRT[0x40] = 0xff;
}
// Triangle table (data at 0x1b340c: 256 cases x 64 bytes = up to 5 triangles of 3 signed vertex offsets, terminated by -1) = the classic
// Lorensen/Bourke table, here as cube-edge numbers 0..11 (base 12). Case = (inside-mask of the upper z plane << 4) | mask of the lower plane.
const TRI_EDGES = ';038;091;138918;1b2;0381b2;9b2092;23828bb89;32a;02a80a;1092a3;12a1a99a8;31ba3b;01b0b88ba;30939aa9b;9b8ba8;487;403743;091874;491417713;1b2874;3743401b2;9b2920874;29b279237749;87432a;a74a42240;9108742a3;4a79a492a912;31b3ba748;1ba1a414074a;4879a09baa30;4a749a9ba;945;945038;045105;845853351;1b2945;3801b2459;5b2524420;25b352345384;9452a3;02a0a8459;0450512a3;2512852a8458;ba3b31945;45901881b8ba;5045a05baa30;5845b8ba8;987597;903935537;087071175;135375;987975b21;b21905503537;820852875b25;25b235375;75979832a;9759279022a7;2a3081187175;a12a71751;985875b31ba3;50759070a1b0a0b;a0ba30b05870507;a5b75a;b56;03856b;91056b;13818956b;156216;156162380;956960062;589528562382;2a3b56;a80a02b56;0912a356b;56b12992a9a8;6a3635531;0a805a01556a;36a063056095;6956a9a89;56b487;4034376b5;10956b874;b56179137749;621615487;152562340374;874950056062;793749392569296;32a748b56;56b4274022a7;0914872a356b;91292a9a474a56b;87435a31556a;5a156a1a074a0a4;095056063a36874;6956a949779a;b946b4;46b4b9038;b10b06604;8138618466b1;194142246;380192294246;042462;823842462;b94b46a32;0282a84b946b;32a0610466b1;6146b14182a181a;946963931a36;81a801a16941614;36a306046;684a86;76b7b88b9;03707b0b96b7;b7617b187108;b76b17137;162186198876;296219697039793;708760620;723627;2a3b86b98876;2702a70796b797b;10818717b6b72a3;a12a71b16617;869876961a36163;019a76;70876030aa06;76a;7a6;380a67;091a67;891813a67;b2167a;1b238067a;20929b67a;67a23bb38b89;732672;780706602;267273091;126168189867;b67b71173;b671b7178180;0730b709b67b;7b678b89b;648a68;3a6360064;8a6864910;964936913a63;64868a21b;1b23a00a6064;48a4a609229b;b39b23934a63436;832824426;024426;109243264483;149124264;83181686461b;b01b60640;43648363b093b39;b4964b;4597a6;038459a67;5105047a6;a67843345351;945b217a6;67a1b2038459;7a65b44b2420;384345352b25a67;732726594;945068026678;326367105504;682678281458185;945b61167173;1b6167170807945;4b045b0b367b3b7;7b678b5b44b8;65969aa98;3a6036065059;08a0a50515a6;63a653513;1b29a598aa65;03a0a60695961b2;a58a65850b25052;63a65323bb35;598582526328;965906026;185108586328682;165261;1631b6368596869;b01b60905506;0835b6;b65;ab57a5;ab5a57803;57a5ab109;b57b7a918813;a21a17715;0381721577a2;95797292027a;7257a2529382928;2b5253357;802825857b52;91053b57332b;928912827b52725;153357;078017157;930953573;978579;54858bb8a;54050a5aba03;0918b48abb54;b4ab54a43914341;21525828a485;0a403a4a521a5a1;05209525a485a58;95423a;2b5325354348;52b542402;32b3b5358485091;52b542129924;854835315;054150;854835950053;954;47a4a99ab;03847997a9ab;1ab14a1047a4;34138414b7a4b4a;47a94a9a2921;94797a9a121a038;a47a24204;a47a24843342;2b9297273794;97b947b72807270;3b732b7b410b4b0;12b847;419471731;419471018817;430734;478;98bb8a;3903a9ab9;0b108b8ab;3b1ab3;1a219a98a;3903a919229a;0a28a0;3a2;2832b8b98;92b029;2832b808118b;12b;183981;019;083;;';
// cube edge -> (edge array, dx,dy,dz): array<<12 | dz<<8 | dy<<4 | dx; array 0/1/2 = edges along x/y/z
const EDGE_MAP = [0x0000, 0x1001, 0x0010, 0x1000, 0x0100, 0x1101, 0x0110, 0x1100, 0x2000, 0x2001, 0x2010, 0x2011];
// vertex slot = array*4096 + dz*256 + dy*16 + dx relative to the slot of the cell's lowest sample (x-1,y-1,z-1) = s-273
const TRI = TRI_EDGES.split(';').map((c) => Array.from(c, (ch) => { const m = EDGE_MAP[parseInt(ch, 12)]; return (m >> 12) * 4096 + ((m >> 8) & 15) * 256 + ((m >> 4) & 15) * 16 + (m & 15); }));
export const MC_TRI = TRI, MC_RSQRT = RSQRT;
const MC_THRESHOLD = f32(0.65);               // run (0x115d74) stores the constant 0x3f266666 into [0x1f6330]; the script has no threshold parameter
const STEP_K = f32(0.06666667);               // float at 0x1add93, used instead of 1/15
const _f1 = new Float32Array(1), _i1 = new Int32Array(_f1.buffer), _u1 = new Uint32Array(_f1.buffer);
/** 1/sqrt(x) estimate: exponent halved by integer arithmetic, mantissa from the table (one Newton step is done by the caller). */
function rsqrtApprox(bits) {
  const idx = (bits >>> 17) & 0x7f, e = bits & 0x7f800000;
  _u1[0] = ((((0xbe000000 - e) >>> 1) & 0x7f800000) | (RSQRT[idx] << 15)) >>> 0;
  return _f1[0];
}

export class MarchingCubes {
  /** bbox = [xmin,ymin,zmin,xmax,ymax,zmax] of the object (original: obj+0xbc..0xd0). */
  constructor(bbox) {
    const [x0, y0, z0, x1, y1, z1] = bbox.map(f32);
    this.step = [f32((x1 - x0) * STEP_K), f32((y1 - y0) * STEP_K), f32((z1 - z0) * STEP_K)]; this.min = [x0, y0, z0];
    this.pos = new Float32Array(3 * 3 * NN); this.nrm = new Float32Array(3 * 3 * NN);   // 3 arrays (x,y,z edges) of 4096 vertex slots
    this.out = new Uint32Array(15 * NN); this.nTri = 0;                                // <= 5 triangles per cell (the original allocates 4000 faces only)
    this.faceN = new Float32Array(3 * 5 * NN);
    const [sx, sy, sz] = this.step;
    for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {   // 0x106e54: static components of the edge vertices
      const s = x + 16 * y + 256 * z, px = f32(x * sx + x0), py = f32(y * sy + y0), pz = f32(z * sz + z0);
      this.pos[3 * s + 1] = py; this.pos[3 * s + 2] = pz;                      // x-edge slot (x,y,z): y,z fixed
      this.pos[3 * (NN + s)] = px; this.pos[3 * (NN + s) + 2] = pz;            // y-edge slot
      this.pos[3 * (2 * NN + s)] = px; this.pos[3 * (2 * NN + s) + 1] = py;    // z-edge slot
    }
    this.mask = new Uint8Array(NN + 256); this._g1 = new Float64Array(3); this._g2 = new Float64Array(3);
  }
  /** gradient (x2 at the borders) of sample s=(x,y,z): returns -(dV) so it points out of the blob (0x152012) */
  _grad(v, s, x, y, z, o) {
    o[0] = x === 0 ? (v[s] - v[s + 1]) * 2 : x === 15 ? (v[s - 1] - v[s]) * 2 : v[s - 1] - v[s + 1];
    o[1] = y === 0 ? (v[s] - v[s + 16]) * 2 : y === 15 ? (v[s - 16] - v[s]) * 2 : v[s - 16] - v[s + 16];
    o[2] = z === 0 ? (v[s] - v[s + 256]) * 2 : z === 15 ? (v[s - 256] - v[s]) * 2 : v[s - 256] - v[s + 256];
  }
  /** one crossing vertex: slot k (array*4096+slot), t = fraction from sample s1 towards s0 along axis ax */
  _edge(v, s1, s0, ax, k, x, y, z, thr) {
    const v1 = v[s1], t = (v1 - thr) / (v1 - v[s0]);
    const g1 = this._g1, g2 = this._g2;
    this._grad(v, s0, ax === 0 ? x - 1 : x, ax === 1 ? y - 1 : y, ax === 2 ? z - 1 : z, g1);
    this._grad(v, s1, x, y, z, g2);
    const gx = g2[0] - (g2[0] - g1[0]) * t, gy = g2[1] - (g2[1] - g1[1]) * t, gz = g2[2] - (g2[2] - g1[2]) * t;
    _f1[0] = gx * gx + gy * gy + gz * gz; const gg = _f1[0], r = rsqrtApprox(_i1[0]);   // |g|^2 is stored as float, its bits index the table
    const k2 = r * 0.5 * (3 - r * r * gg);                                             // one Newton-Raphson step
    const c = ax === 0 ? x : ax === 1 ? y : z, sp = this.step[ax];
    this.pos[3 * k + ax] = sp * c + (this.min[ax] - t * sp);
    this.nrm[3 * k] = gx * k2; this.nrm[3 * k + 1] = gy * k2; this.nrm[3 * k + 2] = gz * k2;
  }
  /** polygonise: vol = Float32Array(4096). Fills this.out (3 vertex-slot indices per triangle), returns the triangle count. */
  run(vol, thr = MC_THRESHOLD) {
    thr = f32(thr); _f1[0] = thr; const T = _i1[0];
    const vi = new Int32Array(vol.buffer, vol.byteOffset, NN);          // the original compares float bit patterns as signed ints (ecx = bits of thr)
    const mask = this.mask, out = this.out; let n = 0;
    for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const s = x + 16 * y + 256 * z, a = vi[s];
      // an edge carries a vertex when exactly one end is >= thr
      if (x > 0) { const b = vi[s - 1]; if (b < T ? a >= T : a < T) this._edge(vol, s, s - 1, 0, s - 1, x, y, z, thr); }
      if (z > 0) { const b = vi[s - 256]; if (b < T ? a >= T : a < T) this._edge(vol, s, s - 256, 2, 2 * NN + s - 256, x, y, z, thr); }
      if (y === 0) continue;
      { const b = vi[s - 16]; if (b < T ? a >= T : a < T) this._edge(vol, s, s - 16, 1, NN + s - 16, x, y, z, thr); }
      if (x === 0) continue;
      // 4-bit inside mask of the (x-1..x, y-1..y) square in this z plane (inside = thr < value); the plane below was stored 256 entries earlier
      const m = ((T < vi[s - 1]) << 3) | ((T < a) << 2) | ((T < vi[s - 16]) << 1) | (T < vi[s - 17] ? 1 : 0);
      mask[s + 256] = m;
      if (z === 0) continue;
      const cs = (m << 4) | mask[s];
      if (cs === 0 || cs === 255) continue;
      const tri = TRI[cs], base = s - 273;                                // 273 = 256+16+1: slot of the cell's lowest corner
      for (let i = 0; i < tri.length; i += 3) { out[n++] = tri[i] + base; out[n++] = tri[i + 1] + base; out[n++] = tri[i + 2] + base; }
    }
    this.nTri = n / 3; return this.nTri;
  }
  /** Compact (shared-vertex) mesh: {pos, idx, nrm, faceNormals} (views, valid until the next call). faceNormals = (b-a)x(c-a), not normalised, like the original's face record. */
  mesh() {
    const n = this.nTri * 3, remap = this._remap || (this._remap = new Int32Array(3 * NN)), P = this._P || (this._P = new Float32Array(9 * NN)),
      Nn = this._N || (this._N = new Float32Array(9 * NN)), I = this._I || (this._I = new Uint32Array(15 * NN)), FN = this.faceN;
    remap.fill(-1); let m = 0;
    for (let i = 0; i < n; i++) {
      const k = this.out[i]; let r = remap[k];
      if (r < 0) { r = remap[k] = m++; P[3 * r] = this.pos[3 * k]; P[3 * r + 1] = this.pos[3 * k + 1]; P[3 * r + 2] = this.pos[3 * k + 2]; Nn[3 * r] = this.nrm[3 * k]; Nn[3 * r + 1] = this.nrm[3 * k + 1]; Nn[3 * r + 2] = this.nrm[3 * k + 2]; }
      I[i] = r;
    }
    for (let t = 0; t < this.nTri; t++) {
      const a = 3 * this.out[3 * t], b = 3 * this.out[3 * t + 1], c = 3 * this.out[3 * t + 2], p = this.pos;
      const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      FN[3 * t] = uy * vz - uz * vy; FN[3 * t + 1] = uz * vx - ux * vz; FN[3 * t + 2] = ux * vy - uy * vx;
    }
    return { pos: P.subarray(0, 3 * m), idx: I.subarray(0, n), nrm: Nn.subarray(0, 3 * m), faceNormals: FN.subarray(0, 3 * this.nTri) };
  }
}

// ---------------------------------------------------------------- glue to the scene3d module
// Contract (see re/volumes.md): the scene event named in the params (state S) may provide
//   S.getObjectBBox(name) -> [xmin,ymin,zmin,xmax,ymax,zmax]   object-space bounding box (original obj+0xbc..0xd0)
//   S.setObjectMesh(name, {pos:Float32Array(3n), idx:Uint32Array(3m), nrm:Float32Array(3n)|null, faceNormals, smooth:bool})
// If setObjectMesh is missing the mesh is kept in S.lastMesh and in this effect's state.lastMesh.
const sceneEvent = (ctx, name) => ctx.engine && ctx.engine.events && ctx.engine.events.find((e) => e.name && e.name.toLowerCase() === name.toLowerCase());
let EXP = null; try { EXP = await import('./3d/formats.js'); } catch (e) { EXP = null; }
// ponytail: fallback when scene3d does not provide getObjectBBox: object-space bbox = vertices through the inverse node matrix (needs ./3d/formats.js parseEXP)
function fallbackBBox(ctx, se, objName) {
  if (!EXP) return null;
  const file = words(se.groups[2])[0].toLowerCase(), cache = ctx.__exp || (ctx.__exp = {});
  const sc = cache[file] || (cache[file] = EXP.parseEXP(ctx.assets.bin(file)));
  const o = sc.objects.find((q) => q.name.toLowerCase() === objName.toLowerCase()); if (!o) return null;
  const m = o.tm, bb = [1e30, 1e30, 1e30, -1e30, -1e30, -1e30], P = o.positions;
  for (let i = 0; i < P.length; i += 3) {
    const d0 = P[i] - m[9], d1 = P[i + 1] - m[10], d2 = P[i + 2] - m[11];
    for (let r = 0; r < 3; r++) { const l = f32(m[3 * r] * d0 + m[3 * r + 1] * d1 + m[3 * r + 2] * d2); bb[r] = Math.min(bb[r], l); bb[3 + r] = Math.max(bb[3 + r], l); }
  }
  return bb;
}
FX.register('marchingcubes', {                 // marchingcubes SCENE OBJECT VOLUME smoothflag
  init(params, ev, ctx) {
    const p = words(params), se = sceneEvent(ctx, p[0]);
    if (!se) throw new Error('MarchingCubes: Scene (' + p[0] + ') not found');
    const S = se.state || {};
    const bb = (S.getObjectBBox && S.getObjectBBox(p[1])) || fallbackBBox(ctx, se, p[1]);
    if (!bb) throw new Error('MarchingCubes: Object (' + p[1] + ') not found');
    return { scene: S, obj: p[1], vol: findVolume(ctx, p[2], 'MarchingCubes'), mc: new MarchingCubes(bb), smooth: +p[3] !== 0, lastMesh: null };
  },
  run(st) {
    st.mc.run(st.vol);
    const m = st.mc.mesh(); m.smooth = st.smooth;              // original: object+4 = 2 (Gouraud) when the flag is non-zero, else 1 (flat)
    st.lastMesh = m;
    if (st.scene.setObjectMesh) st.scene.setObjectMesh(st.obj, m); else st.scene.lastMesh = m;
  },
});
