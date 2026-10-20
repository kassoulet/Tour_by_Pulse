// node tools/test-archive.mjs : decode every TOUR.98 record with docs/js/archive.js, compare with tools/extract.py output
import fs from 'fs';
import { execFileSync } from 'child_process';
import os from 'os'; import path from 'path';
import { parseArchive } from '../docs/js/archive.js';
const here = new URL('.', import.meta.url).pathname;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tour98-'));
execFileSync('python3', [here + 'extract.py', here + '../TOUR.98', tmp]);
const b = fs.readFileSync(here + '../TOUR.98');
let ok = 0, bad = 0, skipped = 0;
for (const r of parseArchive(b.buffer.slice(b.byteOffset, b.byteOffset + b.length))) {
  const out = r.unpack();
  if (r.type === 't') { skipped++; if (out.length !== r.usize) bad++; continue; }   // TGA: python writes PNG; check size only
  const ref = fs.readFileSync(path.join(tmp, r.name.toLowerCase()));
  if (out.length === ref.length && Buffer.compare(Buffer.from(out), ref) === 0) ok++; else { bad++; console.log('MISMATCH', r.name); }
}
console.log(`records identical to python: ${ok}, TGA size-checked: ${skipped}, bad: ${bad}`);
process.exit(bad ? 1 : 0);
