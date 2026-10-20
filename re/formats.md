# TOUR pixel formats and buffer descriptors (verified by running the original under Unicorn)

All facts below were measured with `re/dt_basic2d/*.py` (snapshot `state.bin`, 16 buffers of the script already created).

## Buffer descriptor (`createBuffer` table)
Table `0x1f91e0`, stride `0x28`, count in `[0x1b7558]` (16 after the script's createBuffer lines).

| off  | meaning |
|------|---------|
| 0x00 | name, char[16], **lower-case** (events refer to buffers by exact `strcmp` after the script text was lower-cased) |
| 0x10 | width (640 / 320) |
| 0x14 | height (480 / 240) |
| 0x18 | bits per pixel: 8, 16 or 32 |
| 0x1c | pointer to the surface object (C++ class, vtable `0x1b24f8`, 0xb4+ bytes) |
| 0x20 | **pixel data pointer**, valid only while locked: the frame function calls `0x105d08` first (loops `desc[+0x20] = Lock(desc[+0x1c])`, Lock = `0x1080da`) and `0x105db6..` unlocks at the end |

Surface object: `+0 w, +4 h, +0x18 pitch in bytes (w*bpp/8, no padding: 0xa00 = 640*4, 0x500 = 640*2)`, `+0x20 format id` (0x3e8 = 8888, 0x3ee = 565, 0x3fc = 8 bit palettised),
`+0x2c bpp, +0x30 bytes/pixel`, then `{shift,size,mask}` triplets: R `+0x34/+0x38/+0x3c`, G, B, A.
Row pitch is always `w * bytes_per_pixel` (no padding), the buffers are plain top-down raster order.

## Pixel formats
* **32 bpp = 0xAARRGGBB** little-endian dword (R shift 16, G shift 8, B shift 0, A shift 24 mask 0xff000000). The JS port's `Uint32Array` with 0x00RRGGBB is correct; the alpha byte is **preserved** by 32->32 blits (random data copies identically). In memory: B,G,R,A.
* **16 bpp = RGB565** (R mask 0xf800 shift 11, G 0x07e0 shift 5, B 0x001f).
* **8 bpp** = palette index. A bare 8-bit surface blitted to 32 bit uses an identity grey palette (`0xb1 -> 0xb1b1b1`); the `palette` effect is what really colours 8 bit data.

## Conversions done by the original blitter (`blit`, class method `0x1351ec`)
* 32 -> 32 and 16 -> 16: straight copy, 100 % identical.
* **16 -> 32** (RGB565 -> 0x00RRGGBB, used by every `blit {TITLE} {SCREEN}`): per-channel tables, *not* bit replication:
  * R (5 bit) and B (5 bit): `floor(v*255/31)` = `[0,8,16,24,32,41,49,57,65,74,82,90,98,106,115,123,131,139,148,156,164,172,180,189,197,205,213,222,230,238,246,255]`
  * G (6 bit): `v*4139>>10` = `0,4,8,...,92, 97,...,189, 194,...,254` (note: 63 -> **254**, not 255). Table built by the code at `0x1a5a..` from two 256-entry lookup tables at `0x28a380/0x28a384` (one for the low byte, one for the high byte, summed - two pixels per loop).
  * alpha = 0. Verified over all 65536 input values.
* 32 -> 16: truncation `(r>>3)<<11 | (g>>2)<<5 | b>>3` (checked on one pixel; not used by the script).
* The blitter is a generic DirectDraw-like library: `Lock` on both surfaces (`0x13331c`), format-pair specific converter chosen by `0x1a2ffc`, runs it (`0x1a44f4`), `Unlock` (`0x133334`).

## Harness tips (hit while measuring)
* Events can be created with the original parser: `call(0x104fd8, eax=line)` where line = `addEvent type name {in..} {out} {params}`; **names must be lower case**, and the parser scans for a 4th `{...}` group without bound (infinite loop if none exists) -> append ` {0 0}`.
  Event layout: `+0x20 init, +0x24 run, +0x28 free, +0x2c state, +0x30,+0x34.. input descriptors (up to 3), +0x40 output descriptor, +0x44 flags, +0x48/+0x49 two bytes (fourth group, `%d %d`)`. New event = `list[count]` with list at `0x1f8c20`, count `[0x1b755c]`.
  `init(eax = params text, ecx = event)`, `run(eax = state, edx = event)`.
