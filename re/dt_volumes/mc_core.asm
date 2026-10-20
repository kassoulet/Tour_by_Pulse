151ab8  60                     pushal 
151ab9  a338dc1b00             mov dword ptr [0x1bdc38], eax
151abe  8db3bcfbffff           lea esi, [ebx - 0x444]
151ac4  8dbaa099ffff           lea edi, [edx - 0x6660]
151aca  8b0d30631f00           mov ecx, dword ptr [0x1f6330]
151ad0  b830231f00             mov eax, 0x1f2330
151ad5  2bc3                   sub eax, ebx
151ad7  a3131f1500             mov dword ptr [0x151f13], eax
151adc  0500040000             add eax, 0x400
151ae1  a3041f1500             mov dword ptr [0x151f04], eax
151ae6  33d2                   xor edx, edx
151ae8  32f6                   xor dh, dh
151aea  32d2                   xor dl, dl
151aec  84d2                   test dl, dl
151aee  0f843b010000           je 0x151c2f
151af4  8b8640040000           mov eax, dword ptr [esi + 0x440]
151afa  8b9e44040000           mov ebx, dword ptr [esi + 0x444]
151b00  3bc1                   cmp eax, ecx
151b02  7c0a                   jl 0x151b0e
151b04  3bd9                   cmp ebx, ecx
151b06  0f8d23010000           jge 0x151c2f
151b0c  eb08                   jmp 0x151b16
151b0e  3bd9                   cmp ebx, ecx
151b10  0f8c19010000           jl 0x151c2f
151b16  d98644040000           fld dword ptr [esi + 0x444]
151b1c  d82530631f00           fsub dword ptr [0x1f6330]
151b22  d98644040000           fld dword ptr [esi + 0x444]
151b28  d8a640040000           fsub dword ptr [esi + 0x440]
151b2e  def9                   fdivp st(1)
151b30  8dae44040000           lea ebp, [esi + 0x444]
151b36  55                     push ebp
151b37  8dae40040000           lea ebp, [esi + 0x440]
151b3d  8bc2                   mov eax, edx
151b3f  fec8                   dec al
151b41  e8cc040000             call 0x152012
151b46  5d                     pop ebp
151b47  8bc2                   mov eax, edx
151b49  e8c4040000             call 0x152012
151b4e  dce3                   fsubr st(3), st(0)
151b50  d9cc                   fxch st(4)
151b52  d8e9                   fsubr st(1)
151b54  d9cd                   fxch st(5)
151b56  d8ea                   fsubr st(2)
151b58  d9ce                   fxch st(6)
151b5a  dccb                   fmul st(3), st(0)
151b5c  dccd                   fmul st(5), st(0)
151b5e  dcce                   fmul st(6), st(0)
151b60  d9cb                   fxch st(3)
151b62  deec                   fsubp st(4)
151b64  dee4                   fsubrp st(4)
151b66  dee4                   fsubrp st(4)
151b68  d9c1                   fld st(1)
151b6a  d8ca                   fmul st(2)
151b6c  d9c3                   fld st(3)
151b6e  d8cc                   fmul st(4)
151b70  d9c5                   fld st(5)
151b72  d8ce                   fmul st(6)
151b74  d9ca                   fxch st(2)
151b76  dec1                   faddp st(1)
151b78  dec1                   faddp st(1)
151b7a  d905c4331b00           fld dword ptr [0x1b33c4]
151b80  d9c9                   fxch st(1)
151b82  52                     push edx
151b83  d91d48dc1b00           fstp dword ptr [0x1bdc48]
151b89  a148dc1b00             mov eax, dword ptr [0x1bdc48]
151b8e  bd000000be             mov ebp, 0xbe000000
151b93  c1e811                 shr eax, 0x11
151b96  8b1548dc1b00           mov edx, dword ptr [0x1bdc48]
151b9c  83e07f                 and eax, 0x7f
151b9f  81e20000807f           and edx, 0x7f800000
151ba5  33db                   xor ebx, ebx
151ba7  2bea                   sub ebp, edx
151ba9  d1ed                   shr ebp, 1
151bab  8a9814741b00           mov bl, byte ptr [eax + 0x1b7414]
151bb1  c1e30f                 shl ebx, 0xf
151bb4  5a                     pop edx
151bb5  8bc2                   mov eax, edx
151bb7  81e50000807f           and ebp, 0x7f800000
151bbd  90                     nop 
151bbe  0beb                   or ebp, ebx
151bc0  892d50dc1b00           mov dword ptr [0x1bdc50], ebp
151bc6  25ff000000             and eax, 0xff
151bcb  a34cdc1b00             mov dword ptr [0x1bdc4c], eax
151bd0  90                     nop 
151bd1  d90550dc1b00           fld dword ptr [0x1bdc50]
151bd7  d9c0                   fld st(0)
151bd9  d8c8                   fmul st(0)
151bdb  d9c9                   fxch st(1)
151bdd  d80d40dc1b00           fmul dword ptr [0x1bdc40]
151be3  d9cb                   fxch st(3)
151be5  d8ca                   fmul st(2)
151be7  d9c9                   fxch st(1)
151be9  d80d48dc1b00           fmul dword ptr [0x1bdc48]
151bef  d9ca                   fxch st(2)
151bf1  da0d4cdc1b00           fimul dword ptr [0x1bdc4c]
151bf7  d9ca                   fxch st(2)
151bf9  d82d44dc1b00           fsubr dword ptr [0x1bdc44]
151bff  d9c9                   fxch st(1)
151c01  d82dd0331b00           fsubr dword ptr [0x1b33d0]
151c07  d9c9                   fxch st(1)
151c09  decb                   fmulp st(3)
151c0b  dec1                   faddp st(1)
151c0d  d9c9                   fxch st(1)
151c0f  dcca                   fmul st(2), st(0)
151c11  d9c9                   fxch st(1)
151c13  d99f00660000           fstp dword ptr [edi + 0x6600]
151c19  dcca                   fmul st(2), st(0)
151c1b  decb                   fmulp st(3)
151c1d  d99f0c660000           fstp dword ptr [edi + 0x660c]
151c23  d99f10660000           fstp dword ptr [edi + 0x6610]
151c29  d99f14660000           fstp dword ptr [edi + 0x6614]
151c2f  81fa00000100           cmp edx, 0x10000
151c35  0f8237010000           jb 0x151d72
151c3b  8b4644                 mov eax, dword ptr [esi + 0x44]
151c3e  8b9e44040000           mov ebx, dword ptr [esi + 0x444]
151c44  3bc1                   cmp eax, ecx
151c46  7c0a                   jl 0x151c52
151c48  3bd9                   cmp ebx, ecx
151c4a  0f8d22010000           jge 0x151d72
151c50  eb08                   jmp 0x151c5a
151c52  3bd9                   cmp ebx, ecx
151c54  0f8c18010000           jl 0x151d72
151c5a  d98644040000           fld dword ptr [esi + 0x444]
151c60  d82530631f00           fsub dword ptr [0x1f6330]
151c66  d98644040000           fld dword ptr [esi + 0x444]
151c6c  d86644                 fsub dword ptr [esi + 0x44]
151c6f  def9                   fdivp st(1)
151c71  8dae44040000           lea ebp, [esi + 0x444]
151c77  55                     push ebp
151c78  8d6e44                 lea ebp, [esi + 0x44]
151c7b  8bc2                   mov eax, edx
151c7d  2d00000100             sub eax, 0x10000
151c82  e88b030000             call 0x152012
151c87  5d                     pop ebp
151c88  8bc2                   mov eax, edx
151c8a  e883030000             call 0x152012
151c8f  dce3                   fsubr st(3), st(0)
151c91  d9cc                   fxch st(4)
151c93  d8e9                   fsubr st(1)
151c95  d9cd                   fxch st(5)
151c97  d8ea                   fsubr st(2)
151c99  d9ce                   fxch st(6)
151c9b  dccb                   fmul st(3), st(0)
151c9d  dccd                   fmul st(5), st(0)
151c9f  dcce                   fmul st(6), st(0)
151ca1  d9cb                   fxch st(3)
151ca3  deec                   fsubp st(4)
151ca5  dee4                   fsubrp st(4)
151ca7  dee4                   fsubrp st(4)
151ca9  d9c1                   fld st(1)
151cab  d8ca                   fmul st(2)
151cad  d9c3                   fld st(3)
151caf  d8cc                   fmul st(4)
151cb1  d9c5                   fld st(5)
151cb3  d8ce                   fmul st(6)
151cb5  d9ca                   fxch st(2)
151cb7  dec1                   faddp st(1)
151cb9  dec1                   faddp st(1)
151cbb  d905cc331b00           fld dword ptr [0x1b33cc]
151cc1  d9c9                   fxch st(1)
151cc3  52                     push edx
151cc4  d91d48dc1b00           fstp dword ptr [0x1bdc48]
151cca  a148dc1b00             mov eax, dword ptr [0x1bdc48]
151ccf  bd000000be             mov ebp, 0xbe000000
151cd4  c1e811                 shr eax, 0x11
151cd7  8b1548dc1b00           mov edx, dword ptr [0x1bdc48]
151cdd  83e07f                 and eax, 0x7f
151ce0  81e20000807f           and edx, 0x7f800000
151ce6  33db                   xor ebx, ebx
151ce8  2bea                   sub ebp, edx
151cea  d1ed                   shr ebp, 1
151cec  8a9814741b00           mov bl, byte ptr [eax + 0x1b7414]
151cf2  c1e30f                 shl ebx, 0xf
151cf5  5a                     pop edx
151cf6  8bc2                   mov eax, edx
151cf8  81e50000807f           and ebp, 0x7f800000
151cfe  c1e810                 shr eax, 0x10
151d01  0beb                   or ebp, ebx
151d03  892d50dc1b00           mov dword ptr [0x1bdc50], ebp
151d09  25ff000000             and eax, 0xff
151d0e  a34cdc1b00             mov dword ptr [0x1bdc4c], eax
151d13  90                     nop 
151d14  d90550dc1b00           fld dword ptr [0x1bdc50]
151d1a  d9c0                   fld st(0)
151d1c  d8c8                   fmul st(0)
151d1e  d9c9                   fxch st(1)
151d20  d80d40dc1b00           fmul dword ptr [0x1bdc40]
151d26  d9cb                   fxch st(3)
151d28  d8ca                   fmul st(2)
151d2a  d9c9                   fxch st(1)
151d2c  d80d48dc1b00           fmul dword ptr [0x1bdc48]
151d32  d9ca                   fxch st(2)
151d34  da0d4cdc1b00           fimul dword ptr [0x1bdc4c]
151d3a  d9ca                   fxch st(2)
151d3c  d82d44dc1b00           fsubr dword ptr [0x1bdc44]
151d42  d9c9                   fxch st(1)
151d44  d82dd8331b00           fsubr dword ptr [0x1b33d8]
151d4a  d9c9                   fxch st(1)
151d4c  decb                   fmulp st(3)
151d4e  dec1                   faddp st(1)
151d50  d9c9                   fxch st(1)
151d52  dcca                   fmul st(2), st(0)
151d54  d9c9                   fxch st(1)
151d56  d99f68060c00           fstp dword ptr [edi + 0xc0668]
151d5c  dcca                   fmul st(2), st(0)
151d5e  decb                   fmulp st(3)
151d60  d99f6c060c00           fstp dword ptr [edi + 0xc066c]
151d66  d99f70060c00           fstp dword ptr [edi + 0xc0670]
151d6c  d99f74060c00           fstp dword ptr [edi + 0xc0674]
151d72  84f6                   test dh, dh
151d74  0f8463020000           je 0x151fdd
151d7a  8b8604040000           mov eax, dword ptr [esi + 0x404]
151d80  8b9e44040000           mov ebx, dword ptr [esi + 0x444]
151d86  3bc1                   cmp eax, ecx
151d88  7c0a                   jl 0x151d94
151d8a  3bd9                   cmp ebx, ecx
151d8c  0f8d25010000           jge 0x151eb7
151d92  eb08                   jmp 0x151d9c
151d94  3bd9                   cmp ebx, ecx
151d96  0f8c1b010000           jl 0x151eb7
151d9c  d98644040000           fld dword ptr [esi + 0x444]
151da2  d82530631f00           fsub dword ptr [0x1f6330]
151da8  d98644040000           fld dword ptr [esi + 0x444]
151dae  d8a604040000           fsub dword ptr [esi + 0x404]
151db4  def9                   fdivp st(1)
151db6  8dae44040000           lea ebp, [esi + 0x444]
151dbc  55                     push ebp
151dbd  8dae04040000           lea ebp, [esi + 0x404]
151dc3  8bc2                   mov eax, edx
151dc5  fecc                   dec ah
151dc7  e846020000             call 0x152012
151dcc  5d                     pop ebp
151dcd  8bc2                   mov eax, edx
151dcf  e83e020000             call 0x152012
151dd4  dce3                   fsubr st(3), st(0)
151dd6  d9cc                   fxch st(4)
151dd8  d8e9                   fsubr st(1)
151dda  d9cd                   fxch st(5)
151ddc  d8ea                   fsubr st(2)
151dde  d9ce                   fxch st(6)
151de0  dccb                   fmul st(3), st(0)
151de2  dccd                   fmul st(5), st(0)
151de4  dcce                   fmul st(6), st(0)
151de6  d9cb                   fxch st(3)
151de8  deec                   fsubp st(4)
151dea  dee4                   fsubrp st(4)
151dec  dee4                   fsubrp st(4)
151dee  d9c1                   fld st(1)
151df0  d8ca                   fmul st(2)
151df2  d9c3                   fld st(3)
151df4  d8cc                   fmul st(4)
151df6  d9c5                   fld st(5)
151df8  d8ce                   fmul st(6)
151dfa  d9ca                   fxch st(2)
151dfc  dec1                   faddp st(1)
151dfe  dec1                   faddp st(1)
151e00  d905c8331b00           fld dword ptr [0x1b33c8]
151e06  d9c9                   fxch st(1)
151e08  52                     push edx
151e09  d91d48dc1b00           fstp dword ptr [0x1bdc48]
151e0f  a148dc1b00             mov eax, dword ptr [0x1bdc48]
151e14  bd000000be             mov ebp, 0xbe000000
151e19  c1e811                 shr eax, 0x11
151e1c  8b1548dc1b00           mov edx, dword ptr [0x1bdc48]
151e22  83e07f                 and eax, 0x7f
151e25  81e20000807f           and edx, 0x7f800000
151e2b  33db                   xor ebx, ebx
151e2d  2bea                   sub ebp, edx
151e2f  d1ed                   shr ebp, 1
151e31  8a9814741b00           mov bl, byte ptr [eax + 0x1b7414]
151e37  c1e30f                 shl ebx, 0xf
151e3a  5a                     pop edx
151e3b  8bc2                   mov eax, edx
151e3d  81e50000807f           and ebp, 0x7f800000
151e43  c1e808                 shr eax, 8
151e46  0beb                   or ebp, ebx
151e48  892d50dc1b00           mov dword ptr [0x1bdc50], ebp
151e4e  25ff000000             and eax, 0xff
151e53  a34cdc1b00             mov dword ptr [0x1bdc4c], eax
151e58  90                     nop 
151e59  d90550dc1b00           fld dword ptr [0x1bdc50]
151e5f  d9c0                   fld st(0)
151e61  d8c8                   fmul st(0)
151e63  d9c9                   fxch st(1)
151e65  d80d40dc1b00           fmul dword ptr [0x1bdc40]
151e6b  d9cb                   fxch st(3)
151e6d  d8ca                   fmul st(2)
151e6f  d9c9                   fxch st(1)
151e71  d80d48dc1b00           fmul dword ptr [0x1bdc48]
151e77  d9ca                   fxch st(2)
151e79  da0d4cdc1b00           fimul dword ptr [0x1bdc4c]
151e7f  d9ca                   fxch st(2)
151e81  d82d44dc1b00           fsubr dword ptr [0x1bdc44]
151e87  d9c9                   fxch st(1)
151e89  d82dd4331b00           fsubr dword ptr [0x1b33d4]
151e8f  d9c9                   fxch st(1)
151e91  decb                   fmulp st(3)
151e93  dec1                   faddp st(1)
151e95  d9c9                   fxch st(1)
151e97  dcca                   fmul st(2), st(0)
151e99  d9c9                   fxch st(1)
151e9b  d99f64600600           fstp dword ptr [edi + 0x66064]
151ea1  dcca                   fmul st(2), st(0)
151ea3  decb                   fmulp st(3)
151ea5  d99f6c600600           fstp dword ptr [edi + 0x6606c]
151eab  d99f70600600           fstp dword ptr [edi + 0x66070]
151eb1  d99f74600600           fstp dword ptr [edi + 0x66074]
151eb7  84d2                   test dl, dl
151eb9  0f841e010000           je 0x151fdd
151ebf  33ed                   xor ebp, ebp
151ec1  8b8640040000           mov eax, dword ptr [esi + 0x440]
151ec7  8b9e44040000           mov ebx, dword ptr [esi + 0x444]
151ecd  90                     nop 
151ece  3bc8                   cmp ecx, eax
151ed0  7d02                   jge 0x151ed4
151ed2  45                     inc ebp
151ed3  90                     nop 
151ed4  d1e5                   shl ebp, 1
151ed6  90                     nop 
151ed7  3bcb                   cmp ecx, ebx
151ed9  7d02                   jge 0x151edd
151edb  45                     inc ebp
151edc  90                     nop 
151edd  d1e5                   shl ebp, 1
151edf  90                     nop 
151ee0  8b8604040000           mov eax, dword ptr [esi + 0x404]
151ee6  8b9e00040000           mov ebx, dword ptr [esi + 0x400]
151eec  3bc8                   cmp ecx, eax
151eee  7d02                   jge 0x151ef2
151ef0  45                     inc ebp
151ef1  90                     nop 
151ef2  d1e5                   shl ebp, 1
151ef4  90                     nop 
151ef5  3bcb                   cmp ecx, ebx
151ef7  7d02                   jge 0x151efb
151ef9  45                     inc ebp
151efa  90                     nop 
151efb  90                     nop 
151efc  81fa00000100           cmp edx, 0x10000
151f02  89ae30231f00           mov dword ptr [esi + 0x1f2330], ebp
151f08  0f82cf000000           jb 0x151fdd
151f0e  c1e504                 shl ebp, 4
151f11  8b8630231f00           mov eax, dword ptr [esi + 0x1f2330]
151f17  0be8                   or ebp, eax
151f19  0f84be000000           je 0x151fdd
151f1f  81fdff000000           cmp ebp, 0xff
151f25  0f84b2000000           je 0x151fdd
151f2b  c1e506                 shl ebp, 6
151f2e  52                     push edx
151f2f  51                     push ecx
151f30  8b1538dc1b00           mov edx, dword ptr [0x1bdc38]
151f36  b803000000             mov eax, 3
151f3b  8b9d10341b00           mov ebx, dword ptr [ebp + 0x1b3410]
151f41  894210                 mov dword ptr [edx + 0x10], eax
151f44  8b8d14341b00           mov ecx, dword ptr [ebp + 0x1b3414]
151f4a  8b850c341b00           mov eax, dword ptr [ebp + 0x1b340c]
151f50  03df                   add ebx, edi
151f52  03c7                   add eax, edi
151f54  03cf                   add ecx, edi
151f56  d903                   fld dword ptr [ebx]
151f58  d820                   fsub dword ptr [eax]
151f5a  d901                   fld dword ptr [ecx]
151f5c  d820                   fsub dword ptr [eax]
151f5e  d94304                 fld dword ptr [ebx + 4]
151f61  d86004                 fsub dword ptr [eax + 4]
151f64  d94104                 fld dword ptr [ecx + 4]
151f67  d86004                 fsub dword ptr [eax + 4]
151f6a  d9c0                   fld st(0)
151f6c  d8cc                   fmul st(4)
151f6e  d9c2                   fld st(2)
151f70  d8cc                   fmul st(4)
151f72  d94308                 fld dword ptr [ebx + 8]
151f75  d86008                 fsub dword ptr [eax + 8]
151f78  d94108                 fld dword ptr [ecx + 8]
151f7b  d86008                 fsub dword ptr [eax + 8]
151f7e  d9ce                   fxch st(6)
151f80  d8c9                   fmul st(1)
151f82  d9ca                   fxch st(2)
151f84  deeb                   fsubp st(3)
151f86  d9ce                   fxch st(6)
151f88  d8cd                   fmul st(5)
151f8a  d9ce                   fxch st(6)
151f8c  decb                   fmulp st(3)
151f8e  dee5                   fsubrp st(5)
151f90  d9ca                   fxch st(2)
151f92  decb                   fmulp st(3)
151f94  d9c9                   fxch st(1)
151f96  d95a1c                 fstp dword ptr [edx + 0x1c]
151f99  dee9                   fsubp st(1)
151f9b  d9c9                   fxch st(1)
151f9d  d95a18                 fstp dword ptr [edx + 0x18]
151fa0  d95a14                 fstp dword ptr [edx + 0x14]
151fa3  83c50c                 add ebp, 0xc
151fa6  894230                 mov dword ptr [edx + 0x30], eax
151fa9  895a34                 mov dword ptr [edx + 0x34], ebx
151fac  894a38                 mov dword ptr [edx + 0x38], ecx
151faf  83c034                 add eax, 0x34
151fb2  83c334                 add ebx, 0x34
151fb5  83c134                 add ecx, 0x34
151fb8  894224                 mov dword ptr [edx + 0x24], eax
151fbb  895a28                 mov dword ptr [edx + 0x28], ebx
151fbe  894a2c                 mov dword ptr [edx + 0x2c], ecx
151fc1  83c23c                 add edx, 0x3c
151fc4  b8ffffffff             mov eax, 0xffffffff
151fc9  39850c341b00           cmp dword ptr [ebp + 0x1b340c], eax
151fcf  0f8561ffffff           jne 0x151f36
151fd5  891538dc1b00           mov dword ptr [0x1bdc38], edx
151fdb  59                     pop ecx
151fdc  5a                     pop edx
151fdd  83c604                 add esi, 4
151fe0  83c760                 add edi, 0x60
151fe3  fec2                   inc dl
151fe5  80fa10                 cmp dl, 0x10
151fe8  0f85fefaffff           jne 0x151aec
151fee  fec6                   inc dh
151ff0  80fe10                 cmp dh, 0x10
151ff3  0f85f1faffff           jne 0x151aea
151ff9  81c200000100           add edx, 0x10000
151fff  81fa00001000           cmp edx, 0x100000
152005  0f82ddfaffff           jb 0x151ae8
15200b  61                     popal 
15200c  a138dc1b00             mov eax, dword ptr [0x1bdc38]
152011  c3                     ret 
152012  84c0                   test al, al
152014  7412                   je 0x152028
152016  3c0f                   cmp al, 0xf
152018  751c                   jne 0x152036
15201a  d945fc                 fld dword ptr [ebp - 4]
15201d  d86500                 fsub dword ptr [ebp]
152020  d80d3cdc1b00           fmul dword ptr [0x1bdc3c]
152026  eb14                   jmp 0x15203c
152028  d94500                 fld dword ptr [ebp]
15202b  d86504                 fsub dword ptr [ebp + 4]
15202e  d80d3cdc1b00           fmul dword ptr [0x1bdc3c]
152034  eb06                   jmp 0x15203c
152036  d945fc                 fld dword ptr [ebp - 4]
152039  d86504                 fsub dword ptr [ebp + 4]
15203c  84e4                   test ah, ah
15203e  7413                   je 0x152053
152040  80fc0f                 cmp ah, 0xf
152043  751c                   jne 0x152061
152045  d945c0                 fld dword ptr [ebp - 0x40]
152048  d86500                 fsub dword ptr [ebp]
15204b  d80d3cdc1b00           fmul dword ptr [0x1bdc3c]
152051  eb14                   jmp 0x152067
152053  d94500                 fld dword ptr [ebp]
152056  d86540                 fsub dword ptr [ebp + 0x40]
152059  d80d3cdc1b00           fmul dword ptr [0x1bdc3c]
15205f  eb06                   jmp 0x152067
152061  d945c0                 fld dword ptr [ebp - 0x40]
152064  d86540                 fsub dword ptr [ebp + 0x40]
152067  3d00000100             cmp eax, 0x10000
15206c  7218                   jb 0x152086
15206e  3d00000f00             cmp eax, 0xf0000
152073  7222                   jb 0x152097
152075  d98500fcffff           fld dword ptr [ebp - 0x400]
15207b  d86500                 fsub dword ptr [ebp]
15207e  d80d3cdc1b00           fmul dword ptr [0x1bdc3c]
152084  eb1d                   jmp 0x1520a3
152086  d94500                 fld dword ptr [ebp]
152089  d8a500040000           fsub dword ptr [ebp + 0x400]
15208f  d80d3cdc1b00           fmul dword ptr [0x1bdc3c]
152095  eb0c                   jmp 0x1520a3
152097  d98500fcffff           fld dword ptr [ebp - 0x400]
15209d  d8a500040000           fsub dword ptr [ebp + 0x400]
1520a3  d9ca                   fxch st(2)
1520a5  c3                     ret 
1520a6  0000                   add byte ptr [eax], al
1520a8  0000                   add byte ptr [eax], al
1520aa  0000                   add byte ptr [eax], al
1520ac  0000                   add byte ptr [eax], al
1520ae  0000                   add byte ptr [eax], al
1520b0  53                     push ebx
1520b1  51                     push ecx
1520b2  52                     push edx
1520b3  56                     push esi
1520b4  89c6                   mov esi, eax
1520b6  bb0b000000             mov ebx, 0xb
1520bb  bab4061b00             mov edx, 0x1b06b4
1520c0  b808000000             mov eax, 8
1520c5  e892f9faff             call 0x101a5c
1520ca  89c1                   mov ecx, eax
1520cc  31db                   xor ebx, ebx
1520ce  31d2                   xor edx, edx
1520d0  89f0                   mov eax, esi
1520d2  e8de58fbff             call 0x1079b5
1520d7  8901                   mov dword ptr [ecx], eax
1520d9  85c0                   test eax, eax
1520db  7515                   jne 0x1520f2
1520dd  56                     push esi
1520de  68c0061b00             push 0x1b06c0
1520e3  e880fdfaff             call 0x101e68
1520e8  83c408                 add esp, 8
1520eb  31c0                   xor eax, eax
1520ed  5e                     pop esi
1520ee  5a                     pop edx
1520ef  59                     pop ecx
1520f0  5b                     pop ebx
1520f1  c3                     ret 
1520f2  894104                 mov dword ptr [ecx + 4], eax
1520f5  89c8                   mov eax, ecx
1520f7  5e                     pop esi
1520f8  5a                     pop edx
1520f9  59                     pop ecx
1520fa  5b                     pop ebx
1520fb  c3                     ret 
1520fc  53                     push ebx
1520fd  51                     push ecx
1520fe  56                     push esi
1520ff  57                     push edi
152100  55                     push ebp
152101  89c5                   mov ebp, eax
152103  89d7                   mov edi, edx
152105  8b5004                 mov edx, dword ptr [eax + 4]
152108  803a40                 cmp byte ptr [edx], 0x40
15210b  7511                   jne 0x15211e
15210d  b8d8061b00             mov eax, 0x1b06d8
152112  e8a844fbff             call 0x1065bf
152117  b8ffffffff             mov eax, 0xffffffff
15211c  eb3a                   jmp 0x152158
