globalThis.__tourSpin = 1.5819e-4;
// tools/test-scene3d-render.mjs - whole-frame comparison of the JS `scene` effect with the original (frames rendered by re/dt_scene3d/golden3d.py on a black SCREEN).
// usage: node tools/test-scene3d-render.mjs [name ...] [--png]     (needs build/raw: python3 tools/mkraw.py)
import fs from 'node:fs';
import { nodeAssets } from './render.mjs';
import { FX, Buf } from '../docs/js/core.js';
import '../docs/js/fx/scene3d.js';
const R = new URL('../re/dt_scene3d/ref/', import.meta.url);
const cases = { unrdisp: ['unrdisp.lwe 30.0 0.0', 30, 0], tentacle: ['tentacle.exp 50.0 80.0', 50, 80], box3: ['box3.exp 20.0 0.0', 20, 0], hires: ['hires.exp 20.0 0.0', 20, 0], camel8: ['camel8.exp 20.0 0.0', 20, 0] };
const assets = await nodeAssets(); const png = process.argv.includes('--png');
const names = process.argv.slice(2).filter((a) => !a.startsWith('--')); if (!names.length) names.push(...Object.keys(cases));
for (const nm of names) {
  const [params] = cases[nm]; const scr = new Buf('SCREEN', 640, 480, 32);
  const ctx = { assets, frame: 0, render: true, engine: { events: [] } }, ev = { inputs: [scr], outputs: [scr], local: 0, name: 'x' }, impl = FX.get('scene');
  const st = impl.init(params, ev, ctx); ctx.frame = 0; impl.play(st, ev, ctx);
  for (const T of (process.env.TS ? process.env.TS.split(",").map(Number) : [100, 200, 300])) {
    const f = new URL(`${nm}/f${String(T).padStart(5, '0')}.raw`, R); if (!fs.existsSync(f)) continue;
    const ref = new Uint32Array(fs.readFileSync(f).buffer.slice(0)); scr.data.fill(0); ctx.frame = T; const t0 = performance.now(); impl.run(st, ev, ctx); const ms = performance.now() - t0;
    let same = 0, sum = [0, 0, 0], mx = 0, cov = 0;
    for (let i = 0; i < ref.length; i++) {
      const a = scr.data[i], b = ref[i]; if (b) cov++; if (a === b) same++;
      for (let c = 0; c < 3; c++) { const d = Math.abs(((a >> (c * 8)) & 255) - ((b >> (c * 8)) & 255)); sum[c] += d; if (d > mx) mx = d; }
    }
    console.log(`${nm} T=${T}: identical ${(100 * same / ref.length).toFixed(2)}%  mean|err| RGB ${sum.map((s) => (s / ref.length).toFixed(3)).join(' ')} max ${mx}  (ref coverage ${(100 * cov / ref.length).toFixed(1)}%)  ${ms.toFixed(0)} ms`);
    if (png) fs.writeFileSync(`/tmp/claude-1000/-home-gautier-SynologyDrive-code-current-demoports/4a6b9f3e-e5e0-45de-8028-f20db5171c61/scratchpad/js_${nm}_${T}.ppm`, Buffer.concat([Buffer.from('P6\n640 480\n255\n'), Buffer.from(Uint8Array.from({ length: 640 * 480 * 3 }, (_, i) => { const v = scr.data[(i / 3) | 0]; return (v >> (16 - 8 * (i % 3))) & 255; }))]));
  }
}
