// tools/test-scene3d-fx.mjs - displace247 against the original (re/dt_scene3d/disp_gt.py dumps).  usage: node tools/test-scene3d-fx.mjs /tmp/disp_hires.json "hires.exp 20.0 0.0" "wscene1 box02 0.3 -0.04 0.17+0.04*sin(Frame*0.002)" displace247
import fs from 'node:fs';
import { nodeAssets } from './render.mjs';
import { FX, Buf, compileExpr } from '../docs/js/core.js';
import '../docs/js/fx/scene3d.js'; import '../docs/js/fx/scene3d-fx.js';
const [jf, sparams, fparams, fxname] = process.argv.slice(2); const gt = JSON.parse(fs.readFileSync(jf));
const assets = await nodeAssets(), scr = new Buf('SCREEN', 640, 480, 32);
const evs = []; const ctx = { assets, frame: 0, render: false, expr: compileExpr, engine: { events: evs } };
const sev = { name: fparams.split(' ')[0], inputs: [scr], outputs: [scr], local: 0 }; sev.state = FX.get('scene').init(sparams, sev, ctx); evs.push(sev);
FX.get('scene').play(sev.state, sev, ctx);
const fev = { name: 'sdfdfg', local: 0 }; fev.state = FX.get(fxname).init(fparams, fev, ctx); evs.push(fev);
const o = sev.state.scene.getObject(fparams.split(' ')[1]); let first = null, last = null;
for (let i = 0; i < gt.frames.length; i++) {
  ctx.frame = gt.t0 + i * gt.dt; scr.data.fill(0); ctx.render = i === gt.frames.length - 1; FX.get('scene').run(sev.state, sev, ctx); if (ctx.render) last = Uint32Array.from(scr.data);
  if (first === null) first = ctx.frame; fev.local = ctx.frame - first; FX.get(fxname).run(fev.state, fev, ctx);
  if (i % 10 === 9 || i === 0) { let mx = 0; const g = gt.frames[i]; for (let v = 0; v < g.length; v++) for (let k = 0; k < 3; k++) mx = Math.max(mx, Math.abs(o.P[v * 3 + k] - g[v][k])); console.log('frame', i, 'max |pos err|', mx.toExponential(2)); }
}
if (fs.existsSync(jf + '.raw')) { // whole frame of the last step
  const ref = new Uint32Array(fs.readFileSync(jf + '.raw').buffer.slice(0)); let sum = 0, same = 0; for (let i = 0; i < ref.length; i++) { const a = last[i], b = ref[i]; if (a === b) same++; sum += Math.abs((a >> 16 & 255) - (b >> 16 & 255)) + Math.abs((a >> 8 & 255) - (b >> 8 & 255)) + Math.abs((a & 255) - (b & 255)); }
  console.log('last frame: identical', (100 * same / ref.length).toFixed(2) + '%', 'mean|err| per channel', (sum / ref.length / 3).toFixed(3));
}
if (process.argv.includes('--png') && last) { const w = (name, d) => fs.writeFileSync(name, Buffer.concat([Buffer.from('P6\n640 480\n255\n'), Buffer.from(Uint8Array.from({ length: 640 * 480 * 3 }, (_, i) => (d[(i / 3) | 0] >> (16 - 8 * (i % 3))) & 255))])); w('/tmp/fx_js.ppm', last); w('/tmp/fx_ref.ppm', new Uint32Array(fs.readFileSync(jf + '.raw').buffer.slice(0))); }
