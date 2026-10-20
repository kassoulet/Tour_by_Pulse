from hx import *
import emucore as E,sys
lock()
l=sys.argv[1]
try: ev=mkev(l); print('ok',hex(ev),hex(rd32(0x1b755c)))
except Exception as e: print('fail',l,e, hex(E.ireg('ECX')),hex(E.ireg('EDX')))
