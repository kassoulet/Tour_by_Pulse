#!/usr/bin/env python3
"""fn.py ADDR - guess the entry of the function containing ADDR (scan back for 'ret' followed by a push-ebx prologue)"""
import sys,os
B=0x100000
img=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'image.bin'),'rb').read()
a=int(sys.argv[1],16)-B
i=a
while i>0:
    if img[i-1]==0xc3 or img[i-2:i]==b'\xc2\x00' : 
        # skip padding
        j=i
        while img[j]==0 and j<a: j+=1
        if img[j] in (0x53,0x51,0x52,0x56,0x57,0x55,0x83,0x81,0x8b,0x89): print(hex(j+B)); break
    i-=1
