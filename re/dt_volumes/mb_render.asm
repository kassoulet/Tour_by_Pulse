1155cc  53                     push ebx
1155cd  51                     push ecx
1155ce  56                     push esi
1155cf  89d1                   mov ecx, edx
1155d1  89c3                   mov ebx, eax
1155d3  8db0c0030000           lea esi, [eax + 0x3c0]
1155d9  8b03                   mov eax, dword ptr [ebx]
1155db  83f801                 cmp eax, 1
1155de  721d                   jb 0x1155fd
1155e0  7607                   jbe 0x1155e9
1155e2  83f802                 cmp eax, 2
1155e5  740d                   je 0x1155f4
1155e7  eb14                   jmp 0x1155fd
1155e9  89da                   mov edx, ebx
1155eb  89c8                   mov eax, ecx
1155ed  e8f6f8ffff             call 0x114ee8
1155f2  eb09                   jmp 0x1155fd
1155f4  89da                   mov edx, ebx
1155f6  89c8                   mov eax, ecx
1155f8  e817fdffff             call 0x115314
1155fd  83c33c                 add ebx, 0x3c
115600  39f3                   cmp ebx, esi
115602  75d5                   jne 0x1155d9
115604  5e                     pop esi
115605  59                     pop ecx
115606  5b                     pop ebx
115607  c3                     ret 
115608  53                     push ebx
115609  51                     push ecx
11560a  56                     push esi
11560b  89d1                   mov ecx, edx
11560d  d9410c                 fld dword ptr [ecx + 0xc]
115610  d901                   fld dword ptr [ecx]
115612  d94110                 fld dword ptr [ecx + 0x10]
115615  d94104                 fld dword ptr [ecx + 4]
115618  d94114                 fld dword ptr [ecx + 0x14]
11561b  d94108                 fld dword ptr [ecx + 8]
11561e  d9cd                   fxch st(5)
115620  d91dd0331b00           fstp dword ptr [0x1b33d0]
115626  d9cb                   fxch st(3)
115628  d91dc4331b00           fstp dword ptr [0x1b33c4]
11562e  d9c9                   fxch st(1)
115630  d91dd4331b00           fstp dword ptr [0x1b33d4]
115636  d91dc8331b00           fstp dword ptr [0x1b33c8]
11563c  d91dd8331b00           fstp dword ptr [0x1b33d8]
115642  89c3                   mov ebx, eax
115644  8b711c                 mov esi, dword ptr [ecx + 0x1c]
115647  8b5220                 mov edx, dword ptr [edx + 0x20]
11564a  89f0                   mov eax, esi
11564c  d91dcc331b00           fstp dword ptr [0x1b33cc]
115652  e861c40300             call 0x151ab8
115657  8b511c                 mov edx, dword ptr [ecx + 0x1c]
11565a  29d0                   sub eax, edx
11565c  89c2                   mov edx, eax
11565e  be3c000000             mov esi, 0x3c
115663  c1fa1f                 sar edx, 0x1f
115666  f7fe                   idiv esi
115668  8b5118                 mov edx, dword ptr [ecx + 0x18]
11566b  89421c                 mov dword ptr [edx + 0x1c], eax
11566e  8b4118                 mov eax, dword ptr [ecx + 0x18]
115671  8b1d6c1b1d00           mov ebx, dword ptr [0x1d1b6c]
115677  8b401c                 mov eax, dword ptr [eax + 0x1c]
11567a  01c3                   add ebx, eax
11567c  891d6c1b1d00           mov dword ptr [0x1d1b6c], ebx
115682  5e                     pop esi
115683  59                     pop ecx
115684  5b                     pop ebx
115685  c3                     ret 
115686  8bc0                   mov eax, eax
115688  53                     push ebx
115689  51                     push ecx
11568a  83ec70                 sub esp, 0x70
11568d  89e2                   mov edx, esp
11568f  52                     push edx
115690  8d542454               lea edx, [esp + 0x54]
115694  52                     push edx
115695  68d0dd1a00             push 0x1addd0
11569a  50                     push eax
11569b  e8262b0000             call 0x1181c6
1156a0  83c410                 add esp, 0x10
1156a3  89c2                   mov edx, eax
1156a5  85c0                   test eax, eax
1156a7  750a                   jne 0x1156b3
1156a9  b8d8dd1a00             mov eax, 0x1addd8
1156ae  e80c0fffff             call 0x1065bf
1156b3  8d442450               lea eax, [esp + 0x50]
1156b7  e898f5ffff             call 0x114c54
1156bc  89c1                   mov ecx, eax
1156be  83fa01                 cmp edx, 1
1156c1  7e0c                   jle 0x1156cf
1156c3  8b5820                 mov ebx, dword ptr [eax + 0x20]
1156c6  31d2                   xor edx, edx
1156c8  89e0                   mov eax, esp
1156ca  e8e622ffff             call 0x1079b5
1156cf  8b1df0412000           mov ebx, dword ptr [0x2041f0]
1156d5  31c0                   xor eax, eax
1156d7  31d2                   xor edx, edx
1156d9  85db                   test ebx, ebx
1156db  750b                   jne 0x1156e8
1156dd  895124                 mov dword ptr [ecx + 0x24], edx
1156e0  8988f0412000           mov dword ptr [eax + 0x2041f0], ecx
1156e6  eb16                   jmp 0x1156fe
1156e8  83c004                 add eax, 4
1156eb  42                     inc edx
1156ec  3d80000000             cmp eax, 0x80
1156f1  7d0b                   jge 0x1156fe
1156f3  83b8f041200000         cmp dword ptr [eax + 0x2041f0], 0
1156fa  74e1                   je 0x1156dd
1156fc  ebea                   jmp 0x1156e8
1156fe  83fa20                 cmp edx, 0x20
115701  750a                   jne 0x11570d
115703  b8f8dd1a00             mov eax, 0x1addf8
115708  e8b20effff             call 0x1065bf
11570d  89c8                   mov eax, ecx
11570f  83c470                 add esp, 0x70
115712  59                     pop ecx
115713  5b                     pop ebx
115714  c3                     ret 
115715  8d4000                 lea eax, [eax]
115718  53                     push ebx
115719  51                     push ecx
11571a  52                     push edx
11571b  89c1                   mov ecx, eax
11571d  8b4024                 mov eax, dword ptr [eax + 0x24]
115720  31d2                   xor edx, edx
115722  bb43010000             mov ebx, 0x143
115727  891485f0412000         mov dword ptr [eax*4 + 0x2041f0], edx
11572e  ba8cdd1a00             mov edx, 0x1add8c
115733  8b4120                 mov eax, dword ptr [ecx + 0x20]
115736  e8ddc3feff             call 0x101b18
11573b  bb44010000             mov ebx, 0x144
115740  ba8cdd1a00             mov edx, 0x1add8c
115745  89c8                   mov eax, ecx
115747  e8ccc3feff             call 0x101b18
11574c  5a                     pop edx
11574d  59                     pop ecx
11574e  5b                     pop ebx
11574f  c3                     ret 
115750  b84c8a1b00             mov eax, 0x1b8a4c
115755  c3                     ret 
115756  8bc0                   mov eax, eax
115758  53                     push ebx
115759  51                     push ecx
11575a  83ec20                 sub esp, 0x20
11575d  89e2                   mov edx, esp
11575f  52                     push edx
115760  680cde1a00             push 0x1ade0c
115765  50                     push eax
115766  e85b2a0000             call 0x1181c6
11576b  83c40c                 add esp, 0xc
