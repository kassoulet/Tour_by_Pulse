; morphvolume function 1 at 115fa0
115fa0  53                     push ebx
115fa1  51                     push ecx
115fa2  56                     push esi
115fa3  83ec04                 sub esp, 4
115fa6  89c3                   mov ebx, eax
115fa8  83781400               cmp dword ptr [eax + 0x14], 0
115fac  7510                   jne 0x115fbe
115fae  c7401401000000         mov dword ptr [eax + 0x14], 1
115fb5  8b15f8281b00           mov edx, dword ptr [0x1b28f8]
115fbb  895010                 mov dword ptr [eax + 0x10], edx
115fbe  d905f8281b00           fld dword ptr [0x1b28f8]
115fc4  d86310                 fsub dword ptr [ebx + 0x10]
115fc7  83ec04                 sub esp, 4
115fca  d91c24                 fstp dword ptr [esp]
115fcd  8b430c                 mov eax, dword ptr [ebx + 0xc]
115fd0  b900100000             mov ecx, 0x1000
115fd5  e896450300             call 0x14a570
115fda  d9c0                   fld st(0)
115fdc  8b4304                 mov eax, dword ptr [ebx + 4]
115fdf  8b13                   mov edx, dword ptr [ebx]
115fe1  8b7308                 mov esi, dword ptr [ebx + 8]
115fe4  d9e8                   fld1 
115fe6  89c3                   mov ebx, eax
115fe8  dee1                   fsubrp st(1)
115fea  89f0                   mov eax, esi
115fec  d9c9                   fxch st(1)
115fee  e869c20300             call 0x15225c
115ff3  83c404                 add esp, 4
115ff6  5e                     pop esi
115ff7  59                     pop ecx
115ff8  5b                     pop ebx
115ff9  c3                     ret 
115ffa  8bc0                   mov eax, eax
115ffc  53                     push ebx
115ffd  51                     push ecx
115ffe  52                     push edx
115fff  89c1                   mov ecx, eax
116001  bbc1020000             mov ebx, 0x2c1
116006  8b400c                 mov eax, dword ptr [eax + 0xc]
116009  ba8cdd1a00             mov edx, 0x1add8c
11600e  e8e804ffff             call 0x1064fb
116013  89c8                   mov eax, ecx
116015  e8febafeff             call 0x101b18
11601a  5a                     pop edx
11601b  59                     pop ecx
11601c  5b                     pop ebx
11601d  c3                     ret 
11601e  8bc0                   mov eax, eax
116020  b89c8a1b00             mov eax, 0x1b8a9c
116025  c3                     ret 
116026  8bc0                   mov eax, eax
116028  53                     push ebx
116029  51                     push ecx
11602a  56                     push esi
11602b  57                     push edi
11602c  55                     push ebp
11602d  81ecf0000000           sub esp, 0xf0
116033  89c1                   mov ecx, eax
116035  bbe8020000             mov ebx, 0x2e8
11603a  ba8cdd1a00             mov edx, 0x1add8c
