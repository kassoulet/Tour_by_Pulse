// scene3d-raster.js - software triangle fillers of the TOUR `scene` renderer (32 bit SCREEN target).
// The original generates each filler by patching immediates into a template (self-modifying code, obj2 / 0x15xxxx-0x16xxxx, see re/scene3d.md):
// the setup computes screen space plane gradients of the texture coordinates (affine, no perspective correction), walks the edges with 16.16 fixed
// point (start x = ceil(x - 1/4096) = (fixed+0xfff0)>>16, end x = (fixed+0xffe0)>>16, rows likewise) and the inner loop adds the gradients with
// `add esi,imm / adc cl,imm` (the 8-bit integer parts wrap, so textures repeat every 256 texels).  Here the same sampling positions are used with
// floating point plane equations; the inner loops are specialised per material mode.

export const MODE = { ENV32: 3, ENV8: 4, LIT8: 2, DUAL: 0x84, GLASS: 0x24 };

// one triangle: screen coords x[3],y[3] and K attribute planes (arrays a[k][3]); `span(y, xs, xe, attrAt)` is called per scanline through the
// per-mode closure.  To avoid per-pixel closures every filler is a dedicated function below that reads the plane coefficients from `P`.
const P = new Float64Array(64);   // plane coefficients: for attribute k: [k*3] = value at (0,0), [k*3+1] = d/dx, [k*3+2] = d/dy
let planeOk = false;

function planes(x0, y0, x1, y1, x2, y2, k, a0, a1, a2, o) { // attribute a over the triangle -> value(x,y) = o0 + o1*x + o2*y
  const det = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
  const dx = ((a1 - a0) * (y2 - y0) - (a2 - a0) * (y1 - y0)) / det, dy = ((a2 - a0) * (x1 - x0) - (a1 - a0) * (x2 - x0)) / det;
  P[o] = a0 - dx * x0 - dy * y0; P[o + 1] = dx; P[o + 2] = dy;
}

export const TUNE = { epl: 0xfff0 / 65536, epr: 0xffe0 / 65536, epy: 0, ox: 0, oy: 0 };
const EPS_L = 0xfff0 / 65536, EPS_R = 0xffe0 / 65536; // ceil offsets of the original (16 and 32 units of 1/65536 below 1)

/** Rasterise a triangle. `fill(dst, rowOff, xs, xe, y)` is the per-mode span function reading P. attrs = flat [a0,a1,a2, b0,b1,b2, ...] */
export function drawTriangle(dst, W, H, x0, y0, x1, y1, x2, y2, attrs, nattr, fill) {
  // degenerate (the original skips |area| < ~1.4e-4 of its normalised cross product)
  x0 += TUNE.ox; x1 += TUNE.ox; x2 += TUNE.ox; y0 += TUNE.oy; y1 += TUNE.oy; y2 += TUNE.oy;
  const det = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
  if (!(Math.abs(det) > 1e-4)) return;
  for (let k = 0; k < nattr; k++) planes(x0, y0, x1, y1, x2, y2, k, attrs[k * 3], attrs[k * 3 + 1], attrs[k * 3 + 2], k * 3);
  // sort by y
  let ax = x0, ay = y0, bx = x1, by = y1, cx = x2, cy = y2, t;
  if (ay > by) { t = ax; ax = bx; bx = t; t = ay; ay = by; by = t; }
  if (by > cy) { t = bx; bx = cx; cx = t; t = by; by = cy; cy = t; }
  if (ay > by) { t = ax; ax = bx; bx = t; t = ay; ay = by; by = t; }
  let ys = Math.ceil(ay - TUNE.epy); const ye = Math.ceil(cy - TUNE.epy);
  if (ys < 0) ys = 0; const yend = Math.min(ye, H);
  const dac = (cx - ax) / (cy - ay || 1), dab = (bx - ax) / (by - ay || 1), dbc = (cx - bx) / (cy - by || 1);
  for (let y = ys; y < yend; y++) {
    const xl0 = ax + (y - ay) * dac;                       // long edge a-c
    const xs0 = y < by ? ax + (y - ay) * dab : bx + (y - by) * dbc; // short edges
    let xl, xr; if (xl0 < xs0) { xl = xl0; xr = xs0; } else { xl = xs0; xr = xl0; }
    let xs = Math.ceil(xl - (1 - TUNE.epl)), xe = Math.ceil(xr - (1 - TUNE.epr));
    if (xs < 0) xs = 0; if (xe > W) xe = W;
    if (xe > xs) fill(dst, y * W, xs, xe, y);
  }
}

// ----------------------------------------------------------------------------------------------- per mode span fillers
// textures are set through the `T` object (see scene3d.js): T.tex32 (Uint32Array 65536), T.tex8, T.pal32, T.lut, T.tex8b, T.c32, T.alpha, T.blend
export const T = { tex32: null, tex8: null, pal32: null, lut2: null, tex8b: null, c32: null, alpha: null, alphaMul: null, opa: 255 };

export function fillENV32(dst, ro, xs, xe, y) {   // mode 3: dst = tex32[(v<<8)|u]   (add esi,imm; adc cl / add ebx,imm; adc ch ; mov [edi+edx*4],eax)
  const tex = T.tex32; const u0 = P[0] + P[2] * y, du = P[1], v0 = P[3] + P[5] * y, dv = P[4];
  for (let x = xs; x < xe; x++) dst[ro + x] = tex[((((v0 + dv * x + 65536) | 0) & 255) << 8) | (((u0 + du * x + 65536) | 0) & 255)];
}
export function fillENV8(dst, ro, xs, xe, y) {    // mode 4: dst = pal32[tex8[(v<<8)|u]]
  const tex = T.tex8, pal = T.pal32; const u0 = P[0] + P[2] * y, du = P[1], v0 = P[3] + P[5] * y, dv = P[4];
  for (let x = xs; x < xe; x++) dst[ro + x] = pal[tex[((((v0 + dv * x + 65536) | 0) & 255) << 8) | (((u0 + du * x + 65536) | 0) & 255)]];
}
export function fillLIT8(dst, ro, xs, xe, y) {    // mode 2: dst = lut2[(L<<8)|tex8[(v<<8)|u]]   (L = interpolated light 0..255)
  const tex = T.tex8, lut = T.lut2; const u0 = P[0] + P[2] * y, du = P[1], v0 = P[3] + P[5] * y, dv = P[4], l0 = P[6] + P[8] * y, dl = P[7];
  for (let x = xs; x < xe; x++) {
    let l = Math.floor(l0 + dl * x); l = l < 0 ? 0 : l > 255 ? 255 : l;
    dst[ro + x] = lut[(l << 8) | tex[((((v0 + dv * x + 65536) | 0) & 255) << 8) | (((u0 + du * x + 65536) | 0) & 255)]];
  }
}
export function fillDUAL(dst, ro, xs, xe, y) {    // mode 0x84: two texture coordinate sets; dst = lut[(tex2[uv2]<<8) | tex1[uv1]]
  const t1 = T.tex8, t2 = T.tex8b, lut = T.lut; const a0 = P[0] + P[2] * y, da = P[1], b0 = P[3] + P[5] * y, db = P[4], c0 = P[6] + P[8] * y, dc = P[7], d0 = P[9] + P[11] * y, dd = P[10];
  for (let x = xs; x < xe; x++) {
    const i1 = ((((b0 + db * x + 65536) | 0) & 255) << 8) | (((a0 + da * x + 65536) | 0) & 255), i2 = ((((d0 + dd * x + 65536) | 0) & 255) << 8) | (((c0 + dc * x + 65536) | 0) & 255);
    dst[ro + x] = lut[(t2[i2] << 8) | t1[i1]];
  }
}
export function fillGLASS(dst, ro, xs, xe, y) {   // mode 0x24: alpha blend of c32[uv] (colour, pre-scaled by alpha) over the destination: dst*(64-a)/64 + c32
  const c32 = T.c32, al = T.alpha, mul = T.alphaMul; const u0 = P[0] + P[2] * y, du = P[1], v0 = P[3] + P[5] * y, dv = P[4];
  for (let x = xs; x < xe; x++) {
    const i = ((((v0 + dv * x + 65536) | 0) & 255) << 8) | (((u0 + du * x + 65536) | 0) & 255), row = al[i] << 8, d = dst[ro + x];
    const r = mul[row + ((d >> 16) & 255)], g = mul[row + ((d >> 8) & 255)], b = mul[row + (d & 255)];
    dst[ro + x] = (c32[i] + ((r << 16) | (g << 8) | b)) >>> 0;   // packed add, no saturation (as the original)
  }
}
