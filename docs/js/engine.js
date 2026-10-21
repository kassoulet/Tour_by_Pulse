// engine.js - script interpreter + event scheduler of "Tour" (port of the original "unr" engine, see re/engine.md).
//   script line:  [<order> <row>] command args      (untimed lines belong to the group of the previous timed line)
//   addEvent <effect> <name> {inputs} {outputs} {params} [{start order, start row}]   -- no layer number, events run in creation order
import { Buf, FX, compileExpr } from './core.js';
import { timeOf } from './xmtime.js';
import { blitBuf } from './fx/engfx.js'; // also registers fillbuffer / buffer_and / blit / surfcopy

export const Hooks = { loadScene: null, loadAnim: null }; // reserved for 3D / anim modules (loadscene is a no-op in the original script too)

/** Parse script.unr -> [{order,row,cmd,rest,line}] (`;` comments skipped, `@` ends the script). */
export function parseScript(text) {
  const cmds = []; let order = 0, row = 0;
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim();
    if (!line || line[0] === ';') continue;
    if (line[0] === '@') break;
    const m = /^(\d+)\s+(\d+)\s+(\S.*)$/.exec(line);
    if (m) { order = +m[1]; row = +m[2]; line = m[3]; }
    const sp = line.search(/\s/);
    const cmd = (sp < 0 ? line : line.slice(0, sp)).toLowerCase();
    cmds.push({ order, row, cmd, rest: sp < 0 ? '' : line.slice(sp + 1).trim(), line });
  }
  return cmds;
}

function groups(s) { // "{a b} {c} {}" -> ["a b","c",""]
  const out = []; const re = /\{([^}]*)\}/g; let m;
  while ((m = re.exec(s))) out.push(m[1].trim());
  return out;
}
const warned = Object.create(null);
const warnOnce = (k, ...a) => { if (!warned[k]) { warned[k] = 1; console.warn(...a); } };

/**
 * The runtime shared by Engine and by effect unit tests: buffers, events, per-frame run loop.
 * ctx fields: assets, bufs, events, time (s), frame (centiseconds = time*100), order, row, render, beams, expr(), buf(name).
 */
export function makeCtx(assets) {
  const ctx = {
    assets, bufs: Object.create(null), events: [], scenes: Object.create(null), anims: Object.create(null),
    time: 0, frame: 0, order: 0, row: 0, render: true, beams: true, control: 0, lwotr: 255, lwoshading: 4,
    expr: compileExpr,
    buf(name) { return this.bufs[String(name).toUpperCase()]; },

    /** createBuffer: image (file name) is converted to the buffer format and copied LINEARLY (no resampling, see re/formats.md). */
    createBuffer(name, w, h, bpp, file) {
      const b = new Buf(name.toUpperCase(), w, h, bpp);
      if (file && file.length > 3) this.fillFromImage(b, file);
      this.bufs[b.name] = b; return b;
    },
    fillFromImage(b, file) {
      const im = this.assets.image(file.toLowerCase());
      const n = Math.min(im.rgb.length, b.data.length), s = im.rgb;
      if (b.bpp === 32) b.data.set(n === s.length ? s : s.subarray(0, n));
      else if (b.bpp === 16) for (let i = 0; i < n; i++) { const p = s[i]; b.data[i] = ((p >> 8) & 0xf800) | ((p >> 5) & 0x7e0) | ((p >> 3) & 31); }
      else for (let i = 0; i < n; i++) { const p = s[i]; b.data[i] = (((p >> 16) & 255) + ((p >> 8) & 255) + (p & 255)) / 3; } // 8 bit + image: unused by the script
    },
    _bl(s, max) { // "A B C" -> Buf[] (unknown names: warn, keep a hole so slots stay aligned)
      const out = [];
      for (const n of (s || '').split(/\s+/).filter(Boolean).slice(0, max)) {
        const b = this.buf(n); if (!b) warnOnce('buf' + n, 'unknown buffer', n); out.push(b);
      }
      return out;
    },
    /** addEvent: type, name, groups = [inputs, outputs, params, extra?] as TEXT (same as in the script), or one string "{..} {..} {..} [{..}]". */
    addEvent(type, name, g, extra) {
      if (typeof g === 'string') { const gg = groups(g); g = gg; }
      g = [g[0] || '', g[1] || '', g[2] || '', g[3] || ''];
      const x = extra || (g[3] ? g[3].split(/\s+/).map((v) => (+v | 0) & 255) : [0, 0]);
      const impl = FX.get(type);
      const ev = {
        type: type.toLowerCase(), name, groups: g, impl,
        inputs: this._bl(g[0], 4), outputs: this._bl(g[1], 1).filter(Boolean), // outputs: only the first name is read by the original
        extra: [x[0] | 0, x[1] | 0], start: [x[0] | 0, x[1] | 0], // {start order, start row}: event skipped until the module position reaches it
        state: null, suppressed: false, t0: null, local: 0, playStart: null, failed: false,
      };
      if (!impl) warnOnce('fx' + ev.type, 'missing effect', ev.type);
      else if (impl.init) { try { ev.state = impl.init(g[2], ev, this); } catch (err) { ev.failed = true; console.error('effect init', ev.type, name, 'failed:', err.message); } } // tolerant: a failing effect is skipped, the demo goes on
      if (this.ff) ev.t0 = this.frame; // seek fast-forward: the event has been running since its creation (Frame origin = creation time)
      this.events.push(ev); return ev;
    },
    _named(name) { const n = name.toLowerCase(); return this.events.filter((e) => e.name.toLowerCase() === n); },
    deleteEvent(name) {
      for (const e of this._named(name)) {
        if (e.impl && e.impl.free && !e.failed) try { e.impl.free(e.state, e, this); } catch (err) { console.error('free', e.type, err); }
        this.events.splice(this.events.indexOf(e), 1);
      }
    },
    suppressEvent(name, on = true) { for (const e of this._named(name)) e.suppressed = on; },
    changeBuffers(name, gin, gout) {
      for (const e of this._named(name)) {
        const ins = this._bl(gin, 4); ins.forEach((b, i) => { e.inputs[i] = b; }); // only the named slots are replaced
        if ((gout || '').length <= 2) e.outputs = []; // empty group: output pointer set to NULL
        else { const o = this._bl(gout, 1).filter(Boolean); if (o.length) e.outputs = o; }
      }
    },
    play(name) { for (const e of this._named(name)) { e.playStart = this.frame; if (e.impl && e.impl.play) e.impl.play(e.state, e, this); } },
    stop(name) { for (const e of this._named(name)) { e.playStart = null; if (e.impl && e.impl.stop) e.impl.stop(e.state, e, this); } },

    /** One displayed frame at music time t (seconds): the run loop 0x105d08. order/row = module position (for the {start} gates). */
    step(t, order = this.order, row = this.row) {
      this.time = t; this.frame = t * 100; this.order = order; this.row = row;
      for (const ev of this.events) {
        if (ev.suppressed || !ev.impl || !ev.impl.run || ev.failed) continue;
        if (ev.start[0] > order || (ev.start[0] === order && ev.start[1] > row)) continue;
        if (ev.t0 === null) ev.t0 = this.frame; // `Frame` origin = first run (not creation)
        ev.local = this.frame - ev.t0;
        try { ev.impl.run(ev.state, ev, this); } catch (err) { ev.failed = true; console.error('effect', ev.type, ev.name, 'failed:', err); }
      }
    },
    /** helper for effect tests: run one event at an absolute time (seconds) */
    run(ev, t) {
      this.time = t; this.frame = t * 100;
      if (ev.t0 === null) ev.t0 = this.frame;
      ev.local = this.frame - ev.t0; ev.impl.run(ev.state, ev, this);
    },
  };
  return ctx;
}

/** Fallback timeline when the module is not available (silent mode): 64-row patterns, speed 6, 125 bpm. */
export function syntheticTimeline(orders = 40, rows = 64, speed = 6, bpm = 125) {
  const dt = speed * 2.5 / bpm, times = []; let t = 0;
  for (let o = 0; o < orders; o++) { times[o] = []; for (let r = 0; r < rows; r++) { times[o][r] = t; t += dt; } }
  return { times, duration: t, songLen: orders, orders: [] };
}

export class Engine {
  /** assets: { text(name), image(name)->{w,h,rgb:Uint32Array 0x00RRGGBB}, bin(name)->Uint8Array } */
  constructor(assets, scriptText, timeline) {
    this.assets = assets; this.cmds = parseScript(scriptText); this.tl = timeline;
    this.cmdTimes = this.cmds.map((c) => timeOf(timeline, c.order, c.row));
    const endCmd = this.cmds.findIndex((c) => c.cmd === 'theend');
    this.endTime = endCmd >= 0 ? this.cmdTimes[endCmd] : timeline.duration;
    this.pos = []; // flattened [time, order, row] (first row wins on ties) for t -> module position
    timeline.times.forEach((rows, o) => rows.forEach((tm, r) => { const l = this.pos[this.pos.length - 1]; if (!l || tm > l[0] + 1e-9) this.pos.push([tm, o, r]); }));
    this.reset();
  }
  reset() {
    if (this.ctx) for (const e of this.ctx.events) if (e.impl && e.impl.free && !e.failed) try { e.impl.free(e.state, e, this.ctx); } catch (err) { /* ignore */ }
    this.ctx = makeCtx(this.assets); this.ctx.engine = this;
    this.bufs = this.ctx.bufs; this.next = 0; this.ended = false; this.ff = false;
  }
  get events() { return this.ctx.events; }
  buf(name) { return this.ctx.buf(name); }
  /** module position (order,row) at music time t */
  posAt(t) {
    const p = this.pos; let lo = 0, hi = p.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (p[m][0] <= t + 1e-9) lo = m; else hi = m - 1; }
    return p[lo] ? [p[lo][1], p[lo][2]] : [0, 0];
  }

  /** Execute all script groups due at time t (seconds). */
  _exec(t) {
    while (this.next < this.cmds.length && this.cmdTimes[this.next] <= t + 1e-9 && !this.ended) {
      const i = this.next++;
      if (this.ff) this.ctx.frame = this.cmdTimes[i] * 100; // fast-forward: commands see their own time
      this._run(this.cmds[i]);
    }
  }
  _run(c) {
    const ctx = this.ctx, a = c.rest.split(/\s+/);
    switch (c.cmd) {
      case 'createbuffer': { const [name, w, h, bpp, file] = a; ctx.createBuffer(name, +w, +h, +bpp, file); break; } // sscanf "%s %s %d %d %d %s"
      case 'loadimage': { const b = ctx.buf(a[0]); if (b) ctx.fillFromImage(b, a[1]); else warnOnce('li' + a[0], 'loadImage: unknown buffer', a[0]); break; }
      case 'blit': blitBuf(ctx.buf(a[0]), ctx.buf(a[1])); break; // first = source, second = destination
      case 'deletebuffer': delete ctx.bufs[a[0].toUpperCase()]; break;
      case 'addevent': {
        const m = /^(\S+)\s+(\S+)\s*(.*)$/.exec(c.rest);
        ctx.addEvent(m[1], m[2], groups(m[3])); break;
      }
      case 'deleteevent': ctx.deleteEvent(a[0]); break;
      case 'suppressevent': ctx.suppressEvent(a[0], true); break;
      case 'resumeevent': ctx.suppressEvent(a[0], false); break;
      case 'changebuffers': { const m = /^(\S+)\s*(.*)$/.exec(c.rest); const g = groups(m[2]); ctx.changeBuffers(m[1], g[0], g[1]); break; }
      case 'play': ctx.play(a[0]); break;
      case 'stop': ctx.stop(a[0]); break;
      case 'renderoff': ctx.render = false; break;
      case 'renderon': ctx.render = true; break;
      case 'beamsoff': ctx.beams = false; break;
      case 'beamson': ctx.beams = true; break;
      case 'theend': this.ended = true; break;
      case 'loadscene': if (Hooks.loadScene) ctx.scenes[a[0].toLowerCase()] = Hooks.loadScene(a[0], a[1], a[2], ctx); break;
      case 'loadanim': if (Hooks.loadAnim) ctx.anims[a[0].toLowerCase()] = Hooks.loadAnim(a[0], a[1], ctx); break;
      default: break; // setscenesorder, setwireframe, setparticles, assignbuffertotexture, *background: unused / ignored (unknown commands are ignored by the original too)
    }
  }

  /** Run one frame at music time t (seconds). Returns the SCREEN buffer. After TheEnd the events no longer run (like the original). */
  update(t) {
    const ctx = this.ctx; ctx.time = t; ctx.frame = t * 100;
    this._exec(t);
    if (!this.ended) { const [o, r] = this.posAt(t); ctx.step(t, o, r); }
    return this.bufs.SCREEN;
  }
  /** Jump to time t: rebuild state by replaying the script, with a short warm-up for feedback effects (cellrd, echo...). */
  seek(t, warm = 1.5, fps = 30) {
    this.reset();
    const from = Math.max(0, t - warm);
    this.ff = this.ctx.ff = true; this._exec(from - 1e-6 > 0 ? from - 1e-6 : 0); this.ff = this.ctx.ff = false;
    for (let tt = from; tt < t; tt += 1 / fps) this.update(tt);
    return this.update(t);
  }
}
