# TOUR (Pulse / Pygmy Projects / Virtual Dreams, 1998) - asm snippets worth reading

Addresses are **linear**: `TOUR.EXE` is a PMODE/W program (16-bit LZEXE-style stub + 32-bit flat Watcom C++ image). `re/unpack_pmodew.py` runs the loader under Unicorn and
dumps object 1 as `re/image.bin` (linear base `0x100000`) and object 2 as `re/obj2.bin` (linear base `0x1b000`, ~40 KB of self-modifying rasteriser/kernel code).
Every listing below was produced by capstone (`re/ds.py ADDR N` for the image; the same code pointed at `obj2.bin` for addresses 0x1b000-0x25000) on those two files, with
the bytes untouched, so the `0xbc614e`, `0xbbbbbbbb` and `0xc` operands are the *placeholders* the code patches at run time. The "checked" remarks come from the
differential tests in `re/tricks.md` (the original function called in the Unicorn harness against a model, results compared); I did not re-run the harness for this page,
I re-disassembled every address and re-read the table contents quoted in 11 and 9.

The machine is a Pentium / Pentium MMX class PC (the code pairs `fxch` with FP ops, avoids write-allocate misses, and uses MMX only for blends and one rasteriser). The compiler
is Watcom (arguments in EAX, EDX, EBX, ECX, then the stack). Frame = 640x480, 16 or 32 bits per pixel buffers (see the effects write-up).

---

## 1. memset that touches the next cache line (0x103ad0 bytes, 0x103b07 dwords)

```
103b17: push ecx / shr ecx,2 / je ... / dec ecx / je ...
103b20: mov [eax],edx        ; 4 stores of the first half line
103b22: mov [eax+4],edx
103b25: dec ecx              ; loop counter updated between stores (pairing)
103b26: mov [eax+8],edx
103b29: mov [eax+0xc],edx
103b2c: je  103b46
103b2e: cmp byte [eax+0x20],dl   ; READ the next 32-byte line
103b31: mov [eax+0x10],edx
103b34: mov [eax+0x14],edx
 ...
```

The routine first aligns `eax` to 32 bytes (`test al,0x1f` at 0x103b0b), then writes a 32-byte line as two groups of four dword stores, each group preceded by a `cmp byte [eax+0x20],dl`
that *reads* the following line. A Pentium does not allocate a cache line on a write miss, so storing to cold memory goes straight to the bus word by word; the dummy
read pulls the next line into the cache while the current one is being filled. `0x103ad0` is the byte variant (aligns to 4, replicates `dl` with `ror edx,8` and calls the dword
one); `0x125b4e` also calls `0x103b07` directly. Recorded check: 2336 calls (32 alignments x 73 lengths) exact. Side effect (noted in `re/tricks.md`): the touch reads up to
32 bytes past the end of the block.

## 2. The truncating float to int, with `frndint` (0x103d1a)

```
103d1a: push eax
        fnstcw [esp]
        push dword [esp]
        mov byte [esp+1], 0x1f        ; control word high byte: RC = 11 (chop)
        fldcw [esp]
        frndint
        fldcw [esp+4]                 ; restore
```

The Watcom `__CHP` helper (same code as in INSIDE). The x87 default rounds to nearest; C wants truncation, so the control word is rewritten around a `frndint`. It is the
cast used by the palette tables and the fade/crossfade effects (`2.7 -> 2`, `-2.7 -> -2`, whereas a plain `fistp` gives 3 / -3). The port uses `Math.trunc` there.

## 3. Float to 16.16 with a magic number (0x16b972..0x16b9ac, ~84 sites in the fillers)

```
16b972: fld st(3)
16b974: fadd dword [0x1c2488]      ; 0x51c00000 = 1.5 * 2^36
16b991: fstp qword [0x1c2454]
16b997: mov edx, [0x1c2454]        ; the LOW dword of the double = x * 65536
16b99d: add ebx, 0xfff0
16b9a3: shr ebx, 0x10
16b9a6: add edx, 0xffe0
16b9ac: shr edx, 0x10
```

The constant at `0x1c2488` is the float32 `0x51c00000` = 1.5 * 2^36. Adding it to a value forces the double's exponent to 2^36, whose last mantissa bit is worth 2^-16, so the
low 32 bits of the stored double **are the value in 16.16 fixed point, correctly rounded to nearest, with no `fistp` and no control-word change**. The two `add 0xfff0 / 0xffe0` plus
`shr 16` that follow are the pixel-centre bias (take the integer part of an x or u coordinate). The rasteriser setup converts a dozen floats per triangle this way; a recorded test
(304 random floats against the JS model, max error 0) validates it.

## 4. Self-modifying textured filler (setup 0x16b494-0x16b51b, loops 0x16baa0-0x16baee, 84 sites)

Setup writes the per-span constants into the loop (the image holds `0xbc614e` and `0xc` placeholders):

```
16b494: mov [0x16babd], ecx           ; = disp32 of  movd mm0,[ecx*4+disp]  (colour plane base)
16b49a: mov [0x16baaf], edx           ; = disp32 of  mov al,[ecx+disp]       (alpha plane base)
16b4fc: shl eax,0x10 / ... / mov [0x16bab5], eax   ; step 1, fraction -> imm32 of "add esi,imm"
16b50c: mov [0x16bae0], cl                         ; step 1, integer  -> imm8  of "adc cl,imm"
16b515: mov [0x16bae3], ebx                        ; step 2, fraction -> imm32 of "add ebx,imm"
16b51b: mov [0x16bae9], dl                         ; step 2, integer  -> imm8  of "adc ch,imm"
```

and the loop (alpha-weighted texture blend into a 32-bit destination, MMX):

```
16baad: mov al, [ecx+0xbc614e]       ; alpha byte of texel cx (cx = ch:cl, 16-bit index), imm32 = alpha plane
16bab3: add esi, 0xbc614e            ; fraction of the cl coordinate += step (sets carry)
16bab9: movd mm0, [ecx*4+0]          ; 32-bit texel colour, disp32 = colour plane (patched)
16bac1: movd mm1, [edi+edx*4]        ; destination pixel (edx counts up to 0)
16bac5: punpcklbw mm1, mm7
16bac8: pmullw mm1, [eax*8+0x1c2224] ; * (63 - alpha) from a table of 8-byte rows
16bad0: psraw mm1, 6
16bad4: packuswb mm1, mm7
16bad7: paddb mm1, mm0               ; + texel (already multiplied by alpha)
16bada: movd [edi+edx*4], mm1
16bade: adc cl, 0xc                  ; cl += integer step + carry
16bae1: add ebx, 0xbc614e            ; fraction of the ch coordinate += step
16bae7: adc ch, 0xc                  ; ch += integer step + carry
16baeb: inc edx / jne 16baad
```

The texture coordinate lives in `ecx` as two 8-bit integer parts (`ch:cl`), so `cx` is directly a 16-bit texel index; the 16-bit fractions are in `esi` and `ebx` (the
fraction is the `add` operand, whose carry feeds the `adc` of the integer byte). The `add reg,imm32 / adc r8,imm8` pairs are a DDA with no memory operand and no shift; the two
steps and the two plane bases come from the opcode stream, not from registers. `edx` is a counter that runs up to 0 and also indexes `[edi+edx*4]`. The
blend multiplies the destination by a weight read from `[eax*8+0x1c2224]` (8-byte rows, one word per channel, `psraw 6`) and adds the texel with `paddb`, so one `pmullw` handles all four channels (I did not decode the weight table's contents). It needs the translation buffer flushed
after patching in the Unicorn harness (`mu.ctl_flush_tb()`); the recorded check is five runs of 300 pixels plus one of 200, bit exact.

The same idea is used by the 16-bit and 32-bit fillers (`0x14b580`, `0x152e5a`, section 9) and by the reaction-diffusion kernel (section 10).

## 5. Reading the divide's latency away (0x16b4e5)

```
16b4d7: fld dword [esi+0x20]
16b4da: fsub dword [ebp+0x20]
16b4dd: fxch st(1)
16b4df: fstp qword [0x1c2454]
16b4e5: fdiv dword [0x1c2448]       ; ~39 cycles on a Pentium, not waited for
16b4eb: mov eax,[0x1c2454]          ; integer work continues: fraction/integer
16b4f0: mov ebx,[0x1c245c]          ;   split of the previous gradients,
16b4f6: mov ecx,[0x1c2454]          ;   immediate patching (section 4) ...
16b4fc: shl eax,0x10 ...
```

The divide that produces the gradient is issued, and the following ~25 integer instructions (splitting the *already converted* du/dv into the integer and fraction bytes
and patching them into the loop) run while the FPU divides; the quotient is only collected afterwards. This is a read of the listing (no separate test).

## 6. Four-wide hand-scheduled x87 vector ops (0x1521bd multiply, 0x1521f2 add, 0x152227 sub, 0x15218c scale, 0x15225c mix)

```
1521c0: fld dword [edx]        ; a0
1521c2: fmul dword [ebx]       ; a0*b0
1521c4: fld dword [edx+4]
1521c7: fmul dword [ebx+4]
1521ca: fld dword [edx+8]
1521cd: fmul dword [ebx+8]
1521d0: fxch st(2)
1521d2: fld dword [edx+0xc]
1521d5: fmul dword [ebx+0xc]
1521d8: fxch st(2)
1521da: fstp dword [eax+4]     ; stores in the order 1,0,3,2
1521dd: fstp dword [eax]
1521df: fstp dword [eax+0xc]
1521e2: fstp dword [eax+8]
```

Four pipelined multiplies in flight (the Pentium's FPU takes a new `fmul` every cycle, with 3 cycles latency) and `fxch` in the shadow of other FP ops (free on a Pentium) lets the
stores come out in the order 1,0,3,2 exactly when each product is ready. The recorded check (`re/tricks.md`) is bit-identical float32 results against the JS port; which scene effects call these helpers is not re-checked here (see `re/scene3d.md`).

## 7. MMX on negative indices: `neg ecx` and run towards zero (0x1e7a8, 0x1e7e9)

```
1e7a8: neg ecx                       ; ecx = -bytes
1e7aa: sub esi, ecx                  ; every pointer moves to the END of its buffer
1e7ac: sub ebx, ecx
1e7ae: sub edi, ecx
1e7b0: movq mm0, [esi+ecx]
1e7b4: paddusb mm0, [ebx+ecx]       ; saturating byte add of 8 pixels
1e7b8: movq [edi+ecx], mm0
1e7bc: add ecx, 8
1e7c2: jne 1e7b0                     ; the add sets ZF at 0: no cmp, no separate counter
1e7c4: emms
```

Three arrays, one counter: the pointers are advanced to the end and the single index runs from `-n` to 0, so `add ecx,8 / jne` is the entire loop control. The family `0x1e7a8` (add),
`0x1e7c7` (the same loop with a second `paddusb mm0,mm0` after the add, i.e. doubled), `0x1e7e9` (`psubusb`) is the family of the `blend` effect's modes, 8 bytes per iteration (mode 1 is the one the script uses, see the effects write-up 3.2).

A bug is preserved in the original: **0x1e808**, the sibling of the subtract, is

```
1e814: psubusb mm0, [ebx+ecx]
1e818: psubusb mm0, mm0              ; x - x = 0  (the intended operand was probably another memory/register)
1e81b: movq [edi+ecx], mm0
```

so that variant always writes zeros. The effects write-up (3.2) lists it as one of the two bugs the port copies (`blend` mode 33; the script only uses mode 1).

## 8. MMX recursive low-pass with the loop counter folded into the address (0x1f83c)

```
1f84b: mov ebp, 0xffff0600           ; = -64000 = -(0x140*200): 200 rows of 320 bytes, up to 0
1f87a: psubw mm0, mm1                ; y - state
1f87d: pmullw mm0, mm6               ; * k (replicated byte -> 4 words, the strength)
1f880: psraw mm0, 7                  ; >> 7
1f884: paddw mm1, mm0                ; state += k*(y-state)/128   (one-pole IIR on 4 adjacent columns)
1f887: add edi, 4
1f88d: add ebp, 0x140                ; next row (320-byte pitch)
1f893: packuswb mm1, mm7
1f896: movd [edi], mm1
1f899: jne 1f870                     ; ZF from the add: ebp reached 0
```

A vertical recursive smoothing (state `mm1`, strength in `mm6`) that runs on **four neighbouring 8-bit columns at once** (one `movd` = 4 pixels, `punpcklbw` to words). The row index
`ebp` is also the loop counter: the base pointer is biased by `sub esi,ebp` (0x1f85f) and `ebp` starts at `0xffff0600` (= -64000) so that `[esi+ebp]` addresses row 0 and the 200th `add ebp,0x140` makes it exactly 0,
which sets ZF for the `jne`. Variants: 0x1f83c vertical, 0x1f8dc and 0x1fa20 horizontal (per `re/tricks.md`; I did not trace which script effect calls them). Recorded check: exact at t = 0, 1, 17, 64, 100, 128. The strength byte `al` is replicated (`mov ah,al`, `shl 16`, `or`) into a dword, then `punpcklbw` widens it to four words.

## 9. Branch-free saturation in a SWAR byte add (0x152e5a) and in RGB565 (0x14b580)

SWAR, four 8-bit lanes in a dword (no MMX):

```
152e5a: mov ebx,[edi]                 ; dest
152e5c: mov al,[ecx+0x1869f]          ; texel index
152e62: and ebx,0xfefefefe            ; clear bit0 of each lane: room for the carry
152e69: mov eax,[eax*4+0x1869f]       ; source dword
152e70: add esi,0xbc614e              ; patched DDA, as in 4
152e76: adc cl,0xc
152e79: add eax,ebx
152e7b: mov edx,eax
152e80: and edx,0x1010100             ; the carry out of each lane
152e86: mov ebx,edx
152e88: shr edx,8
152e8b: sub ebx,edx                   ; carry -> 0xff mask  (c<<8 - c)
152e8d: or  ebx,eax                   ; saturate
```

With the destination's bit 0 cleared (the recorded model needs the source texel bytes to be even too), a lane that overflows leaves a carry in **bit 0 of the next lane**; the mask
`0x01010100` picks those three carry bits, and `c - (c>>8)` turns each into a `0xff` in the lane that produced it, which the final `or` saturates. A saturating byte add in about eight integer ops, no branch (the top lane's carry
falls outside the mask; the recorded model describes what the code really computes). Recorded: 20000 random dwords vs that model, exact.

RGB565 saturating add:

```
14b580: mov bx,[edi]  ... mov ax,[eax*2+0x1869f]    ; dst, src
14b591: mov edx,ebx / xor edx,eax                   ; a^b
14b596: add bx,ax
14b59a: sbb eax,eax                                 ; CF -> mask : red overflowed (top field)
14b59c: xor edx,ebx / and edx,0x820                 ; carries into the g and b field boundaries
14b5a4: and eax,0xf800
14b5a9: shr edx,5
14b5b5: or ebx,eax                                  ; saturate red
14b5b7: or bx,[edx*2+0x1ba99c]                      ; 4-entry sparse table
```

`edx` after `and 0x820` is `0`, `0x20`, `0x800` or `0x820`; `>>5` turns that into table index 0, 1, 0x40, 0x41, and the table at `0x1ba99c` holds `[0]=0, [1]=0x1f, [0x40]=0x7e0, [0x41]=0x7ff`
(read from the image): blue and green saturate by OR-ing a constant, red by the `sbb` mask. No compare, no branch. The result is **not** an ideal saturating
add: the recorded JS model differs from an ideal one in 47 % of random pairs (+1 in the next field, red and green only), and what is checked exact is that model.

## 10. The reaction-diffusion kernel with 12 patched displacements (patcher 0x20400, kernel 0x2073e)

```
20400: mov eax,[0x214280] / mov ebx,[0x214284] / mov ecx,[0x214288]
20412: mov [0x20762],ecx            ; the three table base addresses are written ...
20418: mov [0x2076a],eax            ; ... into 12 displacement fields of the kernel
 ...
20760: add bl,[ebp-0x44444445]      ; displacement 0xbbbbbbbb = placeholder (noise table)
20766: mov ax,[eax+eax-0x44444445]  ; 16-bit lookup T[idx], base patched
2076e: mov ecx,[edx+0x410]          ; second input, at +0x410 from the first
20774: mov cx,[ecx+ecx-0x44444445]  ; second lookup
2077c: add ebp,[esp] ; 20781: and ebp,0x7fff ; noise index += 0x41
2077f: add eax,ebx                  ; + noise
20787: mov [esi],ah                 ; >> 8 = high byte
2078b: add ecx,ebx / mov [edi],ch   ; the same for the second output
```

Per cell: a 16-bit table lookup `T[idx]` plus a noise walk (`bl += noise[ebp]`, `ebp = (ebp+0x41) & 0x7fff`); the output is the **high byte of the sum**
(`mov [esi],ah`, `mov [edi],ch`), which replaces a shift. `[eax+eax+disp]` scales a 16-bit index for free; the patcher writes three table addresses into twelve displacement fields (each address four times).
The kernel is unrolled (input offsets +0, +4, +8 ...). The effects write-up section 5 says what the effect computes. Recorded: 2x260 outputs plus the `ebx/ebp` state exact.

## 11. A pitch table without a pow: 8363 * 2^(x/3072) (0x148f90)

```
148f93: neg eax
148f95: mov ebx,eax / and ebx,0xf
148f9a: mov bx,[ebx*2+0x1ba700]       ; nibble 0 (units of 1/3072 octave)
148fa2: mov edx,eax / sar edx,4 / and edx,0xf
148fac: mov cx,[edx*2+0x1ba6e0]       ; nibble 1
...  nibble 2 -> [..+0x1ba6c0]
148fce: add eax,0x8000 / sar eax,0xc / and eax,0xf
148fe1: mov eax,[eax*4+0x1ba680]      ; nibble 3 (octaves): dwords
148fe8: mul edx / shrd eax,edx,16     ; three 16.16 multiplies
148ff0: mul edx / shrd eax,edx,16
148ff8: mul edx / shrd eax,edx,16
```

The sound system (IMS-style mixer in the demo) maps an XM note (period units of 1/3072 octave) to a playback rate **without an exponential**: the value is split into four nibbles and
each looks up a 2^(-k * step) factor, multiplied together in 16.16 with `mul / shrd 16`. I read the table contents in the image: the nibble-2 table starts `0x8000, 0x78d1, 0x7209, 0x6ba2, ...,
0x5a82` for k = 0, 1, 2, 3, ..., 6 (`0x5a82/0x8000 = 2^-0.5`), the nibble-1 table `0x8000, 0x7f8a, 0x7f14, ...` (`0x7f8a/0x8000 = 2^(-1/192)`: nibble 1 is worth 16/3072 octave), and the dwords at `0x1ba680` (nibble 3, 4096 units = 4/3 octave per step) begin
`0xcf6dbd, 0x525171, 0x20ab00` (`0x20ab` = **8363**, the S3M C-4 rate; consecutive entries differ by about 2^(4/3) = 2.52). The 0.22 % error against the ideal figure above 1 kHz and the exactness of the port against the 98 sampled inputs are from the recorded test (`re/tricks.md`).

## 12. Painter's sort in two 10-bit passes on the float's bit pattern (0x107ebc pass 1, 0x125b61 pass 2)

```
107ec6: mov ecx,eax
107ec8: sar eax,0xa                   ; high part of the key
107ecb: and ecx,0x3ff                 ; low 10 bits = bucket of pass 1
107ed1: cmp eax,edx / jle ... / mov [0x1b7528],eax    ; running max / min of the high key
107eda: cmp eax,[0x1b7524] / jge ... / mov [0x1b7524],eax
107eed: mov [edx],ebx                 ; node: item
107eff: mov [edx+4],eax               ;       key
107ef6: mov ecx,[ebx+0x1f73c0] / mov [edx+8],ecx      ; push on the bucket list
107f02: mov [ebx+0x1f73c0],edx
 ...
125b87: mov eax,[edx+4]
125b8a: mov eax,[eax*4+0x2045a0]      ; pass 2: same push, bucket = key >> 10
125b91: mov [edx+0xc],eax
125b97: mov [eax*4+0x2045a0],edx
```

A positive float's bit pattern is monotonic with its value, so a depth is sorted as an integer: the first pass pushes 16-byte nodes onto 1024 buckets keyed by the low 10 bits and
remembers the min/max of the high part, the second pass walks the pass-1 buckets in order (`add ebx,4` at 0x125ba5) and pushes each node onto a bucket of its high key (table `0x2045a0`, `0x400` entries). Two linear passes, no comparison between
items. The key itself is described in `re/scene3d.md`; this page only shows the sort mechanics (read from the listing, not re-tested).

## 13. Round-towards-zero /8 with the shift's carry (0x10fa43)

```
10fa43: mov eax, edx
10fa45: sar edx, 0x1f          ; 0 or -1
10fa48: shl edx, 3             ; 0 or -8 ; CF = last bit shifted out (bit 29): 1 only for -1
10fa4b: sbb eax, edx           ; eax - edx - CF  = eax + 7 for negatives (8 - 1)
10fa4d: sar eax, 3
```

The same trick as in INSIDE (0x36d10, there a `/ 64`); `re/tricks.md` lists further sites (0x12eab3 ...): Watcom's signed `x / 8`. `shl edx,3` leaves CF = 1 only when `edx` was -1, so `sbb` adds exactly 7 to negative numbers before the arithmetic
shift, giving C's round-toward-zero. 3142 values checked exact.

## 14. The LZ decoder keeps the flag bit in CF (dlz, 0x129ed8)

```
129ef3: shr bp,1            ; next flag bit -> CF
129ef6: dec dl              ; bits left (dec does not touch CF)
129ef8: jne 129f01
129efa: lodsw               ; refill 16 flag bits
129efc: mov bp,ax
129eff: mov dl,0x10
129f01: rcl bh,1            ; the carry (the flag bit) is shifted into bh
```

16 flag bits at a time in `bp`, with `dec dl` (which preserves CF) as the counter and `lodsw` refilling; the flag lands in CF and `jb` branches on it. It is the same bit-reader as
the LZEXE-style 16-bit stub of `TOUR.EXE` (per `re/tricks.md`, the stub subroutine at stub offset 0x82); it decodes `SCRIPT.UNR` (1498 -> 4221 bytes) identically in the harness.

## 15. The BWT/MTF/Huffman decoder: three-byte refill and a tree walked with `sbb` (0x173a4b, 0x173b25-0x173bda)

```
173b2c: mov edi,[esi]          ; read 4 bytes ...
173b30: bswap edi              ; ... big-endian
173b32: and edi,0xffffff00     ; keep 3 bytes
173b38: add bl,0x18            ; bit count += 24
173b3b: shr edi,cl             ; align under the bits already in edx
173b3d: or  edx,edi            ; refill without a loop
173b3f: add esi,3

173b42: mov eax,edx
173b44: shr eax,0x18           ; top 8 bits
173b47: mov edi,[eax*4+0x1c2ce9]     ; fast table: node for this byte
173b4e: mov ecx,[edi+0xc]            ; code length
173b51: mov eax,[edi+8]              ; symbol, or -1 = longer than 8 bits
...
173b5f: shl edx,8              ; fall to the slow path: walk the tree bit by bit
173b72: add edx,edx            ; top bit -> CF
173b75: sbb ebp,ebp            ; ebp = -1 or 0   (the branch direction as a mask)
```

The bit reservoir `edx` always holds big-endian bits; a refill loads 4 bytes, `bswap`s, masks to 3 bytes and shifts them under what is left (`bl` counts the valid bits), so one refill is
24 bits and never a loop. An 8-bit table lookup decodes the common short codes; the others walk the tree one bit at a time, the bit extracted by `add edx,edx / sbb ebp,ebp` and used as
`[edi+ebp*4+4]`. The setup at 0x173aa7 patches seven displacement fields (seven `0x3e7` placeholders occur in 0x173aa7-0x173d00) with its table addresses (`mov [0x173bb3],ebp` ...). The decoder produced `TOUR3.XM`
(2146697 -> 2894937 bytes, module title "tribal cloud no. 9", 32 patterns, 31 instruments; saved as `re/assets_raw/TOUR3.XM`).

---

## What I left out

* The whole-image mnemonic count in `re/tricks.md` ("MMX only around 0x16bac5 and in object 2"): the demo is mostly x87 and integer, MMX appears in the blends and in the filler only.
* Hits of `aam`, `xlat`, `rcl` in the 0x10a3xx / 0x10c8xx / 0x1382xx / 0x136cxx ranges: they are tables decoded as code, not tricks. `hsort.c` is only a file name passed to the debug allocator, it is not a heap sort.
* Hand-placed `nop`s inside the asm routines (0x14b595, 0x14b599, 0x173a63...) are pairing/alignment padding.
