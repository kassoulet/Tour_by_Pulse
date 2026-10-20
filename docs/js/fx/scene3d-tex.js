// scene3d-tex.js - material set-up of the TOUR scene renderer: converts the PNG / JPG textures into the tables used by the span fillers
// (the original builds them in matmgr.c at load time: 0x11e3xx / 0x11eXXX / 0x1570c0).  Formulas fitted to dumps of the original tables, see re/scene3d.md.
import { T, fillENV32, fillENV8, fillLIT8, fillDUAL, fillGLASS } from './scene3d-raster.js';

const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
// lit colour ramp of the smooth shaded material (camel8): R channel of the original 64K table [light][texel] for a white texel (W) and a black texel (S = specular only)
const CAMEL_W = 'JCQkJCQkJCQkJCQkJCQkJCQlJicnKCkqKywsLS4vMDAxMjM0NTU2Nzg5OTo7PD0+Pj9AQUJCQ0RFRkdHSElKS0xMTU5PUFBRUlNUVVVWV1hZWVpbXF1eXl9gYWJiY2RlZmdnaGlqa2tsbW5vcHBxcnN0dXV2d3h5eXp7fH1+fn+AgYKCg4SFhoeHiImKi4uMjY6PkJCRkpOUlZWWl5iZmZqbnJ2enp+goaKio6SlpqenqKmqq6usra6vsLCxsrO0tLW2t7i5ubq7vL2+vr/AwcLDxMTFxsfIycrLzM7P0NLT1dfZ3N7i5enu9Pv//////////////////////////w==';
const CAMEL_S = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQEBAQEBAgICAwQEBQcICgwOERQYHSMqMjxIVmd7k6/R+f///////////w==';

const cache = new Map();
const lum63 = (r, g, b) => Math.floor((r + g + b) / 3 * 63 / 255);

/** returns {code, kind, nattr, fill, bind(), amb, lscale, lmax, S} for a material; cached per scene+material. */
export function prepareMaterial(ctx, S, mat, o) {
  const key = S.file + '/' + (mat.name || '') + '/' + o.name; let p = cache.get(key); if (p) { p.S = S; return p; }
  const code = mat.modeCode || mat.mode, assets = ctx.assets; p = { code, S };
  const idx = (n) => assets.indexed(n);
  if (S.kind === 'lwe' || (code & 0xff) === 3) {
    const im = assets.image(mat.tex[0]); const t32 = new Uint32Array(65536); t32.set(im.rgb.subarray(0, 65536));
    p.kind = 'env32'; p.nattr = 2; p.fill = fillENV32; p.bind = () => { T.tex32 = t32; };
  } else if (code === 4) {
    const ix = idx(mat.tex[0]), pal = new Uint32Array(256); for (let i = 0; i < 256; i++) pal[i] = ((ix.pal[i * 3] & 0xfc) << 16) | ((ix.pal[i * 3 + 1] & 0xfc) << 8) | (ix.pal[i * 3 + 2] & 0xfc);
    p.kind = 'env8'; p.nattr = 2; p.fill = fillENV8; p.bind = () => { T.tex8 = ix.data; T.pal32 = pal; };
  } else if (code === 2) {
    const ix = idx(mat.tex[0]), W = b64(CAMEL_W), Sp = b64(CAMEL_S), lut = new Uint32Array(65536);
    for (let L = 0; L < 256; L++) for (let t = 0; t < 256; t++) {
      const f = (c) => Math.min(255, Math.round(ix.pal[t * 3 + c] / 255 * (W[L] - Sp[L]) + Sp[L]));
      lut[(L << 8) | t] = (f(0) << 16) | (f(1) << 8) | f(2);
    }
    p.kind = 'lit8'; p.nattr = 3; p.fill = fillLIT8; p.lscale = 240 / 1.04; p.amb = 16 / p.lscale; p.lmax = 254;
    p.bind = () => { T.tex8 = ix.data; T.lut2 = lut; };
  } else if (code === 0x84) {
    const a = idx(mat.tex[0]), b = idx(mat.tex[4]), lut = new Uint32Array(65536);
    for (let h = 0; h < 256; h++) for (let l = 0; l < 256; l++) {
      const f = (c) => Math.max(0, Math.min(255, Math.round(0.746 * (b.pal[h * 3 + c] + a.pal[l * 3 + c]) - 1.6)));
      lut[(h << 8) | l] = (f(0) << 16) | (f(1) << 8) | f(2);
    }
    p.kind = 'dual'; p.nattr = 4; p.fill = fillDUAL; p.bind = () => { T.tex8 = a.data; T.tex8b = b.data; T.lut = lut; };
  } else if (code === 0x24) {
    const a = idx(mat.tex[0]), b = idx(mat.tex[1]), c32 = new Uint32Array(65536), al = new Uint8Array(65536), mul = new Uint8Array(65536);
    const palA = new Uint8Array(256); for (let i = 0; i < 256; i++) palA[i] = lum63(b.pal[i * 3], b.pal[i * 3 + 1], b.pal[i * 3 + 2]);
    for (let i = 0; i < 65536; i++) {
      const q = palA[b.data[i]]; al[i] = q; const c = a.data[i];
      c32[i] = ((Math.floor(a.pal[c * 3] * q / 63) << 16) | (Math.floor(a.pal[c * 3 + 1] * q / 63) << 8) | Math.floor(a.pal[c * 3 + 2] * q / 63)) >>> 0;
    }
    for (let q = 0; q < 64; q++) for (let d = 0; d < 256; d++) mul[(q << 8) | d] = Math.floor(d * (63 - q) / 63);
    p.kind = 'glass'; p.nattr = 2; p.fill = fillGLASS; p.bind = () => { T.c32 = c32; T.alpha = al; T.alphaMul = mul; };
  } else throw new Error('scene3d: unsupported material mode 0x' + code.toString(16));
  cache.set(key, p); return p;
}
