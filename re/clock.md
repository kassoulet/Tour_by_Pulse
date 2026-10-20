# Golden reference frames (original engine under Unicorn, virtual music clock)

Usage (from `re/`, venv python, needs `state.bin` from `boot.py`):

    python3 golden.py T0 T1 DT OUTDIR            # frames with T0 <= t < T1, step DT s, PNG f_<seconds>.png
    python3 golden.py a,b,c N DT OUTDIR          # several windows of N frames each, ONE run (fast-forward between)
    env: EVERY=n (save every n-th), COARSE=s (fine-step lead-in before each window; elsewhere 0.5 s steps;
         single-window default 0 = every frame fine), COUNT=max instructions (default unlimited)
T may be seconds or `order:row` (via xm_times.json if present, else placeholder 0.12 s/row, 64 rows/order: TOUR3.XM is not extracted yet).
Always starts at t=0 (the script is consumed one command per frame, ordering matters). Tools: `tools/cmp.py A B [diff]`, `tools/ppm2png.py`, `tools/contact.py out.png cols thumbw imgs...`.
References: `golden/ref/` (gitignored), 2 frames each at 0:20 3:20 8:40 9:50 10:0 10:40 12:0 12:50 14:0 15:0 16:20 16:40 17:40 19:0 20:30 21:50 22:30 23:30 24:30 25:10, dt=1/30 (`golden/contact.png`). Regenerate: ~2.5 min.

## Patches / hooks (linear addresses)
| addr | what |
|---|---|
| 0x10e580 | IMS time (16.16 s) -> `mov eax,[0x70000]; ret` |
| 0x10e0c8 | IMS order/row -> `mov eax,[0x70004]; ret` (order<<16 / row<<8, read by glue 0x103c98 which also gives time*100/65536 = centiseconds in float [0x1b28f8]) |
| 0x101364 | per-frame driver (main loop 0x1017a9): code hook advances the clock; it runs script lines (<= current order/row, one per frame) and calls the engine frame 0x105d08 when time>0 |
| 0x105d08 | engine frame: lock buffers (0x1080da), run events in creation order (array 0x1f8c20, count 0x1b755c; event+0x24 run, +0x2c state, +0x44 flags bit0 suppress, +0x48/0x49 order,row), unlock (0x10811b), present (0x10814d, eax=[0x1d1b60]=SCREEN obj) |
| 0x10814d | present: patched to `ret`, hook captures buffer entry 0 |
| 0x1f91e0 | buffer table, stride 0x28: name[16], +0x10 w, +0x14 h, +0x18 bpp, +0x1c obj, +0x20 data ptr (set by lock each frame); 16 entries, entry 0 = SCREEN 640x480x32 |
Pixels: 32 bpp = 0x00RRGGBB (BGRA in memory), 16 bpp = RGB565.
No lock/video patch is needed (unlike 73MS): the snapshot already has real memory surfaces; the VBE/LFB is never touched since present is skipped.
Other fix: `emucore.py` got INT 21h AH=3Ch (create file; engine writes a debug `chn.pic` around 17:50 and the run died on UNHANDLED INT) with writes to non-std handles discarded.

## Facts
* 3D `scene` (obj2 rasteriser, FPCW 0x37f from load_snapshot) renders correctly (glass, tentacle, volumes, hires, camel city all visible in the references).
* Deterministic: first 24 frames of two separate runs are 100.000 % identical (cmp.py). Coarse fast-forward changes the state of stateful effects (cellrd grayscott, echo): for exact frames use a single window with COARSE large enough, or dt=1/30 from 0.
* Speed ~0.15-0.3 s/frame (title 0.25, 3D similar); whole demo at 30 fps ~ 25 min; the 20-window set 2.5 min.
* Times in file names depend on xm_times.json; replace the placeholder with the real timeline when available (rerun).
