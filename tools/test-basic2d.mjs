// Differential test of docs/js/fx/basic2d.js (+ engfx blit) against the original.  Reference: cd re/dt_basic2d && $PY gen.py ; then node tools/test-basic2d.mjs
import fs from 'node:fs';
import { FX, Buf } from '../docs/js/core.js';
import '../docs/js/fx/engfx.js';
import '../docs/js/fx/basic2d.js';
const R = new URL('../re/dt_basic2d/ref/', import.meta.url), A = new URL('../docs/assets/', import.meta.url);
const cases = JSON.parse(fs.readFileSync(new URL('index.json', R), 'utf8'));
const ctx = { assets: { bin: (n) => new Uint8Array(fs.readFileSync(new URL(n, A))) }, frame: 0 };
const T = { 8: Uint8Array, 16: Uint16Array, 32: Uint32Array };
const load = (file, bpp, n) => { const b = fs.readFileSync(new URL(file, R)); return new T[bpp](b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
let fails = 0;
for (const c of cases) {
  const bufs = {}; const mk = (o) => { const b = new Buf(o.name, o.w, o.h, o.bpp); return b; };
  const ins = c.inputs.map((i) => { const b = mk(i); b.data.set(load(i.file, i.bpp)); bufs[i.name] = b; return b; });
  const out = bufs[c.output.name] || (bufs[c.output.name] = mk(c.output));
  if (c.pre) out.data.set(load(c.pre, c.output.bpp));
  const ev = { inputs: ins.length ? c.inputs.map((i) => bufs[i.name]) : [], outputs: [out], local: c.local ?? 0 };
  // inputs listed once per distinct buffer in the json; rebuild the original order from the event line (same as inputs order here)
  ctx.frame = c.frame;
  const fx = FX.get(c.effect), st = fx.init(c.params, ev, ctx);
  fx.run(st, ev, ctx);
  const want = load(c.output.file, c.output.bpp), got = out.data, ch = c.output.bpp === 32 ? [0, 8, 16, 24] : c.output.bpp === 16 ? [0, 5, 11] : [0];
  const mask = c.output.bpp === 16 ? [31, 63, 31] : [255, 255, 255, 255];
  let same = 0, mx = [0, 0, 0, 0], sum = [0, 0, 0, 0];
  for (let i = 0; i < want.length; i++) {
    if (got[i] === want[i]) same++;
    ch.forEach((s, k) => { const d = Math.abs(((got[i] >>> s) & mask[k]) - ((want[i] >>> s) & mask[k])); if (d > mx[k]) mx[k] = d; sum[k] += d; });
  }
  const ok = same === want.length; if (!ok) fails++;
  console.log((ok ? 'ok   ' : 'FAIL ') + c.label.padEnd(18) + ' identical ' + (100 * same / want.length).toFixed(4) + '%  max err/ch [' + mx.slice(0, ch.length) + ']  mean [' + sum.slice(0, ch.length).map((v) => (v / want.length).toFixed(4)) + ']');
}
console.log(fails ? fails + ' FAILED' : 'all identical');
process.exit(fails ? 1 : 0);
