// x87.js - tiny exact emulation of the x87 extended format (64 bit mantissa) for the few spots where the original's float32 results
// depend on the 80 bit intermediate (a double + Math.fround differs from fstp-of-an-extended in rare tie cases).  BigInt based: use it
// for per-frame constants, not per pixel.  Values are {m: BigInt mantissa, e: exponent} = m * 2^e.
const f32 = Math.fround;
const dv = new DataView(new ArrayBuffer(8));
export const ex = (x) => {                                   // double -> {m, e}: x = m * 2^e exactly
  if (x === 0) return { m: 0n, e: 0 };
  dv.setFloat64(0, x); const hi = dv.getUint32(0), lo = dv.getUint32(4);
  let e = (hi >>> 20) & 0x7ff, m = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  if (e === 0) e = 1; else m |= 1n << 52n;
  return { m: hi >>> 31 ? -m : m, e: e - 1075 };
};
export const rnd = (v, bits) => {                            // round to `bits` significant bits, nearest even
  let m = v.m < 0n ? -v.m : v.m; const L = m.toString(2).length;
  if (L <= bits) return v;
  const sh = BigInt(L - bits), q = m >> sh, r = m & ((1n << sh) - 1n), h = 1n << (sh - 1n);
  m = r > h || (r === h && (q & 1n)) ? q + 1n : q;
  return { m: v.m < 0n ? -m : m, e: v.e + Number(sh) };
};
export const X64 = (v) => rnd(v, 64);
export const mul = (a, b) => X64({ m: a.m * b.m, e: a.e + b.e });
export const add = (a, b) => { const e = Math.min(a.e, b.e); return X64({ m: (a.m << BigInt(a.e - e)) + (b.m << BigInt(b.e - e)), e }); };
export const neg = (a) => ({ m: -a.m, e: a.e });
export const toF32 = (a) => { const r = rnd(a, 24); return Number(r.m) * 2 ** r.e; };   // fstp dword
export const near32 = (v) => f32(v * (1 + 1e-9)) !== f32(v * (1 - 1e-9));          // is the float32 rounding of v in doubt?
export const num = (a) => Number(a.m) * 2 ** a.e;   // exact when it fits a double (<= 53 significant bits), else rounded
