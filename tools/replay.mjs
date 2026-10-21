// node tools/replay.mjs <goldenDir> <outDir> [dt=0.033333]  - continuous replay of the port, saving a PPM whenever the time reaches a golden frame (names f_<sec>.png)
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { nodeAssets, loadTimeline, writePPM } = await import(root + '/tools/render.mjs');
const { Engine } = await import(root + '/docs/js/engine.js');
const [gdir, odir] = [process.argv[2], process.argv[3]]; const dt = +(process.argv[4] || 0.033333);
fs.mkdirSync(odir, { recursive: true });
const targets = fs.readdirSync(gdir).filter((f) => /^f_[\d.]+\.png$/.test(f)).map((f) => ({ f, t: +f.slice(2, -4) })).sort((a, b) => a.t - b.t);
const assets = await nodeAssets(); const eng = new Engine(assets, assets.text('script.unr'), loadTimeline());
let ti = 0; const t0 = Date.now();
for (let k = 0; ti < targets.length; k++) {
  const tt = k * dt; const scr = eng.update(tt);
  if (tt >= targets[ti].t - dt / 2) { writePPM(scr, path.join(odir, targets[ti].f.replace('.png', '.ppm'))); ti++; }
  if (eng.ended && ti >= targets.length) break;
}
console.log('saved', ti, 'frames in', ((Date.now() - t0) / 1000).toFixed(0), 's');
