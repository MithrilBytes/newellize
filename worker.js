/*
 * Newellize optimizer. Runs inside a Web Worker instantiated from a Blob of
 * this function's source, so it also works from file://.
 *
 * Problem, as in obamify: find a permutation assigning every source pixel to
 * exactly one target cell so the rearranged source approximates the target.
 * Cost = weighted RGB distance + lambda * squared travel distance (the
 * "proximity importance" knob). Solved with a luminance-sorted initial
 * assignment, then millions of pair swaps and 3-cycle rotations under
 * threshold accepting: a move is kept if its cost delta is below a threshold
 * that decays to zero, after which only improvements survive.
 *
 * Protocol: {cmd:'start', runId, N, src, tgt, lambda01, budgetMs} in,
 * {type:'progress'|'done', runId, perm, iter, accepted, colorErr} out.
 * A new 'start' supersedes any run in flight; stale chunk chains see the
 * state object change and die silently.
 */
function optimizerWorkerMain(self) {
  'use strict';

  let st = null;

  let seed = 0x9e3779b9;
  function rng() { // xorshift32
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return seed >>> 0;
  }

  self.onmessage = (e) => {
    const m = e.data;
    if (m.cmd === 'start') { init(m); run(m.budgetMs); }
  };

  function init(m) {
    const N = m.N, n = N * N;
    const sR = new Int32Array(n), sG = new Int32Array(n), sB = new Int32Array(n);
    const tR = new Int32Array(n), tG = new Int32Array(n), tB = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      sR[i] = m.src[i * 4]; sG[i] = m.src[i * 4 + 1]; sB[i] = m.src[i * 4 + 2];
      tR[i] = m.tgt[i * 4]; tG[i] = m.tgt[i * 4 + 1]; tB[i] = m.tgt[i * 4 + 2];
    }
    const X = new Int32Array(n), Y = new Int32Array(n);
    for (let i = 0; i < n; i++) { X[i] = i % N; Y[i] = (i / N) | 0; }

    // initial assignment: k-th brightest source pixel to k-th brightest cell
    const lumaOrder = (R, G, B) => {
      const idx = new Uint32Array(n);
      for (let i = 0; i < n; i++) idx[i] = i;
      const luma = new Float64Array(n);
      for (let i = 0; i < n; i++) luma[i] = 0.299 * R[i] + 0.587 * G[i] + 0.114 * B[i];
      return Array.from(idx).sort((a, b) => luma[a] - luma[b]);
    };
    const oS = lumaOrder(sR, sG, sB), oT = lumaOrder(tR, tG, tB);
    const perm = new Uint32Array(n);
    for (let k = 0; k < n; k++) perm[oT[k]] = oS[k];

    // lambda scaled so the slider behaves the same at every resolution
    const lam = m.lambda01 * (3 * 65025) / n;

    st = { runId: m.runId, N, n, sR, sG, sB, tR, tG, tB, X, Y, perm, lam, iter: 0, accepted: 0 };
    let errSum = 0;
    for (let c = 0; c < n; c++) errSum += cost(st, perm[c], c);
    st.T0 = (errSum / n) * 0.15;
  }

  function cost(s, p, c) {
    const dr = s.sR[p] - s.tR[c], dg = s.sG[p] - s.tG[c], db = s.sB[p] - s.tB[c];
    let v = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
    if (s.lam > 0) {
      const dx = s.X[p] - s.X[c], dy = s.Y[p] - s.Y[c];
      v += s.lam * (dx * dx + dy * dy);
    }
    return v;
  }

  // color-only mean error, for a human-readable resemblance figure
  function colorError(s) {
    let sum = 0;
    for (let c = 0; c < s.n; c++) {
      const p = s.perm[c];
      const dr = s.sR[p] - s.tR[c], dg = s.sG[p] - s.tG[c], db = s.sB[p] - s.tB[c];
      sum += 2 * dr * dr + 4 * dg * dg + 3 * db * db;
    }
    return sum / s.n;
  }

  function run(budgetMs) {
    const s = st, n = s.n, N = s.N, perm = s.perm;
    const CHUNK = 150000;
    const t0 = performance.now();
    let lastReport = 0;

    const report = (type) => {
      self.postMessage({
        type,
        runId: s.runId,
        perm: perm.slice(),
        iter: s.iter,
        accepted: s.accepted,
        colorErr: colorError(s),
        progress: Math.min(1, (performance.now() - t0) / budgetMs),
      });
    };

    (function chunk() {
      if (st !== s) return; // superseded by a newer start
      const now = performance.now();
      const frac = Math.min(1, (now - t0) / budgetMs);
      // threshold decays to 0 at 60% of the budget, then pure greedy
      const T = Math.max(0, s.T0 * (1 - frac / 0.6));

      for (let k = 0; k < CHUNK; k++) {
        const mode = rng() % 10;
        if (mode < 8) {
          // pair swap: half long-range, half lattice-neighbor (polishes texture)
          const c1 = rng() % n;
          let c2;
          if (mode < 4) {
            c2 = rng() % n;
          } else {
            const d = rng() & 3;
            if (d === 0 && c1 % N !== N - 1) c2 = c1 + 1;
            else if (d === 1 && c1 % N !== 0) c2 = c1 - 1;
            else if (d === 2 && c1 < n - N) c2 = c1 + N;
            else if (d === 3 && c1 >= N) c2 = c1 - N;
            else c2 = rng() % n;
          }
          if (c1 === c2) continue;
          const p1 = perm[c1], p2 = perm[c2];
          const delta = cost(s, p1, c2) + cost(s, p2, c1) - cost(s, p1, c1) - cost(s, p2, c2);
          if (delta < T) {
            perm[c1] = p2; perm[c2] = p1;
            s.accepted++;
          }
        } else {
          // 3-cycle rotation escapes local minima that no pair swap can improve
          const c1 = rng() % n, c2 = rng() % n, c3 = rng() % n;
          if (c1 === c2 || c2 === c3 || c1 === c3) continue;
          const p1 = perm[c1], p2 = perm[c2], p3 = perm[c3];
          const base = cost(s, p1, c1) + cost(s, p2, c2) + cost(s, p3, c3);
          const dA = cost(s, p1, c2) + cost(s, p2, c3) + cost(s, p3, c1) - base;
          const dB = cost(s, p1, c3) + cost(s, p2, c1) + cost(s, p3, c2) - base;
          if (dA <= dB) {
            if (dA < T) { perm[c2] = p1; perm[c3] = p2; perm[c1] = p3; s.accepted++; }
          } else if (dB < T) {
            perm[c3] = p1; perm[c1] = p2; perm[c2] = p3; s.accepted++;
          }
        }
      }
      s.iter += CHUNK;

      const t = performance.now();
      if (t - lastReport > 90) { lastReport = t; report('progress'); }
      if (t - t0 < budgetMs && st === s) setTimeout(chunk, 0);
      else if (st === s) report('done');
    })();
  }
}

// Loaded as a plain <script> this file only defines the function above.
// Defensive: pointing new Worker() directly at this file also works.
if (typeof window === 'undefined' && typeof self !== 'undefined') {
  try { optimizerWorkerMain(self); } catch (e) { /* already running via blob */ }
}
