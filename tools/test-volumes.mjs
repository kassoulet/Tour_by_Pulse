// Differential test of docs/js/fx/volumes.js against the original (reference dumped by re/dt_volumes/gen.py, run it first:
//   cd re && $PY dt_volumes/gen.py   -> re/dt_volumes/ref/*.bin + index.json).    usage: node tools/test-volumes.mjs
import fs from 'node:fs';
import { FX } from '../docs/js/core.js';
import '../docs/js/fx/volumes.js';
import { MarchingCubes } from '../docs/js/fx/volumes.js';

const A = new URL('../docs/assets/', import.meta.url), R = new URL('../re/dt_volumes/ref/', import.meta.url);
const rd = (n) => new Uint8Array(fs.readFileSync(new URL(n, R)));
const f32 = (u8) => new Float32Array(u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength));
const idx = JSON.parse(fs.readFileSync(new URL('index.json', R), 'utf8'));
// Known deviation: a.mbs has C = 0.90*clip(Frame*0.0002,0,1); the original evaluates it to 0.0539999977 at Frame 300 (float32 rounding inside the
// expression evaluator: clip() result or Frame*0.0002 is a float), core.js compileExpr (double) gives 0.0540000014 -> 1 ulp differences in the
// field (<=1e-6 absolute after F=1234). This is the engine's evaluator, not the volume code, hence the tolerance for the a.mbs cases below.
const ctx = { assets: { bin: (n) => new Uint8Array(fs.readFileSync(new URL(n, A))), text: (n) => fs.readFileSync(new URL(n, A), 'utf8') } };
const fx = (name, params) => { const e = FX.get(name); const ev = { local: 0 }; return { e, ev, st: e.init(params, ev, ctx) }; };
let fails = 0;
function cmp(label, got, want, tol = 0) {
  let ex = 0, mx = 0, n = want.length;
  for (let i = 0; i < n; i++) { const d = Math.abs(got[i] - want[i]); if (d === 0) ex++; if (d > mx || Number.isNaN(d)) mx = d; }
  const ok = mx <= tol; if (!ok) fails++;
  console.log((ok ? 'ok   ' : 'FAIL ') + label.padEnd(26) + ' identical ' + ex + '/' + n + '  max|err| ' + mx.toExponential(2));
}
const V = (name) => ctx.volumes.get(name.toLowerCase());
fx('volume3D', 'OurVolume'); fx('volume3D', 'V8Volume v8.dat'); fx('volume3D', 'SrcVolume vbox.dat'); fx('volume3D', 'PlasmaVolume');
const FR = idx.frames, step = (o, F) => { o.ev.local = F; o.e.run(o.st, o.ev, ctx); };

const pl = fx('plasma1volume', 'PlasmaVolume 0.7 0.7');
FR.forEach((F, i) => { step(pl, F); cmp('plasma F=' + F, V('PlasmaVolume'), f32(rd('plasma_' + i + '.bin')), 0); });
for (const m of ['test1', 'a', 'c']) {
  const mb = fx('metaballs', 'OurVolume ' + m + '.mbs');
  FR.forEach((F, i) => { V('OurVolume').fill(0); step(mb, F); cmp('metaballs ' + m + ' F=' + F, V('OurVolume'), f32(rd('mb_' + m + '_' + i + '.bin')), m === 'a' ? 1e-6 : 0); });
}
V('SrcVolume').set(f32(rd('vbox.bin'))); V('V8Volume').set(f32(rd('v8.bin')));
const mo = fx('morphvolume', 'OurVolume SrcVolume V8Volume clip10(0.5+0.3*sin(Frame*0.01)+0.7*cos(Frame*0.007))');
FR.forEach((F, i) => { step(mo, F); cmp('morph F=' + F, V('OurVolume'), f32(rd('morph_' + i + '.bin')), 0); });
for (const [n, p] of [['mulvolume', 'mul'], ['addvolume', 'add'], ['subvolume', 'sub']]) { const o = fx(n, 'OurVolume SrcVolume V8Volume'); step(o, 0); cmp(n, V('OurVolume'), f32(rd(p + '.bin')), 0); }
{ const o = fx('fadevolume', 'OurVolume V8Volume 0.25+0.5*clip10(Frame*0.01)'); step(o, 77); cmp('fadevolume', V('OurVolume'), f32(rd('fade.bin')), 0); }

// ---- marching cubes: same volume, same bbox; compare face list (slot triples), face normals, vertex positions and normals
const TOLP = 1e-4, TOLN = 2e-3;
for (const [name, c] of Object.entries(idx.mc)) {
  const vol = f32(rd(name + '_vol.bin')), mc = new MarchingCubes(c.bbox);
  const nt = mc.run(vol), faces = rd(name + '_faces.bin'), dv = new DataView(faces.buffer, faces.byteOffset), vb = c.vbase;
  const vrec = rd(name + '_verts.bin'), vdv = new DataView(vrec.buffer, vrec.byteOffset);
  console.log(name + ': faces original ' + c.nf + ', JS ' + nt + (nt === c.nf ? '' : '  <-- MISMATCH'));
  if (nt !== c.nf) { fails++; continue; }
  let badIdx = 0, mxFN = 0, relFN = 0; const gotFN = (mc.mesh(), mc.faceN);
  for (let k = 0; k < nt; k++) for (let j = 0; j < 3; j++) if ((dv.getUint32(60 * k + 0x30 + 4 * j, true) - vb) / 0x60 !== mc.out[3 * k + j]) badIdx++;
  for (let k = 0; k < nt; k++) for (let j = 0; j < 3; j++) {
    const w = dv.getFloat32(60 * k + 0x14 + 4 * j, true), g = gotFN[3 * k + j]; mxFN = Math.max(mxFN, Math.abs(g - w));
    relFN = Math.max(relFN, Math.abs(g - w) / (Math.abs(w) + 1e-3));
  }
  let mxP = 0, mxN = 0, exP = 0, tot = 0;
  c.vertsel.forEach((s, i) => {
    for (let j = 0; j < 3; j++) {
      const wp = vdv.getFloat32(96 * i + 4 * j, true), wn = vdv.getFloat32(96 * i + 12 + 4 * j, true);
      mxP = Math.max(mxP, Math.abs(mc.pos[3 * s + j] - wp)); mxN = Math.max(mxN, Math.abs(mc.nrm[3 * s + j] - wn)); tot++; if (mc.pos[3 * s + j] === wp) exP++;
    }
  });
  const ok = badIdx === 0 && mxP <= TOLP && mxN <= TOLN && relFN < 1e-3; if (!ok) fails++;
  console.log((ok ? 'ok   ' : 'FAIL ') + '  slots wrong ' + badIdx + '/' + 3 * nt + '  pos identical ' + exP + '/' + tot + ' max ' + mxP.toExponential(2) +
    '  normal max ' + mxN.toExponential(2) + '  faceNormal max abs ' + mxFN.toExponential(2) + ' rel ' + relFN.toExponential(2));
}
console.log(fails ? fails + ' FAILURES' : 'all ok'); process.exit(fails ? 1 : 0);
