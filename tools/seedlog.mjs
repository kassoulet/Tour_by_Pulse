const root='/home/gautier/SynologyDrive/code/current/demoports/tour_by_pulse';
const { nodeAssets, loadTimeline } = await import(root+'/tools/render.mjs');
const { Engine } = await import(root+'/docs/js/engine.js');
const a = await nodeAssets(); const eng = new Engine(a, a.text('script.unr'), loadTimeline());
const log=(n)=>console.log(n,'t=',eng.ctx.time.toFixed(2),'seed',(eng.ctx.randSeed>>>0).toString(16));
eng.ctx.dbgSeed=log;
for (let k=0;k*0.0333<110;k++){ eng.update(k*0.033333); if (k===3250) log('t~108.3'); }
log('end');
