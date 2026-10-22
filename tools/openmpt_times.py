#!/usr/bin/env python3
"""openmpt_times.py - exact start time (seconds) of every (order,row) of docs/assets/tour3.xm according to libopenmpt (ctypes, libopenmpt.so.0).
Writes docs/assets/xm_times.json (used by the player and render tools: the browser plays the module with libopenmpt, so the script must
follow libopenmpt's clock) and re/xm_times.json (used by re/golden.py). The naive effect walker in docs/js/xmtime.js drifts by up to 2.2 s
(several channels set F01/F05 on the same row)."""
import ctypes,json,os
root=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
lib=ctypes.CDLL('libopenmpt.so.0'); d=open(os.path.join(root,'docs/assets/tour3.xm'),'rb').read()
lib.openmpt_module_create_from_memory2.restype=ctypes.c_void_p
lib.openmpt_module_create_from_memory2.argtypes=[ctypes.c_char_p,ctypes.c_size_t]+[ctypes.c_void_p]*7
m=lib.openmpt_module_create_from_memory2(d,len(d),*[None]*7)
lib.openmpt_module_get_position_seconds.restype=ctypes.c_double; lib.openmpt_module_get_position_seconds.argtypes=[ctypes.c_void_p]
lib.openmpt_module_set_position_order_row.restype=ctypes.c_double; lib.openmpt_module_set_position_order_row.argtypes=[ctypes.c_void_p,ctypes.c_int,ctypes.c_int]
lib.openmpt_module_get_duration_seconds.restype=ctypes.c_double; lib.openmpt_module_get_duration_seconds.argtypes=[ctypes.c_void_p]
lib.openmpt_module_get_num_orders.argtypes=[ctypes.c_void_p]
n=lib.openmpt_module_get_num_orders(m); out=[]
for o in range(n):
    row=[]
    for r in range(64):
        lib.openmpt_module_set_position_order_row(m,o,r); row.append(round(lib.openmpt_module_get_position_seconds(m),4))
    out.append(row)
res={'duration':round(lib.openmpt_module_get_duration_seconds(m),4),'times':out}
json.dump(res,open(os.path.join(root,'docs/assets/xm_times.json'),'w'),separators=(',',':'))
os.replace(os.path.join(root,'re/xm_times.json'),os.path.join(root,'re/xm_times_model.json')) if os.path.exists(os.path.join(root,'re/xm_times.json')) and not os.path.exists(os.path.join(root,'re/xm_times_model.json')) else None
json.dump(out,open(os.path.join(root,'re/xm_times.json'),'w'),separators=(',',':'))
print('orders',n,'duration',res['duration'])
