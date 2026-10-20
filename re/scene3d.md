# TOUR 3D scene renderer (`scene`, `displace247`, `displacenorm`, `bomb`) - reverse engineering notes

All addresses are linear (image base 0x100000; obj2 at 0x1b000). JS: `docs/js/fx/scene3d*.js`. Tools: `re/dt_scene3d/` (Unicorn drivers), `tools/test-scene3d*.mjs`.

## Driving the original (how everything below was measured)
`re/dt_scene3d/lib.py` (`init_scene`, `play`, `render`, `dumpbuf`): builds an event by hand, calls the effect `init` (0x10edb8, eax = params text, edx = event with `[ev+0x40]` -> buffer descriptor),
`play` = what the script command does (`[rec+4]=0x105e0c`, speed `[rec+0x92]`, offset `[rec+0x96]`, start `[rec+0x9a]`), then `run` 0x10ee10 with the float time in `[0x1b28f8]`.
`golden3d.py` renders scene frames on a black SCREEN (`re/dt_scene3d/ref/`), `dumpverts.py` dumps camera / object / vertex records (`gt/*.json`), `cov*.py`, `trace*.py`, `loops.py` locate the fillers.
NB: the original dumps a debug texture to `chn.pic` with DOS INT 21/3C while loading a material; `lib.py` fakes the call (golden.py/emucore got the same fix).

## `scene` event
`scene NAME {SCREEN} {SCREEN} {file speed offset} {0 0}`: init 0x10edb8 = `sscanf("%s %f %f %c")` into a 0x1c byte state (+0x10 speed, +0x14 offset, +0x18 -> 0x9e byte scene record), then 0x10599c builds the scene
(loader 0x119640 for `.exp`, 0x11c09c for `.lwe`, both choose by `strstr(name, ".exp")`/".lwe"), copies the record to the global 0x1f9d90 (the renderer works on that copy; objects at `[0x1f9d98]` stride 0x36c,
nulls `[0x1f9d9c]` stride 0x1e4, cameras `[0x1f9da0]` stride 0x128, materials `[0x1f9da4]` stride 0xf3, lights `[0x1f9dac]` stride 0x100).
`play NAME` (0x1048d0) sets the render callback `[rec+4] = 0x105e0c`, speed/offset from the state and the start time; before `play` the event does nothing.
Run (0x10ee10): copy record to global, `call [rec+4]`, copy back. 0x105e0c: `x = (Frame - start) * speed * 0.01`; if `x > duration - 0.5` the start is reset (loop); scene time = `x + offset` (frames of the file, 30/s nominal).
Then: animate objects 0x120588 / lights 0x1213ac / camera, render 0x125990.

## Render pass 0x125990
* globals 0x1f9d20..: clip rect 479.5 / 639.5, zoom x/y `[0x1f9d2c]/[0x1f9d30]`, centre `[0x1f9d38]=W/2`, `[0x1f9d34]=H/2`, near plane `[0x1f9d3c]=0.5`, sort scale `[0x1f9df0]=2000.0`.
* zoom: `.exp`: `W/2 / tan(fov/2)` (fov from the camera track, 0.8378 -> 718.73 at 640 px); `.lwe`: 718.74 (x) and 862.488 (y = x*1.2, 320x200 pixel aspect) fixed.
* per object 0x152350 -> 0x181d5c ("poly submit", object -> camera 3x4 matrix at 0x214b70): every vertex (0x60 byte record: +0 pos, +0xc normal, +0x18/1c/28 camera xyz, +0x20/24 screen xy, +0x2c/30 u,v,
  +0x34/38 second uv, +0x3c clip flags, +0x44 light, +0x5c 1/z) is transformed once per frame (cached by frame counter `[0x1f9d28]`), flagged against the frustum (0x10 z<near, 2/1 x left/right, 8/4 y top/bottom,
  planes through the screen rectangle), triangles outside one plane are dropped; **no back face culling** (the `test eax,eax` after the dot product is dead code; the glass cube shows its inner faces).
* depth key of a triangle: `float32((z0+z1+z2) * 2000)`, bits made monotonic (`b>=0 ? b|0x80000000 : ~b`), `>>12` (20 bit): `0x107ebc` radix pass 1 (low 10 bits, list 0x1f73c0), 0x125b61 pass 2 (high 10 bits, buckets 0x2045a0).
  Polygons are drawn from the highest key (far) to the lowest; equal keys keep creation order. Painter's algorithm, no z buffer.
* every polygon calls the material's draw routine `[mat+0x50]` (32 bit target) / `[mat+0x4c]` (16 bit), chosen at load time in 0x11f14c from the material mode byte `[mat+0xa6]`:
  low nibble = shading (1 flat lit, 2 smooth lit, 3 texture with file uv, 4 environment map), 0x10/0x20/0x40/0x80 = extra texture slots (slot 3 / 1 / 2 / 4 of the .exp material).
* the draw routine clips the polygon (0x158c30: Sutherland-Hodgman in **camera space**, order near, left, right, top, bottom; new vertices = linear interpolation of all attributes, 0x184c0c), fan-triangulates (0x15964c) and
  calls the scan converter 0x123440 (one texture) / 0x1238c4 (two textures) with the setup function of the mode in ecx.

## Materials used by the demo (what the loader derives)
| file | material (.exp mode byte / slots) | `[mat+0xa6]` | 32 bit draw | setup / filler |
|---|---|---|---|---|
| unrdisp.lwe (y-soap1.lwv, env1.jpg) | lwe default shading 3 | 0x03 | 0x12449c | 0x16156c (loop 0x161fc3) |
| tentacle.exp (crater.png slot0, pink.png slot4) | 4 + slot4 | 0x84 | 0x124624 | 0x162aac (loop 0x163644) |
| box3.exp (cityligh.png) | 4 | 0x04 | 0x125110 | 0x15df9c (loop 0x15ea0b) |
| hires.exp (redio.png slot0, pink.png slot1) | 4 + slot1 | 0x24 | 0x125400 | 0x16a510 (loops 0x16af9b, 0x16afd2) |
| camel8.exp (scape.png) | 2 | 0x02 | 0x1257a4 | 0x16d240 (loop 0x16dc88) |
.exp materials: name[16], 5 x texture name[13], 9 floats (ambient, diffuse, specular rgb), u8 shininess, opacity, mode, flags. PNG textures are 8 bit paletted 256x256 (indices kept), jpg is converted to 0x00RRGGBB.

### Vertex shading (0x181d5c, verified against dumps to 1e-5)
* camera space unit normal `n_c = M n` -> env map coordinates `u = 127*n_c.x + 128`, `v = 127*n_c.y + 128` (modes 4 / 0x24 / 0x84).
* mode 3 (lwe): `u = uv.u*255`, `v = uv.v*255` (file uv). `.exp` uv are stored **per polygon corner** and written into the vertex record just before the polygon is drawn: `u = uv.u*256`, `v = -uv.v*256`.
* mode 2 light: `I = min((amb + sum_lights max(0, n.d)/|d|) * 230.769, 254)`, d = light - vertex in object space, ambient 16/230.769 = 0.06933 (230.769 = (224+16)/1.04, 1.04 = constant pushed in 0x10599c).
* vertex normals: sum of the unit triangle normals of every triangle sharing the vertex, normalised (0x14cee6); for .lwe the winding is mirrored (the loader flips z).

### Scene geometry conventions (verified)
* `.exp` objects: stored in world space; the loader makes object space `p_o = (p_file - tm_translation) * tm3^-1`; world = `(p_o - pivot) * tm3 + position_key(t)`.
  Camera: `pos`, `target`, fov keys (TCB splines, as 73MS); right = forward x up(0,0,1), down = forward x right, forward; cam = R (w - pos).
* **tentacle quirk**: tentacle.exp has a single rotation key; the original interpolates past the end of the key array, so a rotation about x by `angle = 1.5819e-4 * t` (t = scene frame, `obj+0x268 = t/65536`) shows up
  in the emulated demo (it is *uninitialised heap* dependent: with truncated parameters the angle was 0). The port applies this angle for tentacle.exp.
* `.lwe`: LightWave handedness is flipped on z: object matrix = `S R(h,p,-b) S` with `S=diag(1,1,-1)`, translation `(x,y,-z)`; camera position = key as is, camera rows = `[col0(R), -col1(R), col2(R)]` of `R(h,p,-b)`.

## The unrdisp displacement modifier (lwe chunk 0x0b, class 0x118498/0x118b0c/0x118c94)
75 byte record: `char texture[13]` ("Disp2.tga"), 46 bytes `{f32 size[3], center[3], ..., f32 tileU @+0x24 = 3, tileV @+0x28 = 4, u8 type @+0x2c = 2 (spherical), u8 axis @+0x2d = 0x0b (Y)}`, `f32 amplitude = 2.0`, `char target[12]` ("Null").
Every frame (type 2, 0x118924): `q = P0 - NullPos(t)` (the Null object's key position, TCB); `(lon, lat) = spherical(-q.x, q.y, q.z)` (0x156414: `lon = -atan(a/c) (+pi if c<0)`, `lat = atan(b/sqrt(a^2+c^2))`);
`u = frac(1 - lon/2pi)*3`, `v = frac(0.5 - lat/pi)*4`; `h = Disp2[(floor(v*255)&255)<<8 | floor(u*255)&255]` (256x256 byte map, the red channel of disp2.png);
`P = P0 + q/|q| * h * 2/255`; normals are rebuilt (0x14cee6). Exact to 2e-7 in position at t = 30 (all 1106 vertices), ~5 % of the vertices differ by one map texel at t = 75 (float32 rounding of the u/v chain).
Other projection types/axes (planar 0, cylindrical 1, axis X/Z) exist in 0x156568 and are not implemented (no shipped file uses them).

## The fillers (the self-modifying code)
Every filler is a template in object 1 (0x15xxxx-0x16xxxx) whose immediates are patched by its setup function before each triangle; the inner loops all follow the same pattern (see `docs/notes/scene3d-raster.html`):
`mov eax,[ecx*4+TEXTURE]` / `add esi,DU ; adc cl,DUint` / `add ebx,DV ; adc ch,DVint` / `mov [edi+edx*4],eax` / `inc edx ; jne`, i.e. a 256x256 texture indexed by the two 8-bit integer parts (`ch:cl`, wrap = repeat), fractions kept in the
high halves of esi/ebx, the carry of the 32 bit adds feeding the byte adds. Affine only (no perspective correction). Edge walking in 16.16: start `x = (fix + 0xfff0) >> 16`, end `(fix + 0xffe0) >> 16`, rows likewise;
attribute gradients from the three vertices (plane equation), left edge corrected for the sub-pixel start.
* mode 3: `dst = tex32[v<<8|u]`.
* mode 4 (box3): `dst = pal32[tex8[v<<8|u]]`, `pal32 = palette & 0xfcfcfc`.
* mode 2 (camel8): `dst = lut[(L<<8) | tex8[v<<8|u]]`, `L` interpolated (integer part of ebx's high byte, packed with the v fraction in the same register).
  The 64K colour ramp (built by 0x1570c0) = `pal * diffuse-ramp(L) + specular-ramp(L)`, ambient 0.141 up to L=16, linear diffuse to L=224, specular `pow`-like ramp to 255 above 224; the port embeds the measured white/black texel columns.
* mode 0x84 (tentacle): two 8-bit textures with their own coordinate pair (file uv -> crater in bl/bh, env uv -> pink in cl/ch, the second pair uses 8-bit fractions in dl/dh): `dst = lut[(pink<<8) | crater]`,
  lut ~ `clamp(0.746*(P+C) - 1.6)` per channel (symmetric; fitted, max error 3 of 255 against the 64K dump).
* mode 0x24 (hires): pass 1 per pixel: `c32[uv]` (redio colour * alpha/63) and alpha row `a = floor(avg(pink palette rgb)*63/255)` -> scanline buffer, pass 2 (0x16afd2): `dst = c32 + mul[a][dst_channel]`
  with `mul[a][d] = floor(d*(63-a)/63)` (table at 0x2a033a8), packed add without saturation.

## Not reproduced exactly
* fixed point of the original (gradients quantised to 16.16, 8-bit fraction packing in dl/dh, carry leaks of the packed adds) -> a few % of pixels differ by one texel; silhouettes match 99.7 %.
* tentacle LUT / hires colour and alpha tables are fitted formulas (their builders in matmgr.c 0x11e3xx were not ported); the camel8 ramp is a measured table.
* near-plane / frustum clipping follows 0x158c30 but the original's float32 intermediate rounding is not copied.
* 16 bit target (RGB565) renderers and the flat-lit / flare / particle paths are not ported (unused by script.unr).

## API for other effects (`ctx.engine.events.find(name).state`)
`getObjectNames()`, `getObjectBBox(name)` -> `[xmin,ymin,zmin,xmax,ymax,zmax]` (object space, the original's `obj+0xbc..0xd0`), `setObjectMesh(name, {pos,idx,nrm?,faceNormals?,smooth?})` replaces the object's mesh
(positions in object space; used by marchingcubes every frame, `box01` of `test`), `getScene()`.
