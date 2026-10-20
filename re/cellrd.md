# cellrd (Gray-Scott reaction-diffusion cellular automaton) - reverse notes

Handlers: init 0x1146a4, run 0x11480c, free 0x1147f0 (`gfeed` 0x114860 is a different effect, unused). Library code 0x14e9xx-0x1508xx ("blob.c"), kernel in object 2 (0x20400-0x2084c, self-modifying).
* init: `sscanf("grayscott %f %f %f %s")` or `"preinit grayscott ..."` (state+4 = 1: run does nothing) or the string `run` (state fresh; the simulation state is **global**, built by the preinit event).
  Floats: F=[0x2142cc] (0.012), k=[0x2142c8] (0.045), D=[0x2142c4] (3.2). 5th word = initial pattern file (loader 0x150680, 264x144 image into A or B) or `none`.
  `srand(12345)` (0x14b370), buffers (0x14eb40), patch object 2 (0x20400), noise table 0x8000 bytes = `(rand()>>6)%256` (0x14b34c), step table (2,4..512, unused in the end), palette table 0x214290 (0x14f2c4), reaction tables (0x14ed9c), arrays zeroed, 8 blob presets (0x114530 -> 0x1504d8).
* state arrays: A=[0x2142b8] B=[0x2142c0] (current), A'=[0x2142b4] B'=[0x2142bc] (next), 264 x 144 bytes, field 260 x 140 at (2,2), periodic wrap (0x14fd28), values 0..31. Box sums: 0x204e3/0x2057a (5x5 of A -> [0x2142a8]), 0x20458/0x20662 (3x3 of B -> [0x2142ac]).
* run (per frame, 2 iterations): blobs 0x150550 (8 records at 0x2142dc: pos = trunc(117 sin(p2 t+p3)+130, 63 sin(p4 t+p5)+70), 3x3 blob of value trunc(31*p6) in A and B, t += dt; plus A[1000]=A[2000]=B[1600]=30), step 0x14f8e4, wrap 0x14fd18, swap 0x14ff6c; then draw 0x14fd48.
* step: 4 rand() calls (start dither byte, start noise index, step, sign - **the step is pushed but the kernel adds its loop counter** instead); per row: pack indices (sum<<10|B<<5|A) for A (5x5 sum) and B (3x3 sum), kernel 0x2073e: `A' = (T1[idxA] + dither) >> 8`, `B' = (T2[idxB] + dither) >> 8`, dither byte += noise[ebp] per cell.
* tables: T1 (776*1024 words) = floor(256 * clamp(31*(D*(F(1-a) - a w^2) + 0.04*sumA/31), 0, 31)), T2 (280*1024) = floor(256*clamp(31/0.7*(D*(a w^2 - (F+k) w) + 0.7*sumB/31/9),0,31)), a = A/31, w = 0.7*B/31 (float32 stores at a, w, a w^2, the result).
* colours: pal[B*32+A] = R<<16|G<<8|B, R=255(1.5-2a), G=255(b+4.3ab^2-0.2), B=255(1-0.6 sin(5b)-1.2a), clamped, float32 products truncated.
* draw: field (260 x 140) written twice to the 640-wide 32 bit buffer: linear offsets 195*640 (cols 0..259) and 156*640+378 (cols 378..637).
Test: `re/dt_feedback/cellrd_init.py` + `cellrd_run.py OUT 400`, then `node tools/test-feedback.mjs cellrd OUT`: tables, palette, noise, A, B and screen identical for 400 frames.
Shared global rand(): the seed after the preinit (0x565bb039) is what echo5's init starts from; `ctx.randSeed` carries it in the port.
