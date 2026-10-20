import emucore as E,sys
from unicorn import *
E.mu.reg_write(E.R('ESP'),0x1fc000)
on=[0]; tr=[]
def h(uc,a,sz,_):
    if a==0x1709b2: on[0]=1
    if on[0] and len(tr)<80: tr.append((a,E.ireg('EAX'),E.ireg('EBX'),E.ireg('EDI')))
    if a==0x170a2d: on[0]=0
E.mu.hook_add(UC_HOOK_CODE,h)
E.run(0x1084ac,3000000)
for t in tr: print('%x eax=%x ebx=%x edi=%x'%t)
