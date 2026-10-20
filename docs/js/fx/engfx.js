// engfx.js - effects that belong to the engine core of TOUR (re/engine.md): fillbuffer, buffer_and, blit / surfcopy.
// Also exports blitBuf(src,dst), the surface blit used by the `blit` script command (0x10825b in the original).
import { FX } from '../core.js';

// 16->32 expansion tables measured from the original (re/formats.md): r8=floor(r5*255/31), g8=4*g6+floor(g6/24), b8=r8 table
const T5 = new Uint32Array(32), T6 = new Uint32Array(64);
for (let i = 0; i < 32; i++) T5[i] = Math.floor(i * 255 / 31);
for (let i = 0; i < 64; i++) T6[i] = 4 * i + Math.floor(i / 24);

/** Copy src -> dst converting the pixel format like the original (same size assumed; the shorter length wins). */
export function blitBuf(src, dst) {
  if (!src || !dst || src === dst) return;
  const s = src.data, d = dst.data, n = Math.min(s.length, d.length);
  if (src.bpp === dst.bpp) { d.set(n === s.length ? s : s.subarray(0, n)); return; }
  if (src.bpp === 16 && dst.bpp === 32) {
    for (let i = 0; i < n; i++) { const p = s[i]; d[i] = (T5[p >> 11] << 16) | (T6[(p >> 5) & 63] << 8) | T5[p & 31]; }
  } else if (src.bpp === 32 && dst.bpp === 16) {
    for (let i = 0; i < n; i++) { const p = s[i]; d[i] = ((p >> 8) & 0xf800) | ((p >> 5) & 0x7e0) | ((p >> 3) & 31); }
  }
  // 8 bit <-> others: not used by the script (needs a palette); left untouched like an unsupported conversion
}

// fillbuffer (0x10ecd0/0x10ecfc): the parameter is parsed but run() always memsets the output to 0
FX.register('fillbuffer', {
  init: () => ({}),
  run(st, ev) { const o = ev.outputs[0]; if (o) o.data.fill(0); },
});

// buffer_and (0x10ed38/0x10ed68): out[i] &= mask (hex param) over w*h dwords
FX.register('buffer_and', {
  init: (p) => ({ mask: parseInt(p, 16) | 0 }),
  run(st, ev) {
    const i0 = ev.inputs[0], o = ev.outputs[0]; if (!i0 || !o) return;
    const d = new Uint32Array(o.data.buffer, o.data.byteOffset, i0.w * i0.h);
    for (let i = 0; i < d.length; i++) d[i] &= st.mask;
  },
});

const blitFx = { init: () => ({}), run(st, ev) { blitBuf(ev.inputs[0], ev.outputs[0]); } };
FX.register('blit', blitFx);
FX.register('surfcopy', blitFx);
