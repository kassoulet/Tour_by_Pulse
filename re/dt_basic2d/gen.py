"""gen.py: differential-test reference generator for docs/js/fx/basic2d.js.
usage (from re/dt_basic2d):  $PY gen.py   -> ref/index.json + ref/*.bin  ; then  node ../../tools/test-basic2d.mjs
Each case: random input buffers written into the ORIGINAL's buffers, event created with the original addEvent parser (0x104fd8),
original run() called, output buffer dumped."""
import json,os
from hx import *
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'ref'); os.makedirs(OUT,exist_ok=True)
lock()
rng=np.random.default_rng(12345)
cases=[]
def rnd(name,kind='rand'):
    d,w,h,b=buf(name)
    if b==8: a=rng.integers(0,256,(h,w),dtype='u1')
    elif b==16: a=rng.integers(0,65536,(h,w),dtype='<u2')
    else:
        a=rng.integers(0,2**32,(h,w),dtype='<u4')
        if kind=='rgb': a&=0xffffff
    return a
def save(fn,a): open(os.path.join(OUT,fn),'wb').write(np.ascontiguousarray(a).tobytes())
def case(label,effect,params,ins,out,frame=0.0,local=None,inkind='rand',fix=None,prefill=True,prep=None):
    """ins: buffer names (lowercase). frame: global Frame float (0x1b28f8); local: Frame-firstFrame to force."""
    wrf(0x1b28f8,frame)
    data={}
    for n in ins+[out]:
        if n in data: continue
        data[n]=rnd(n,inkind) if n!=out or prefill else np.zeros_like(getbuf(n))
        setbuf(n,data[n])
    if prep: prep(data)
    for n in data: setbuf(n,data[n])
    line="addEvent %s ev_%s {%s} {%s} {%s}"%(effect,label,' '.join(ins),out,params)
    ev=mkev(line)
    if fix: fix(ev)
    runev(ev)
    res=getbuf(out)
    c={'label':label,'effect':effect,'params':params,'frame':frame,'local':local,'inputs':[],'output':{'name':out,'file':label+'_out.bin'}}
    for n in dict.fromkeys(ins):
        d,w,h,b=buf(n); fn='%s_in_%s.bin'%(label,n); save(fn,data[n]); c['inputs'].append({'name':n,'w':w,'h':h,'bpp':b,'file':fn})
    d,w,h,b=buf(out); c['output'].update(w=w,h=h,bpp=b)
    c['pre']=label+'_pre.bin'; save(c['pre'],data[out]); save(c['output']['file'],res)
    cases.append(c); freeev(ev)
    print(label,'done')
# blit: all 65536 16-bit values, and 32-bit copy
d,w,h,b=buf('title'); setbuf('title',(np.arange(w*h)%65536).astype('<u2').reshape(h,w))
ev=mkev("addEvent blit ev_blit {title} {screen} {}"); runev(ev)
save('blit_in.bin',getbuf('title')); save('blit_out.bin',getbuf('screen'))
cases.append({'label':'blit16','effect':'blit','params':'','frame':0,'local':None,'inputs':[{'name':'title','w':640,'h':480,'bpp':16,'file':'blit_in.bin'}],'output':{'name':'screen','w':640,'h':480,'bpp':32,'file':'blit_out.bin'}})
case('blit32','blit','',['temp'],'screen')
for pal in ('medusa.pal','picture.pal','green.pal'):
    case('palette_'+pal.split('.')[0],'palette',pal,['temp8'],'lores')
case('doubleimage','doubleimage','',['lores'],'screen')
case('blend1','blend','1',['screen','efxlayer'],'screen')
for F in (0,17,100,333.5,1234):
    case('mapimage_%g'%F,'mapimage','',['citylights'],'temp',frame=float(F),prefill=True)
def mkfix(F0,off=0x10):
    def fix(ev):
        st=rd32(ev+0x2c); wr32(st+off+4,1); wrf(st+off,F0)
    return fix
for i,(p,loc) in enumerate([('0 0 0 (1.0-sqr(sqr(fabs(sin(Frame*0.0071)))))',0),('0 0 0 (1.0-sqr(sqr(fabs(sin(Frame*0.0071)))))',123),('0 0 0 (1.0-sqr(sqr(fabs(sin(Frame*0.0071)))))',251),
    ('1 0.5 0.25 Frame*0.01',10),('0.3 0.9 1 Frame*0.01',50),('1 1 1 Frame*0.01',99),('0.2 0.4 0.6 0.5',0),('0 0 0 Frame*0.004',20),('1 1 1 1.0',0)]):
    case('fade%d'%i,'fade',p,['fears'],'temp',frame=1000.0+loc,local=loc,fix=mkfix(1000.0))
for m in (2,3,11,33):
    case('blend%d'%m,'blend',str(m),['screen','efxlayer'],'screen')
def keyprep(d):
    e=d['efxlayer']; e[0,0]&=0xffffff; key=e[0,0]; e[::2,:]=key; e[:,::3]=key
case('blend22','blend','22',['screen','efxlayer'],'screen',prep=keyprep)
def zprep(d):
    e=d['efxlayer']; e[::2,::2]&=0xff000000
case('blend2k','blend','2',['screen','efxlayer'],'screen',prep=zprep)
for i,p in enumerate(['0 0 0 0','0.5 0.5 0.5 -1','1 1 1 0.004','1 1 1 Frame*0.0025']):
    case('fadeb%d'%i,'fade',p,['fears'],'temp',frame=1000.0+300,local=300,fix=mkfix(1000.0))
for i,p in enumerate(['Frame*0.01','0.5','0','1.0','-1']):
    case('xfade%d'%i,'xfade',p,['fears','ppro'],'temp',frame=1000.0+30,local=30,fix=mkfix(1000.0,4))
case('afade','afade','',['fears','ppro','lores'],'temp')
json.dump(cases,open(OUT+'/index.json','w'),indent=1)
