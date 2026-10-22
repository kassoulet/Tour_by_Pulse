// scene3d-scene.js - scene data model of the TOUR `scene` effect: loaders (.exp / .lwe+.lwv), animation, camera, object transforms,
// per-vertex shading (env map uv, smooth lighting).  Re-derived from TOUR.EXE (Bscene1.c) and verified against the original, see re/scene3d.md.
import { parseEXP, parseLWE, parseLWV } from './scene3d-formats.js';
import { evalKeys } from './scene3d-anim.js';
import { hpbToMatrix } from './scene3d-math.js';
import { parseModifier } from './scene3d-disp.js';

const NEAR = 0.5;                 // [0x1f9d3c]
export const SCENE_NEAR = NEAR;

/** unit face normals summed per vertex and normalised (the loader's normal builder; matches the original vertex normals to 1e-6). */
export function computeNormals(P, I, flip) {
  const N = new Float32Array(P.length);
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (flip) { nx = -nx; ny = -ny; nz = -nz; }
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    N[a] += nx; N[a + 1] += ny; N[a + 2] += nz; N[b] += nx; N[b + 1] += ny; N[b + 2] += nz; N[c] += nx; N[c + 1] += ny; N[c + 2] += nz;
  }
  for (let i = 0; i < N.length; i += 3) { const l = Math.hypot(N[i], N[i + 1], N[i + 2]) || 1; N[i] /= l; N[i + 1] /= l; N[i + 2] /= l; }
  return N;
}

export class SceneObject {
  constructor(name) {
    this.name = name; this.visible = true;
    this.P = null;        // current object space positions Float32Array(3n)  (displace247 / bomb / marching cubes modify this)
    this.P0 = null;       // pristine copy
    this.N = null;        // vertex normals (object space)
    this.UV = null;       // file uv in texel units Float32Array(2n) (0..255 scale), or null
    this.idx = null; this.tmat = null; // Uint32Array(3t), Uint16Array(t)
    this.keys = null; this.M = [1, 0, 0, 0, 1, 0, 0, 0, 1]; this.pivot = [0, 0, 0]; this.base = [0, 0, 0];
    this.W = new Float64Array(12);   // object -> world: rows = images of x,y,z axes (row vectors), then translation  (w = p*W3 + t)
    this.kind = 'exp'; this.version = 0; this.flat = false; this.UVc = null;
  }
  setMesh(pos, idx, nrm, smooth) {   // marchingcubes: replace geometry
    this.P = Float32Array.from(pos); this.idx = Uint32Array.from(idx);
    this.N = nrm ? Float32Array.from(nrm) : computeNormals(this.P, this.idx, this.kind === 'lwe');
    const nt = this.idx.length / 3; this.tmat = new Uint16Array(nt); this.UV = null; this.UVc = null; this.version++; this.smoothFlag = smooth;
  }
  bbox() { const P = this.P0 || this.P, b = [1e30, 1e30, 1e30, -1e30, -1e30, -1e30]; for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { if (P[i + k] < b[k]) b[k] = P[i + k]; if (P[i + k] > b[3 + k]) b[3 + k] = P[i + k]; } return b; }
}

function inv3(m) { // row-major 3x3 inverse
  const [a, b, c, d, e, f, g, h, i] = m, A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C || 1;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}

export class Scene {
  constructor(file, kind) {
    this.file = file; this.kind = kind; this.objects = []; this.lights = []; this.materials = []; this.duration = 100; this.time = 0;
    this.cam = { pos: new Float64Array(3), R: new Float64Array(9), zx: 718.74, zy: 718.74 }; // R rows = camera x (right), y (down), z (forward) axes in world space
    this.W = 640; this.H = 480; this.camsrc = null; this.nulls = []; this.spin = 0;
  }
  getObject(n) { n = n.toLowerCase().replace(/\.lw[ov]$/, ''); return this.objects.find((o) => o.name.toLowerCase().replace(/\.lw[ov]$/, '') === n) || null; }
  getObjectNames() { return this.objects.map((o) => o.name); }

  /** evaluate the animation at scene time t (frames) for a W x H target. */
  evaluate(t, W, H) {
    this.time = t; this.W = W; this.H = H; const d = new Float64Array(6), c = this.cam;
    if (this.kind === 'exp') {
      for (const o of this.objects) {
        if (!o.keys) continue;
        evalKeys(o.keys, t, d.subarray(0, 3), o.keys[o.keys.length - 1].frame, true);
        const M = o.M, p = o.pivot, W3 = o.W;
        // world = (p_obj - pivot) * M + key(t)   (rotation / scale keys are single identity keys in every shipped file)
        for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) W3[r * 3 + k] = M[r * 3 + k];
        if (this.spin) { // quirk of the original (see re/scene3d.md): a rotation about x of  spin*t  radians appears (interpolation past the last rotation key)
          const th = this.spin * t, c = Math.cos(th), s = Math.sin(th); // column-vector Rx = [[1,0,0],[0,c,s],[0,-s,c]]; rows of W3 (row vector convention) = columns of Rx
          W3.set([1, 0, 0, 0, c, -s, 0, s, c]);
        }
        for (let k = 0; k < 3; k++) W3[9 + k] = d[k] - (p[0] * W3[k] + p[1] * W3[3 + k] + p[2] * W3[6 + k]);
      }
      for (const l of this.lights) { evalKeys(l.keys, t, d.subarray(0, 3), l.keys[l.keys.length - 1].frame, true); l.pos = [d[0], d[1], d[2]]; }
      const cs = this.camsrc, e = new Float64Array(3), g = new Float64Array(3);
      evalKeys(cs.pos, t, e, cs.pos[cs.pos.length - 1].frame, true); evalKeys(cs.target, t, g, cs.target[cs.target.length - 1].frame, true);
      c.pos.set(e);
      let fx = g[0] - e[0], fy = g[1] - e[1], fz = g[2] - e[2]; const fl = Math.hypot(fx, fy, fz) || 1; fx /= fl; fy /= fl; fz /= fl;
      let rx = fy, ry = -fx, rz = 0; const rl = Math.hypot(rx, ry, rz) || 1; rx /= rl; ry /= rl; rz /= rl;   // right = forward x up(0,0,1)
      const dx = fy * rz - fz * ry, dy = fz * rx - fx * rz, dz = fx * ry - fy * rx;                          // down = forward x right
      const R = c.R; R[0] = rx; R[1] = ry; R[2] = rz; R[3] = dx; R[4] = dy; R[5] = dz; R[6] = fx; R[7] = fy; R[8] = fz;
      const fov = cs.fov.length ? cs.fov[0].value : 0.8; c.zx = c.zy = W * 0.5 / Math.tan(fov * 0.5);
    } else { // lwe: LightWave handedness is flipped on z (world = S R^T S); camera position is stored negated
      for (const o of this.objects) {
        evalKeys(o.keys, t, d, o.keys[o.keys.length - 1].frame);
        const R = new Float64Array(9); hpbToMatrix(d[3], d[4], -d[5], R); const W3 = o.W;
        // W3 rows (row vector convention, w = p * W3): S R^T S  ->  W3[r][k] = S_r S_k R[k][r] ... R[k*3+r]
        const sg = [1, 1, -1];
        for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) W3[r * 3 + k] = sg[r] * sg[k] * R[r * 3 + k];
        W3[9] = d[0]; W3[10] = d[1]; W3[11] = -d[2];
      }
      for (const l of this.lights) { evalKeys(l.keys, t, d, l.keys[l.keys.length - 1].frame); l.pos = [d[0], d[1], -d[2]]; }
      const ck = this.camsrc.keys; evalKeys(ck, t, d, ck[ck.length - 1].frame);
      c.pos[0] = d[0]; c.pos[1] = d[1]; c.pos[2] = d[2];
      const R = new Float64Array(9); hpbToMatrix(d[3], d[4], -d[5], R);
      // camera axes as rows of R^T with the original's sign convention (verified numerically): rows = columns of [R with y column negated]
      c.R.set([R[0], R[3], R[6], -R[1], -R[4], -R[7], R[2], R[5], R[8]]);
      c.zx = W * 0.5 / (320 / 718.74); c.zy = c.zx * 1.2;
    }
  }
}

// ----------------------------------------------------------------------------------------------- loading
const lc = (s) => s.toLowerCase();
export function loadScene(file, assets) {
  const f = lc(file), bin = assets.bin(f), u8 = new Uint8Array(bin.buffer, bin.byteOffset, bin.byteLength);
  let S;
  if (f.endsWith('.exp')) {
    const d = parseEXP(u8); S = new Scene(f, 'exp'); S.duration = d.duration;
    S.materials = d.materials.map((m) => ({ name: m.name, tex: m.tex || [m.texture], mode: m.mode, modeCode: m.mode | (m.tex[1] ? 0x20 : 0) | (m.tex[2] ? 0x40 : 0) | (m.tex[3] ? 0x10 : 0) | (m.tex[4] ? 0x80 : 0), opacity: m.opacity, ambient: m.ambient, diffuse: m.diffuse, specular: m.specular, shininess: m.shininess, flags: m.flags }));
    for (const o of d.objects) {
      const so = new SceneObject(o.name); so.kind = 'exp'; so.keys = o.pos.map((k) => ({ frame: k.frame, v: k.v, tension: k.tension, continuity: k.continuity, bias: 0, linear: k.linear }));
      so.M = o.tm.slice(0, 9); so.pivot = o.pivot.slice(); const t = o.tm.slice(9, 12), iM = inv3(so.M), n = o.positions.length / 3;
      so.P0 = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const x = o.positions[i * 3] - t[0], y = o.positions[i * 3 + 1] - t[1], z = o.positions[i * 3 + 2] - t[2]; for (let k = 0; k < 3; k++) so.P0[i * 3 + k] = x * iM[k] + y * iM[3 + k] + z * iM[6 + k]; }
      so.P = Float32Array.from(so.P0); so.idx = o.indices; so.tmat = o.tmat; so.N = computeNormals(so.P0, so.idx, false);
      if (o.uvs && o.triUV) { // uv per polygon corner (the original copies them into the vertex record just before drawing each polygon)
        so.UVc = new Float32Array(o.indices.length * 2);
        for (let k = 0; k < o.indices.length; k++) { const u = o.triUV[k]; so.UVc[k * 2] = o.uvs[u * 2] * 256; so.UVc[k * 2 + 1] = -o.uvs[u * 2 + 1] * 256; }
      }
      S.objects.push(so);
    }
    for (const l of d.lights) S.lights.push({ name: l.name, color: l.color, pos: [0, 0, 0], keys: l.pos.map((k) => ({ frame: 0, v: k.v, tension: 0, continuity: 0, bias: 0, linear: false })) });
    const c = d.cameras[0], kk = (a) => a.map((k) => ({ frame: k.frame, v: k.v, tension: k.tension, continuity: k.continuity, bias: 0, linear: k.linear }));
    S.camsrc = { pos: kk(c.pos), target: kk(c.target), fov: c.fov, roll: c.roll };
    S.spin = f === 'tentacle.exp' ? (globalThis.__tourSpin ?? 1.5819e-4) : 0;
  } else {
    const d = parseLWE(u8); S = new Scene(f, 'lwe'); S.duration = d.duration;
    for (const o of d.objects) {
      const nm = o.name.toLowerCase().replace(/\.lwo$/, '.lwv'), v = parseLWV(assets.bin(nm));
      const so = new SceneObject(o.name); so.kind = 'lwe'; so.keys = o.keys; so.P0 = v.positions; so.P = Float32Array.from(v.positions); so.idx = v.indices; so.tmat = v.tsurf;
      so.UV = new Float32Array(v.uv.length); for (let i = 0; i < v.uv.length; i++) so.UV[i] = v.uv[i] * 255;
      so.N = computeNormals(so.P0, so.idx, true); S.objects.push(so);
      if (o.modifier) so.mod = parseModifier(o.modifier);
      for (const s of v.surfaces) S.materials.push({ name: s.name, tex: [s.texture], mode: 3, opacity: 255, color: s.color });
    }
    S.nulls = d.nulls;
    for (const l of d.lights) S.lights.push({ name: 'light', color: l.color, pos: [0, 0, 0], keys: l.keys });
    S.camsrc = d.cameras[0];
  }
  return S;
}

// ----------------------------------------------------------------------------------------------- per frame vertex pipeline
/** Transform all vertices of `o` into camera space + projection + shading inputs. Returns arrays in o.vt (allocated once per mesh version). */
export function transformObject(S, o) {
  const n = o.P.length / 3;
  let V = o.vt; if (!V || V.n !== n) V = o.vt = { n, cx: new Float32Array(n), cy: new Float32Array(n), cz: new Float32Array(n), sx: new Float32Array(n), sy: new Float32Array(n), u: new Float32Array(n), v: new Float32Array(n), u2: new Float32Array(n), v2: new Float32Array(n), li: new Float32Array(n), ox: new Float32Array(n), oy: new Float32Array(n), oz: new Float32Array(n) };
  const c = S.cam, R = c.R, W = o.W, P = o.P, N = o.N, hw = S.W * 0.5, hh = S.H * 0.5;
  // combined 3x4: cam = R * (p*W3 + t - campos)
  const t0 = W[9] - c.pos[0], t1 = W[10] - c.pos[1], t2 = W[11] - c.pos[2];
  const m = new Float64Array(12);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) m[r * 4 + k] = R[r * 3] * W[k] + R[r * 3 + 1] * W[3 + k] + R[r * 3 + 2] * W[6 + k]; // m[r][k] multiplies p[?]: see below
  // above computed with (W row k ... ) -> build properly: cam_r = sum_j R[r][j] * (sum_i p_i W[i][j] + t_j) => coefficient of p_i = sum_j R[r][j] W[i][j]
  for (let r = 0; r < 3; r++) { for (let i = 0; i < 3; i++) m[r * 4 + i] = R[r * 3] * W[i * 3] + R[r * 3 + 1] * W[i * 3 + 1] + R[r * 3 + 2] * W[i * 3 + 2]; m[r * 4 + 3] = R[r * 3] * t0 + R[r * 3 + 1] * t1 + R[r * 3 + 2] * t2; }
  o.cm = m;
  const mat = S.materials[o.tmat && o.tmat.length ? o.tmat[0] : 0] || {}, mode = o.mode = mat.modeCode || mat.mode;
  const low = mode & 15;
  // lights in object space (for smooth lighting)
  const ol = S.lights.map((l) => { // light world pos -> object space: p = (w - t) * inv(W3)
    const iW = inv3([W[0], W[1], W[2], W[3], W[4], W[5], W[6], W[7], W[8]]); const x = l.pos[0] - W[9], y = l.pos[1] - W[10], z = l.pos[2] - W[11];
    return [x * iW[0] + y * iW[3] + z * iW[6], x * iW[1] + y * iW[4] + z * iW[7], x * iW[2] + y * iW[5] + z * iW[8]];
  });
  for (let i = 0; i < n; i++) {
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    const X = m[0] * x + m[1] * y + m[2] * z + m[3], Y = m[4] * x + m[5] * y + m[6] * z + m[7], Z = m[8] * x + m[9] * y + m[10] * z + m[11];
    V.cx[i] = X; V.cy[i] = Y; V.cz[i] = Z;
    if (Z > 0) { const iz = 1 / Z; V.sx[i] = hw + X * c.zx * iz; V.sy[i] = hh + Y * c.zy * iz; }
    const nx = N[i * 3], ny = N[i * 3 + 1], nz = N[i * 3 + 2];
    // env map: unit camera-space normal -> texel coords
    let a = m[0] * nx + m[1] * ny + m[2] * nz, b = m[4] * nx + m[5] * ny + m[6] * nz, cc = m[8] * nx + m[9] * ny + m[10] * nz; const l = Math.hypot(a, b, cc) || 1;
    V.u[i] = 127 * a / l + 128; V.v[i] = 127 * b / l + 128;
    V.ox[i] = x; V.oy[i] = y; V.oz[i] = z;
  }
  o.vtLights = ol;
  return V;
}
