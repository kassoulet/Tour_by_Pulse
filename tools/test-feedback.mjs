// node tools/test-feedback.mjs cellrd <dumpdir>   : compare cellrd.js with dumps made by re/dt_feedback/cellrd_init.py + cellrd_run.py
import fs from 'node:fs';
import { _cellrd } from '../docs/js/fx/cellrd.js';
import { Buf } from '../docs/js/core.js';
const [, , what, dir] = process.argv;
const rd = (n) => new Uint8Array(fs.readFileSync(dir + '/' + n));
function cmp(name, a, b) {
  let diff = 0, max = 0; for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); if (d) { diff++; if (d > max) max = d; } }
  console.log(name.padEnd(8), 'n=' + a.length, 'different=' + diff, (100 * (1 - diff / a.length)).toFixed(4) + '% identical', 'max=' + max);
  return diff;
}
if (what === 'cellrd') {
  const C = _cellrd; C.setup(0.012, 0.045, 3.2);
  const u16 = (n) => { const b = rd(n); return new Uint16Array(b.buffer, b.byteOffset, b.length / 2); };
  cmp('table1', C.G.t1, u16('t1.bin')); cmp('table2', C.G.t2, u16('t2.bin'));
  const pb = rd('pal.bin'), pal = new Uint32Array(pb.buffer, pb.byteOffset, 1024);
  cmp('palette', C.G.pal, pal); cmp('noise', C.G.noise, rd('noise.bin'));
  const nfr = fs.readdirSync(dir).filter((f) => /^A\d+\.bin$/.test(f)).length;
  const out = new Buf('SCREEN', 640, 480, 32); let totA = 0, totB = 0;
  const cmpq = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++; return d; };
  for (let f = 0; f < nfr; f++) {
    for (let i = 0; i < 2; i++) { C.drawBlobs(); C.step(); }
    C.draw(out);
    const id = String(f).padStart(3, '0');
    const dA = cmpq(C.G.A, rd('A' + id + '.bin')), dB = cmpq(C.G.B, rd('B' + id + '.bin'));
    totA += dA; totB += dB;
    if (fs.existsSync(dir + '/scr' + id + '.bin')) {
      const sb = rd('scr' + id + '.bin'), s = new Uint32Array(sb.buffer, sb.byteOffset, 640 * 480);
      let sd = 0; for (let i = 0; i < s.length; i++) if (s[i] !== out.data[i]) sd++;
      console.log('frame', f, 'A diffs', dA, 'B diffs', dB, 'screen: different pixels', sd);
    }
    if (dA + dB) { console.log('first divergence at frame', f); break; }
  }
}

if (what === 'cellrd') console.log('(cellrd: frames compared:', fs.readdirSync(dir).filter((f) => /^A\d+\.bin$/.test(f)).length, ')');

// node tools/test-feedback.mjs reebok <dumpdir>  (dumps from re/dt_feedback/reebok_run.py)
if (what === 'reebok' || what === 'echo5') {
  const { FX } = await import('../docs/js/core.js');
  await import('../docs/js/fx/feedback.js');
  const { decodeIndexedPng } = await import('../docs/js/png.js');
  const png = await decodeIndexedPng(new Uint8Array(fs.readFileSync(new URL('../docs/assets/picture.png', import.meta.url))));
  const assets = { indexed: () => png };
  const ctx = { assets, frame: 0, time: 0 };
  const stat = (name, a, b) => {
    let d = 0, mx = 0, sum = 0; for (let i = 0; i < a.length; i++) { const e = Math.abs(a[i] - b[i]); if (e) { d++; sum += e; if (e > mx) mx = e; } }
    console.log(name.padEnd(12), 'identical ' + (100 * (1 - d / a.length)).toFixed(4) + '%', 'max err ' + mx, 'mean err ' + (sum / a.length).toFixed(5));
    return d;
  };
  if (what === 'reebok') {
    const out = new Buf('TEMP8', 320, 240, 8), ev = { inputs: [], outputs: [out] };
    stat('texture', png.data, rd('tex.bin'));
    const fx = FX.get('reebok'), st = fx.init('picture.png', ev, ctx);
    const times = fs.readFileSync(dir + '/rtimes.txt', 'utf8').split(' ').map(Number);
    let bad = 0;
    for (let f = 0; f < times.length; f++) {
      const id = String(f).padStart(2, '0');
      out.data.set(rd('rin' + id + '.bin')); ctx.frame = times[f]; fx.run(st, ev, ctx);
      bad += stat('frame ' + f, out.data, rd('rout' + id + '.bin'));
    }
    console.log(bad ? 'MISMATCH' : 'reebok: all frames byte-identical');
  }
  if (what === 'echo5') {   // dumps from re/dt_feedback/echo5_run.py
    const out = new Buf('TEMP8', 320, 240, 8), ev = { inputs: [out], outputs: [out] };
    const fx = FX.get('echo5'), st = fx.init('0.5*Frame', ev, ctx);
    const times = fs.readFileSync(dir + '/e5times.txt', 'utf8').split(' ').map(Number);
    let bad = 0;
    for (let f = 0; f < times.length; f++) {
      const id = String(f).padStart(3, '0');
      ctx.frame = times[f]; fx.run(st, ev, ctx);
      bad += stat('frame ' + f, out.data, rd('e5out' + id + '.bin'));
      if (bad) { out.data.set(rd('e5out' + id + '.bin')); }   // resync so that later frames are judged independently
    }
    console.log(bad ? 'MISMATCH' : 'echo5: all frames byte-identical');
  }
}

// node tools/test-feedback.mjs tri <dumpdir>  (dumps from re/dt_feedback/tri_run.py): the 3D triangle pipeline
if (what === 'tri') {
  const { drawTri, Vtx } = await import('../docs/js/fx/feedback.js');
  const tris = JSON.parse(fs.readFileSync(dir + '/tri.json', 'utf8')), tex = rd('tri_tex.bin'), scr = rd('tri_scr0.bin'), ref = rd('tri_scr1.bin');
  const v = [new Vtx(), new Vtx(), new Vtx()];
  let first = -1;
  for (let t = 0; t < tris.length; t++) {
    tris[t].forEach((p, k) => v[k].set(p[0], p[1], p[2], p[3], p[4]));
    drawTri(v[0], v[1], v[2], { screen: scr, tex });
  }
  let d = 0, mx = 0; for (let i = 0; i < scr.length; i++) { const e = Math.abs(scr[i] - ref[i]); if (e) { d++; if (e > mx) mx = e; } }
  console.log('triangles', tris.length, 'different pixels', d, 'of', scr.length, 'max', mx);
}
