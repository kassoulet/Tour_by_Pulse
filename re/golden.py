"""Run the ORIGINAL TOUR engine headlessly (state.bin) driven by a virtual music clock; dump SCREEN as PNG.
usage: python3 golden.py T0 T1 DT OUTDIR      (T = seconds, or 'order:row' ; env EVERY=n, COARSE=s, COUNT=maxinstr (default unlimited))
       python3 golden.py T0a,T0b,... N DT OUTDIR  (several windows of N frames each in ONE run; COARSE=s fine-step lead-in, default 1)
See clock.md.  Patches: IMS time 0x10e580 / order,row 0x10e0c8 -> mailbox; present 0x10814d -> capture SCREEN."""
import sys,json,os,struct
import emucore as E
from emucore import mu,B,ireg,w
from unicorn import *
E.install_heap()
st=E.load_snapshot(E.HERE+'/state.bin')
try: TIMES=json.load(open(E.HERE+'/xm_times.json'))
except OSError: TIMES=[[r*0.12+o*64*0.12 for r in range(64)] for o in range(32)]   # placeholder: 0.12 s/row, 64 rows (real XM missing)
MAIL=0x70000      # [0]=time 16.16 s, [4]=order<<16|row<<8
def patch(addr,b): mu.mem_write(addr,bytes(b))
patch(0x10e580,[0xa1]+list(struct.pack('<I',MAIL))+[0xc3])      # mov eax,[MAIL]   ; ret   (IMS time)
patch(0x10e0c8,[0xa1]+list(struct.pack('<I',MAIL+4))+[0xc3])    # mov eax,[MAIL+4] ; ret   (IMS order/row)
patch(0x10814d,[0xc3])                                           # present: no-op (captured by hook)
BUF0=0x1f91e0                       # buffer table, stride 0x28: name[16] w h bpp obj data ; entry 0 = SCREEN
def tsec(s):
    if ':' in s: o,r=map(int,s.split(':')); return TIMES[o][r]
    return float(s)
def row_at(ts):
    o=0
    while o+1<len(TIMES) and TIMES[o+1][0]<=ts: o+=1
    r=0
    while r+1<len(TIMES[o]) and TIMES[o][r+1]<=ts: r+=1
    return o,r
t=[0.0]; dt=[1/30]; LEAD=[0.0]; WIN=[]; OUT=[None]; EVERY=int(os.environ.get('EVERY','1')); captured=[0]
def setclock(ts):
    o,r=row_at(ts); mu.mem_write(MAIL,struct.pack('<II',int(ts*65536),(o<<16)|(r<<8)))
def on_frame_start():       # per-frame driver 0x101364
    n=t[0]+dt[0]   # fine step inside a window (lead-in COARSE s before it), else 0.5 s step
    fine=any(a-LEAD[0]-1e-9<=n<b for a,b in WIN) or not LEAD[0]
    t[0]+=dt[0] if fine else 0.5; setclock(t[0])
def on_present():
    captured[0]+=1
    d=bytes(mu.mem_read(BUF0,0x28)); wd,ht,bpp=struct.unpack_from('<III',d,0x10); dp=struct.unpack_from('<I',d,0x20)[0]
    if OUT[0] and any(a-1e-9<=t[0]<b for a,b in WIN) and captured[0]%EVERY==0: save(t[0],wd,ht,bpp,dp)
def save(ts,wd,ht,bpp,dp):
    from PIL import Image
    raw=bytes(mu.mem_read(dp,wd*ht*bpp//8))
    if bpp==32: im=Image.frombuffer('RGBA',(wd,ht),raw,'raw','BGRA',0,1).convert('RGB')
    elif bpp==16:
        import numpy as np
        p=np.frombuffer(raw,'<u2').astype(np.uint32).reshape(ht,wd)
        im=Image.fromarray(np.dstack([((p>>11)&31)*255//31,((p>>5)&63)*255//63,(p&31)*255//31]).astype('u1'))
    else: im=Image.frombuffer('L',(wd,ht),raw,'raw','L',0,1)
    im.save('%s/f_%07.3f.png'%(OUT[0],ts))
def at(addr,fn): mu.hook_add(UC_HOOK_CODE,lambda uc,a,sz,_:fn(),begin=addr,end=addr)
at(0x101364,on_frame_start); at(0x10814d,on_present)
if __name__=='__main__':
    dt[0]=float(sys.argv[3]); OUT[0]=sys.argv[4]; os.makedirs(OUT[0],exist_ok=True)
    if ',' in sys.argv[1] or sys.argv[2].isdigit() and ':' in sys.argv[1]:
        n=int(sys.argv[2]); WIN[:]=[(tsec(a),tsec(a)+n*dt[0]) for a in sys.argv[1].split(',')]; LEAD[0]=float(os.environ.get('COARSE','1'))
    else:
        WIN[:]=[(tsec(sys.argv[1]),tsec(sys.argv[2]))]; LEAD[0]=float(os.environ.get('COARSE','0'))   # COARSE=0: every frame fine
    t1=max(b for a,b in WIN); t[0]=-dt[0]
    def stop():
        if t[0]>=t1: mu.emu_stop()
    at(0x101364,stop)
    w('ESP',st['regs']['ESP'])
    try: mu.emu_start(st['regs']['EIP'],0,count=int(os.environ.get('COUNT','0')))
    except Exception as e: print('ERR',e,hex(ireg('EIP')))
    print('presents',captured[0],'last t',t[0])
