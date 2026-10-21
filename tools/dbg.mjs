// node tools/dbg.mjs <t> : replay to t and list the events (state of each)
import path from 'path'; import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { nodeAssets, loadTimeline } = await import(root + '/tools/render.mjs');
const { Engine } = await import(root + '/docs/js/engine.js');
const eng = new Engine(await nodeAssets(), (await nodeAssets()).text('script.unr'), loadTimeline());
const t = +process.argv[2]; eng.seek(t);
for (const e of eng.events) console.log(e.type, e.name, 'failed=' + !!e.failed, 'supp=' + !!e.suppressed, 'local=' + (e.local ?? '-').toString().slice(0, 8), e.err || '');
