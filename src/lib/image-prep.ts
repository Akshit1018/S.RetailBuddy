/** Make phone photos of bills readable — including dim shop lamps and a phone torch. */

export type PrepMode = "auto" | "night" | "adaptive" | "contrast";

export type ImageStats = {
  mean: number;
  variance: number;
  p5: number;
  p95: number;
  dark: boolean;
  uneven: boolean;
};

function clamp(n: number) {
  return n < 0 ? 0 : n > 255 ? 255 : n;
}

function luma(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function analyzeGray(gray: Float32Array): ImageStats {
  let sum = 0;
  let sumSq = 0;
  const hist = new Uint32Array(256);
  const n = gray.length;
  for (let i = 0; i < n; i++) {
    const g = gray[i]!;
    sum += g;
    sumSq += g * g;
    hist[Math.max(0, Math.min(255, g | 0))]++;
  }
  const mean = sum / n;
  const variance = sumSq / n - mean * mean;
  const cut5 = n * 0.05;
  const cut95 = n * 0.95;
  let acc = 0;
  let p5 = 0;
  let p95 = 255;
  for (let b = 0; b < 256; b++) {
    acc += hist[b]!;
    if (acc >= cut5 && p5 === 0) p5 = b;
    if (acc >= cut95) {
      p95 = b;
      break;
    }
  }
  return {
    mean,
    variance,
    p5,
    p95,
    dark: mean < 88 || p95 < 150,
    uneven: p95 - p5 > 150 && variance > 1800,
  };
}

function grayWorld(d: Uint8ClampedArray) {
  let r = 0;
  let g = 0;
  let b = 0;
  const n = d.length / 4;
  for (let i = 0; i < d.length; i += 4) {
    r += d[i]!;
    g += d[i + 1]!;
    b += d[i + 2]!;
  }
  r /= n;
  g /= n;
  b /= n;
  const avg = (r + g + b) / 3 || 1;
  const sr = avg / Math.max(r, 8);
  const sg = avg / Math.max(g, 8);
  const sb = avg / Math.max(b, 8);
  // Only correct a real colour cast (yellow tube / phone torch).
  if (Math.max(sr, sg, sb) / Math.min(sr, sg, sb) < 1.06) return;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = clamp(d[i]! * sr);
    d[i + 1] = clamp(d[i + 1]! * sg);
    d[i + 2] = clamp(d[i + 2]! * sb);
  }
}

function toGray(d: Uint8ClampedArray): Float32Array {
  const gray = new Float32Array(d.length / 4);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    gray[p] = luma(d[i]!, d[i + 1]!, d[i + 2]!);
  }
  return gray;
}

function writeGray(d: Uint8ClampedArray, gray: Float32Array) {
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    const g = clamp(gray[p]!);
    d[i] = d[i + 1] = d[i + 2] = g;
    d[i + 3] = 255;
  }
}

function applyGamma(gray: Float32Array, gamma: number) {
  const lut = new Float32Array(256);
  const inv = 1 / Math.max(0.2, gamma);
  for (let i = 0; i < 256; i++) lut[i] = 255 * Math.pow(i / 255, inv);
  for (let i = 0; i < gray.length; i++) {
    gray[i] = lut[clamp(gray[i]!)]!;
  }
}

function stretchPercentile(gray: Float32Array, loP = 0.02, hiP = 0.98) {
  const hist = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) {
    hist[clamp(gray[i]!)]++;
  }
  const n = gray.length;
  const loCut = n * loP;
  const hiCut = n * hiP;
  let acc = 0;
  let lo = 0;
  let hi = 255;
  for (let b = 0; b < 256; b++) {
    acc += hist[b]!;
    if (acc >= loCut && lo === 0) lo = b;
    if (acc >= hiCut) {
      hi = b;
      break;
    }
  }
  if (hi - lo < 24) return;
  const scale = 255 / (hi - lo);
  for (let i = 0; i < gray.length; i++) {
    gray[i] = clamp((gray[i]! - lo) * scale);
  }
}

/** Local contrast so a torch hotspot and a dark corner both stay readable. */
function clahe(gray: Float32Array, w: number, h: number, tiles = 8, clip = 2.6) {
  const tw = Math.max(8, Math.floor(w / tiles));
  const th = Math.max(8, Math.floor(h / tiles));
  const nx = Math.max(1, Math.ceil(w / tw));
  const ny = Math.max(1, Math.ceil(h / th));
  const cdfs: Uint8Array[] = [];

  for (let ty = 0; ty < ny; ty++) {
    for (let tx = 0; tx < nx; tx++) {
      const x0 = tx * tw;
      const y0 = ty * th;
      const x1 = Math.min(w, x0 + tw);
      const y1 = Math.min(h, y0 + th);
      const hist = new Float32Array(256);
      let count = 0;
      for (let y = y0; y < y1; y++) {
        const row = y * w;
        for (let x = x0; x < x1; x++) {
          hist[clamp(gray[row + x]!)]++;
          count++;
        }
      }
      const clipLimit = Math.max(1, (clip * count) / 256);
      let excess = 0;
      for (let b = 0; b < 256; b++) {
        if (hist[b]! > clipLimit) {
          excess += hist[b]! - clipLimit;
          hist[b] = clipLimit;
        }
      }
      const extra = excess / 256;
      for (let b = 0; b < 256; b++) hist[b]! += extra;
      const cdf = new Uint8Array(256);
      let run = 0;
      const scale = 255 / Math.max(1, count);
      for (let b = 0; b < 256; b++) {
        run += hist[b]!;
        cdf[b] = clamp(run * scale);
      }
      cdfs.push(cdf);
    }
  }

  const out = new Float32Array(gray.length);
  for (let y = 0; y < h; y++) {
    const ty = Math.min(ny - 1, y / th);
    const ty0 = Math.min(ny - 1, Math.floor(ty));
    const ty1 = Math.min(ny - 1, ty0 + 1);
    const fy = ty - ty0;
    for (let x = 0; x < w; x++) {
      const tx = Math.min(nx - 1, x / tw);
      const tx0 = Math.min(nx - 1, Math.floor(tx));
      const tx1 = Math.min(nx - 1, tx0 + 1);
      const fx = tx - tx0;
      const v = clamp(gray[y * w + x]!);
      const a = cdfs[ty0 * nx + tx0]![v]!;
      const b = cdfs[ty0 * nx + tx1]![v]!;
      const c = cdfs[ty1 * nx + tx0]![v]!;
      const d = cdfs[ty1 * nx + tx1]![v]!;
      const top = a * (1 - fx) + b * fx;
      const bot = c * (1 - fx) + d * fx;
      out[y * w + x] = top * (1 - fy) + bot * fy;
    }
  }
  gray.set(out);
}

function unsharp(gray: Float32Array, w: number, h: number, amount = 0.55) {
  const blur = new Float32Array(gray.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      blur[i] =
        (gray[i - w - 1]! +
          gray[i - w]! +
          gray[i - w + 1]! +
          gray[i - 1]! +
          gray[i]! +
          gray[i + 1]! +
          gray[i + w - 1]! +
          gray[i + w]! +
          gray[i + w + 1]!) /
        9;
    }
  }
  for (let i = 0; i < gray.length; i++) {
    if (!blur[i]) continue;
    gray[i] = clamp(gray[i]! + amount * (gray[i]! - blur[i]!));
  }
}

/** Sauvola local threshold — survives a torch beam on one side of the bill. */
function sauvola(gray: Float32Array, w: number, h: number, win = 31, k = 0.22) {
  const W = w + 1;
  const I = new Float64Array(W * (h + 1));
  const S = new Float64Array(W * (h + 1));
  for (let y = 1; y <= h; y++) {
    let row = 0;
    let rowSq = 0;
    const srcRow = (y - 1) * w;
    const irow = y * W;
    const prow = (y - 1) * W;
    for (let x = 1; x <= w; x++) {
      const v = gray[srcRow + x - 1]!;
      row += v;
      rowSq += v * v;
      I[irow + x] = I[prow + x] + row;
      S[irow + x] = S[prow + x] + rowSq;
    }
  }
  const half = (win - 1) >> 1;
  const R = 128;
  const out = new Float32Array(gray.length);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - half);
    const y1 = Math.min(h - 1, y + half);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - half);
      const x1 = Math.min(w - 1, x + half);
      const a = y0 * W + x0;
      const b = y0 * W + (x1 + 1);
      const c = (y1 + 1) * W + x0;
      const d = (y1 + 1) * W + (x1 + 1);
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const sum = I[d]! - I[b]! - I[c]! + I[a]!;
      const sumSq = S[d]! - S[b]! - S[c]! + S[a]!;
      const mean = sum / area;
      const std = Math.sqrt(Math.max(0, sumSq / area - mean * mean));
      const t = mean * (1 + k * (std / R - 1));
      out[y * w + x] = gray[y * w + x]! > t ? 245 : 18;
    }
  }
  gray.set(out);
}

function enhance(
  gray: Float32Array,
  w: number,
  h: number,
  stats: ImageStats,
  mode: PrepMode,
) {
  if (mode === "contrast") {
    const contrast = stats.variance < 900 ? 1.85 : 1.35;
    for (let i = 0; i < gray.length; i++) {
      gray[i] = clamp((gray[i]! - stats.mean) * contrast + stats.mean);
    }
    return;
  }

  const night = mode === "night" || (mode === "auto" && stats.dark);
  const uneven = mode === "adaptive" || (mode === "auto" && stats.uneven);

  if (night) {
    const g = stats.mean < 45 ? 0.48 : stats.mean < 70 ? 0.58 : 0.68;
    applyGamma(gray, g);
    stretchPercentile(gray, 0.01, 0.97);
    clahe(gray, w, h, 8, 2.8);
    unsharp(gray, w, h, 0.7);
  } else {
    stretchPercentile(gray, 0.02, 0.98);
    if (stats.variance < 700) {
      clahe(gray, w, h, 6, 2.2);
    }
    const contrast = stats.variance < 900 ? 1.55 : 1.25;
    const mean = stats.mean;
    for (let i = 0; i < gray.length; i++) {
      gray[i] = clamp((gray[i]! - mean) * contrast + 128 * 0.15 + mean * 0.85);
    }
    unsharp(gray, w, h, 0.45);
  }

  if (uneven) {
    sauvola(gray, w, h, night ? 35 : 29, night ? 0.18 : 0.22);
  }
}

export async function prepareImageForOcr(
  dataUrl: string,
  opts?: { maxWidth?: number; threshold?: boolean; mode?: PrepMode },
): Promise<string> {
  const detailed = await prepareImageForOcrDetailed(dataUrl, opts);
  return detailed.dataUrl;
}

export async function prepareImageForOcrDetailed(
  dataUrl: string,
  opts?: { maxWidth?: number; threshold?: boolean; mode?: PrepMode },
): Promise<{ dataUrl: string; stats: ImageStats; mode: PrepMode }> {
  const maxWidth = opts?.maxWidth ?? 1600;
  const requested: PrepMode =
    opts?.mode ?? (opts?.threshold === true ? "adaptive" : "auto");
  if (typeof document === "undefined") {
    return {
      dataUrl,
      stats: { mean: 128, variance: 1000, p5: 20, p95: 230, dark: false, uneven: false },
      mode: requested,
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1.5, maxWidth / Math.max(img.width, 1));
        const w = Math.max(400, Math.round(img.width * scale));
        const h = Math.max(280, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve({
            dataUrl,
            stats: { mean: 128, variance: 1000, p5: 20, p95: 230, dark: false, uneven: false },
            mode: requested,
          });
          return;
        }
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const d = imageData.data;
        grayWorld(d);
        const gray = toGray(d);
        const stats = analyzeGray(gray);
        let mode = requested;
        if (requested === "auto") {
          mode = stats.dark ? "night" : stats.uneven ? "adaptive" : "contrast";
        }
        enhance(gray, w, h, stats, mode);
        writeGray(d, gray);
        ctx.putImageData(imageData, 0, 0);
        resolve({ dataUrl: canvas.toDataURL("image/png"), stats, mode });
      } catch {
        resolve({
          dataUrl,
          stats: { mean: 128, variance: 1000, p5: 20, p95: 230, dark: false, uneven: false },
          mode: requested,
        });
      }
    };
    img.onerror = () =>
      resolve({
        dataUrl,
        stats: { mean: 128, variance: 1000, p5: 20, p95: 230, dark: false, uneven: false },
        mode: requested,
      });
    img.src = dataUrl;
  });
}

/** Dim a bill photo so we can test / demo shop-lamp and torch conditions. */
export async function simulateWeakLight(
  dataUrl: string,
  kind: "shop" | "night" | "torch" = "shop",
): Promise<string> {
  if (typeof document === "undefined") return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const maxR = Math.hypot(cx, cy);
      const gain = kind === "night" ? 0.28 : kind === "torch" ? 0.4 : 0.36;
      const yellow = kind !== "night";
      const torch = kind === "torch";
      for (let i = 0, p = 0; i < d.length; i += 4, p++) {
        const x = p % canvas.width;
        const y = (p / canvas.width) | 0;
        const r = Math.hypot(x - cx, y - cy) / maxR;
        let v = torch
          ? 0.18 + 0.95 * Math.exp(-r * r * 3.2)
          : 0.55 + 0.45 * (1 - r * r);
        v *= gain;
        let R = d[i]! * v * (yellow ? 1.18 : 1);
        let G = d[i + 1]! * v * (yellow ? 0.92 : 1);
        let B = d[i + 2]! * v * (yellow ? 0.62 : 1);
        const n = ((x * 73 + y * 149) % 17) - 8;
        R += n;
        G += n;
        B += n;
        d[i] = clamp(R);
        d[i + 1] = clamp(G);
        d[i + 2] = clamp(B);
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function compressCapture(dataUrl: string, maxEdge = 2000): Promise<string> {
  if (typeof document === "undefined") return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const edge = Math.max(img.width, img.height);
      const scale = edge > maxEdge ? maxEdge / edge : 1;
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      let mean = 128;
      try {
        const sample = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let sum = 0;
        const step = 16;
        let n = 0;
        for (let i = 0; i < sample.length; i += 4 * step) {
          sum += luma(sample[i]!, sample[i + 1]!, sample[i + 2]!);
          n++;
        }
        mean = n ? sum / n : 128;
      } catch {
        /* ignore */
      }
      const dark = mean < 90;
      if (scale === 1 && dataUrl.length < 1_800_000 && !dark) {
        resolve(dataUrl);
        return;
      }
      resolve(canvas.toDataURL("image/jpeg", dark ? 0.92 : 0.86));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
