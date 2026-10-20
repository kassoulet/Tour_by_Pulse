; metaballs function 1 at 115b04
115b04  53                     push ebx
115b05  51                     push ecx
115b06  56                     push esi
115b07  83ec04                 sub esp, 4
115b0a  89c1                   mov ecx, eax
115b0c  83b8ac00000000         cmp dword ptr [eax + 0xac], 0
115b13  7516                   jne 0x115b2b
115b15  c780ac00000001000000   mov dword ptr [eax + 0xac], 1
115b1f  8b15f8281b00           mov edx, dword ptr [0x1b28f8]
115b25  8990a8000000           mov dword ptr [eax + 0xa8], edx
115b2b  d905f8281b00           fld dword ptr [0x1b28f8]
115b31  89ca                   mov edx, ecx
115b33  d8a1a8000000           fsub dword ptr [ecx + 0xa8]
115b39  31db                   xor ebx, ebx
115b3b  d91c24                 fstp dword ptr [esp]
115b3e  8b31                   mov esi, dword ptr [ecx]
115b40  56                     push esi
115b41  53                     push ebx
115b42  8b8288000000           mov eax, dword ptr [edx + 0x88]
115b48  ff742408               push dword ptr [esp + 8]
115b4c  e81f4a0300             call 0x14a570
115b51  83ec04                 sub esp, 4
115b54  d91c24                 fstp dword ptr [esp]
115b57  8b4268                 mov eax, dword ptr [edx + 0x68]
115b5a  ff74240c               push dword ptr [esp + 0xc]
115b5e  e80d4a0300             call 0x14a570
115b63  83ec04                 sub esp, 4
115b66  d91c24                 fstp dword ptr [esp]
115b69  8b4248                 mov eax, dword ptr [edx + 0x48]
115b6c  ff742410               push dword ptr [esp + 0x10]
115b70  e8fb490300             call 0x14a570
115b75  83ec04                 sub esp, 4
115b78  d91c24                 fstp dword ptr [esp]
115b7b  8b4228                 mov eax, dword ptr [edx + 0x28]
115b7e  ff742414               push dword ptr [esp + 0x14]
115b82  e8e9490300             call 0x14a570
115b87  83ec04                 sub esp, 4
115b8a  d91c24                 fstp dword ptr [esp]
115b8d  8b4208                 mov eax, dword ptr [edx + 8]
115b90  ff742418               push dword ptr [esp + 0x18]
115b94  e8d7490300             call 0x14a570
115b99  83ec04                 sub esp, 4
115b9c  83c204                 add edx, 4
115b9f  d91c24                 fstp dword ptr [esp]
115ba2  43                     inc ebx
115ba3  e8a4f2ffff             call 0x114e4c
115ba8  83fb08                 cmp ebx, 8
115bab  7c91                   jl 0x115b3e
115bad  8b5104                 mov edx, dword ptr [ecx + 4]
115bb0  8b01                   mov eax, dword ptr [ecx]
115bb2  e815faffff             call 0x1155cc
115bb7  83c404                 add esp, 4
115bba  5e                     pop esi
115bbb  59                     pop ecx
115bbc  5b                     pop ebx
115bbd  c3                     ret 
115bbe  8bc0                   mov eax, eax
115bc0  53                     push ebx
115bc1  51                     push ecx
115bc2  52                     push edx
115bc3  89c1                   mov ecx, eax
115bc5  bb12020000             mov ebx, 0x212
115bca  ba8cdd1a00             mov edx, 0x1add8c
115bcf  8b00                   mov eax, dword ptr [eax]
115bd1  e842bffeff             call 0x101b18
115bd6  bb13020000             mov ebx, 0x213
115bdb  ba8cdd1a00             mov edx, 0x1add8c
115be0  89c8                   mov eax, ecx
115be2  e831bffeff             call 0x101b18
115be7  5a                     pop edx
115be8  59                     pop ecx
115be9  5b                     pop ebx
115bea  c3                     ret 
115beb  90                     nop 
115bec  b87c8a1b00             mov eax, 0x1b8a7c
115bf1  c3                     ret 
115bf2  8bc0                   mov eax, eax
115bf4  53                     push ebx
115bf5  51                     push ecx
115bf6  56                     push esi
115bf7  57                     push edi
115bf8  55                     push ebp
115bf9  81ecf4000000           sub esp, 0xf4
115bff  89c1                   mov ecx, eax
115c01  bb3f020000             mov ebx, 0x23f
115c06  ba8cdd1a00             mov edx, 0x1add8c
115c0b  b808000000             mov eax, 8
115c10  e847befeff             call 0x101a5c
115c15  89c5                   mov ebp, eax
115c17  8d8424f0000000         lea eax, [esp + 0xf0]
115c1e  50                     push eax
115c1f  8d442404               lea eax, [esp + 4]
115c23  50                     push eax
115c24  8d8424a8000000         lea eax, [esp + 0xa8]
115c2b  50                     push eax
115c2c  8d44245c               lea eax, [esp + 0x5c]
115c30  50                     push eax
115c31  6840e01a00             push 0x1ae040
115c36  51                     push ecx
115c37  e88a250000             call 0x1181c6
115c3c  83c418                 add esp, 0x18
115c3f  83f804                 cmp eax, 4
115c42  740a                   je 0x115c4e
115c44  b84ce01a00             mov eax, 0x1ae04c
115c49  e87109ffff             call 0x1065bf
115c4e  8b155c751b00           mov edx, dword ptr [0x1b755c]
115c54  31c9                   xor ecx, ecx
115c56  31f6                   xor esi, esi
115c58  85d2                   test edx, edx
115c5a  7e2c                   jle 0x115c88
115c5c  31db                   xor ebx, ebx
115c5e  8b83208c1f00           mov eax, dword ptr [ebx + 0x1f8c20]
115c64  8d542450               lea edx, [esp + 0x50]
115c68  83c010                 add eax, 0x10
115c6b  e88009ffff             call 0x1065f0
115c70  85c0                   test eax, eax
115c72  7506                   jne 0x115c7a
115c74  8bb3208c1f00           mov esi, dword ptr [ebx + 0x1f8c20]
115c7a  8b3d5c751b00           mov edi, dword ptr [0x1b755c]
115c80  41                     inc ecx
115c81  83c304                 add ebx, 4
115c84  39f9                   cmp ecx, edi
115c86  7cd6                   jl 0x115c5e
115c88  85f6                   test esi, esi
115c8a  751c                   jne 0x115ca8
115c8c  8d442450               lea eax, [esp + 0x50]
115c90  50                     push eax
115c91  6870e01a00             push 0x1ae070
115c96  e8cdc1feff             call 0x101e68
115c9b  83c408                 add esp, 8
115c9e  b801000000             mov eax, 1
115ca3  e8ea09ffff             call 0x106692
115ca8  8b4e2c                 mov ecx, dword ptr [esi + 0x2c]
115cab  8b4918                 mov ecx, dword ptr [ecx + 0x18]
115cae  31ff                   xor edi, edi
115cb0  8b4134                 mov eax, dword ptr [ecx + 0x34]
115cb3  31f6                   xor esi, esi
115cb5  85c0                   test eax, eax
115cb7  7e31                   jle 0x115cea
115cb9  31db                   xor ebx, ebx
