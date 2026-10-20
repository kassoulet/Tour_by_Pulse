# basic2d effects (palette, doubleimage, blend, fade, mapimage, xfade, afade)
Port: docs/js/fx/basic2d.js. Test: `cd re/dt_basic2d && $PY gen.py` (reference from the original in Unicorn, uses hx.py: original addEvent parser 0x104fd8, lock 0x105d08) then `node tools/test-basic2d.mjs` (all cases 100 % identical).
Harness gotchas: event line must be lower-case and get a trailing ` {0 0}` (the parser scans for a 4th group without bound). Fade tables: A[f][v]=((256-f)*v)>>8 at [0x1d1b40], B[f][v]=(f*v)>>8 at [0x1d1b48].
fade state: +0 r,+4 g,+8 b (float32), +0xc expr, +0x10 first Frame, +0x14 started flag; xfade: +0 expr, +4 first Frame, +8 flag. f=(int)(expr*255) truncating (0x103d1a sets RC=truncate).
blend modes 1,2,3,11,22,33; mode 22 has an original bug (falls into the key-0 loop after the first non-key pixel); 33 writes zeros (psubusb mm0,mm0).
Not ported: zoom, colormap/colordistort, matrix, dither, ditherfs, edges, wave, partmag2d, interpolator, lowpass, fade 16/8-bit branches. Format facts: re/formats.md.
