from hx import *
a=rd32(0x1d1b40); b=rd32(0x1d1b48); print(hex(a),hex(b),hex(rd32(0x1d1b44)),hex(rd32(0x1d1b4c)),hex(rd32(0x1d1b88)))
A=np.frombuffer(rd(a,256*256),'u1').reshape(256,256); Bt=np.frombuffer(rd(b,256*256),'u1').reshape(256,256)
for f in (0,1,2,128,255):
    print(f,A[f,:6],A[f,250:],Bt[f,:6],Bt[f,250:])
f=np.arange(256)[:,None]; v=np.arange(256)[None,:]
for nm,T in (('A',A),('B',Bt)):
    for fn,lab in ((f*v//255,'f*v//255'),((f*v+127)//255,'round f*v/255'),((255-f)*v//255,'(255-f)v//255'),(((255-f)*v+127)//255,'rnd(255-f)v/255'),(f*v>>8,'f*v>>8'),((256-f)*v>>8,'(256-f)*v>>8'),(v,'v')):
        print(nm,lab,(T==np.minimum(fn,255)).mean())
