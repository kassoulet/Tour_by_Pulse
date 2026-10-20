// tools/test-scene3d.mjs - compares the JS vertex pipeline (scene3d-scene.js) with ground truth dumped from the original
// (re/dt_scene3d/dumpverts.py -> re/dt_scene3d/gt/*.json).  usage: node tools/test-scene3d.mjs
import fs from 'node:fs';
import { loadScene, transformObject } from '../docs/js/fx/scene3d-scene.js';
import { displaceLWE } from '../docs/js/fx/scene3d-disp.js';
const A = new URL('../docs/assets/', import.meta.url), G = new URL('../re/dt_scene3d/gt/', import.meta.url);
const assets = { bin: (n) => new Uint8Array(fs.readFileSync(new URL(n.toLowerCase(), A))) };
import { execSync } from 'node:child_process';
globalThis.__img = (b) => { const f = '/tmp/_img.png'; fs.writeFileSync(f, b); const raw = execSync(`python3 -c "from PIL import Image;import sys;sys.stdout.buffer.write(Image.open('${f}').convert('RGB').tobytes())"`, { maxBuffer: 1 << 26 }); const rgb = new Uint32Array(raw.length / 3); for (let i = 0; i < rgb.length; i++) rgb[i] = (raw[i * 3] << 16) | (raw[i * 3 + 1] << 8) | raw[i * 3 + 2]; return { rgb }; };
const cases = [['tentacle.exp', 'tentacle_100'], ['tentacle.exp', 'tentacle_200'], ['unrdisp.lwe', 'unrdisp_100'], ['unrdisp.lwe', 'unrdisp_250'], ['box3.exp', 'box3_100'], ['hires.exp', 'hires_100'], ['camel8.exp', 'camel8_100']];
let bad = 0;
for (const [file, gtn] of cases) {
  const p = new URL(gtn + '.json', G); if (!fs.existsSync(p)) { console.log('missing', gtn); continue; }
  const gt = JSON.parse(fs.readFileSync(p)), S = loadScene(file, assets), o = S.objects[0];
  S.evaluate(gt.time ?? gt.t, 640, 480); const ctx = { assets: { image: (n) => { const b = fs.readFileSync(new URL(n.toLowerCase().replace('.tga', '.png'), A)); return globalThis.__img(b); } } };
  if (o.mod) displaceLWE(S, o, ctx);
  const V = transformObject(S, o), gv = gt.objs[0].verts;
  const err = { cam: 0, scr: 0, nrm: 0, uv: 0, ncount: 0 };
  for (let i = 0; i < gv.length; i++) {
    const g = gv[i]; if (g[10] == null || !(g[10] > 0.5) || g[8] == null) continue; err.ncount++;
    err.cam = Math.max(err.cam, Math.abs(V.cx[i] - g[6]), Math.abs(V.cy[i] - g[7]), Math.abs(V.cz[i] - g[10]) );
    err.scr = Math.max(err.scr, Math.abs(V.sx[i] - g[8]), Math.abs(V.sy[i] - g[9]));
    err.nrm = Math.max(err.nrm, Math.abs(o.N[i * 3] - g[3]), Math.abs(o.N[i * 3 + 1] - g[4]), Math.abs(o.N[i * 3 + 2] - g[5]));
    if (g[11] != null && o.mode & 4) err.uv = Math.max(err.uv, Math.abs(V.u[i] - g[11]), Math.abs(V.v[i] - g[12]));
  }
  console.log(gtn.padEnd(14), 'verts', err.ncount, 'max|err| cam', err.cam.toExponential(2), 'screen', err.scr.toExponential(2), 'normal', err.nrm.toExponential(2), 'envuv', err.uv.toExponential(2));
}
