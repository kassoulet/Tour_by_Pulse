; fadevolume function 0 at 1164b4
1164b4  53                     push ebx
1164b5  51                     push ecx
1164b6  56                     push esi
1164b7  57                     push edi
1164b8  55                     push ebp
1164b9  81ec54010000           sub esp, 0x154
1164bf  89c1                   mov ecx, eax
1164c1  bbd0030000             mov ebx, 0x3d0
1164c6  ba8cdd1a00             mov edx, 0x1add8c
1164cb  b814000000             mov eax, 0x14
1164d0  e887b5feff             call 0x101a5c
1164d5  89c6                   mov esi, eax
1164d7  c7400c00000000         mov dword ptr [eax + 0xc], 0
1164de  89e0                   mov eax, esp
1164e0  50                     push eax
1164e1  8d842408010000         lea eax, [esp + 0x108]
1164e8  50                     push eax
1164e9  8d8424bc000000         lea eax, [esp + 0xbc]
1164f0  50                     push eax
1164f1  688ce11a00             push 0x1ae18c
1164f6  51                     push ecx
1164f7  e8ca1c0000             call 0x1181c6
1164fc  83c414                 add esp, 0x14
1164ff  83f803                 cmp eax, 3
116502  740a                   je 0x11650e
116504  b84ce21a00             mov eax, 0x1ae24c
116509  e8b100ffff             call 0x1065bf
11650e  31db                   xor ebx, ebx
116510  31c9                   xor ecx, ecx
116512  8b93f0412000           mov edx, dword ptr [ebx + 0x2041f0]
116518  85d2                   test edx, edx
11651a  7412                   je 0x11652e
11651c  89d0                   mov eax, edx
11651e  8d9424b4000000         lea edx, [esp + 0xb4]
116525  e8c600ffff             call 0x1065f0
11652a  85c0                   test eax, eax
11652c  740c                   je 0x11653a
11652e  83c304                 add ebx, 4
116531  41                     inc ecx
116532  81fb80000000           cmp ebx, 0x80
116538  7cd8                   jl 0x116512
11653a  83f920                 cmp ecx, 0x20
11653d  750a                   jne 0x116549
11653f  b86ce21a00             mov eax, 0x1ae26c
116544  e87600ffff             call 0x1065bf
116549  8b048df0412000         mov eax, dword ptr [ecx*4 + 0x2041f0]
116550  31db                   xor ebx, ebx
116552  8b4020                 mov eax, dword ptr [eax + 0x20]
116555  31c9                   xor ecx, ecx
116557  894604                 mov dword ptr [esi + 4], eax
11655a  8bbbf0412000           mov edi, dword ptr [ebx + 0x2041f0]
116560  85ff                   test edi, edi
116562  7412                   je 0x116576
116564  8d942404010000         lea edx, [esp + 0x104]
11656b  89f8                   mov eax, edi
11656d  e87e00ffff             call 0x1065f0
116572  85c0                   test eax, eax
116574  740c                   je 0x116582
116576  83c304                 add ebx, 4
116579  41                     inc ecx
