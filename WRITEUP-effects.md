# TOUR (Pulse / Pygmy Projects / Virtual Dreams, 1998) - effects, engine and scenes

*Tour* is the 3rd-place demo of Assembly '98 (752 points). Credits (`TOUR.NFO`): programming camel, silver eagle, unreal; 3D fndr; gfx/3D/design visualize; music falcon.
Files: `TOUR.EXE` (PMODE/W, Watcom C++ 32-bit, ~494 KB), `TOUR.98` (4.7 MB archive of 116 records), music `tour3.xm` ("tribal cloud no. 9", XM, 20 channels), which is
stored inside the archive with a BWT+MTF+Huffman coder. It is the predecessor of the engine of *73 million seconds* (`../pls73ms`), and the port is a study of it.

All addresses below are linear addresses of the unpacked image (base 0x100000; object 2, the self-modifying rasteriser/MMX code, at 0x1b000).
Everything quoted as "verified" is taken from `re/*.md` and `docs/notes/*.html`, which record differential tests of the JS against the original running under Unicorn.

## 0. What is exact and what is not

| part | status |
|---|---|
| script interpreter, event scheduler, expression evaluator (float32 rules) | exact behaviour, checked on 40-60 random Frame values per function |
| `palette`, `doubleimage`, `blend`, `fade`, `mapimage`, `blit` (16->32) | 100 % identical pixels against the original |
| `echo5`, `reebok` | 300 resp. 80 consecutive frames: 0 differing bytes |
| `cellrd` | tables, palette, noise, A, B and screen identical for 400 frames (800 steps) |
| volume effects, metaballs, marching cubes | float-for-float identical (4096/4096), 5 volumes of marching cubes bit-identical |
| 3D pipeline (transform, shading, sort, clip) | camera/vertex/normal/env-uv agree to ~1e-6; **not bit-exact** |
| 3D fillers | **approximated**: same sampling positions, but floating-point plane gradients instead of the original's 16.16 patched immediates; silhouettes 99.7 % identical, interior mean error 0.3 - 1 per channel |
| tentacle / hires colour tables | **fitted** (tentacle LUT max error 3/255, hires alpha tables fitted); camel8 ramp is a measured table |
| whole demo vs. the original run headless | mean error **1.2 / 255** per channel, 93.6 % of pixels within 8 levels over 152 s (README). The JPEG decoder of the browser differs from the original's: ~1 level floor |

Not ported (unused by `script.unr`): 16-bit target renderers, flat-lit/flare/particle paths, zoom, colormap, matrix, dither, edges, wave, lowpass, other `echo*` variants, `volumesprites`, other displacement-modifier projections.

## 1. Display and timing

* VESA **640x480x32**, square pixels, 4:3. Several effects work in a **320x240 8-bit** buffer (`TEMP8`) and are palettised then doubled (section 3.1). The LightWave scenes
  (`.lwe`) use a vertical zoom `y = 1.2 * x` (862.488 vs 718.74): the aspect of 320x200 data, fixed in the loader.
* **All time is the music clock.** `Frame` (float at 0x1b28f8) is the song time in centiseconds, taken from IMS (`(int)time16.16 * 100 * 2^-16`). The script lines starting
  with `order row` fire when the XM position reaches them; at most one timed group fires per frame in the original (the port runs all due groups). Each event keeps its
  own `Frame` origin, set on its first `run`. That is why the port can pause/seek: it sets the module position and re-renders.
  The exceptions are effects that accumulate state per rendered frame (echo5, reebok, cellrd, bomb): they depend on the frames actually executed.
* **The script is data**: `script.unr` (116 lines) creates 16 buffers and ~45 events. Events run **strictly in creation order** every frame; the picture is composed by that order
  (for example `fillbuffer -> echo5 -> palette -> doubleimage -> blend`). The optional 4th group `{order row}` is a start gate. There are no layers in this build.

```
; frame function 0x101364: at most one timed group per frame, then the event loop 0x105d08
for e in events (creation order): if (e.startOrder < curOrder || (== && e.startRow <= curRow)) && !suppressed: e.run()
```

## 2. Timeline (times from `re/xm_times.json`, order:row -> seconds)

| time | order | what happens |
|---|---|---|
| 0:00 - 0:46 | 0-7 | `cellrd` preinit (silent, builds tables), then a slideshow of 7 title JPEGs (the first is shown from the start) (`blit TEMPIMAGES TITLE`, next image loaded one row later) |
| 0:46 - 0:52 | 8 | echo5 cage, palette `medusa.pal`, added over `efxlayer.jpg` |
| 0:52 - 1:04 | 9-10 | Isabella picture + LightWave scene `unrdisp.lwe` (soap bubble with displacement modifier) |
| 1:04 - 1:16 | 11-12 | `newhires.jpg` + `tentacle.exp` (from 12:35 / 1:13.5 the `bomb` effect blows its faces apart) |
| 1:16 - 1:37 | 13-16:29 | `box3.exp` glass cube whose box01 mesh is a **marching-cubes** polygonisation of a morphing metaball/plasma volume |
| 1:37 - 1:47 | 16:30-17 | `reebok` six-layer rotozoom, with a `fade` of `fears.tga` added |
| 1:47 - 2:11 | 18-21 | `hires.exp` with `displace247`, over a live Gray-Scott `cellrd` simulation |
| 2:11 - 2:29 | 22-24 | `camel8.exp` city with scrolling light band (`mapimage`) + `ppro` overlay |
| 2:29 - end | 25 | `sleep.jpg`, `TheEnd` at 25:63 |

(The note in `re/archive.md`: xmtime.js totals 154.56 s, libopenmpt reports 152.34 s; a 2.2 s mismatch is unexplained there, so the times in this table are as accurate as `xm_times.json`.)

## 3. The 2D building blocks (`docs/js/fx/basic2d.js`)

### 3.1 palette + doubleimage: the "low-res" path
8-bit work buffers hold indices. `palette` turns them into 32-bit colour through a 256-entry table made from a 768-byte VGA palette (6-bit components). The conversion is done
on the packed dword: the components are at most 63, so one `shl 2` multiplies all three at once.

```js
t32[i] = (((r << 16) | (g << 8) | b) << 2) >>> 0;     // 0x108e3d..0x108e4d
for (let i = 0; i < n; i++) dst[i] = t32[src[i]];     // 0x108e61: one table read per pixel
```
`doubleimage` writes every pixel as a 2x2 block (pitch 640*4 hard-coded in the original routine at 0x1e896). If the heights differ it centres vertically by `(x - (x>>31)) >> 1` rows.
Verified 100 % identical pixels (3 palettes, random data).

### 3.2 blend, fade
`blend {A B} {OUT} {1}` is a saturating add per byte (`paddusb`, MMX at 0x1e7a8); modes 2, 3, 11, 22, 33 exist. The script uses only mode 1. The original has two bugs that the port
copies: mode 22 falls back into the key-0 loop after the first non-key pixel, and mode 33 does `psubusb mm0,mm0` (writes zeros). The JS emulates the packed byte add with SWAR:

```js
const r = ((x & 0x7f7f7f7f) + (y & 0x7f7f7f7f)) ^ ((x ^ y) & 0x80808080);   // per-byte sum without carry-out
const c = ((x & y) | ((x | y) & ~r)) & 0x80808080;                         // bytes that overflowed
o[i] = r | ((c >>> 7) * 255);
```
`fade {r g b expr}` fades **towards a colour**: `f = (int)(expr * 255)` (truncating, see asm doc), `out = ((256-f)*src >> 8) + (f*col >> 8)` per channel through two 256-entry tables
(`A[f][v]`, `B[f][v]` at 0x1d1b40/0x1d1b48 in the original). In the script, `fade xf {FEARS} {TEMP} {0 0 0 (1.0-sqr(sqr(fabs(sin(Frame*0.0071)))))}` pulses a picture out of black, and
`blend addop {SCREEN TEMP}` adds it over the reebok layer. Verified identical.

### 3.3 mapimage: the city lights band
A 256x256 JPEG is loaded **linearly** into a 640x480 buffer, so the effect reads the buffer as rows of 256 pixels. Rows 48..207 become destination rows 160..319, each repeated 2.5 times
and scrolled by `(int)Frame` pixels (the *global* Frame, 100 px/s) with the wrap done by `and 0xff` on the index:

```js
for (let k = 0; k < 160; k++) for (let x = 0; x < 640; x++) d[(160+k)*640 + x] = s[(48+k)*256 + ((x + shift) & 255)];
```
Verified 100 % at 5 frame values.

### 3.4 Blit and formats
32 bpp is 0x00RRGGBB, 16 bpp RGB565. The original's 16->32 blit (every title picture) is **not** bit replication: R and B use `floor(v*255/31)`, G uses `v*4139 >> 10`, so 63 becomes
**254** (not 255) in green. Verified over all 65536 inputs. The port reproduces these tables.

## 4. Title slideshow and the two "feedback" looks

### 4.1 echo5 (46 - 52 s): an additive 3D cage with a recursive glow
It is not a picture feedback by warping. echo5 is a tiny software 3D engine drawing into the 320x240 8-bit buffer:

* a cage of **33 square sheets** (11 along each axis at -100..+100 step 20, 132 vertices, 66 triangles), rotated by an angle that integrates the *change* of the script expression
  `0.5*Frame` (`angle += delta*0.00425`; rotY uses 1.1x, rotZ 0.8x), scaled (2, 2.6, 2), and wobbled by three sines:
  `G = 0.3(sin(X/51.4 + t) + sin(Y/51.4 + 0.8t) + sin(Z/51.4 + 1.3t)) + 2`, where X, Y, Z are the *integer-truncated* model coordinates; then `v = M p * G`, `z += 1200`;
* every triangle is drawn **additively** (`dest += texel`, wrapping) with a perspective-correct mapper into a texture of **2500 random soft blobs** generated at start from `rand()`
  (so it depends on the rand state left by cellrd's preinit; the port shares `ctx.randSeed`);
* polygons are filed into 4096 depth buckets by `0.2*(z0+z1+z2)`; since addition commutes the order does not matter visually;
* after drawing, a **recursive smear** runs over the 320x200 buffer, first along rows then along columns: `p_new = p + T[p_prev]` with saturation, `T[k] = round(0.65 k)`.
  That is an IIR filter with gain 0.65 and gives the glowing trails.

```js
for (let y = 0; y < 200; y++) { let p = 0; for (let i = y*320; i < y*320 + 320; i++) { const v = buf[i] + T[p]; p = v > 255 ? 255 : v; buf[i] = p; } }
for (let x = 0; x < 320; x++) { let p = 0; for (let i = x; i < 64000; i += 320) { const v = buf[i] + T[p]; p = v > 255 ? 255 : v; buf[i] = p; } }
```
Verified 300 consecutive frames byte-identical (feedback included); the triangle library (4 clip stages, rasteriser 0x18253d) separately on 900 random triangles. The per-frame
products of angle and phases are emulated in x87 extended precision (`x87.js`) because the original keeps them unrounded.

### 4.2 reebok (1:37 - 1:47): six additive rotozoom layers
The 256x256 8-bit `picture.png` is drawn six times into the 320x240 index buffer, each layer rotated and zoomed differently, **added with saturation** into the buffer, then palettised
(`picture.pal`) and doubled. Per frame: `x0 = (Frame - t0)*0.6`, angle `a = f32(x0 * 0.006)`; six phases (0, 42, 84, 126, 168, 210) all decrease with time, wrap at 256; the zoom of a layer is
`(sin(a)*0.5 + 2) * phase/32`; a per-layer brightness table `trunc(k * f32(0.7 sin(0.9 q^2 + 2.24 q)))` (q = phase/256; may be negative, bytes wrap) turns texels into additive increments.

The mapper works on a **coarse grid**: 8x8-pixel cells on a 41 x 31 grid of corners. The corner texture coordinates are computed in floating point and converted to 16.16 with the magic-number trick
(asm doc, section 3); inside a cell the coordinates are interpolated incrementally in fixed point, with the carry of the fraction add feeding the integer byte (`adc`). The texture sits in a
64 KB-aligned block, so `bh:bl` is the address and wraps for free. One quirk is reproduced: `ecx` and `edx` still hold the destination pixel / integer steps in their low bytes and those
are added to the fractions too.

```js
let s = esi + ecxHi + cl; esi = s >>> 0; const c1 = s > 0xffffffff ? 1 : 0;   // add esi,ecx
bl = (bl + dl + c1) & 255;                                                   // adc bl,dl
s = ebp + edx; ebp = s >>> 0; const c2 = s > 0xffffffff ? 1 : 0;             // add ebp,edx
bh = (bh + dh + c2) & 255;                                                   // adc bh,dh
cl = Math.min(255, tbl[texel] + D[p]); texel = tex[(bh << 8) | bl]; D[p] = cl;
```
Verified: 80 frames on random start content, 0 of 76800 bytes differ in every frame. A detail found by testing: the angle uses the unrounded x87 value of `0.6*elapsed`, the phases use its float32 copy.

## 5. cellrd (from 1:47, behind the hires scene): Gray-Scott by lookup table
Pink worms in the lower-left and upper-right of the `hires.exp` scene are a chemical simulation: two species A, B (5 bits each, 0..31) on a 260 x 140 torus (stored in 264 x 144 bytes,
2-cell periodic border). A diffuses with a 5x5 box sum, B with a 3x3 box sum, and the reaction `dA = F(1-A) - A B^2`, `dB = A B^2 - (F+k) B` turns it into spots, stripes and worms. The script gives
`0.012 0.045 3.2` = F, k, D. The preinit event (script start, at time 0) builds everything and is then deleted.

**No floating point per cell.** At preinit two 16-bit tables are filled by a float loop (0x14ed9c):
T1 has 776 x 1024 entries (A: max 5x5 sum is 25*31), T2 has 280 x 1024 (B), index `(sum << 10) | (B << 5) | A`. The table already contains the whole reaction term plus the diffusion mean:

```js
// T1: floor(256 * clamp(31 * (D*(F(1-a) - a w^2) + 0.04*sumA/31), 0, 31)),  a = A/31, w = 0.7*B/31
// T2: floor(256 * clamp(31/0.7 * (D*(a w^2 - (F+k) w) + 0.7*sumB/31/9), 0, 31))
A2[i] = (t1[(s5[i] << 10) | ab] + bl) >> 8;         // ab = (B[i] << 5) | A[i]
B2[i] = (t2[(s3[i] << 10) | ab] + bl) >> 8;
```
The low byte of the 16-bit value is the fraction. A pseudo-random **dither byte** `bl` (running sum of a 32 KB noise table of `rand()` bytes) is added before the `>> 8`, i.e. **stochastic
rounding**: slow reaction rates still progress. A quirk preserved by the port: the caller draws a random step, but the kernel adds its loop counter instead. Per frame: eight moving 3x3 blob seeds
(`pos = trunc(117 sin(p2 t + p3) + 130, 63 sin(p4 t + p5) + 70)`), **two** steps, then the field is drawn twice into the 640-wide 32-bit screen (at 0,195 and 378,156 - hence the two worm areas)
through a 1024-entry colour table `pal[B*32 + A]`: `R = 255(1.5-2a)`, `G = 255(b + 4.3 a b^2 - 0.2)`, `B = 255(1 - 0.6 sin(5b) - 1.2 a)`.

The original's table builder uses 80-bit x87 intermediates; a few entries fall exactly on a float32 rounding tie, where JS doubles round the other way. Those are recomputed with BigInt
arithmetic that rounds to 64 bits after each operation (`x87.js`). Result: identical for 400 frames. ~2.5 ms/frame in node.

## 6. The 3D renderer (`scene`, `docs/js/fx/scene3d*.js`)

### 6.1 Pipeline
`scene NAME {SCREEN} {SCREEN} {file speed offset} {0 0}` loads `.exp` or `.lwe` (chosen by `strstr`) and `play NAME` sets the animation clock `x = (Frame - start)*speed*0.01 + offset`
(scene frames, 30/s nominal). Per frame: animate objects/lights/camera (TCB splines for keys), then `0x125990`:

* each vertex (a 0x60-byte record cached by frame number) is transformed to camera space, flagged against 5 frustum planes, projected `x*zoom/z + centre`; triangles outside one plane are dropped;
  **no z buffer and no back-face culling** (the dot product is dead code; the glass cube shows its inner faces);
* **painter's sort**: key = `float32((z0+z1+z2)*2000)`, with the float bits made monotonic and `>>12` (20 bits), two 10-bit radix passes; far to near, ties in creation order;
* the polygon is clipped in **camera space** (near, left, right, top, bottom; Sutherland-Hodgman, all attributes interpolated linearly), fan-triangulated, and scan converted by the filler chosen from the material mode.

```js
function sortKey(zsum) { f32[0] = Math.fround(zsum) * 2000; const b = u32[0];
  return (((b & 0x80000000) ? ~b : (b | 0x80000000)) >>> 12); }
polys.sort((p, q) => q.k - p.k || p.s - q.s);        // far first, creation order for ties
```
Shading is per vertex: environment mapping `u = 127 nx + 128, v = 127 ny + 128` from the camera-space unit normal; smooth lit mode `I = min((amb + sum max(0, n.d)/|d|) * 230.77, 254)`
(ambient 16/230.769). Vertex normals are the normalised sum of the unit normals of adjacent triangles. Checked against dumps of the original to ~1e-6.
Geometry conventions found by testing: `.exp` objects are stored in world space; `.lwe` handedness is flipped on z; the **last `.exp` TCB key has a zero incoming tangent**.
A real quirk of the original that the port reproduces: `tentacle.exp` has one rotation key and the original interpolates past the end of the key array (uninitialised heap), which makes the
tentacle rotate about x by `1.58e-4 * t` rad.

### 6.2 Fillers (approximated)
There is no generic rasteriser. A template per (material mode, depth) is patched by its setup routine (see asm doc, section 1). The modes used:

| mode | scene | pixel |
|---|---|---|
| 3 | unrdisp (bubble) | `dst = tex32[v<<8 | u]` |
| 4 | box3 (glass cube) | `dst = pal32[tex8[v<<8 | u]]`, `pal32 = palette & 0xfcfcfc` |
| 2 | camel8 (city) | `dst = lut[(L<<8) | tex8[...]]`, L = interpolated light, a 64K ramp built at load |
| 0x84 | tentacle | two 8-bit textures (file uv and env uv): `dst = lut[(pink<<8) | crater]`, lut ~ `clamp(0.746(P+C) - 1.6)` per channel |
| 0x24 | hires (glass) | two passes: `c32` premultiplied by alpha, then `dst = c32 + mul[a][dst]`, `mul[a][d] = floor(d(63-a)/63)`, packed add without saturation |

The JS keeps the original sampling positions (start `(x + 0xfff0) >> 16`, end `(x + 0xffe0) >> 16`, same for rows) but computes plane-equation attributes in floating point:
```js
dst[ro + x] = tex[((((v0 + dv*x + 65536) | 0) & 255) << 8) | (((u0 + du*x + 65536) | 0) & 255)];
```
This is the **approximated** part: silhouettes 99.7 % identical; interior differs by the original's 16.16 quantisation, 8-bit fraction packing and carry leaks, and the fitted colour tables.
Speed 1.6 - 4.5 ms/frame in node (tentacle: 2741 triangles). The 16-bit renderers and flare/particle paths exist in the binary but are unused.

### 6.3 Mesh-modifying effects
* **displace247** (script: `{wscene1 Box02 0.3 -0.04 0.17+0.04*sin(Frame*0.002)}`) wobbles every vertex of one object radially: `v' = c + (v-c)*(1 + A sin(|v-c| F + Frame S))`. A, S, F are script expressions evaluated per frame.
  Verified: 5e-5 after 90 frames.
* **bomb** (`{ipl tentacle sqr(Frame*0.03)}`): unshares the mesh into three private vertices per triangle and flies every triangle away from the object centre,
  `centre' = g + dir*|c-g|*(1 + speed*d)`, speed = `(1.2 - |c-g|/max) * (rand()/32768 + 0.3)`. `rand()` is the Watcom LCG (`seed*0x41c64e6d + 0x3039`, `>>16 & 0x7fff`), so the explosion is the same each run: the seed in the
  continuous original run is 0xfc0b2df1 at creation (cellrd consumed rand() since 0x565bb039). The per-face state is bit-identical to the original's.
* **unrdisp displacement modifier** (an `.lwe` chunk): every vertex is projected spherically around a Null object, looked up in the 256x256 map `Disp2.tga` (tiled 3 x 4) and pushed out by up to 2 units:
  `u = frac(1 - lon/2pi)*3, v = frac(0.5 - lat/pi)*4, h = Disp2[(floor(v*255)&255)<<8 | floor(u*255)&255], P = P0 + q/|q| * h * 2/255`.
  Exact to 2e-7 at t = 30; at t = 75 ~5 % of the vertices differ by one map texel (float32 rounding of the u/v chain). The modifier also uses the Null's rotation.
  The other projection types (planar, cylindrical) are in the code and not ported (no shipped file uses them).

## 7. The volume sequence (1:16 - 1:37): metaballs, plasma, marching cubes
The script builds a small dataflow of named 16x16x16 float volumes (`volume3D`, `copyvolume`, `metaballs`, `morphvolume`, `plasma1volume`, `mulvolume`) and polygonises the result into the
`box01` object of `box3.exp` every frame (`marchingcubes test box01 OurVolume 1`). Events run in creation order, which *is* the dataflow:

```
SrcVolume <- vbox.dat ;  per frame: OurVolume = SrcVolume ; OurVolume += metaballs(test1.mbs)
OurVolume = OurVolume*t + V8Volume*(1-t)   ; t = clip10(0.5 + 0.3 sin(0.01 F) + 0.7 cos(0.007 F))
PlasmaVolume = 0.7 + 0.7 sin(r + 0.02 F)   ; OurVolume *= PlasmaVolume ; marching cubes at iso 0.65
```
* **Volumes** are 0x4000-byte float arrays, index `x + 16y + 256z`, registered by name in a 32-slot table (linear `strcmp`). Kernels are x87 unrolled by 4. Values are computed in 80-bit and rounded to float
  on store, which the JS reproduces with doubles + `Float32Array`, bit for bit. One detail found by testing: the script-expression factor is rounded to float before use.
* **plasma1volume**: `v = a + b sin(dist + 0.02 Frame)`, `dist` a precomputed table sqrt((x-7.5)^2+...); only **one octant** (8x8x8 = 512 `fsin`) is evaluated, each result stored four times (x, y mirrored), and the finished planes z<8 are copied onto 15-z.
* **metaballs** (`test1.mbs`: 8 lines `X Y Z R C`, each a script expression of Frame): every ball is added (never cleared by the effect) with the quartic `f(d2) = (A d2 + B) d2 + C`, `A = C/R^4`, `B = -2C/R^2`: value C at the centre, value and slope zero at radius R.
  The grid points sit at `(i-8)*0.25`. The renderer precomputes squared distance tables per axis and clips loops to the sphere's bounding box. Only `A = C/(R*R*R2)` needs real x87 emulation (BigInt) to be bit-exact for every radius.
* **marching cubes** (iso 0.65, constant): per sample, the 3 edges from the lower neighbours carry a vertex when exactly one end is above the threshold; vertices are interpolated `t = (v1-thr)/(v1-v0)`, their normals are the interpolated central-difference gradient, normalised with a table-driven reciprocal square root
  (asm doc, section 8). Triangles come from the classic 256-case table (identical to the 73MS table); vertex slots are indexed by *edge* (array of 4096 x-edges, then y, then z) so triangles share vertices. The object's mesh is replaced with up to 4000 faces of 0x3c bytes (a copy of face 0, so the material is kept) and a vertex count of 0x3000.
  Verified for 5 volumes (224 - 3360 triangles): count, slot indices, positions, normals, face normals all bit-identical.

## 8. Scene notes
* **Soap bubble** (`unrdisp.lwe`, 52 s - 1:04): `.lwe` scene with env-map `env1.jpg` (mode 3, file uv) over the `isabella.jpg` backdrop; the displacement modifier above wobbles it. Matches at scene times 210-499 once the Null's turn (90 deg at frame 299, bank 40 deg at 400) is applied.
* **Tentacle** (`tentacle.exp`, mode 0x84, two textures) with the **bomb** explosion from 1:13.5.
* **Glass cube** (`box3.exp`, mode 4): the camera sees inner faces (no culling); the marching-cubes mesh lives inside it. A huge mostly-off-screen quad of the box is the reason clipping happens in camera space.
* **hires.exp** (mode 0x24, alpha glass) with `displace247` over the live `cellrd` field; **camel8.exp** (mode 2 lit, `displace247` on `Box02` with other parameters `0.2 -0.02 0.10+0.05 sin(0.002 Frame)`) over `mapimage` light band + `ppro.jpg` added with `blend`.

## 9. How it was checked
`re/unpack_pmodew.py` unpacks the EXE under Unicorn; `re/boot.py` boots it to its main loop (snapshot `state.bin`); `re/harness.py` calls any original function with custom buffers; `re/golden.py` renders whole reference frames from the original
(virtual music clock; deterministic: two runs 100 % identical); `tools/replay.mjs` + `tools/cmp-all.py` compare them with the port. Each effect has a differential test (`re/dt_*`, `tools/test-*.mjs`).
Caveat recorded in `re/clock.md`: coarse fast-forward changes the state of stateful effects (cellrd, echo), so exact frames need a single run from t = 0.

## 10. Art and data: where it lives, how it was decoded

Everything is in **`TOUR.98`** (4,752,364 bytes, 116 records, no file is stored outside it). Record layout: `[u32 usize][u32 csize][u32 namelen][u32 dataofs][u32 nameofs][u32 dataend][u8 type][name\0][payload]`,
offsets absolute; the loader is `0x107680` (directory) / `0x107907` (load by name). Types: `j` raw JPEG (37 files), `p` raw PNG (18), `t` TGA (3; stored with the "dlz" LZ when smaller, `csize < usize`), `2` dlz LZ (55: scripts, palettes,
meshes, volumes), `b` BWT/MTF/Huffman (the XM), `3` adaptive-Huffman LZ (`RYMDLEGO.XM`), `1` byte RLE. Offsets below are file offsets of the payload (parsed from the archive directory, `tools/extract.py` does the same; the decoders were compared with the original's own routines in Unicorn: `TOUR3.XM` 2,894,937 bytes equal, `RYMDLEGO.XM` 74,016 equal, 113 files identical + 3 TGA size-checked by `tools/test-archive.mjs`).
Extracted copies: `re/assets_raw/` (as stored) and `docs/assets/` (what the browser reads; TGA converted to PNG).

Previews (made from `re/assets_raw/` with Pillow, resized): [`figures/tour_pictures.png`](figures/tour_pictures.png) (16 cover/backdrop pictures, 160x120 thumbnails) and
[`figures/tour_textures.png`](figures/tour_textures.png) (the 256x256 textures, `FONT0.PNG` and `FEARS.TGA`, 128x128 thumbnails; palettised PNGs shown with their own palette).

### 10.1 Full-screen pictures (JPEG, 640x480 true colour)
All 640x480 JPEGs, true colour (distinct-colour counts measured with Pillow: 39,179 - 67,895 for COUNTRYF/FENDERCL/SILVER/CAMELC, more than 70,000 for the others except where listed). `createBuffer NAME 640 480 16 file` decodes into an **RGB565** surface (so the 16->32 blit tables of section 3.4 apply),
`... 32 file` into 0x00RRGGBB. The original uses its own JPEG decoder; the browser's differs slightly (README: ~1 level floor).

| file | offset | bytes | used as |
|---|---|---|---|
| COUNTRYF, FENDERCL, FALCON, SILVER, ECHO, CAMELC, UNREAL .JPG | 3,581,210 / 3,425,606 / 3,522,228 / 3,380,036 / 2,801,569 / 3,471,155 / 3,310,594 | 53,713 / 45,513 / 58,944 / 45,532 / 71,094 / 51,037 / 69,406 | the 7 title-slideshow pictures, loaded into `TEMPIMAGES` then blitted to `TITLE` (countryf first, from the script start) |
| TITLE.JPG | 3,182,874 | 60,592 | initial `TITLE` buffer content |
| ISABELLA.JPG | 3,262,299 | 48,259 | backdrop of the soap-bubble scene |
| NEWHIRES.JPG / Q.JPG / HIRES.JPG | 3,752,990 / 3,112,540 / 3,058,967 | 95,082 / 70,299 / 53,542 | backdrops of the tentacle / cube / hires scenes (`changeBuffers bbb {NEWHIRES}`, `{DREAMS}` = q.jpg, `{HIRES}`) |
| PPRO.JPG | 3,243,500 | 18,761 | overlay of the city scene; only **256 distinct colours** (counted), added with `blend` mode 1 |
| EFXLAYER.JPG | 2,401,338 | 26,027 | layer added over the echo5 picture; 669 distinct colours |
| SLEEP.JPG | 2,319,413 | 81,887 | final "THEEND" picture |
| SCROLL.JPG | 2,719,428 | 14,255 | **256x256**, 34,111 colours: source of the `mapimage` light band (section 3.3) |

About 25 more JPEGs in the archive (MEMORIES, BINOCHE, WHITE, SCR, TOURZ2, PULSEW, CLASSICA, VIRTUALD, WSPEDO, CUV, LENV, BUMPY, A, PYGMYW, KVET, RUUTI2, EYE2...) are **not referenced by `script.unr`**; their role was not investigated.

### 10.2 Textures and maps
| file | offset | bytes | format |
|---|---|---|---|
| PICTURE.PNG (+ PICTURE.PAL) | 2,688,155 / 2,149,953 | 19,704 / 768 (386 packed) | 256x256 PNG, 8-bit paletted, **74 colours** used; the reebok picture, coloured at run time by `picture.pal` (VGA 6-bit RGB) |
| MEDUSA.PAL | 2,148,810 | 768 | palette of the echo5 look (also GREEN.PAL, ORANGE.PAL exist, unused by the script) |
| ENV1.JPG | 2,707,893 | 11,499 | 256x256 true colour (19,232 colours), environment map of the soap bubble |
| CRATER.PNG, PINK.PNG | 2,909,023 / 4,438,262 | 44,993 / 43,993 | 256x256 PNG 8-bit, 256 / 248 colours; the two textures of the tentacle (file uv / env uv) |
| CITYLIGH.PNG | 2,872,701 | 36,286 | 256x256 PNG 8-bit, 256 colours; env map of the glass cube |
| REDIO.PNG | 2,733,718 | 22,787 | 256x256 PNG 8-bit, 256 colours; colour of the hires glass (alpha comes from the average of PINK's palette) |
| SCAPE.PNG | 2,756,540 | 44,995 | 256x256 PNG 8-bit, 256 colours; camel8 city texture |
| DISP2.JPG / DISP2.TGA | 3,972,262 / 3,979,099 | 6,802 / 66,322 (8,398 packed) | 256x256 height map of the bubble modifier (TGA: header says 8-bit **paletted** type 1, 256x256; the loader uses the red channel; the JPEG version has 255 colours) |
| FEARS.TGA | 2,427,400 | 307,218 (260,718 packed) | header: image type 3, **8-bit greyscale 640x480** (18 + 307,200 bytes); loaded into a 32-bit buffer, faded in by `fade` |
| VISUAL.TGA | 4,620,053 | 64,786 (13,646 packed) | 8-bit paletted type 1, 320x200 per header; not referenced by the script |
| FONT0.PNG | 4,649,178 | 3,506 | 320x200 PNG, 8-bit palette with **2 colours** (a bitmap font sheet); not referenced by `script.unr` (the demo shows no text from it in this script) |
| FLARE1.UNR | 4,743,713 | 2,854 | a 128x128 PNG (122 colours) with an odd extension: a lens-flare sprite, unused by the script |

Note on formats: PNG textures are loaded as 8-bit **indices** (palette kept) for the 8-bit material paths and converted for the 32-bit ones; the JPEG-derived ones become 0x00RRGGBB. The mesh materials reference up to 5 texture slots (13-byte names) per material; the modes are listed in section 6.2.

### 10.3 3D models and scenes
Two in-house formats made by the group's converters (see `docs/notes/scene3d-formats.html`):

* **`.exp` (magic `UEXP`)**: export of a 3D Studio MAX scene. Header = counts (objects, cameras, nulls, lights, particles, materials) + duration; materials (81-byte name+5 texture slots, 9 colour floats, shininess/opacity/mode/flags);
  per object: world-space vertices, per-corner UVs, triangles with material index, node matrix, pivot, rotation/position keys (TCB). Extracted counts (parsed with the port's `parseEXP`):

  | file | offset | bytes (packed) | object | vertices | triangles | duration |
  |---|---|---|---|---|---|---|
  | TENTACLE.EXP | 2,215,155 | 105,605 (55,066) | `tentacle` | 1,396 | 2,741 | 700 frames @30 |
  | BOX3.EXP | 2,171,989 | 1,073 (434) | `Box01` (cube; its mesh is replaced by marching cubes) | 8 | 12 | 500 |
  | HIRES.EXP | 2,192,515 | 44,345 (14,877) | `Box02` | 602 | 1,200 | 100 |
  | CAMEL8.EXP | 2,177,610 | 44,345 (14,870) | `Box02` | 602 | 1,200 | 100 |

  (hires and camel8 have the same size and mesh data; they differ by material/camera. Other `.exp` files in the archive - BOX2, CAMEL, CUBE, EXPORT, IPLTEST, MAP, SLAM, SLAM2, SLAM3, UNREAL - are not used by the script.)
* **`.lwe` + `.lwv` (UNLW)**: a LightWave scene reduced to 44-byte Kochanek-Bartels motion keys (`.lwe`, 814 bytes for `UNRDISP.LWE` at 2,170,978) referring to an object `.lwv`. **Y-SOAP1.LWV** (39,866 bytes, 19,511 packed, offset 2,151,430) is the soap bubble:
  1,106 vertices (3,318 floats), 2,208 triangles, 1 surface; the displacement modifier of the `.lwe` (chunk 0x0b) names `Disp2.tga`. Other `.lwv/.lwe` (ZZZ, TESTMAP, WIRE1, DEL3/4, BOKS, DABOX, UUU, ZSCENE, JEAS1, WOJSPERI, UNREAL) and `ZORRO.LWO` are not referenced by the script.
* **Volumes**: `V1..V8.DAT`, `VBOX.DAT` are raw 16x16x16 float32 fields (16,384 bytes each, dlz-packed); the script loads `V8` and `VBOX`. `*.MBS` are the metaball scripts (`TEST1.MBS` used).
* **Music**: `TOUR3.XM` (type `b`, 2,146,697 packed -> 2,894,937 bytes, "tribal cloud no. 9", XM 1.04, 20 channels, 26 orders, 32 patterns, 31 instruments / 21 samples, 2,842,748 sample bytes, standard delta-coded PCM) and `RYMDLEGO.XM` (74,016 bytes, 16 channels, 17 samples; not used by the script). The original mixes the music itself (`TOUR.NFO`: SB32 disabled because the music is over a megabyte).
* **Misc**: `SCRIPT.UNR` (4,221 bytes, 1,498 packed, dlz, at offset 36: the demo's whole timeline), `TUNNEL.MAT` (6,268 bytes, not referenced), `M_*.BIN` (256 bytes each, small tables, not analysed).
