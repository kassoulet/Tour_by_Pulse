; plasma1volume function 0 at 116634
116634  53                     push ebx
116635  51                     push ecx
116636  56                     push esi
116637  57                     push edi
116638  55                     push ebp
116639  89e5                   mov ebp, esp
11663b  81ecc8010000           sub esp, 0x1c8
116641  83e4f8                 and esp, 0xfffffff8
116644  89c1                   mov ecx, eax
116646  bb22040000             mov ebx, 0x422
11664b  ba8cdd1a00             mov edx, 0x1add8c
116650  b814000000             mov eax, 0x14
116655  e802b4feff             call 0x101a5c
11665a  89c6                   mov esi, eax
11665c  c7400800000000         mov dword ptr [eax + 8], 0
116663  89e0                   mov eax, esp
116665  50                     push eax
116666  8d8424b8000000         lea eax, [esp + 0xb8]
11666d  50                     push eax
11666e  8d842470010000         lea eax, [esp + 0x170]
116675  50                     push eax
116676  688ce11a00             push 0x1ae18c
11667b  51                     push ecx
11667c  e8451b0000             call 0x1181c6
116681  83c414                 add esp, 0x14
116684  83f803                 cmp eax, 3
116687  740a                   je 0x116693
116689  b8a8e21a00             mov eax, 0x1ae2a8
11668e  e82cfffeff             call 0x1065bf
116693  31db                   xor ebx, ebx
116695  31c9                   xor ecx, ecx
116697  8b93f0412000           mov edx, dword ptr [ebx + 0x2041f0]
11669d  85d2                   test edx, edx
11669f  7412                   je 0x1166b3
1166a1  89d0                   mov eax, edx
1166a3  8d942468010000         lea edx, [esp + 0x168]
1166aa  e841fffeff             call 0x1065f0
1166af  85c0                   test eax, eax
1166b1  740c                   je 0x1166bf
1166b3  83c304                 add ebx, 4
1166b6  41                     inc ecx
1166b7  81fb80000000           cmp ebx, 0x80
1166bd  7cd8                   jl 0x116697
1166bf  83f920                 cmp ecx, 0x20
1166c2  750a                   jne 0x1166ce
1166c4  b8cce21a00             mov eax, 0x1ae2cc
1166c9  e8f1fefeff             call 0x1065bf
1166ce  8b048df0412000         mov eax, dword ptr [ecx*4 + 0x2041f0]
1166d5  8b4020                 mov eax, dword ptr [eax + 0x20]
1166d8  8906                   mov dword ptr [esi], eax
1166da  8d8424b4000000         lea eax, [esp + 0xb4]
1166e1  e8223d0300             call 0x14a408
1166e6  8b1d24a91b00           mov ebx, dword ptr [0x1ba924]
1166ec  89460c                 mov dword ptr [esi + 0xc], eax
1166ef  85db                   test ebx, ebx
1166f1  7415                   je 0x116708
1166f3  68ece21a00             push 0x1ae2ec
1166f8  e86bb7feff             call 0x101e68
1166fd  31c9                   xor ecx, ecx
1166ff  83c404                 add esp, 4
116702  890d24a91b00           mov dword ptr [0x1ba924], ecx
116708  89e0                   mov eax, esp
11670a  e8f93c0300             call 0x14a408
11670f  8b3d24a91b00           mov edi, dword ptr [0x1ba924]
116715  894610                 mov dword ptr [esi + 0x10], eax
116718  85ff                   test edi, edi
11671a  7414                   je 0x116730
11671c  680ce31a00             push 0x1ae30c
116721  e842b7feff             call 0x101e68
116726  31c0                   xor eax, eax
116728  83c404                 add esp, 4
11672b  a324a91b00             mov dword ptr [0x1ba924], eax
116730  31d2                   xor edx, edx
116732  31db                   xor ebx, ebx
116734  b90f000000             mov ecx, 0xf
116739  dd052ae31a00           fld qword ptr [0x1ae32a]
11673f  89d0                   mov eax, edx
116741  21c8                   and eax, ecx
116743  898424c4010000         mov dword ptr [esp + 0x1c4], eax
11674a  89d0                   mov eax, edx
