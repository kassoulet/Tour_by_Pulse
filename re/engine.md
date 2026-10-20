# TOUR engine: script interpreter, event scheduler, time (re of TOUR.EXE, linear addresses)

All addresses linear (image base 0x100000). Verified by reading the disassembly and by inspecting the post-init snapshot (`re/state.bin`) with the harness.

## Program flow (main at 0x1016xx-0x1017b0)
`0x103ba4` IMS init -> load `tour3.xm` (0x1079b5 from TOUR.98, 0x103bf4 = IMS load module) -> `0x101014` tables -> `0x101320` fill the script
time table with "never" (order 640, row 60, handler 0x10130c) -> `0x103e28(script text)` **pre-pass** -> `0x103d40` run the first script group
-> `0x103c68` start the module -> loop `while(!0x101364())` -> (`0x103c80/90` stop IMS) exit.
The per-frame function `0x101364` returns 1 when the demo is over (TheEnd reached, or Esc pressed).

## Time source
* `0x103c98(&order,&row,..)`: `0x10e0c8` returns the IMS module position `order = (v>>16)&255`, `row = (v>>8)&255`; `0x10e580` = IMS "song time" (call through `[0x21424c]`, 16.16 fixed
  seconds). **Frame (global float at 0x1b28f8) = (int)time16.16 * 100 * 2^-16 = centiseconds of song time** (doubles at 0x1ac68f=100.0, 0x1ac697=1.52587890625e-5). Clamped: <0 -> 0, >100000 -> 0.
  So all time is the music clock (not wall clock): the JS port feeds `t` = audio position in seconds; `ctx.frame = t*100`.
* The (order,row) of the XM pattern position drives the script; JS uses `xmtime.js` (exact start time of each (order,row)) to map script times to seconds.

## Script format and interpreter
* Script text = `docs/assets/script.unr`, lines terminated by CR LF; a line starting with `;` is a comment; `@` ends the script. The whole file is lower-cased by
  the line reader when commands are compared (`0x10659a` strlwr + `0x1065f0` strcmp): names/commands/effects are **case-insensitive**.
* **Pre-pass 0x103e28**: for each line that starts with a char `<= '9'` (digit) it does `sscanf(line,"%d %d")` into a table (0x1cc1b0, stride 0x14: `+0 order, +4 row, +8 start-hook, +0xc per-frame hook, +0x10 end-hook`).
  Lines starting with a letter (type 2) or `;` (type 1) have no time and belong to the **group** of the previous timed line.  Index of a timed line = running counter [0x1f2284].
* **Group execution 0x103d40**: executes the timed line (skipping the 2 numbers: scans to the first char > '9') through the dispatcher 0x103edc, then all following untimed lines, stopping at the next timed line or `@`.
* **Frame function 0x101364**:
  1. read order/row/time as above;
  2. **at most one timed group fires per frame**: if `order > T[idx+1].order` (or equal order and `row >= T[idx+1].row`) -> idx++, run end-hook of the previous group, run the group
     (the group with time (0,0) is not re-run: it was executed at init, before the music started), then the start-hook; a `TheEnd` line sets hook +0xc = 0x10130c which makes this call return 1
     **before the events of that frame run**;
  3. `0x105d08` = **run frame**: lock all buffers (`[entry+0x20]`), then for every event in creation order (see below) call its `run`, unlock buffers, present SCREEN (`0x10814d`, 640x480x32 LFB).
  JS: all groups due at time `t` are executed (a slow frame does not delay the script); this differs from the original only when two timed lines fall into one frame.
* Dispatcher 0x103edc commands (strings 0x1ac6ac..0x1ac834): `theend`, `loadscene`(no-op here), `loadanim`, `addevent`, `suppressevent`, `resumeevent`, `deleteevent`, `changebuffers`,
  `setscenesorder`, `process_twirl3d`, `setwireframe`, `setparticles`, `renderoff`/`renderon` (flag 0x1b2cf0 = 1/0), `beamsoff`/`beamson` (0x1b2cf4 = 1/0; NB `beamsoff` sets 1 in this build - a naming quirk), `assignbuffertotexture`,
  `loadimage`, `blit`, `deletebuffer`, `createbuffer`, `play`, `stop`, `loadbackground`, `removebackground`, `assignbackground`. Unknown commands are silently ignored.
  Only these are used by script.unr: createBuffer, loadImage, blit, addEvent, deleteEvent, suppressEvent, changeBuffers, play, TheEnd.

### Commands (used ones)
| command | handler | semantics |
|---|---|---|
| `createBuffer NAME w h bpp [file]` | 0x104198 / 0x104480 | `sscanf("%s %s %d %d %d %s")`. New entry in the buffer table 0x1f91e0 (index counter 0x1b7558). The **first** buffer (SCREEN) is the video surface (0x107fc8: set VESA mode w x h x bpp). Others = memory surfaces (0x10805a). Zero-initialised. If `strlen(file) > 3`: image loaded with the buffer's pixel format and **memcpy'd linearly** (see `formats.md`). |
| `loadImage BUF file` | 0x1046b0 | `sscanf("%*s %s %s")`; same conversion/copy into the existing buffer (no resample: scroll.jpg is 256x256 into a 640x480 buffer). |
| `blit SRC DST` | 0x1047a4 | surface blit (0x10825b), 16->32 converts with the tables of `formats.md`. |
| `addEvent TYPE NAME {in} {out} {params} [{o r}]` | 0x104fd8 | see below. Unknown TYPE: message `tried to add non existant event: %s` then 0x108b54 = **fatal error** (text mode, exit). The port instead ignores the line (warns once) so partial builds run. All effect names used by script.unr exist in the original table (`fillbuffer`, `buffer_and` are the first two records at 0x1b2cf8 - older notes started the table at 0x1b2d20 and missed them). |
| `deleteEvent NAME` | 0x1054e8 | every event whose name matches (strcmp, case-insens): `free(state)` (`[ev+0x28](eax=[ev+0x2c])`), release the event, set its slot to NULL (the slot is **not** reused, order of the others unchanged). Non-existing name: silently nothing. |
| `suppressEvent NAME` / `resumeEvent NAME` | 0x1053e0 / 0x105464 | set / clear bit0 of `ev+0x44` for every matching event. A suppressed event is skipped by the run loop (its `Frame` origin is therefore not set). |
| `changeBuffers NAME {in} {out}` | 0x105588 | for each matching event: inputs: `sscanf("%s %s %s %s")` of group 1, resolves the names found and overwrites input slots 0..n-1 of `ev+0x30..` (**others are kept**; empty group = nothing changes); output (`ev+0x40`): empty group -> set to NULL; a name > 2 chars -> replaced. |
| `play NAME` | 0x1048d0 | looks up the event, takes its state (a `scene` state), sets in its animation descriptor: callback 0x105e0c, width/height of the scene (state+0x10/0x14), and **play start time = current Frame (0x1b28f8)** at `+0x9a`. The 3D animation clock of a scene = `Frame - playStart`. `stop` (0x104948) clears it. |
| `TheEnd` | 0x103f2c | hook +0xc = 0x10130c: demo ends when this group is reached. |

### Event object (0x4e bytes, alloc 0x101a7c(0x4e))
`+0x00` type name, `+0x10` instance name, `+0x20/+0x24/+0x28` = init/run/free of the effect, `+0x2c` state, `+0x30,+0x34,+0x38,+0x3c` = **input buffers** (first brace group, up to 4 names),
`+0x40` = **output buffer** (second group, first name only; pointer to a buffer-table entry), `+0x44` flags (bit0 suppressed; initial value = 4th dword of the effect descriptor = 0), `+0x48` start order (byte),
`+0x49` start row (byte) = the optional 4th group `{o r}` (`sscanf("%d %d")`, default 0 0).
Events are kept in a flat array (`0x1f8c20 + 4*i`, 1-based, count 0x1b755c) in **creation order** - there are no layers in this build.
*Differences to 73MS notes*: inputs = +0x30.., output = +0x40 (73MS had them the other way round in the notes); no layer number in `addEvent`.

`init(eax = text of the 3rd {..} group (params), edx = event)` -> state (stored in +0x2c). `run(eax = state, edx = event)`. `free(eax = state)`.
Parsing of the groups is purely positional (first `{`..`}` = inputs, second = outputs, third = params, optional fourth within 4 chars = `{start order, start row}`); a group may contain parentheses/spaces but no braces.

### Run loop 0x105d08 (per frame)
For each non-NULL event `e` in order: run iff `(e.startOrder < curOrder) || (e.startOrder == curOrder && e.startRow <= curRow)` and not suppressed.
=> the 4th group `{o r}` is a **start gate**: the event is skipped until the module position reaches (o,r) (e.g. `{0 4}` on a late scene is always satisfied; `{0 0}` always).
Nothing else is ordered: effects run strictly in creation order, which is what composes the picture (e.g. scene -> displace247 -> ...).

### Per-event `Frame`
Every effect keeps `state.firstFrame`: on its **first call of run** (not at addEvent) it stores the global Frame; expressions are then evaluated with
`Frame_local = Frame_global - firstFrame` (centiseconds), e.g. `fade` run 0x111008: `[state+0x14]==0 -> [state+0x10] = [0x1b28f8]`. Port: `ev.local` set by the engine (`ev.t0` = frame at first run).

## Expression evaluator
Compile `0x14a408(string)` -> RPN program, evaluate `0x14a570(prog, frame)` (double stack, result float32 stored by the effects). Functions (strings at 0x1b0200+):
`ASIN ACOS ATAN SIN COS TAN FABS ABS SQRT SQR FLOOR CEIL LOG EXP CLIP10 CLIP11 POW CLIP DELTA`, variables/constants `FRAME POS PI`. Binary operators + - * / and parentheses, unary minus.
Used in script.unr: `sqr(Frame*0.03)`, `0.5*Frame`, `1.0-sqr(sqr(fabs(sin(Frame*0.0071))))`, `clip10(0.5+0.3*sin(Frame*0.01)+0.7*cos(Frame*0.007))`, `0.17+0.04*sin(Frame*0.002)`.
Angles are radians; `Frame` is in centiseconds. **float32 rules (verified in the harness against 0x14a570, 40-60 random Frames per function):** `Frame` enters as float32; literals, + - * / and SIN COS TAN ASIN ACOS ATAN FABS ABS SQRT SQR FLOOR CEIL LOG EXP
work in double (stack slots are qwords); **CLIP10 CLIP11 CLIP POW** receive their arguments as float32 (`fstp dword`) and return float32 (pow: 38/40 bit-exact, rest libm noise); `PI` is float32 (3.1415927410125732);
the final result is stored as float32 (`fstp dword [ebp-4]`). Example `0.90*clip(Frame*0.0002,0,1)` at Frame 300 = 0.0539999977 (not 0.0540000014). Implemented in `core.js compileExpr`; `ctx.expr(src)(ev.local)` returns the float32 value.

## Effects implemented by the engine itself (docs/js/fx/engfx.js)
* `fillbuffer` (0x10ecd0/0x10ecfc): init parses an int (kept but **unused**), run = `memset(output.data, 0, w*h*bpp/8)` - the parameter is ignored: it always clears to 0. Used by script.unr with `{0}`.
* `buffer_and` (0x10ed38/0x10ed68): `out[i] &= *(u32*)state` over `w*h` dwords of the first input's dimensions (not used by the script).
* `blit` / `surfcopy`: surface blit as above.
