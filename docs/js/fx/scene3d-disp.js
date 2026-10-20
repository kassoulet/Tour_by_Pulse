// scene3d-disp.js - the LightWave "displacement map" object modifier of .lwe files (chunk 0x0b, class at 0x118498/0x118b0c, projection code 0x156568/0x156414).
// Used by unrdisp.lwe: every frame the vertices are moved along the direction (v - NullPos) by  map[sphericalProjection(v - NullPos)] * amp/255, normals are rebuilt.
import { evalKeys } from './scene3d-anim.js';
import { computeNormals } from './scene3d-scene.js';

/** decode the 75 byte modifier record: name[13], 46 bytes of parameters, f32 amplitude, char target[12] */
export function parseModifier(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), p = 13, f = (o) => dv.getFloat32(p + o, true);
  let nm = ''; for (let i = 0; i < 13 && u8[i]; i++) nm += String.fromCharCode(u8[i]);
  let tg = ''; for (let i = 0; i < 12 && u8[p + 0x32 + i]; i++) tg += String.fromCharCode(u8[p + 0x32 + i]);
  return { tex: nm.toLowerCase(), size: [f(0), f(4), f(8)], center: [f(0xc), f(0x10), f(0x14)], tileU: f(0x24), tileV: f(0x28), type: u8[p + 0x2c], axis: u8[p + 0x2d], amp: f(0x2e) / 255, target: tg };
}

// 0x156414: longitude / latitude of (a,b,c)
function sph(a, b, c) {
  if (a === 0 && c === 0) return [0, b < 0 ? -Math.PI / 2 : b > 0 ? Math.PI / 2 : 0];
  let lon; if (c === 0) lon = a < 0 ? -Math.PI / 2 : Math.PI / 2; else { lon = -Math.atan(a / c); if (c < 0) lon += Math.PI; }
  const r = Math.hypot(a, c); return [lon, Math.atan(b / r)];
}

export function displaceLWE(S, o, ctx) {
  const m = o.mod; if (!m) return;
  if (!m.map) { const im = ctx.assets.image(m.tex); m.map = new Uint8Array(65536); for (let i = 0; i < 65536; i++) m.map[i] = im.rgb[i] & 255; }
  const nl = S.nulls.find((q) => q.name === m.target) || S.nulls[0], d = new Float64Array(6);
  if (nl) evalKeys(nl.keys, S.time, d, nl.keys[nl.keys.length - 1].frame);
  const P0 = o.P0, P = o.P, n = P.length / 3;
  if (m.type !== 2 || m.axis !== 0x0b) { if (!m.warned) { m.warned = true; console.warn('scene3d: displacement type', m.type, 'axis', m.axis, 'not implemented'); } return; }
  const fr = Math.fround, d0 = fr(d[0]), d1 = fr(d[1]), d2 = fr(d[2]), PI = Math.PI;
  for (let i = 0; i < n; i++) {
    const x = P0[i * 3], y = P0[i * 3 + 1], z = P0[i * 3 + 2], qx = fr(x - d0), qy = fr(y - d1), qz = fr(z - d2);
    let [lon, lat] = sph(-qx, qy, qz); lon = fr(lon); lat = fr(lat);
    let u = fr(1 - fr(lon * 0.15915494309189535)), v = fr(0.5 - fr(lat * 0.3183098861837907));
    u = fr(fr(u - Math.floor(u)) * m.tileU); v = fr(fr(v - Math.floor(v)) * m.tileV);
    const h = m.map[(((fr(v * 255)) | 0) & 255) << 8 | (((fr(u * 255)) | 0) & 255)], l = Math.hypot(qx, qy, qz) || 1, s = h * m.amp / l;
    P[i * 3] = x + qx * s; P[i * 3 + 1] = y + qy * s; P[i * 3 + 2] = z + qz * s;
  }
  o.N = computeNormals(P, o.idx, true);
}
