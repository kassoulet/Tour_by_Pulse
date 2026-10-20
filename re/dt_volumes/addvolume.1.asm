; addvolume function 1 at 116160
116160  53                     push ebx
116161  51                     push ecx
116162  83781000               cmp dword ptr [eax + 0x10], 0
116166  7510                   jne 0x116178
116168  c7401001000000         mov dword ptr [eax + 0x10], 1
11616f  8b15f8281b00           mov edx, dword ptr [0x1b28f8]
116175  89500c                 mov dword ptr [eax + 0xc], edx
116178  b900100000             mov ecx, 0x1000
11617d  8b5804                 mov ebx, dword ptr [eax + 4]
116180  8b10                   mov edx, dword ptr [eax]
116182  8b4008                 mov eax, dword ptr [eax + 8]
116185  e868c00300             call 0x1521f2
11618a  59                     pop ecx
11618b  5b                     pop ebx
11618c  c3                     ret 
11618d  8d4000                 lea eax, [eax]
116190  53                     push ebx
116191  52                     push edx
116192  bb0e030000             mov ebx, 0x30e
116197  ba8cdd1a00             mov edx, 0x1add8c
11619c  e877b9feff             call 0x101b18
1161a1  5a                     pop edx
1161a2  5b                     pop ebx
1161a3  c3                     ret 
1161a4  b8ac8a1b00             mov eax, 0x1b8aac
1161a9  c3                     ret 
1161aa  8bc0                   mov eax, eax
1161ac  53                     push ebx
1161ad  51                     push ecx
1161ae  56                     push esi
1161af  57                     push edi
1161b0  55                     push ebp
1161b1  81ecf0000000           sub esp, 0xf0
1161b7  89c1                   mov ecx, eax
1161b9  bb35030000             mov ebx, 0x335
1161be  ba8cdd1a00             mov edx, 0x1add8c
1161c3  b814000000             mov eax, 0x14
1161c8  e88fb8feff             call 0x101a5c
1161cd  89c6                   mov esi, eax
1161cf  c7401000000000         mov dword ptr [eax + 0x10], 0
