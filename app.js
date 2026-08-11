(() => {
'use strict';

const $ = (id) => document.getElementById(id);
const ui = {
  stage: $('stage'), strip: $('strip'), spin: $('spin'),
  res: $('resSel'), prox: $('proxSlider'), proxOut: $('proxOut'),
  auto: $('autoChk'), play: $('playBtn'), reverse: $('reverseChk'), png: $('pngBtn'), vid: $('vidBtn'),
  stats: $('stats'),
};
const stageCtx = ui.stage.getContext('2d');
const MAX_COLOR_ERR = 9 * 65025; // weights 2+4+3 at delta 255
const HOLD_MS = 3200;
const BUDGET_MS = 8000;

const setSpin = (on) => { ui.spin.hidden = !on; };

// ---------------------------------------------------------------- samples
function seededRnd(seed) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

const SAMPLES = [
  { name: 'forest', draw(x) {
    const r = seededRnd(7);
    const sky = x.createLinearGradient(0, 0, 0, 512);
    sky.addColorStop(0, '#e3ebe4'); sky.addColorStop(0.5, '#b7c8bb'); sky.addColorStop(1, '#87a48e');
    x.fillStyle = sky; x.fillRect(0, 0, 512, 512);
    x.fillStyle = '#f4f1de';
    x.beginPath(); x.arc(350, 110, 55, 0, Math.PI * 2); x.fill();
    const cols = ['#8fac8c', '#69906d', '#4a7355', '#2f523c', '#1d3628'];
    for (let L = 0; L < 5; L++) {
      const base = 190 + L * 70;
      x.fillStyle = cols[L];
      x.beginPath(); x.moveTo(0, 512); x.lineTo(0, base);
      for (let px = 0; px <= 512; px += 16) {
        x.lineTo(px, base + Math.sin(px * 0.02 + L * 9) * 18 + r() * 14 - 7);
      }
      x.lineTo(512, 512); x.closePath(); x.fill();
      x.fillStyle = 'rgba(226,235,228,0.3)';
      x.fillRect(0, base + 26, 512, 20);
    }
  } },
  { name: 'static', draw(x) {
    const r = seededRnd(3);
    x.fillStyle = '#7f7f7f'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 80; i++) {
      const g = (r() * 255) | 0;
      x.fillStyle = `rgba(${g},${g},${g},0.35)`;
      x.beginPath(); x.arc(r() * 512, r() * 512, 30 + r() * 110, 0, Math.PI * 2); x.fill();
    }
    for (let i = 0; i < 5000; i++) {
      const g = (r() * 255) | 0;
      x.fillStyle = `rgba(${g},${g},${g},0.5)`;
      x.fillRect(r() * 512, r() * 512, 3, 3);
    }
  } },
  { name: 'synthwave', draw(x) {
    const r = seededRnd(42);
    const sky = x.createLinearGradient(0, 0, 0, 512);
    sky.addColorStop(0, '#140b33'); sky.addColorStop(0.55, '#5b2a86'); sky.addColorStop(1, '#e8654f');
    x.fillStyle = sky; x.fillRect(0, 0, 512, 512);
    x.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 90; i++) x.fillRect(r() * 512, r() * 240, 2, 2);
    const sun = x.createLinearGradient(0, 150, 0, 400);
    sun.addColorStop(0, '#ffd75e'); sun.addColorStop(1, '#ff4f7e');
    x.fillStyle = sun;
    x.beginPath(); x.arc(256, 300, 130, 0, Math.PI * 2); x.fill();
    x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 6; i++) x.fillRect(100, 305 + i * 22, 312, 4 + i * 2);
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = '#170a28';
    x.beginPath(); x.moveTo(0, 512); x.lineTo(0, 400);
    for (let i = 0; i <= 8; i++) x.lineTo(i * 64, 390 + Math.sin(i * 2.7) * 45);
    x.lineTo(512, 512); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(102,192,244,0.5)'; x.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const y = 420 + i * i * 1.6;
      x.beginPath(); x.moveTo(0, y); x.lineTo(512, y); x.stroke();
    }
    for (let i = -6; i <= 6; i++) {
      x.beginPath(); x.moveTo(256 + i * 18, 415); x.lineTo(256 + i * 110, 512); x.stroke();
    }
  } },
  { name: 'ember', draw(x) {
    const r = seededRnd(5);
    x.fillStyle = '#120302'; x.fillRect(0, 0, 512, 512);
    const glow = x.createRadialGradient(256, 460, 40, 256, 460, 380);
    glow.addColorStop(0, '#6e1a09'); glow.addColorStop(0.5, '#380d05'); glow.addColorStop(1, 'rgba(18,3,2,0)');
    x.fillStyle = glow; x.fillRect(0, 0, 512, 512);
    const pal = ['#ffe08a', '#ffb45e', '#ff7a36', '#e2481f', '#8f2410'];
    for (let i = 0; i < 300; i++) {
      const y = 512 - r() * r() * 512;
      const heat = 1 - y / 512;
      const ci = Math.min(4, (heat * 5 + r() * 1.5) | 0);
      x.fillStyle = pal[ci];
      const s = (2 + r() * 4) * (0.5 + y / 512);
      x.fillRect(r() * 512, y, s, s);
    }
  } },
  { name: 'ocean', draw(x) {
    const r = seededRnd(9);
    const sky = x.createLinearGradient(0, 0, 0, 270);
    sky.addColorStop(0, '#f6d7a3'); sky.addColorStop(1, '#8fb8cc');
    x.fillStyle = sky; x.fillRect(0, 0, 512, 270);
    x.fillStyle = '#ffedc4';
    x.beginPath(); x.arc(256, 220, 55, 0, Math.PI * 2); x.fill();
    const sea = x.createLinearGradient(0, 260, 0, 512);
    sea.addColorStop(0, '#3d7e8f'); sea.addColorStop(1, '#0b2f3c');
    x.fillStyle = sea; x.fillRect(0, 260, 512, 252);
    for (let i = 0; i < 150; i++) {
      const y = 264 + r() * r() * 240;
      const a = 0.55 * Math.max(0.08, 1 - (y - 260) / 260);
      x.fillStyle = `rgba(255,233,180,${a.toFixed(3)})`;
      x.fillRect(r() * 512, y, 6 + r() * 50, 2 + r() * 2);
    }
    x.fillStyle = 'rgba(240,250,252,0.7)';
    for (let i = 0; i < 40; i++) x.fillRect(r() * 512, 430 + r() * 80, 10 + r() * 40, 2);
  } },
  { name: 'city', draw(x) {
    const r = seededRnd(11);
    const sky = x.createLinearGradient(0, 0, 0, 512);
    sky.addColorStop(0, '#0a1024'); sky.addColorStop(1, '#25355e');
    x.fillStyle = sky; x.fillRect(0, 0, 512, 512);
    x.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 70; i++) x.fillRect(r() * 512, r() * 200, 1.5, 1.5);
    x.fillStyle = '#e8ecf4';
    x.beginPath(); x.arc(408, 88, 30, 0, Math.PI * 2); x.fill();
    const win = ['#ffd98a', '#ffb457', '#fff2c9'];
    let bx = 0;
    while (bx < 512) {
      const w = 34 + r() * 52;
      const h = 150 + r() * 270;
      const top = 512 - h;
      x.fillStyle = '#0a0e1d';
      x.fillRect(bx, top, w, h);
      for (let wy = top + 10; wy < 498; wy += 15) {
        for (let wx = bx + 6; wx < bx + w - 8; wx += 11) {
          if (r() < 0.45) { x.fillStyle = win[(r() * 3) | 0]; x.fillRect(wx, wy, 5, 7); }
        }
      }
      bx += w + 5;
    }
  } },
  { name: 'meadow', draw(x) {
    const r = seededRnd(13);
    const sky = x.createLinearGradient(0, 0, 0, 290);
    sky.addColorStop(0, '#a9d7ef'); sky.addColorStop(1, '#e9f4dc');
    x.fillStyle = sky; x.fillRect(0, 0, 512, 290);
    x.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 6; i++) {
      const cx = r() * 512, cy = 40 + r() * 150, s = 24 + r() * 30;
      for (let b = 0; b < 5; b++) {
        x.beginPath();
        x.arc(cx + b * s * 0.5 - s, cy + (r() - 0.5) * 10, s * (0.5 + r() * 0.4), 0, Math.PI * 2);
        x.fill();
      }
    }
    const field = x.createLinearGradient(0, 280, 0, 512);
    field.addColorStop(0, '#a3ca70'); field.addColorStop(1, '#437030');
    x.fillStyle = field; x.fillRect(0, 280, 512, 232);
    const petals = ['#ffffff', '#ffd6e8', '#ffe066', '#ff8fa3', '#f4a259'];
    for (let i = 0; i < 260; i++) {
      const y = 292 + r() * r() * 215;
      const s = 2 + r() * 4 * ((y - 280) / 232) + 1;
      x.fillStyle = petals[(r() * petals.length) | 0];
      x.fillRect(r() * 512, y, s, s);
    }
  } },
];

const sampleCache = [];
function sampleCanvas(i) {
  if (!sampleCache[i]) {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    SAMPLES[i].draw(c.getContext('2d'));
    sampleCache[i] = c;
  }
  return sampleCache[i];
}

// ---------------------------------------------------------------- helpers
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function smallOf(source, N) {
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, N, N);
  return ctx.getImageData(0, 0, N, N).data;
}

function pack(rgba) {
  const n = rgba.length / 4;
  const out = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = 0xff000000 | (rgba[i * 4 + 2] << 16) | (rgba[i * 4 + 1] << 8) | rgba[i * 4];
  }
  return out;
}

const tgtCache = new Map();
function tgtSmall(N) {
  if (!tgtCache.has(N)) tgtCache.set(N, smallOf(gaben, N));
  return tgtCache.get(N);
}

// ---------------------------------------------------------------- worker runs
let worker = null, workerURL = null, runSeq = 0;
const runs = new Map();

function ensureWorker() {
  if (worker) return;
  workerURL = URL.createObjectURL(
    new Blob([`"use strict";(${optimizerWorkerMain})(self);`], { type: 'text/javascript' })
  );
  worker = new Worker(workerURL);
  worker.onmessage = onWorkerMsg;
  worker.onerror = (e) => {
    setSpin(false);
    ui.stats.textContent = `optimizer crashed: ${e.message || 'unknown error'}`;
  };
}

function startRun(idx, live) {
  ensureWorker();
  const N = +ui.res.value;
  const cell = Math.floor(512 / N);
  const src = smallOf(sampleCanvas(idx), N);
  const runId = ++runSeq;
  for (const [id, r] of runs) { runs.delete(id); r.resolve(null); } // superseded
  const rec = { runId, idx, N, cell, S: cell * N, colors32: pack(src), perm: null, lastStats: null };
  rec.promise = new Promise((res) => { rec.resolve = res; });
  runs.set(runId, rec);
  if (live) {
    setStageSize(rec);
    stageCtx.fillStyle = '#16202d';
    stageCtx.fillRect(0, 0, rec.S, rec.S);
    setSpin(true);
  }
  worker.postMessage({
    cmd: 'start', runId, N, src, tgt: tgtSmall(N),
    lambda01: +ui.prox.value / 100, budgetMs: BUDGET_MS,
  });
  return rec;
}

function onWorkerMsg(e) {
  const m = e.data;
  const rec = runs.get(m.runId);
  if (!rec) return; // stale
  rec.perm = m.perm;
  rec.lastStats = m;
  if (m.type === 'done') { runs.delete(m.runId); rec.resolve(rec); }
}

// ---------------------------------------------------------------- stage paint
const mosaic = { canvas: document.createElement('canvas'), ctx: null, data: null, u32: null, N: 0 };
function ensureMosaic(N) {
  if (mosaic.N === N) return;
  mosaic.canvas.width = mosaic.canvas.height = N;
  mosaic.ctx = mosaic.canvas.getContext('2d');
  mosaic.data = mosaic.ctx.createImageData(N, N);
  mosaic.u32 = new Uint32Array(mosaic.data.data.buffer);
  mosaic.N = N;
}

function setStageSize(rec) {
  if (ui.stage.width !== rec.S) { ui.stage.width = rec.S; ui.stage.height = rec.S; }
}

function showRaw(rec) {
  stageCtx.imageSmoothingEnabled = true;
  stageCtx.drawImage(sampleCanvas(rec.idx), 0, 0, rec.S, rec.S);
}

function paintMosaic(rec) {
  if (!rec.perm) return;
  ensureMosaic(rec.N);
  const n = rec.N * rec.N;
  for (let c = 0; c < n; c++) mosaic.u32[c] = rec.colors32[rec.perm[c]];
  mosaic.ctx.putImageData(mosaic.data, 0, 0);
  stageCtx.imageSmoothingEnabled = false;
  stageCtx.drawImage(mosaic.canvas, 0, 0, rec.S, rec.S);
}

// ---------------------------------------------------------------- stats
const state = { cur: null, anim: null, animRAF: 0, animating: false, recording: false };

function updateStats(m) {
  if (!m) { ui.stats.textContent = ''; return; }
  const r = Math.max(0, 100 * (1 - Math.sqrt(m.colorErr / MAX_COLOR_ERR)));
  ui.stats.textContent =
    `${(m.iter / 1e6).toFixed(1)}M swaps · resemblance ${r.toFixed(1)}%`;
}

// ---------------------------------------------------------------- animation
/*
 * Physics morph, modeled on obamify's morph_sim: every pixel is a particle
 * that starts moving at frame zero, pulled toward its assigned cell by a
 * force that ramps cubically with time (per pixel ramp rate, so arrivals
 * stagger naturally), with velocity damping and a speed cap. The raw sample
 * stays underneath as a ghost so the frame keeps full coverage while pixels
 * flow (obamify gets this from a Voronoi jump flood on the GPU).
 */
function buildAnim(rec, reverse) {
  const { N, cell, S, perm, colors32 } = rec;
  const n = N * N;
  const a = {
    sx: new Float32Array(n), sy: new Float32Array(n),
    dx: new Float32Array(n), dy: new Float32Array(n),
    px: new Float32Array(n), py: new Float32Array(n),
    vx: new Float32Array(n), vy: new Float32Array(n),
    force: new Float32Array(n),
    settled: new Uint8Array(n),
    col: new Uint32Array(n),
    base: new Uint32Array(S * S),
    reverse: !!reverse, S, cell, n,
  };
  for (let c = 0; c < n; c++) {
    const p = perm[c];
    const hx = (p % N) * cell, hy = ((p / N) | 0) * cell; // pixel's home
    const gx = (c % N) * cell, gy = ((c / N) | 0) * cell; // assigned cell
    if (reverse) { a.sx[c] = gx; a.sy[c] = gy; a.dx[c] = hx; a.dy[c] = hy; }
    else { a.sx[c] = hx; a.sy[c] = hy; a.dx[c] = gx; a.dy[c] = gy; }
    a.force[c] = 0.18 + Math.random() * 0.4; // wide ramp spread, the change stays slow
    a.col[c] = colors32[p];
  }
  // ghost underlay = the start state, so the frame keeps full coverage
  for (let c = 0; c < n; c++) {
    const col = a.col[c];
    let off = (a.sy[c] * S + a.sx[c]) | 0;
    for (let yy = 0; yy < cell; yy++) {
      for (let xx = 0; xx < cell; xx++) a.base[off + xx] = col;
      off += S;
    }
  }
  a.image = stageCtx.createImageData(S, S);
  a.u32 = new Uint32Array(a.image.data.buffer);
  state.anim = a;
}

function stopAnim() {
  cancelAnimationFrame(state.animRAF);
  state.animating = false;
}

function playAnim(onEnd) {
  const a = state.anim;
  if (!a) { if (onEnd) onEnd(); return; }
  stopAnim();
  state.animating = true;
  const { S, cell, n } = a;
  a.px.set(a.sx); a.py.set(a.sy);
  a.vx.fill(0); a.vy.fill(0);
  a.settled.fill(0);
  const MAX_V = cell * 1.15; // slow glide, the whole change reads gradually
  const DAMP = 0.965;
  const SNAP = cell * 0.45;
  const SNAP_SPEED2 = MAX_V * MAX_V * 0.2;
  let elapsed = 0;
  let settledCount = 0;
  let acc = 0;
  let last = performance.now();

  const frame = (now) => {
    acc += Math.min(100, now - last);
    last = now;
    while (acc >= 16.667) { // fixed 60Hz steps, display rate independent
      acc -= 16.667;
      elapsed += 1 / 60;
      for (let c = 0; c < n; c++) {
        if (a.settled[c]) continue;
        const ddx = a.dx[c] - a.px[c], ddy = a.dy[c] - a.py[c];
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        let vX = a.vx[c], vY = a.vy[c];
        if (dist < SNAP && vX * vX + vY * vY < SNAP_SPEED2) {
          a.px[c] = a.dx[c]; a.py[c] = a.dy[c];
          a.settled[c] = 1; settledCount++;
          continue;
        }
        const t = elapsed * a.force[c];
        const fac = Math.min(t * t * t, 1000);
        const g = fac / (S * 60);
        vX = (vX + ddx * dist * g) * DAMP;
        vY = (vY + ddy * dist * g) * DAMP;
        const sp = Math.sqrt(vX * vX + vY * vY);
        if (sp > MAX_V) { const k = MAX_V / sp; vX *= k; vY *= k; }
        a.vx[c] = vX; a.vy[c] = vY;
        a.px[c] += vX; a.py[c] += vY;
      }
    }
    a.u32.set(a.base);
    for (let c = 0; c < n; c++) {
      let ix = Math.round(a.px[c]), iy = Math.round(a.py[c]);
      if (ix < 0) ix = 0; else if (ix > S - cell) ix = S - cell;
      if (iy < 0) iy = 0; else if (iy > S - cell) iy = S - cell;
      const col = a.col[c];
      let off = iy * S + ix;
      for (let yy = 0; yy < cell; yy++) {
        for (let xx = 0; xx < cell; xx++) a.u32[off + xx] = col;
        off += S;
      }
    }
    stageCtx.putImageData(a.image, 0, 0);
    if (settledCount < n && elapsed < 15) {
      state.animRAF = requestAnimationFrame(frame);
    } else {
      state.animating = false;
      if (state.cur) { // crisp final frame
        if (a.reverse) showRaw(state.cur); else paintMosaic(state.cur);
      }
      if (onEnd) onEnd();
    }
  };
  state.animRAF = requestAnimationFrame(frame);
}
// ---------------------------------------------------------------- cycle
/*
 * obamify.com interaction model: every sample is precomputed in the
 * background (the pump), picking one shows the finished result instantly,
 * and play/reverse run the morph on demand. auto loops the whole set.
 */
let cycleToken = 0, curIdx = 0, idle = false;
const cache = new Map();
const keyOf = (idx) => `${idx}|${ui.res.value}|${ui.prox.value}`;
let queue = [];
let bgBusy = false;

function markStrip(idx) {
  [...ui.strip.children].forEach((el, i) => el.classList.toggle('sel', i === idx));
}

async function pump() {
  if (bgBusy) return;
  bgBusy = true;
  while (queue.length) {
    while (runs.size > 0) await sleep(200); // never compete with a visible solve
    const idx = queue.shift();
    const k = keyOf(idx);
    if (cache.has(k)) continue;
    const rec = await startRun(idx, false).promise;
    if (rec) cache.set(k, rec);
    else { queue.push(idx); await sleep(300); } // superseded, retry later
  }
  bgBusy = false;
}

async function runCycle(idx, opts = {}) {
  if (state.recording) return;
  const token = ++cycleToken;
  idle = false;
  curIdx = idx;
  markStrip(idx);
  stopAnim();
  state.anim = null;

  let rec = cache.get(keyOf(idx));
  if (!rec) {
    for (const b of [ui.play, ui.png, ui.vid]) b.disabled = true;
    const k = keyOf(idx);
    rec = await startRun(idx, true).promise;
    if (token !== cycleToken || !rec) return;
    cache.set(k, rec);
  } else {
    setStageSize(rec);
  }
  setSpin(false);

  state.cur = rec;
  updateStats(rec.lastStats);
  ui.play.disabled = false;
  ui.png.disabled = false;
  ui.vid.disabled = !VID_MIME;

  if (opts.play || ui.auto.checked) {
    buildAnim(rec, false);
    playAnim(() => afterPlay(rec, token, false));
  } else {
    paintMosaic(rec); // show the finished result, morph plays on demand
  }
}

async function afterPlay(rec, token, wasReverse) {
  if (token !== cycleToken) return;
  if (!ui.auto.checked || wasReverse) { idle = true; return; }
  await sleep(HOLD_MS);
  if (token !== cycleToken) return;
  while (state.recording) { await sleep(400); if (token !== cycleToken) return; }
  if (!ui.auto.checked) { idle = true; return; }
  runCycle((rec.idx + 1) % SAMPLES.length);
}

// ---------------------------------------------------------------- controls
let knobTimer = 0;
function reRun() {
  clearTimeout(knobTimer);
  knobTimer = setTimeout(() => {
    queue = [...SAMPLES.keys()];
    runCycle(curIdx);
    pump();
  }, 300);
}
ui.res.addEventListener('change', reRun);
ui.prox.addEventListener('input', () => { ui.proxOut.textContent = ui.prox.value; reRun(); });
ui.auto.addEventListener('change', () => {
  if (ui.auto.checked && idle) runCycle(curIdx, { play: true });
});
ui.play.addEventListener('click', () => {
  if (!state.cur || state.recording) return;
  const token = ++cycleToken;
  const rev = ui.reverse.checked;
  buildAnim(state.cur, rev);
  playAnim(() => afterPlay(state.cur, token, rev));
});

// ---------------------------------------------------------------- exports
ui.png.addEventListener('click', () => {
  const rec = state.cur;
  if (!rec || !rec.perm) return;
  paintMosaic(rec);
  const m = Math.ceil(1024 / rec.N);
  const out = document.createElement('canvas');
  out.width = out.height = rec.N * m;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(mosaic.canvas, 0, 0, out.width, out.height);
  out.toBlob((blob) => {
    const aEl = document.createElement('a');
    aEl.href = URL.createObjectURL(blob);
    aEl.download = 'newellized.png';
    aEl.click();
    setTimeout(() => URL.revokeObjectURL(aEl.href), 5000);
  }, 'image/png');
});

const VID_MIME = (() => {
  if (typeof MediaRecorder === 'undefined' || !ui.stage.captureStream) return null;
  for (const t of ['video/webm;codecs=vp9', 'video/webm', 'video/mp4']) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return null;
})();
if (!VID_MIME) ui.vid.title = 'Video recording is not supported in this browser';

ui.vid.addEventListener('click', () => {
  if (!state.cur || !VID_MIME || state.recording) return;
  state.recording = true;
  cycleToken++; // cancel any pending auto-advance while recording
  const wasReverse = ui.reverse.checked;
  for (const b of [ui.play, ui.png, ui.vid]) b.disabled = true;
  const stream = ui.stage.captureStream(60);
  const rec = new MediaRecorder(stream, { mimeType: VID_MIME, videoBitsPerSecond: 8e6 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  rec.onstop = () => {
    const blob = new Blob(chunks, { type: VID_MIME });
    const aEl = document.createElement('a');
    aEl.href = URL.createObjectURL(blob);
    aEl.download = VID_MIME.includes('mp4') ? 'newellize.mp4' : 'newellize.webm';
    aEl.click();
    setTimeout(() => URL.revokeObjectURL(aEl.href), 5000);
    state.recording = false;
    ui.play.disabled = false;
    ui.png.disabled = false;
    ui.vid.disabled = false;
    if (ui.auto.checked && !wasReverse) {
      setTimeout(() => { if (!state.recording) runCycle((curIdx + 1) % SAMPLES.length); }, 1200);
    } else {
      idle = true;
    }
  };
  rec.start();
  buildAnim(state.cur, wasReverse);
  playAnim(() => setTimeout(() => rec.stop(), 400));
});

// ---------------------------------------------------------------- boot
function buildStrip() {
  SAMPLES.forEach((s, i) => {
    const t = document.createElement('canvas');
    t.width = t.height = 68;
    t.title = s.name;
    t.getContext('2d').drawImage(sampleCanvas(i), 0, 0, 68, 68);
    t.addEventListener('click', () => runCycle(i));
    ui.strip.appendChild(t);
  });
}

const gaben = new Image();
gaben.onload = () => {
  buildStrip();
  queue = [...SAMPLES.keys()];
  runCycle(0, { play: true }); // first reveal plays once, then it is play on demand
  pump();
};
gaben.src = window.GABEN_DATA_URI;
})();
