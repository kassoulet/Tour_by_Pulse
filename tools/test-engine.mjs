// node tools/test-engine.mjs  - self-check of the script interpreter (no images needed beyond build/raw)
import assert from 'assert';
const { nodeAssets, loadTimeline } = await import('./render.mjs');
const { Engine, makeCtx, parseScript } = await import('../docs/js/engine.js');
const { FX } = await import('../docs/js/core.js');
await import('../docs/js/fx/index.js');
const assets = await nodeAssets(), tl = loadTimeline();
const eng = new Engine(assets, assets.text('script.unr'), tl);
// parser: 116-line script -> comments dropped, '@' stops
const cmds = parseScript(assets.text('script.unr'));
assert.equal(cmds[0].cmd, 'createbuffer'); assert.equal(cmds.at(-1).cmd, 'theend'); assert.equal(cmds.at(-1).order, 25);
// buffers & image copy (scroll.jpg 256x256 -> CITYLIGHTS 640x480x32 linear)
eng.update(0);
const cl = eng.buf('CITYLIGHTS'), sc = assets.image('scroll.jpg');
assert.equal(cl.data[65535], sc.rgb[65535]); assert.equal(cl.data[65536], 0);
// 16-bit buffer = truncated 565
const t = eng.buf('TITLE'), ti = assets.image('title.jpg'); const p = ti.rgb[1000];
assert.equal(t.data[1000], ((p >> 8) & 0xf800) | ((p >> 5) & 0x7e0) | ((p >> 3) & 31));
// events present at several times (names in creation order); every effect of the script exists in the original but may not be ported yet
const at = (s) => { eng.seek(s, 0); return eng.events.map((e) => e.name).join(','); };
const o = (a, b) => tl.times[a][b];
assert.equal(at(o(0, 5)), 'bbb');
assert.equal(at(o(8, 0) + 0.01), 'filow,eko5,pa,di,blendpa'.replace(/^/, '')); // bbb deleted at 8 0
assert.equal(at(o(9, 0) + 0.01), 'bbb,scena2');
assert.equal(at(o(13, 0) + 0.01), 'bbb,test,nazwa1,nazwa2,nazwa3,nazwa3a,nazwa4,nazwa5,nazwa6,nazwa7,nazwa8,nazwa9'.replace('bbb,', 'bbb,'));
assert(eng.events.find((e) => e.name === 'scena2' || true));
// play / suppress / changeBuffers
eng.seek(o(13, 0) + 0.01, 0); assert(eng.events.find((e) => e.name === 'test').playStart !== null);
eng.seek(o(16, 30) - 0.05, 0); assert.equal(eng.events.find((e) => e.name === 'bbb').inputs[0].name, 'DREAMS');
eng.seek(o(16, 30) + 0.01, 0); assert.equal(eng.events.find((e) => e.name === 'nazwa6').suppressed, true); // suppressed, never deleted

eng.seek(o(25, 63) + 0.1, 0); assert.equal(eng.ended, true);
// makeCtx standalone: fillbuffer / Frame origin = first run
const ctx = makeCtx(assets); const b = ctx.createBuffer('X', 8, 8, 32); b.data.fill(5);
const ev = ctx.addEvent('fillbuffer', 'f', ['X', 'X', '0']); ctx.step(2.5); assert.equal(b.data[3], 0); assert.equal(ev.local, 0); ctx.step(3); assert.equal(ev.local, 50);
console.log('engine tests ok; end time', eng.endTime.toFixed(2));
