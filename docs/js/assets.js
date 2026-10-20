// assets.js - browser-side asset preloader. Presents the same synchronous interface as the node harness (tools/render.mjs):
//   image(name) -> {w,h,rgb:Uint32Array 0x00RRGGBB}   indexed(name) -> {w,h,data:Uint8Array,pal:Uint8Array(768)} (paletted PNGs only)
//   bin(name) -> Uint8Array   text(name) -> string
// names are case-insensitive; `.tga` maps to the converted `.png`. The file list comes from assets/manifest.json (node tools/mkmanifest.mjs).
import { decodeIndexedPng } from './png.js';

async function decode(blob) {
  const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const c = new OffscreenCanvas(bmp.width, bmp.height), g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(bmp, 0, 0);
  const px = g.getImageData(0, 0, bmp.width, bmp.height).data;
  const rgb = new Uint32Array(bmp.width * bmp.height);
  for (let i = 0, j = 0; i < rgb.length; i++, j += 4) rgb[i] = (px[j] << 16) | (px[j + 1] << 8) | px[j + 2];
  return { w: bmp.width, h: bmp.height, rgb };
}

/** Build the synchronous asset object from already loaded tables (shared by the browser loader and tools/render.mjs). */
export function makeAssets({ imgs, idxs, bins, texts }) {
  const norm = (n) => n.toLowerCase().replace(/\.tga$/, '.png');
  return {
    text: (n) => { n = n.toLowerCase(); return texts[n] ?? new TextDecoder('latin1').decode(bins[n]); },
    bin: (n) => bins[n.toLowerCase()],
    has: (n) => norm(n) in imgs || n.toLowerCase() in bins || n.toLowerCase() in texts,
    image(n) { const k = norm(n); if (!imgs[k]) throw new Error('no image ' + n); return imgs[k]; },
    indexed(n) { const k = norm(n); if (!idxs[k]) throw new Error('no paletted image ' + n); return idxs[k]; },
  };
}

export async function loadAssets(base, onProgress) {
  const files = await (await fetch(base + 'manifest.json')).json();
  const imgs = {}, idxs = {}, bins = {}, texts = {};
  let done = 0; const tick = () => onProgress && onProgress(++done / files.length);
  const get = (n) => fetch(base + n).then((r) => { if (!r.ok) throw new Error(n + ' ' + r.status); return r; });
  await Promise.all(files.map(async (n) => {
    if (/\.xm$/.test(n)) { tick(); return; } // streamed by the audio player
    if (/\.(png|jpg)$/.test(n)) {
      const r = await get(n); const buf = await r.arrayBuffer();
      imgs[n] = await decode(new Blob([buf]));
      if (n.endsWith('.png')) { const ix = await decodeIndexedPng(new Uint8Array(buf)); if (ix) idxs[n] = ix; }
    } else if (n === 'script.unr') texts[n] = await (await get(n)).text();
    else bins[n] = new Uint8Array(await (await get(n)).arrayBuffer());
    tick();
  }));
  return makeAssets({ imgs, idxs, bins, texts });
}
