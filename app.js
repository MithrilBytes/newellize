(() => {
'use strict';

const $ = (id) => document.getElementById(id);
const ui = {
  stage: $('stage'), strip: $('strip'),
  res: $('resSel'), prox: $('proxSlider'), proxOut: $('proxOut'), effort: $('effortSel'),
  auto: $('autoChk'), replay: $('replayBtn'), png: $('pngBtn'), vid: $('vidBtn'),
  quip: $('quip'), stats: $('stats'),
};
const stageCtx = ui.stage.getContext('2d');
const MAX_COLOR_ERR = 9 * 65025; // weights 2+4+3 at delta 255
const HOLD_MS = 3200;

const RUN_QUIPS = [
  'Rearranging pixels. They said it could not be done.',
  'Negotiating with each pixel individually.',
  'Counting to three. Stuck at two again.',
  'Applying Valve Time to the ETA.',
  'Consulting the hat economy.',
  'Your pixels will ship when they are ready.',
  'Running it through the summer sale algorithm.',
];
const DONE_QUIPS = [
  'Newellization complete. He is inevitable.',
  'Done. Every pixel found its purpose.',
  'The President of Valve, assembled from the source.',
  'Shipped. On the first try, too.',
];

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
let worker = null, workerURL = null, runSeq = 0, visibleRunId = 0;
const runs = new Map();

function ensureWorker() {
  if (worker) return;
  workerURL = URL.createObjectURL(
    new Blob([`"use strict";(${optimizerWorkerMain})(self);`], { type: 'text/javascript' })
  );
  worker = new Worker(workerURL);
  worker.onmessage = onWorkerMsg;
  worker.onerror = (e) => setQuip(`Optimizer crashed: ${e.message || 'unknown error'}`);
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
    visibleRunId = runId;
    setStageSize(rec);
    showRaw(rec);
    startQuips();
  }
  worker.postMessage({
    cmd: 'start', runId, N, src, tgt: tgtSmall(N),
    lambda01: +ui.prox.value / 100, budgetMs: +ui.effort.value,
  });
  return rec;
}

function onWorkerMsg(e) {
  const m = e.data;
  const rec = runs.get(m.runId);
  if (!rec) return; // stale
  rec.perm = m.perm;
  rec.lastStats = m;
  if (m.runId === visibleRunId) { paintMosaic(rec); updateStats(m, rec); }
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

// ---------------------------------------------------------------- quips, stats
const state = { cur: null, anim: null, animRAF: 0, animating: false, recording: false, quipTimer: 0 };

function setQuip(t) { ui.quip.textContent = t; }
function startQuips() {
  stopQuips();
  let i = (Math.random() * RUN_QUIPS.length) | 0;
  setQuip(RUN_QUIPS[i]);
  state.quipTimer = setInterval(() => { i = (i + 1) % RUN_QUIPS.length; setQuip(RUN_QUIPS[i]); }, 2600);
}
function stopQuips() { clearInterval(state.quipTimer); state.quipTimer = 0; }

function updateStats(m, rec) {
  if (!m) { ui.stats.textContent = ''; return; }
  const r = Math.max(0, 100 * (1 - Math.sqrt(m.colorErr / MAX_COLOR_ERR)));
  ui.stats.textContent =
    `${SAMPLES[rec.idx].name} · ${(m.iter / 1e6).toFixed(1)}M swaps · resemblance ${r.toFixed(1)}%`;
}

// ---------------------------------------------------------------- animation
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const BG32 = 0xff000000 | (0x2d << 16) | (0x20 << 8) | 0x16; // #16202d

function buildAnim(rec) {
  const { N, cell, S, perm, colors32 } = rec;
  const n = N * N;
  const a = {
    sx: new Float32Array(n), sy: new Float32Array(n),
    tx: new Float32Array(n), ty: new Float32Array(n),
    cx: new Float32Array(n), cy: new Float32Array(n),
    delay: new Float32Array(n), dur: new Float32Array(n),
    col: new Uint32Array(n),
    total: 0, S, cell, n,
  };
  for (let c = 0; c < n; c++) {
    const p = perm[c];
    const sx = (p % N) * cell, sy = ((p / N) | 0) * cell;
    const tx = (c % N) * cell, ty = ((c / N) | 0) * cell;
    a.sx[c] = sx; a.sy[c] = sy; a.tx[c] = tx; a.ty[c] = ty;
    const dx = tx - sx, dy = ty - sy;
    const dist = Math.hypot(dx, dy);
    let px = 0, py = 0;
    if (dist > 0) { px = -dy / dist; py = dx / dist; }
    const amp = (Math.random() - 0.5) * 0.6 * dist;
    a.cx[c] = sx + dx / 2 + px * amp;
    a.cy[c] = sy + dy / 2 + py * amp;
    a.delay[c] = Math.random() * 1600;
    a.dur[c] = 2400 + Math.random() * 1000;
    a.total = Math.max(a.total, a.delay[c] + a.dur[c]);
    a.col[c] = colors32[p];
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
  const t0 = performance.now();

  const frame = (now) => {
    const t = now - t0;
    const { S, cell, n } = a;
    a.u32.fill(BG32);
    for (let c = 0; c < n; c++) {
      let k = (t - a.delay[c]) / a.dur[c];
      if (k < 0) k = 0; else if (k > 1) k = 1;
      const e = easeInOutCubic(k);
      const mx1 = a.sx[c] + (a.cx[c] - a.sx[c]) * e, my1 = a.sy[c] + (a.cy[c] - a.sy[c]) * e;
      const mx2 = a.cx[c] + (a.tx[c] - a.cx[c]) * e, my2 = a.cy[c] + (a.ty[c] - a.cy[c]) * e;
      let ix = Math.round(mx1 + (mx2 - mx1) * e);
      let iy = Math.round(my1 + (my2 - my1) * e);
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
    if (t < a.total + 150) {
      state.animRAF = requestAnimationFrame(frame);
    } else {
      state.animating = false;
      if (state.cur) paintMosaic(state.cur); // crisp, gap-free final frame
      if (onEnd) onEnd();
    }
  };
  state.animRAF = requestAnimationFrame(frame);
}
const playAnimP = () => new Promise((res) => playAnim(res));

// ---------------------------------------------------------------- cycle
let cycleToken = 0, curIdx = 0, idle = false;

function markStrip(idx) {
  [...ui.strip.children].forEach((el, i) => el.classList.toggle('sel', i === idx));
}

async function runCycle(idx, preRec) {
  if (state.recording) return;
  const token = ++cycleToken;
  idle = false;
  curIdx = idx;
  markStrip(idx);
  stopAnim();
  state.anim = null;
  for (const b of [ui.replay, ui.png, ui.vid]) b.disabled = true;

  let rec;
  if (preRec && preRec.perm && preRec.idx === idx && preRec.N === +ui.res.value) {
    rec = preRec;
    visibleRunId = rec.runId;
    setStageSize(rec);
    updateStats(rec.lastStats, rec);
  } else {
    rec = await startRun(idx, true).promise;
    if (token !== cycleToken || !rec) return;
  }

  state.cur = rec;
  stopQuips();
  setQuip(DONE_QUIPS[(Math.random() * DONE_QUIPS.length) | 0]);
  ui.replay.disabled = false;
  ui.png.disabled = false;
  ui.vid.disabled = !VID_MIME;
  buildAnim(rec);
  animateAndAdvance(rec, token);
}

async function animateAndAdvance(rec, token) {
  idle = false;
  const nextIdx = (rec.idx + 1) % SAMPLES.length;
  let nextP = null;
  if (ui.auto.checked && !state.recording) nextP = startRun(nextIdx, false).promise;

  await playAnimP();
  if (token !== cycleToken) return;
  await sleep(HOLD_MS);
  if (token !== cycleToken) return;
  while (state.recording) { await sleep(400); if (token !== cycleToken) return; }
  if (!ui.auto.checked) { idle = true; return; }

  const nr = nextP ? await nextP : null;
  if (token !== cycleToken) return;
  runCycle(nextIdx, nr || undefined);
}

// ---------------------------------------------------------------- controls
let knobTimer = 0;
function reRun() {
  clearTimeout(knobTimer);
  knobTimer = setTimeout(() => runCycle(curIdx), 300);
}
ui.res.addEventListener('change', reRun);
ui.effort.addEventListener('change', reRun);
ui.prox.addEventListener('input', () => { ui.proxOut.textContent = ui.prox.value; reRun(); });
ui.auto.addEventListener('change', () => {
  if (ui.auto.checked && idle) runCycle((curIdx + 1) % SAMPLES.length);
});
ui.replay.addEventListener('click', () => {
  if (!state.anim || state.recording) return;
  animateAndAdvance(state.cur, ++cycleToken);
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
  if (!state.anim || !VID_MIME || state.recording) return;
  state.recording = true;
  cycleToken++; // cancel any pending auto-advance while recording
  for (const b of [ui.replay, ui.png, ui.vid]) b.disabled = true;
  setQuip('Recording. Act natural.');
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
    ui.replay.disabled = false;
    ui.png.disabled = false;
    ui.vid.disabled = false;
    setQuip('Video saved. Post responsibly.');
    if (ui.auto.checked) {
      setTimeout(() => { if (!state.recording) runCycle((curIdx + 1) % SAMPLES.length); }, 1200);
    } else {
      idle = true;
    }
  };
  rec.start();
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
gaben.onload = () => { buildStrip(); runCycle(0); };
gaben.src = window.GABEN_DATA_URI;
})();
