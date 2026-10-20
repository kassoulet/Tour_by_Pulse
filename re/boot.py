#!/usr/bin/env python3
"""Boot the original TOUR.EXE image (unpacked PMODE/W object 1 at 0x100000, object 2 at 0x1b000) in Unicorn: runs the Watcom
start-up (_cstart 0x1084ac), the demo's own init (archive open, script load, VESA mode set, IMS init) up to the first keyboard poll of
the main loop (0x106051 = kbhit) and saves state.bin.  Usage: python3 boot.py   (~40 s)"""
import emucore as E
E.install_heap()
E.mu.reg_write(E.R('ESP'),0x3f0000)
E.at(0x6051,lambda:(print('MAINLOOP reached, saving snapshot'),E.save_snapshot(E.HERE+'/state.bin'),E.mu.emu_stop()))
E.run(0x1084ac,4000000000)
