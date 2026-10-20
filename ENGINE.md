# JS port of "Tour" (Pulse / PygmyProjects / VirtualDreams, Assembly '98, 3rd place) — engine contract (read this first)

Goal: a faithful JavaScript port of the 1998 DOS demo *Tour* that runs in a browser (GitHub Pages, **no build step, no libraries**) and in node 22.
It is the **predecessor of "73 million seconds"** (see `../pls73ms/`, a finished port of the same engine family — its JS in `../pls73ms/docs/js/`,
its notes in `../pls73ms/re/NOTES.md`, `../pls73ms/ENGINE.md` are an excellent head start; effect names and structures are largely the same, but this
is an earlier build: 640x480, RGB565/32-bit buffers, different effect set, different details. **Never assume the 73MS code is identical: derive from the
TOUR disassembly and verify against the original running under Unicorn.**)
Other finished reverses with the same methodology: `../zilog`, `../stars`, `../saint`.

The engine is data-driven: `docs/assets/script.unr` (already extracted: read ALL of it, it is ~116 lines) creates buffers (`createBuffer NAME w h bpp [image]`) and **events**
(`addEvent <effect> <name> {inputs} {outputs} {params} [{extra}]`) that run every frame in creation order; other commands: `loadImage`, `deleteEvent`,
`suppressEvent`, `changeBuffers`, `play`, `TheEnd`. A script line may start with `<order> <row>` = the XM module position at which it fires (time base = music).

## The original binary (what you can use)
`re/` — run tools **from the `re/` directory**, with the venv python `PY=/tmp/claude-1000/-home-gautier-SynologyDrive-code-current-demoports/4a6b9f3e-e5e0-45de-8028-f20db5171c61/scratchpad/v/bin/python`
(unicorn, capstone, pillow, numpy installed; if it vanished: `python3 -m venv v && v/bin/pip install unicorn capstone pillow numpy`).
* `re/image.bin` = the unpacked program (PMODE/W LE object 1), **linear base 0x100000**: addresses printed by every tool are *linear* (e.g. `0x10e0c8`).
  Code ≈ 0x100000-0x1ac000 (Watcom C++ 32-bit, flat), strings/data 0x1ac000-0x1c5000, bss up to 0x28c380. `re/obj2.bin` = object 2 at **0x1b000** (self-modifying rasteriser code, ~40 KB).
* `$PY ds.py ADDR [N]` disassemble N instructions at linear ADDR (capstone). `$PY fn.py ADDR` guess function entry. `$PY xref.py VALUE` find 32-bit occurrences of VALUE in the image (data refs / call targets via absolute pointers).
* `re/strings.txt` all strings with linear addresses.  `re/effects.txt` effect table: name, getDescriptor, init, run, free (`$PY fx.py NAME [0|1|2 [N]]` disassembles init/run/free).
  Effect table is at 0x1b2d20 (20-byte records: char name[16]; u32 getDescriptor). `getDescriptor()` returns a pointer to `{init, run, free}` (Watcom register calls: init(eax=param string, edx=event?) -> state; run(eax=state, edx=event)).
* Watcom register convention: args in EAX, EDX, EBX, ECX then stack; returns EAX; floats on the FPU stack / stack. Unicorn starts with x87 CW=0: always `fninit` semantics (0x37f) - the harness does it.
* **Harness** (`re/harness.py`, snapshot `re/state.bin` is gitignored: run `$PY boot.py` once, ~40 s): `from harness import *` gives `mu` (Unicorn), `call(addr, eax, edx, ebx, ecx, stack=[...])`,
  `rd/wr/rd32/wr32/rdf/wrf`, `alloc(n)` (scratch memory, host bump allocator also used as the engine's malloc), `B=0x100000`. The snapshot is the original after init (video mode set, IMS initialised, script loaded) at the first keyboard poll of its main loop.
  Use it for **differential testing**: build a buffer/state in emulated memory, call the original function, dump the result, compare with your JS on the same input. Report measured error numbers.
  DOS/DPMI/VESA/keyboard are stubbed in `re/emucore.py` (`malloc/free/realloc` replaced by a host allocator). Run times: ~0.2 s per call to a function; 40 s boot.
* `re/emucore.py` is a copy-adapt of `../pls73ms/re/emucore.py`; `../pls73ms/re/golden.py` shows how the 73MS authors rendered whole reference frames from the original (clock mailbox, lock/present hooks). Not yet done for TOUR (a task of the engine owner).
* `TOUR.98` is the data archive (records `[u32 usize][u32 csize][u32 namelen][u32 dataofs][u32 nameofs][u32 dataend][u8 type][name\0]...`, offsets absolute, types: `2` dlz LZ, `t` TGA as dlz, `j` jpeg, `p` png raw, `3`/`1`/`b` other coders).
  `re/assets_raw/` = everything already extracted that uses dlz/raw (only TOUR3.XM, RYMDLEGO.XM and `M_*.BIN` are missing: types b/3/1).

## Layout
```
docs/index.html            the site (lead)         docs/css/style.css, docs/js/notes.js (lead, copied from the 73MS site)
docs/js/core.js            Buf, FX registry, compileExpr (lead)       docs/js/engine.js script parser + scheduler (engine owner)
docs/js/xmtime.js          (order,row) -> seconds of the XM (lead, from 73MS)     docs/js/main.js browser player (lead)
docs/js/assets.js          browser asset preloader (engine owner)
docs/js/fx/index.js        imports every effect module (lead: add your import line when you create a module)
docs/js/fx/<module>.js     effect modules — ONE OWNER per module, do not edit others' files
docs/notes/<name>.html     documentation fragments for the site (format below), registered in docs/notes/index.json (JSON array of file names; append yours, keep valid JSON)
docs/assets/*              assets as the browser sees them (png/jpg/pal/exp/lwe/lwv/...; TGA converted to PNG)
re/                        reverse-engineering tools + notes  (put your findings in re/<yourtopic>.md)
tools/                     node/python helper tools (render.mjs, extract.py, ...)
```

## JS API (same as 73MS; see ../pls73ms/docs/js/core.js, engine.js)
```js
import { FX, Buf, compileExpr } from '../core.js';
FX.register('fade', {
  init(params, ev, ctx) { ... return state; },   // params = text of the 3rd {..} group; ev.groups[0..4] are all groups; ev.inputs / ev.outputs are Buf[] (resolved)
  run(state, ev, ctx)  { ... },                  // once per displayed frame, events run in creation order
  free(state, ev, ctx) {},
});
```
`Buf{name,w,h,bpp,data,pal}`; 8 bit = Uint8Array, 16 bit = Uint16Array (**RGB565 ?**), 32 bit = Uint32Array (**0x00RRGGBB ?** byte order to be confirmed from the code — whoever
first ports an effect touching 16/32-bit buffers verifies this with the harness and records it in `re/formats.md`). `ev.local` = centiseconds since the event was added (`Frame` in expressions),
`ctx.frame` absolute centiseconds, `ctx.time` seconds. Assets: `ctx.assets.image(name)->{w,h,rgb:Uint32Array}`, `.bin(name)->Uint8Array`, `.text(name)`.
Keep per-frame work allocation-free; target: 640x480 effects must run in real time in a browser (use typed arrays, integer math, avoid per-pixel closures).

## Rules
* Pure ES modules, no dependencies, no build step, run unmodified in a browser and in node 22.
* Port the **behaviour of the original code** (fixed point, MMX saturation, table lookups, rounding). Keep original names/constants where they matter. Compare with the original using the harness and report measured errors (max/mean per channel, % identical pixels).
* Documentation for the site: for each effect (or group) write `docs/notes/<name>.html` containing ONE root element `<section class="fx" id="fx-<name>">` with: `<h3>` title, 1-3 short paragraphs (plain English: what it does visually, how the original does it, retro context:
  fixed-point maths, MMX, tables, self-modifying code, 640x480 constraints), the **interesting inner loop(s) as real disassembly excerpts** in `<pre class="asm">` (10-40 lines, address-annotated `1234ab  mov eax,[ebx]  ; comment`, source address mentioned),
  the equivalent JS in `<pre class="js">`, and a `<dl class="facts">` (script usage, parameters, buffers, where in the timeline). Only: h3, h4, p, ul/li, pre, code, dl/dt/dd, em, strong, table. No external CSS/JS.
* Do not edit files you do not own. If you need a change in a shared file (core.js/engine.js), describe it in your final report (or make a tiny, clearly commented additive change).
* Do not run more than one heavy emulator job at a time per agent (the machine is shared with other agents). Keep tool output small (head/tail/grep).
* Final report (your last message): what is implemented, what is verified and how (numbers), what is approximate/missing, files written, and facts about the original worth putting on the site (concise).
