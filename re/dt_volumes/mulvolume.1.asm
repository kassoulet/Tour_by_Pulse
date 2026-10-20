; mulvolume function 1 at 116468
116468  53                     push ebx
116469  51                     push ecx
11646a  83781000               cmp dword ptr [eax + 0x10], 0
11646e  7510                   jne 0x116480
116470  c7401001000000         mov dword ptr [eax + 0x10], 1
116477  8b15f8281b00           mov edx, dword ptr [0x1b28f8]
11647d  89500c                 mov dword ptr [eax + 0xc], edx
116480  b900100000             mov ecx, 0x1000
116485  8b5804                 mov ebx, dword ptr [eax + 4]
116488  8b10                   mov edx, dword ptr [eax]
11648a  8b4008                 mov eax, dword ptr [eax + 8]
11648d  e82bbd0300             call 0x1521bd
116492  59                     pop ecx
116493  5b                     pop ebx
116494  c3                     ret 
116495  8d4000                 lea eax, [eax]
116498  53                     push ebx
116499  52                     push edx
11649a  bba8030000             mov ebx, 0x3a8
11649f  ba8cdd1a00             mov edx, 0x1add8c
1164a4  e86fb6feff             call 0x101b18
1164a9  5a                     pop edx
1164aa  5b                     pop ebx
1164ab  c3                     ret 
1164ac  b8cc8a1b00             mov eax, 0x1b8acc
1164b1  c3                     ret 
1164b2  8bc0                   mov eax, eax
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
