; morphvolume function 0 at 115e30
115e30  53                     push ebx
115e31  51                     push ecx
115e32  56                     push esi
115e33  57                     push edi
115e34  55                     push ebp
115e35  81eca4010000           sub esp, 0x1a4
115e3b  89c1                   mov ecx, eax
115e3d  bb93020000             mov ebx, 0x293
115e42  ba8cdd1a00             mov edx, 0x1add8c
115e47  b818000000             mov eax, 0x18
115e4c  e80bbcfeff             call 0x101a5c
115e51  89c6                   mov esi, eax
115e53  c7401400000000         mov dword ptr [eax + 0x14], 0
115e5a  89e0                   mov eax, esp
115e5c  50                     push eax
115e5d  8d842458010000         lea eax, [esp + 0x158]
115e64  50                     push eax
115e65  8d84240c010000         lea eax, [esp + 0x10c]
115e6c  50                     push eax
115e6d  8d8424c0000000         lea eax, [esp + 0xc0]
115e74  50                     push eax
115e75  68e0e01a00             push 0x1ae0e0
115e7a  51                     push ecx
115e7b  e846230000             call 0x1181c6
115e80  83c418                 add esp, 0x18
115e83  83f804                 cmp eax, 4
115e86  740a                   je 0x115e92
115e88  b8ece01a00             mov eax, 0x1ae0ec
115e8d  e82d07ffff             call 0x1065bf
115e92  31c9                   xor ecx, ecx
115e94  31db                   xor ebx, ebx
115e96  8b91f0412000           mov edx, dword ptr [ecx + 0x2041f0]
115e9c  85d2                   test edx, edx
115e9e  7412                   je 0x115eb2
115ea0  89d0                   mov eax, edx
115ea2  8d9424b4000000         lea edx, [esp + 0xb4]
115ea9  e84207ffff             call 0x1065f0
115eae  85c0                   test eax, eax
115eb0  740c                   je 0x115ebe
115eb2  83c104                 add ecx, 4
115eb5  43                     inc ebx
115eb6  81f980000000           cmp ecx, 0x80
115ebc  7cd8                   jl 0x115e96
115ebe  83fb20                 cmp ebx, 0x20
115ec1  750a                   jne 0x115ecd
115ec3  b810e11a00             mov eax, 0x1ae110
115ec8  e8f206ffff             call 0x1065bf
115ecd  8b049df0412000         mov eax, dword ptr [ebx*4 + 0x2041f0]
115ed4  31c9                   xor ecx, ecx
115ed6  8b4020                 mov eax, dword ptr [eax + 0x20]
115ed9  31db                   xor ebx, ebx
115edb  894608                 mov dword ptr [esi + 8], eax
115ede  8bb9f0412000           mov edi, dword ptr [ecx + 0x2041f0]
115ee4  85ff                   test edi, edi
115ee6  7412                   je 0x115efa
115ee8  8d942404010000         lea edx, [esp + 0x104]
115eef  89f8                   mov eax, edi
115ef1  e8fa06ffff             call 0x1065f0
115ef6  85c0                   test eax, eax
115ef8  740c                   je 0x115f06
115efa  83c104                 add ecx, 4
115efd  43                     inc ebx
115efe  81f980000000           cmp ecx, 0x80
115f04  7cd8                   jl 0x115ede
115f06  83fb20                 cmp ebx, 0x20
115f09  750a                   jne 0x115f15
115f0b  b830e11a00             mov eax, 0x1ae130
115f10  e8aa06ffff             call 0x1065bf
115f15  8b049df0412000         mov eax, dword ptr [ebx*4 + 0x2041f0]
115f1c  31c9                   xor ecx, ecx
