// node tools/render.mjs <seconds> [out.ppm] [--warm=1.5]   - render the demo at time t headlessly (needs build/raw: python3 tools/mkraw.py)
// If docs/assets/tour3.xm is missing a synthetic timeline is used (--bpm=125 --speed=6, 64 rows/pattern, 40 orders) so the script timing is still approximate.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { Engine, syntheticTimeline } = await import(root + '/docs/js/engine.js');
const { xmTimeline } = await import(root + '/docs/js/xmtime.js');
const { makeAssets } = await import(root + '/docs/js/assets.js');
const { decodeIndexedPng } = await import(root + '/docs/js/png.js');
await import(root + '/docs/js/fx/index.js');
const A = root + '/docs/assets/', R = root + '/build/raw/';

/** node asset loader (same synchronous interface as the browser). */
export async function nodeAssets() {
  const meta = JSON.parse(fs.readFileSync(R + 'meta.json')), imgs = {}, idxs = {}, bins = {}, texts = {};
  for (const f of fs.readdirSync(A)) {
    if (f === 'manifest.json' || f.endsWith('.xm')) continue;
    const b = fs.readFileSync(A + f);
    if (meta[f]) {
      const r = fs.readFileSync(R + f + '.rgb32'); imgs[f] = { w: meta[f][0], h: meta[f][1], rgb: new Uint32Array(r.buffer, r.byteOffset, r.length >> 2).slice() };
      if (f.endsWith('.png')) { const ix = await decodeIndexedPng(new Uint8Array(b)); if (ix) idxs[f] = ix; }
    } else if (f === 'script.unr') texts[f] = b.toString('latin1');
    else bins[f] = new Uint8Array(b);
  }
  return makeAssets({ imgs, idxs, bins, texts });
}
export function loadTimeline() {
  const p = A + 'tour3.xm';
  if (!fs.existsSync(p)) { console.warn('tour3.xm missing: synthetic timeline'); return syntheticTimeline(); }
  const xm = fs.readFileSync(p); return xmTimeline(xm.buffer.slice(xm.byteOffset, xm.byteOffset + xm.length));
}
export function writePPM(scr, out) {
  const hdr = `P6\n${scr.w} ${scr.h}\n255\n`; const px = Buffer.alloc(scr.w * scr.h * 3);
  for (let i = 0; i < scr.data.length; i++) { const v = scr.data[i]; px[i * 3] = (v >> 16) & 255; px[i * 3 + 1] = (v >> 8) & 255; px[i * 3 + 2] = v & 255; }
  fs.writeFileSync(out, Buffer.concat([Buffer.from(hdr), px]));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const assets = await nodeAssets(), tl = loadTimeline();
  const eng = new Engine(assets, assets.text('script.unr'), tl);
  const t = parseFloat(process.argv[2] ?? '0'); const out = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : 'frame.ppm';
  const warm = parseFloat((process.argv.find((a) => a.startsWith('--warm=')) || '--warm=1.5').slice(7));
  const t0 = Date.now(); const scr = eng.seek(t, warm);
  console.log('rendered t=' + t + 's in ' + (Date.now() - t0) + 'ms; duration', tl.duration.toFixed(1), 'end', eng.endTime.toFixed(1));
  writePPM(scr, out);
}
