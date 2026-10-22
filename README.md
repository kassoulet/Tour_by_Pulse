# Tour — JavaScript port

A study port of **"Tour"** (Pulse / Pygmy Projects / Virtual Dreams, Assembly '98, 3rd place with 752 points), a DOS demo,
re-implemented in plain JavaScript for the browser and Node 22, with the reverse-engineering notes, tools and write-up.
It is the predecessor of the engine of *73 million seconds* (see the sister project `73-Million-Seconds-by-Pulse`).

**Site (GitHub Pages):** `docs/` — player (`demo.html`), engine notes (`index.html`), the best asm tricks (`writeup.html`).

## What is here
- **Faithful port**: the original `script.unr` drives the demo (buffers + events run every frame in creation order, timed by the XM module position).
  Effects: `basic2d` (palette, doubleimage, blend, fade, mapimage, blit), `feedback` (echo5, reebok), `cellrd` (Gray-Scott reaction-diffusion),
  `scene3d` (software 3D: .exp/.lwe scenes, unrdisp, bomb, displace247), `volumes` (metaballs, plasma, marching cubes). 3D, 2D, volume and feedback effects were
  verified against the original executable running in a CPU emulator (most of them bit-exact, see `re/*.md`).
- **Whole-demo check**: the original engine is run headlessly under Unicorn (`re/golden.py`) and its frames are compared with the port's (`tools/replay.mjs`, `tools/cmp-all.py`):
  mean error **1.2 / 255 per channel**, 93.6 % of pixels within 8 levels over the 152 s of the demo (the JPEG decoder of the original differs from the browser's: that alone is a ~1 level floor).
- **Reverse-engineering**: `re/unpack_pmodew.py` runs the PMODE/W loader (real mode → protected mode) in Unicorn to unpack `TOUR.EXE`; `re/boot.py` boots the unpacked original to its main loop;
  `re/harness.py` calls any original function with custom buffers; `tools/extract.py` decodes `TOUR.98` (dlz LZ, byte RLE, adaptive-Huffman LZ, BWT+MTF+Huffman).

## Layout
```
docs/               GitHub Pages site: index.html, demo.html, writeup.html, js/ (core, engine, assets, archive, fx/*), notes/*.html, assets/
re/                 reverse-engineering notes (*.md), unpacker, emulator core (emucore.py), harness, golden-frame runner, differential tests (dt_*/)
tools/              extractor, renderers, comparison and test scripts
ENGINE.md           the port's engine contract (was the brief for the parallel work)
TOUR.EXE TOUR.98    original demo files (unmodified)
```

## Running
```sh
cd docs && python3 -m http.server      # http://localhost:8000/
python3 tools/mkraw.py                 # once (Pillow): build/raw for the node renderer
node tools/render.mjs 75 out.ppm       # render the port at t = 75 s
node tools/test-engine.mjs; node tools/test-volumes.mjs; node tools/test-basic2d.mjs   # self-checks
```
Reference (needs `pip install unicorn capstone pillow numpy`):
```sh
cd re && python3 boot.py                        # ~40 s, makes state.bin
python3 golden.py 0 153 0.033333 golden/full    # the original's frames (EVERY=15 to keep one in 15; ~25 min)
cd .. && node tools/replay.mjs re/golden/full /tmp/replay && python3 tools/cmp-all.py re/golden/full /tmp/replay
```
Music clock: the player follows libopenmpt, so `docs/assets/xm_times.json` (made by `tools/openmpt_times.py`) gives the exact start time of every (order,row).

## Credits
Demo, music and assets © Pulse, Pygmy Projects, Virtual Dreams (1998): camel, silver eagle, unreal, fndr, visualize, falcon. Music played with
[chiptune3](https://github.com/DrSnuggles/chiptune) / libopenmpt. This port and the notes are non-commercial, for study.
