import sys; from PIL import Image
fs=sys.argv[2:]; ims=[Image.open(f).resize((320,240)) for f in fs]
W=Image.new('RGB',(640,240*((len(ims)+1)//2)))
for i,im in enumerate(ims): W.paste(im,((i%2)*320,(i//2)*240))
W.save(sys.argv[1])
