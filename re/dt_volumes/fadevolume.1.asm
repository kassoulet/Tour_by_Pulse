; fadevolume function 1 at 1165d4
1165d4  53                     push ebx
1165d5  89c3                   mov ebx, eax
1165d7  83780c00               cmp dword ptr [eax + 0xc], 0
1165db  7510                   jne 0x1165ed
1165dd  c7400c01000000         mov dword ptr [eax + 0xc], 1
1165e4  8b15f8281b00           mov edx, dword ptr [0x1b28f8]
1165ea  895008                 mov dword ptr [eax + 8], edx
1165ed  d905f8281b00           fld dword ptr [0x1b28f8]
1165f3  d86308                 fsub dword ptr [ebx + 8]
1165f6  83ec04                 sub esp, 4
1165f9  d91c24                 fstp dword ptr [esp]
1165fc  8b4310                 mov eax, dword ptr [ebx + 0x10]
1165ff  e86c3f0300             call 0x14a570
116604  8b13                   mov edx, dword ptr [ebx]
116606  8b4304                 mov eax, dword ptr [ebx + 4]
116609  bb00100000             mov ebx, 0x1000
11660e  e879bb0300             call 0x15218c
116613  5b                     pop ebx
116614  c3                     ret 
116615  8d4000                 lea eax, [eax]
116618  53                     push ebx
116619  52                     push edx
11661a  bbf7030000             mov ebx, 0x3f7
11661f  ba8cdd1a00             mov edx, 0x1add8c
116624  e8efb4feff             call 0x101b18
116629  5a                     pop edx
11662a  5b                     pop ebx
11662b  c3                     ret 
11662c  b8dc8a1b00             mov eax, 0x1b8adc
116631  c3                     ret 
