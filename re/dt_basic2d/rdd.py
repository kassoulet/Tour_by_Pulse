import sys,struct
img=open('/home/gautier/SynologyDrive/code/current/demoports/tour_by_pulse/re/image.bin','rb').read()
for a in sys.argv[1:]:
    a=int(a,16)-0x100000; print(hex(a+0x100000),struct.unpack('<d',img[a:a+8])[0],struct.unpack('<f',img[a:a+4])[0],img[a:a+16])
