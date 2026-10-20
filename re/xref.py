#!/usr/bin/env python3
"""xref.py ADDR - linear addresses where the 32-bit value ADDR occurs in image.bin"""
import sys,os,struct
B=0x100000
img=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'image.bin'),'rb').read()
v=struct.pack('<I',int(sys.argv[1],16)); i=img.find(v)
while i>=0: print(hex(i+B)); i=img.find(v,i+1)
