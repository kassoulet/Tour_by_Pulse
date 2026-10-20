# feedback / simulation effects: echo5, reebok (cellrd: see cellrd.md)

## reebok (init 0x1170c8, run 0x1172cc)
Same algorithm as the sister demo: 6 additive rotozoom layers, 8x8 cells, 41x31 grid (320x240 8 bit buffer; kx=320/w, ky=200/h), texture = 256x256 palette indices of picture.png copied to a 64K aligned block ([state+0x2c]).
Per frame: x0=(Frame-t0)*0.6 (x87), e=f32(x0), a=f32(x0*0.006); phases (f32, at state+0x38) -= e-prev, +256 if negative; layer: scale=f32((sin a*.5+2)*ph/32), table[k]=trunc(k*f32(0.7 sin(0.9q^2+2.24q))) with q=ph/256.
Corner: y=f32((r-cy)*ky), ys=f32(y sin), yc=f32(y cos) (sin, cos float32), u=((x cos-ys)*scale+160)*65536, v=((x sin+yc)*scale+100)*65536 rounded to nearest even (magic number 1.5*2^36). Cell filler 0x152f94 (8 rows of 8 pixels, adc carries, saturating add).
Test: `re/dt_feedback/reebok_run.py OUT 80` + `node tools/test-feedback.mjs reebok OUT` -> every frame 0 differing bytes.

## echo5 (init 0x11807c, run 0x1180dc, kernel 0x155628)
* run: delta = f32(expr(f32(Frame-t0)) - prev); angle += delta*0.00425 (f32); matrix (3x4 floats, 0x184610 identity, rotX(ang) 0x1848d4, rotY(ang*1.1) 0x1847d4, rotZ(ang*0.8) 0x1846d4, scale(2,2.6,2) 0x184648); transform 0x184ad4; wobble 0x1554dc (t += delta*0.03, phases 1.3t / 0.8t; G = 0.3(sin(X/51.4+t)+sin(Y/51.4+0.8t)+sin(Z/51.4+1.3t))+2 with X,Y,Z the model coordinates truncated to int; v = M*p*G, z += 1200); bins 0x1535a8 (key trunc(0.2 sum z), >=4096 dropped); polygons 0x153a8c (u = uv*2^24 + scroll, scroll += delta*3000); triangles 0x18337a; smear 0.65 (0x183d34 rows, 0x183d8a columns, first 200 rows only).
* mesh (0x154ee8): sheets z, y, x (11 each); quad corners (a,b) in [(-100,100),(100,100),(100,-100),(-100,-100)] at c=-100+20i; uv = ((a+c)*0.00025, (b-c)*0.00025) float32; triangles (0,1,2), (0,2,3).
* texture (0x1845bc / 0x184420): 2500 x { y=rand()%255, x=rand()%255, add trunc(4*(0.5+0.5 cos(d*pi/5))) for pixels with float32 distance d<5, saturate, index (y<<8|x)&0xffff }.
* triangle library = 73MS echo4/echo6 library (clip stages 0x182edc/0x183313/0x1832a8/0x1830b1, rasteriser 0x18253d) with projection scales -0.625/-0.390625 stored in 0x1c4090/94 by echo5's init (default 1.0 in the snapshot!).
Tests: `re/dt_feedback/echo5_run.py OUT 300`, `tri_run.py OUT 300 SEED`, `echo5_mat.py OUT`; `node tools/test-feedback.mjs echo5|tri OUT`. 300 frames byte-identical; 3x300 random triangles identical.
echo/echo2/echo3/echo4/tunnel/parasite: not used by the script, not ported.
