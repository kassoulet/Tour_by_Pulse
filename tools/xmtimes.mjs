// node tools/xmtimes.mjs  -> re/xm_times.json, prints length & TheEnd time
import { xmTimeline, timeOf } from '../docs/js/xmtime.js';
import fs from 'fs';
const b = fs.readFileSync(new URL('../docs/assets/tour3.xm', import.meta.url));
const tl = xmTimeline(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
fs.writeFileSync(new URL('../re/xm_times.json', import.meta.url), JSON.stringify(tl.times ?? tl));
console.log(Object.keys(tl), 'orders', (tl.times ?? tl).length, 'end(25,63)=', timeOf(tl, 25, 63), 'total', tl.total ?? tl.length);
