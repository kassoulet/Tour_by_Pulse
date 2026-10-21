# Asm tricks of TOUR.EXE - raw findings (the page is docs/writeup.html)

All addresses linear (image at 0x100000, object 2 at 0x1b000). "H" = checked by calling the original in the Unicorn harness, "N" = JavaScript of the page replayed in node against vectors produced by the harness.

| # | trick | address | check |
|---|-------|---------|-------|
| 1 | memset with a read of the next 32-byte line (P5 does not allocate on write miss) | 0x103ad0 (bytes), 0x103b07 (dwords; also called directly by 0x125b4e) | H: 2336 calls (32 alignments x 73 lengths) exact, no overrun. The touch reads up to 32 bytes past the end (faulted in the emulator at the end of mapped memory). |
| 2 | CW byte 1 := 0x1f (0x1f7f = chop) + frndint + restore | 0x103d1a; user 0x1117ee (table), fade/xfade | H: 2.7->2, -2.7->-2; plain fistp 3/-3, 2.5->2, 3.5->4 |
| 3 | float -> 16.16 with magic 1.5*2^36 (float32 0x51c00000 at 0x1c2488), fstp qword, low dword | 0x16b972-0x16b9ac and ~84 more sites in the fillers | H+N: 304 random floats, max error 0 |
| 3b | fdiv at 0x16b4e5 hidden behind ~25 integer instructions (frac/int split of du,dv, immediate patching) | 0x16b4e5-0x16b51b | read |
| 4 | 4-wide hand-scheduled x87 (fld/fmul/fxch/fstp order 1,0,3,2) | 0x1521bd mul, 0x1521f2 add, 0x152227 sub, 0x15218c scale, 0x15225c mix | H: bit-identical float32 |
| 5 | MMX paddusb/psubusb, negative index loop (neg ecx; sub regs,ecx; add ecx,8; jne) | 0x1e7a8 add, 0x1e7c7 add*2, 0x1e7e9 sub, 0x1e808 (bug: psubusb mm0,mm0 -> zeros) | H: 4 entries vs numpy |
| 6 | MMX recursive lowpass on 4 adjacent 8-bit columns, loop counter folded in ebp (0xffff0600 + 0x140*200 -> 0) | 0x1f83c (vertical), 0x1f8dc, 0x1fa20 horizontal | H+N: t=0,1,17,64,100,128 exact |
| 7 | SWAR saturating byte add, bit0 cleared -> carry flags in bit0 of next byte, e-(e>>8) | 0x152e5a | H+N: 20000 random, model exact (texel bytes even) |
| 8 | RGB565 saturating add: xor carry detect, sbb mask, 4-entry sparse table 0x1ba99c ([0]=0,[1]=0x1f,[0x40]=0x7e0,[0x41]=0x7ff) | 0x14b580 | H+N: 20000 random, model exact; differs from ideal sat add in 47% of random pairs (+1 in the next field, r and g only) |
| 9 | self-modifying filler: 0xbc614e / 0x0c placeholders, add esi,imm + adc cl,imm (v:u in ecx = texture index), premultiplied alpha dst*(63-a)>>6 + texel with pmullw by 8-byte rows [eax*8+0x1c2224] | patch 0x16b494-0x16b51b, loop 0x16baa0-0x16baee; 84 sites | H+N: 5 runs x 300 px + 200 px vector exact (flush the TB after patching!) |
| 10 | cellrd kernel: T[idx] 16-bit lookup + (noise walk) >> 8, 12 patched displacements, [eax+eax+disp] | 0x20400 (patcher), 0x2073e (kernel) | H+N: 260x2 outputs and ebx/ebp state exact |
| 11 | pitch 8363*2^(x/3072): nibble tables 0x1ba700/6e0/6c0 (words) + 0x1ba680 (dwords), mul/shrd 16 x3 | 0x148f90 (variant 0x149004) | H+N: 98 inputs exact; within 0.22% of ideal above 1 kHz |
| 12 | painter's sort: float bits key, 2 x 10-bit radix, bucket push 0x125b61 | 0x107ebc pass 1, 0x125b61 pass 2 | read (scene3d.md has the key) |
| 13 | Watcom signed /8: sar edx,31; shl edx,3; sbb eax,edx; sar eax,3 (CF from the shift) | 0x10fa43, 0x12eab3 ... | H: 3142 values exact |
| 14 | dlz: shr bp,1 / dec dl / (lodsw) keeps CF; same code as LZEXE-style stage-1 stub (subroutine at stub offset 0x82) | 0x129ed8 | H: SCRIPT.UNR 1498->4221 identical |
| 15 | bzip-style decoder: 3-byte bswap refill, 8-bit fast table + add edx,edx / sbb ebp,ebp / [edi+ebp*4+4] tree walk, MTF shift loop, 7 patched 0x3e7 displacements | 0x173a4b getbits, 0x173aa7 patcher, 0x173b25-0x173bda, driver 0x130136 | H: TOUR3.XM decoded (2146697 -> 2894937 bytes, "Extended Module: tribal cloud no. 9", 32 patterns / 31 instruments); saved as re/assets_raw/TOUR3.XM |

## Notes that did not make the page
* Whole-image mnemonic counts (robust disassembly of 0x100000-0x1ac000): MMX only in 0x16bac5 area (image) and object 2 (movq 18, paddus 12, psubus 3, pmullw 6, punpck 15, packus 6, emms 11); no pmaddwd/pmulhw/movq in the image proper -> the demo is mostly x87 + integer; MMX is for blends and the filler.
* `aam`, `xlat`, `rcl` hits in 0x10a3xx / 0x10c8xx / 0x1382xx / 0x136cxx are data tables mis-disassembled, not code. "hsort.c" is just the source-file string passed to the debug allocator (0x107e60), not a heap sort.
* Watcom multiplication by 85 via shl/add (0x13bd68) and `lea` chains; stack-check prologue calls 0x128fdc.
* nops inside the hand-written asm (0x14b595/0x14b599, 0x173a63 ...) are pairing/alignment padding.
* IMS pitch table value 8363 = S3M C-4 speed (0x20ab appears in the code at 0x13bd89).
* The 16-bit stub of TOUR.EXE (file offset 0x40+0x5e) is an LZEXE-style decompressor (relocation table 0x1a entries, retf).
* Unicorn gotchas: rewriting code at the same address needs `mu.ctl_flush_tb()`; hand-assembled test snippets must use fresh addresses.
