# TOUR.98 archive format and decoders

Record: `[u32 usize][u32 csize][u32 namelen][u32 dataofs][u32 nameofs][u32 dataend][u8 type][name\0][payload]`; offsets absolute, next record at `dataend` (116 records, last `dataend` = file size).
Loader (TOUR.EXE): `0x107680` reads the directory (record pointers at 0x1f6410), `0x107907` = load by name; type dispatch at `0x107b94` (type byte in `[ebp-0x34]`).

| type | records | decoder (linear) | what |
|---|---|---|---|
| 0 | - | fread | stored |
| 1 | M_30_210.BIN | 0x129ea8 | byte RLE: `[u32 usize]`, then b>=0x80: copy 256-b literals; else repeat next byte b+3 times |
| 2, t | 55 + 3 | 0x129ed8 | dlz (PKLITE-like LZ, 16-bit LSB-first flag words, `rcl bh,1` offset bits); used only when csize < usize else memcpy (0x12ff81). `t` = TGA inside |
| 3 | RYMDLEGO.XM | 0x12a019 | LZ + 5 adaptive Huffman models (len, dist hi, dist lo, literal-run, literal) |
| 4 | none | 0x12ffa6 | order-N PPM + arithmetic coder (Nelson style: ESCAPE 0x100, DONE -1, FLUSH -2), reads the FILE directly. Not used, not ported |
| b | TOUR3.XM | 0x130136 | BWT + MTF + RLE + canonical Huffman blocks |
| j, p | 37, 18 | - | raw JPEG / PNG |

## type 3 details (0x12a019)
`[u32 usize]` then MSB-first bit stream (`add al,al`; byte refill when ah=0). Model = arrays F (weights), C (children / 0x3fe+2*sym for leaves), P (parent, plus leaf positions at P[0x3fe+2*sym]) indexed by byte offset; leaves at 0..0x1fe, internal 0x200..0x3fc (root), sentinel F[0x3fe]=0xffff. decode: walk C from root with bits; update: ++F[leaf], swap with highest slot of smaller weight, go to parent; rescale (halve) when root weight == limit before the update. Loop: literal run n (model 3) of literals (model 4); then len (model 0; 0 = run again); hi (model 1, absent when len==2); lo (model 2); dist = hi<<8|lo + 1; after a match one raw bit: 1 = literal run follows. Ends when output is full.

## type b details (0x130136)
MSB-first bit stream (reader 0x173a4b, refill 3 bytes via bswap). `u32 total, u32 blocksize`, blocks: `u32 n` (0 = end), `u32 idx` (BWT primary index), table (0x174088): `u16 last` (two 8-bit reads), per symbol 5-bit code c: 0 -> len 0; 1..17 -> len c+1; 18..23 repeat previous len c-16 times; 24..29 zeros c-22; 30 zeros get4+8; 31 zeros get5+24; alphabet 0x126. Canonical codes as deflate (0x173d77; tree bit 1 = child 0, equals plain canonical MSB-first). Symbols (0x173aa7): 0..255 MTF rank (list at 0x1c2bcd); 0x104..0x107 run of 256/128/64/32 of MTF front byte (table at 0x1c2cd5), 0x108..0x125 run of sym-0x106 (2..31). Per byte: L[i]=c, T[i]=cnt[c]++. Then C[c] = prefix sums; inverse BWT from the end: `c=L[x]; out[k]=c; x=T[x]+C[c]`. Code self-modifies its immediates (0x3e7 placeholders).

## Verification
* tools/extract.py decoders vs original in Unicorn (harness `call`, bit-reader globals at 0x1c2ccd zeroed for type b): TOUR3.XM 2 894 937 bytes equal (37 s emulated), RYMDLEGO.XM 74 016 equal, M_30_210.BIN 256 equal, dlz samples equal.
* XM parse (tools/xmcheck.py): tour3.xm "tribal cloud no. 9": XM 1.04, 26 orders, 20 channels, 32 patterns, 31 instruments / 21 samples (2 842 748 sample bytes), no leftover bytes. rymdlego.xm: 20 orders, 16 ch, 16 patterns, 17 samples, exact. Samples are standard XM delta-coded PCM; nothing hidden.
* docs/js/archive.js vs python: `node tools/test-archive.mjs` -> 113 identical + 3 TGA size-checked, 0 bad.

## Music timeline
`node tools/xmtimes.mjs` -> `re/xm_times.json` (times[order][row] from docs/js/xmtime.js). Module effects: speed F01 / F05 alternating (swing, ~994 each), bpm 79, D00 at (0,36) and (25,19). xmtime.js: total 154.56 s, `25 63 TheEnd` -> 154.557 s (clamped: the module's last pattern breaks at row 19 = 154.40 s). ffprobe/libopenmpt: 152.34 s (decoded 152.44 s). Mismatch ~2.2 s (1.4 %) not explained (unknown whether libopenmpt or xmtime.js is closer to IMS).
