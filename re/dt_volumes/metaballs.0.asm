; metaballs function 0 at 1158e4
1158e4  53                     push ebx
1158e5  51                     push ecx
1158e6  56                     push esi
1158e7  57                     push edi
1158e8  55                     push ebp
1158e9  81ec30020000           sub esp, 0x230
1158ef  89c1                   mov ecx, eax
1158f1  bbda010000             mov ebx, 0x1da
1158f6  ba8cdd1a00             mov edx, 0x1add8c
1158fb  b8b0000000             mov eax, 0xb0
115900  e857c1feff             call 0x101a5c
115905  89c5                   mov ebp, eax
115907  c780ac00000000000000   mov dword ptr [eax + 0xac], 0
115911  8d8424f0000000         lea eax, [esp + 0xf0]
115918  50                     push eax
115919  8d842444010000         lea eax, [esp + 0x144]
115920  50                     push eax
115921  68d0dd1a00             push 0x1addd0
115926  51                     push ecx
115927  e89a280000             call 0x1181c6
11592c  83c410                 add esp, 0x10
11592f  83f802                 cmp eax, 2
115932  740a                   je 0x11593e
115934  b8bcde1a00             mov eax, 0x1adebc
115939  e8810cffff             call 0x1065bf
11593e  31db                   xor ebx, ebx
115940  31c9                   xor ecx, ecx
115942  31f6                   xor esi, esi
115944  8b93f0412000           mov edx, dword ptr [ebx + 0x2041f0]
11594a  39d6                   cmp esi, edx
11594c  7412                   je 0x115960
11594e  89d0                   mov eax, edx
115950  8d942440010000         lea edx, [esp + 0x140]
115957  e8940cffff             call 0x1065f0
11595c  85c0                   test eax, eax
11595e  740c                   je 0x11596c
115960  83c304                 add ebx, 4
115963  41                     inc ecx
115964  81fb80000000           cmp ebx, 0x80
11596a  7cd8                   jl 0x115944
11596c  83f920                 cmp ecx, 0x20
11596f  750a                   jne 0x11597b
115971  b8dcde1a00             mov eax, 0x1adedc
115976  e8440cffff             call 0x1065bf
11597b  8b048df0412000         mov eax, dword ptr [ecx*4 + 0x2041f0]
115982  bb02000000             mov ebx, 2
115987  8b4020                 mov eax, dword ptr [eax + 0x20]
11598a  89e9                   mov ecx, ebp
11598c  894504                 mov dword ptr [ebp + 4], eax
11598f  8d8424f0000000         lea eax, [esp + 0xf0]
115996  8d7d20                 lea edi, [ebp + 0x20]
115999  e812c70300             call 0x1520b0
11599e  89c6                   mov esi, eax
1159a0  8d9424f0000000         lea edx, [esp + 0xf0]
1159a7  89f0                   mov eax, esi
1159a9  e84ec70300             call 0x1520fc
1159ae  8d8424e0010000         lea eax, [esp + 0x1e0]
1159b5  50                     push eax
1159b6  8d842494010000         lea eax, [esp + 0x194]
1159bd  50                     push eax
1159be  8d442408               lea eax, [esp + 8]
1159c2  50                     push eax
1159c3  8d44245c               lea eax, [esp + 0x5c]
1159c7  50                     push eax
1159c8  8d8424b0000000         lea eax, [esp + 0xb0]
1159cf  50                     push eax
1159d0  68f8de1a00             push 0x1adef8
1159d5  8d842408010000         lea eax, [esp + 0x108]
1159dc  50                     push eax
1159dd  e8e4270000             call 0x1181c6
1159e2  83c41c                 add esp, 0x1c
1159e5  83f805                 cmp eax, 5
1159e8  7410                   je 0x1159fa
1159ea  53                     push ebx
1159eb  40                     inc eax
1159ec  50                     push eax
1159ed  6808df1a00             push 0x1adf08
1159f2  e871c4feff             call 0x101e68
1159f7  83c40c                 add esp, 0xc
1159fa  8d8424a0000000         lea eax, [esp + 0xa0]
115a01  e8024a0300             call 0x14a408
115a06  894108                 mov dword ptr [ecx + 8], eax
115a09  833d24a91b0000         cmp dword ptr [0x1ba924], 0
115a10  7416                   je 0x115a28
115a12  53                     push ebx
115a13  683cdf1a00             push 0x1adf3c
115a18  31d2                   xor edx, edx
115a1a  e849c4feff             call 0x101e68
115a1f  83c408                 add esp, 8
115a22  891524a91b00           mov dword ptr [0x1ba924], edx
115a28  8d442450               lea eax, [esp + 0x50]
115a2c  e8d7490300             call 0x14a408
115a31  894128                 mov dword ptr [ecx + 0x28], eax
115a34  833d24a91b0000         cmp dword ptr [0x1ba924], 0
115a3b  7416                   je 0x115a53
115a3d  53                     push ebx
115a3e  6870df1a00             push 0x1adf70
115a43  31d2                   xor edx, edx
115a45  e81ec4feff             call 0x101e68
115a4a  83c408                 add esp, 8
115a4d  891524a91b00           mov dword ptr [0x1ba924], edx
115a53  89e0                   mov eax, esp
115a55  e8ae490300             call 0x14a408
115a5a  894148                 mov dword ptr [ecx + 0x48], eax
115a5d  833d24a91b0000         cmp dword ptr [0x1ba924], 0
115a64  7416                   je 0x115a7c
115a66  53                     push ebx
115a67  68a4df1a00             push 0x1adfa4
115a6c  31d2                   xor edx, edx
115a6e  e8f5c3feff             call 0x101e68
115a73  83c408                 add esp, 8
115a76  891524a91b00           mov dword ptr [0x1ba924], edx
115a7c  8d842490010000         lea eax, [esp + 0x190]
115a83  e880490300             call 0x14a408
115a88  894168                 mov dword ptr [ecx + 0x68], eax
115a8b  833d24a91b0000         cmp dword ptr [0x1ba924], 0
115a92  7416                   je 0x115aaa
115a94  53                     push ebx
115a95  68d8df1a00             push 0x1adfd8
115a9a  31d2                   xor edx, edx
115a9c  e8c7c3feff             call 0x101e68
115aa1  83c408                 add esp, 8
115aa4  891524a91b00           mov dword ptr [0x1ba924], edx
115aaa  8d8424e0010000         lea eax, [esp + 0x1e0]
115ab1  e852490300             call 0x14a408
115ab6  898188000000           mov dword ptr [ecx + 0x88], eax
115abc  833d24a91b0000         cmp dword ptr [0x1ba924], 0
115ac3  7416                   je 0x115adb
115ac5  53                     push ebx
115ac6  680ce01a00             push 0x1ae00c
115acb  31d2                   xor edx, edx
115acd  e896c3feff             call 0x101e68
115ad2  83c408                 add esp, 8
115ad5  891524a91b00           mov dword ptr [0x1ba924], edx
115adb  83c104                 add ecx, 4
115ade  43                     inc ebx
115adf  39f9                   cmp ecx, edi
115ae1  0f85b9feffff           jne 0x1159a0
115ae7  89f0                   mov eax, esi
115ae9  e872c60300             call 0x152160
115aee  e845f1ffff             call 0x114c38
115af3  894500                 mov dword ptr [ebp], eax
115af6  89e8                   mov eax, ebp
115af8  81c430020000           add esp, 0x230
115afe  5d                     pop ebp
115aff  5f                     pop edi
115b00  5e                     pop esi
115b01  59                     pop ecx
115b02  5b                     pop ebx
115b03  c3                     ret 
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
