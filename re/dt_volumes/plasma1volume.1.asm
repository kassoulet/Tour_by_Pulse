; plasma1volume function 1 at 1167b4
1167b4  53                     push ebx
1167b5  83ec0c                 sub esp, 0xc
1167b8  89c3                   mov ebx, eax
1167ba  83780800               cmp dword ptr [eax + 8], 0
1167be  7510                   jne 0x1167d0
1167c0  c7400801000000         mov dword ptr [eax + 8], 1
1167c7  8b15f8281b00           mov edx, dword ptr [0x1b28f8]
1167cd  895004                 mov dword ptr [eax + 4], edx
1167d0  d905f8281b00           fld dword ptr [0x1b28f8]
1167d6  d86304                 fsub dword ptr [ebx + 4]
1167d9  8b430c                 mov eax, dword ptr [ebx + 0xc]
1167dc  d91c24                 fstp dword ptr [esp]
1167df  ff3424                 push dword ptr [esp]
1167e2  e8893d0300             call 0x14a570
1167e7  ff3424                 push dword ptr [esp]
1167ea  8b4310                 mov eax, dword ptr [ebx + 0x10]
1167ed  d95c240c               fstp dword ptr [esp + 0xc]
1167f1  e87a3d0300             call 0x14a570
1167f6  d90424                 fld dword ptr [esp]
1167f9  dc0d32e31a00           fmul qword ptr [0x1ae332]
1167ff  8b03                   mov eax, dword ptr [ebx]
116801  d9442408               fld dword ptr [esp + 8]
116805  d9c9                   fxch st(1)
116807  d9ca                   fxch st(2)
116809  d9c9                   fxch st(1)
11680b  e89fba0300             call 0x1522af
116810  83c40c                 add esp, 0xc
116813  5b                     pop ebx
116814  c3                     ret 
116815  8d4000                 lea eax, [eax]
116818  53                     push ebx
116819  52                     push edx
11681a  bb52040000             mov ebx, 0x452
11681f  ba8cdd1a00             mov edx, 0x1add8c
116824  e8efb2feff             call 0x101b18
116829  5a                     pop edx
11682a  5b                     pop ebx
11682b  c3                     ret 
11682c  b8ec8a1b00             mov eax, 0x1b8aec
116831  c3                     ret 
116832  8bc0                   mov eax, eax
116834  53                     push ebx
116835  51                     push ecx
116836  52                     push edx
116837  89c1                   mov ecx, eax
116839  bb6c040000             mov ebx, 0x46c
11683e  ba8cdd1a00             mov edx, 0x1add8c
116843  b81c000000             mov eax, 0x1c
116848  e82fb2feff             call 0x101a7c
11684d  8b91bc000000           mov edx, dword ptr [ecx + 0xbc]
116853  89500c                 mov dword ptr [eax + 0xc], edx
116856  d981c8000000           fld dword ptr [ecx + 0xc8]
11685c  d8a1bc000000           fsub dword ptr [ecx + 0xbc]
116862  d9053ae31a00           fld dword ptr [0x1ae33a]
116868  d9c9                   fxch st(1)
11686a  d8c9                   fmul st(1)
11686c  d918                   fstp dword ptr [eax]
11686e  8b91c0000000           mov edx, dword ptr [ecx + 0xc0]
116874  895010                 mov dword ptr [eax + 0x10], edx
116877  d981cc000000           fld dword ptr [ecx + 0xcc]
11687d  d8a1c0000000           fsub dword ptr [ecx + 0xc0]
116883  d8c9                   fmul st(1)
116885  d95804                 fstp dword ptr [eax + 4]
116888  8b91c4000000           mov edx, dword ptr [ecx + 0xc4]
11688e  895014                 mov dword ptr [eax + 0x14], edx
116891  d981d0000000           fld dword ptr [ecx + 0xd0]
116897  d8a1c4000000           fsub dword ptr [ecx + 0xc4]
11689d  dec9                   fmulp st(1)
11689f  894818                 mov dword ptr [eax + 0x18], ecx
1168a2  d95808                 fstp dword ptr [eax + 8]
1168a5  5a                     pop edx
1168a6  59                     pop ecx
1168a7  5b                     pop ebx
1168a8  c3                     ret 
1168a9  8d4000                 lea eax, [eax]
1168ac  53                     push ebx
1168ad  51                     push ecx
1168ae  56                     push esi
1168af  57                     push edi
1168b0  55                     push ebp
1168b1  81ecf0000000           sub esp, 0xf0
1168b7  89c1                   mov ecx, eax
1168b9  bb98040000             mov ebx, 0x498
1168be  ba8cdd1a00             mov edx, 0x1add8c
1168c3  b808000000             mov eax, 8
1168c8  e88fb1feff             call 0x101a5c
1168cd  89c5                   mov ebp, eax
1168cf  8d442450               lea eax, [esp + 0x50]
1168d3  50                     push eax
1168d4  8d8424a4000000         lea eax, [esp + 0xa4]
1168db  50                     push eax
1168dc  8d442408               lea eax, [esp + 8]
1168e0  50                     push eax
1168e1  688ce11a00             push 0x1ae18c
1168e6  51                     push ecx
1168e7  e8da180000             call 0x1181c6
1168ec  83c414                 add esp, 0x14
1168ef  83f803                 cmp eax, 3
1168f2  740a                   je 0x1168fe
1168f4  b840e31a00             mov eax, 0x1ae340
1168f9  e8c1fcfeff             call 0x1065bf
1168fe  8b155c751b00           mov edx, dword ptr [0x1b755c]
116904  31c9                   xor ecx, ecx
116906  31f6                   xor esi, esi
116908  85d2                   test edx, edx
11690a  7e2a                   jle 0x116936
11690c  31db                   xor ebx, ebx
11690e  8b83208c1f00           mov eax, dword ptr [ebx + 0x1f8c20]
116914  89e2                   mov edx, esp
116916  83c010                 add eax, 0x10
