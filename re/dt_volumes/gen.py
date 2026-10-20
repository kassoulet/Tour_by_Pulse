"""Differential reference generator: runs the ORIGINAL volume effects in the Unicorn harness and dumps results to ref/.
usage (from re/dt_volumes): $PY gen.py     -> ref/index.json + ref/*.bin   (consumed by tools/test-volumes.mjs)"""
import sys, os, json, struct
sys.path.insert(0, '..')
import emucore as E
ASSETS = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../docs/assets'))
_hf = E.hostfile
def hostfile(name):
    p = os.path.join(ASSETS, name.lower())
    return open(p, 'rb').read() if os.path.isfile(p) else _hf(name)
E.hostfile = hostfile
from harness import *
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ref'); os.makedirs(OUT, exist_ok=True)
idx = {}
def cstr(s):
    p = alloc(len(s) + 1); wr(p, s.encode() + b'\0'); return p
def dump(name, data): open(os.path.join(OUT, name + '.bin'), 'wb').write(data)
FRAME = 0x1b28f8
vols = {}
def mkvol(name, data=None):
    st = call(0x115688, cstr(name)); vols[name] = rd32(st + 0x20)
    if data is not None: wr(vols[name], data)
    return vols[name]
def V(name): return rd(vols[name], 16384)
def clear(name): wr(vols[name], bytes(16384))
def setframe(f): wrf(FRAME, f)
def runfx(init, run, params, nframes, frames, key, start_off):
    """init effect, mark 'started at frame 0', then for each frame f run once; dump the volume named key after each"""
    st = call(init, cstr(params))
    wr32(st + start_off[0], 1); wrf(st + start_off[1], 0.0)
    return st
A = lambda n: open(os.path.join(ASSETS, n), 'rb').read()
mkvol('OurVolume'); mkvol('V8Volume', A('v8.dat')); mkvol('SrcVolume', A('vbox.dat')); mkvol('PlasmaVolume')
dump('v8', A('v8.dat')); dump('vbox', A('vbox.dat'))
FR = [0.0, 1.0, 137.0, 250.0, 300.0, 500.0, 1234.5]
# ---- plasma table (built by init)
st = call(0x116634, cstr('PlasmaVolume 0.7 0.7'))
dump('plasma_tab', rd(0x2001f0, 16384))
# ---- plasma1volume
wr32(st + 8, 1); wrf(st + 4, 0.0)
for i, f in enumerate(FR):
    setframe(f); call(0x1167b4, st); dump('plasma_%d' % i, V('PlasmaVolume'))
# ---- metaballs (test1.mbs) from a cleared volume
for mbs in ['test1.mbs', 'a.mbs', 'c.mbs']:
    st = call(0x1158e4, cstr('OurVolume ' + mbs)); wr32(st + 0xac, 1); wrf(st + 0xa8, 0.0)
    for i, f in enumerate(FR):
        clear('OurVolume'); setframe(f); call(0x115b04, st); dump('mb_%s_%d' % (mbs[:-4], i), V('OurVolume'))
# ---- morph: dst = A*t + B*(1-t) ; A=SrcVolume B=V8Volume, expression of Frame
st = call(0x115e30, cstr('OurVolume SrcVolume V8Volume clip10(0.5+0.3*sin(Frame*0.01)+0.7*cos(Frame*0.007))'))
wr32(st + 0x14, 1); wrf(st + 0x10, 0.0)
for i, f in enumerate(FR):
    setframe(f); call(0x115fa0, st); dump('morph_%d' % i, V('OurVolume'))
# ---- mul / add / sub / fade / copy / clear
call(0x1157c4, 0) if False else None
def binop(init, run, off, name, params):
    st = call(init, cstr(params)); wr32(st + off, 1); wrf(st + off - 4, 0.0); call(run, st); dump(name, V('OurVolume'))
wr(vols['SrcVolume'], A('vbox.dat')); wr(vols['V8Volume'], A('v8.dat'))
binop(0x116330, 0x116468, 0x10, 'mul', 'OurVolume SrcVolume V8Volume')
binop(0x1161ac - 0x184, 0x116160, 0x10, 'add', 'OurVolume SrcVolume V8Volume')
binop(0x1161ac, 0x1162e4, 0x10, 'sub', 'OurVolume SrcVolume V8Volume')
st = call(0x1164b4, cstr('OurVolume V8Volume 0.25+0.5*clip10(Frame*0.01)')); wr32(st + 0xc, 1); wrf(st + 8, 0.0)
setframe(77.0); call(0x1165d4, st); dump('fade', V('OurVolume'))
# ---- marching cubes: fake object + original MC init (0x114cac) and run (0x115d74); volumes = real morph/metaball states
def mc_case(name, vol, bbox, flag):
    obj = alloc(0x400); wr(obj, bytes(0x400))
    for i, v in enumerate(bbox): wrf(obj + 0xbc + 4 * i, v)
    face0 = alloc(0x3c); wr(face0, bytes(range(0x3c))); wr32(obj + 0x18, face0)
    mc = call(0x114cac, obj, 0xfa0, flag)
    volp = alloc(16384); wr(volp, vol)
    s = alloc(8); wr32(s, mc); wr32(s + 4, volp)
    call(0x115d74, s)
    nf = rd32(obj + 0x1c); vb = rd32(mc + 0x20); fb = rd32(mc + 0x1c)
    faces = rd(fb, 0x3c * nf); verts = {}
    for k in range(nf):
        for j in range(3):
            p = struct.unpack('<I', faces[0x3c * k + 0x30 + 4 * j: 0x3c * k + 0x34 + 4 * j])[0]
            verts[(p - vb) // 0x60] = 1
    info = dict(nf=nf, flag=flag, bbox=bbox, objflag=rd32(obj + 4), nvert=rd32(obj + 0x10), mcfields=[rdf(mc + 4 * i) for i in range(6)],
                faceTemplate=list(rd(fb, 0x3c)), vbase=vb, fbase=fb, vertsel=sorted(verts))
    dump(name + '_faces', faces)
    dump(name + '_verts', b''.join(rd(vb + 0x60 * s_, 0x60) for s_ in sorted(verts)))
    dump(name + '_vol', vol)
    dump(name + '_slot0', rd(vb, 0x60 * 40)); info['obj'] = list(rd(obj, 0x40))
    return info
idx['mc'] = {}
cases = [('mc0', 'morph_3', [-10, -10, -10, 10, 10, 10], 1), ('mc1', 'morph_4', [-3.5, -2, -4, 5, 6.25, 3], 0),
         ('mc2', 'mb_test1_4', [-5, -5, -5, 5, 5, 5], 1), ('mc3', 'plasma_2', [-30, -20, -10, 30, 20, 40], 1),
         ('mc4', 'mb_test1_5', [-7.5, -7.5, -7.5, 7.5, 7.5, 7.5], 1)]
for n, src, bb, fl in cases:
    f = os.path.join(OUT, src + '.bin')
    idx['mc'][n] = mc_case(n, open(f, 'rb').read(), bb, fl)
idx['frames'] = FR
json.dump(idx, open(os.path.join(OUT, 'index.json'), 'w'))
print('done', {k: v['nf'] for k, v in idx['mc'].items()})
