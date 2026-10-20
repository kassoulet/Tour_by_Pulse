// core.js - shared types for the "Tour" JS port (Pulse, Assembly 1998).
// Effects register themselves in FX; the engine (engine.js) drives them.

/** Pixel buffer. 8 bit = Uint8Array palette index, 16 bit = Uint16Array (RGB565), 32 bit = Uint32Array 0x00RRGGBB.
 *  (Layouts to be confirmed against the original by whoever ports the first effect that touches them - see ENGINE.md.) */
export class Buf {
  constructor(name, w, h, bpp) {
    this.name = name; this.w = w; this.h = h; this.bpp = bpp;
    this.data = bpp === 8 ? new Uint8Array(w * h) : bpp === 16 ? new Uint16Array(w * h) : new Uint32Array(w * h);
    this.pal = null; // optional Uint8Array(768) RGB 0..255 (set by 'palette'-like effects if they need it)
  }
}

/** Effect registry. impl = { init(params, ev, ctx) -> state, run(state, ev, ctx), free?(state, ev, ctx) } */
export const FX = {
  registry: Object.create(null),
  register(name, impl) { this.registry[name.toLowerCase()] = impl; },
  get(name) { return this.registry[name.toLowerCase()]; },
};

// ---- expression evaluator (script params like "1.0-clip10(Frame*0.003)") ----
// Frame = centiseconds since the event started (the original reads the IMS module clock * 100).
const FUNCS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  fabs: Math.abs, abs: Math.abs, sqrt: Math.sqrt, floor: Math.floor, ceil: Math.ceil,
  sqr: (x) => x * x,
  // engine owner: functions of the original evaluator (0x14a570) that were missing: LOG EXP POW (see re/engine.md)
  log: Math.log, exp: Math.exp, pow: (x, y) => Math.fround(Math.pow(Math.fround(x), Math.fround(y))),
  // float32 functions of the original (args pushed as floats, float result): clip10 clip11 clip pow; all other functions work in double
  clip10: (x) => { x = Math.fround(x); return x < 0 ? 0 : x > 1 ? 1 : x; },
  clip11: (x) => { x = Math.fround(x); return x < -1 ? -1 : x > 1 ? 1 : x; },
  clip: (x, a, b) => { x = Math.fround(x); a = Math.fround(a); b = Math.fround(b); return x < a ? a : x > b ? b : x; },
};
const cache = new Map();
/** compileExpr("sin(Frame*0.01)") -> (frame:number) => number.  Function set verified against the original (re/engine.md); DELTA/POS are not implemented (unused by script.unr). */
export function compileExpr(src) {
  let f = cache.get(src);
  if (f) return f;
  const js = src.replace(/[A-Za-z_][A-Za-z_0-9]*/g, (id) => {
    const l = id.toLowerCase();
    if (l === 'frame') return 'Frame';
    if (l === 'pi') return 'Math.fround(Math.PI)'; // PI is a float32 constant in the original
    if (l in FUNCS) return 'F.' + l;
    if (/^e\d*$/i.test(id)) return id;
    throw new Error('unknown identifier in expression: ' + id + ' in ' + src);
  });
  const fn = new Function('F', 'Frame', 'return (' + js + ');');
  // verified against 0x14a570: Frame enters as float32, arithmetic and most functions are double, the final result is stored as float32
  f = (frame) => Math.fround(fn(FUNCS, Math.fround(frame)));
  cache.set(src, f);
  return f;
}
