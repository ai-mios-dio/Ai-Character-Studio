// Finds each separate figure on a character sheet and cuts it out.
// Everything runs in your browser; no images are uploaded anywhere.

const Cutter = {
  // Largest side used while *detecting* (keeps it fast). Cropping still uses full resolution.
  WORK_SIZE: 1200,

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not read image'));
      img.src = src;
    });
  },

  // Distance between two colours (0 = identical).
  colorDist(r1, g1, b1, r2, g2, b2) {
    return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
  },

  // Background colour = the median colour of all pixels around the image's edge.
  guessBackground(px, w, h) {
    const rs = [], gs = [], bs = [];
    const add = (x, y) => {
      const i = (y * w + x) * 4;
      rs.push(px[i]); gs.push(px[i + 1]); bs.push(px[i + 2]);
    };
    for (let x = 0; x < w; x++) { add(x, 0); add(x, h - 1); }
    for (let y = 0; y < h; y++) { add(0, y); add(w - 1, y); }
    const median = (a) => a.sort((m, n) => m - n)[a.length >> 1];
    return [median(rs), median(gs), median(bs)];
  },

  // Grows the mask by `r` pixels in every direction (a square "dilation"),
  // using a summed-area table so it's fast even for a big radius.
  dilate(mask, w, h, r) {
    if (r <= 0) return mask.slice();
    const W = w + 1;
    const sum = new Int32Array(W * (h + 1));
    for (let y = 0; y < h; y++) {
      let row = 0;
      for (let x = 0; x < w; x++) {
        row += mask[y * w + x];
        sum[(y + 1) * W + x + 1] = sum[y * W + x + 1] + row;
      }
    }
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
      for (let x = 0; x < w; x++) {
        const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
        const s = sum[y1 * W + x1] - sum[y0 * W + x1] - sum[y1 * W + x0] + sum[y0 * W + x0];
        out[y * w + x] = s > 0 ? 1 : 0;
      }
    }
    return out;
  },

  // Gives every group of touching pixels its own number (1, 2, 3...).
  label(mask, w, h) {
    const labels = new Int32Array(w * h);
    const stack = new Int32Array(w * h);
    let next = 0;
    for (let start = 0; start < w * h; start++) {
      if (!mask[start] || labels[start]) continue;
      next++;
      let top = 0;
      stack[top++] = start;
      labels[start] = next;
      while (top) {
        const i = stack[--top];
        const x = i % w, y = (i / w) | 0;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= w) continue;
            const j = ny * w + nx;
            if (mask[j] && !labels[j]) { labels[j] = next; stack[top++] = j; }
          }
        }
      }
    }
    return { labels, count: next };
  },

  // Orders boxes like reading a page: top row left-to-right, then the next row.
  readingOrder(boxes) {
    const sorted = [...boxes].sort((a, b) => a.y0 - b.y0);
    const rows = [];
    for (const b of sorted) {
      const cy = (b.y0 + b.y1) / 2;
      const row = rows.find((r) => cy >= r.y0 && cy <= r.y1);
      if (row) { row.items.push(b); row.y0 = Math.min(row.y0, b.y0); row.y1 = Math.max(row.y1, b.y1); }
      else rows.push({ y0: b.y0, y1: b.y1, items: [b] });
    }
    return rows.flatMap((r) => r.items.sort((a, b) => a.x0 - b.x0));
  },

  // Main entry: returns [{ canvas, width, height }] for each figure found.
  async cut(img, { tolerance = 40, merge = 12, minPercent = 0.5, padding = 10, transparent = true } = {}) {
    const fullW = img.naturalWidth, fullH = img.naturalHeight;
    const scale = Math.min(1, this.WORK_SIZE / Math.max(fullW, fullH));
    const w = Math.max(1, Math.round(fullW * scale)), h = Math.max(1, Math.round(fullH * scale));

    const work = document.createElement('canvas');
    work.width = w; work.height = h;
    const wctx = work.getContext('2d', { willReadFrequently: true });
    wctx.drawImage(img, 0, 0, w, h);
    const px = wctx.getImageData(0, 0, w, h).data;

    // 1. Which pixels are "not background"?
    const bg = this.guessBackground(px, w, h);
    const mask = new Uint8Array(w * h);
    for (let i = 0, p = 0; i < w * h; i++, p += 4) {
      if (px[p + 3] < 20) continue; // already transparent
      if (this.colorDist(px[p], px[p + 1], px[p + 2], bg[0], bg[1], bg[2]) > tolerance) mask[i] = 1;
    }

    // 2. Join nearby pieces, then 3. number each separate blob.
    const grown = this.dilate(mask, w, h, merge);
    const { labels, count } = this.label(grown, w, h);

    // 4. Measure each blob using only the real (un-grown) pixels.
    const boxes = Array.from({ length: count + 1 }, () => ({ x0: w, y0: h, x1: -1, y1: -1, n: 0 }));
    for (let i = 0; i < w * h; i++) {
      if (!mask[i]) continue;
      const b = boxes[labels[i]];
      const x = i % w, y = (i / w) | 0;
      if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x;
      if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y;
      b.n++;
    }
    const minPixels = (minPercent / 100) * w * h;
    const kept = this.readingOrder(boxes.slice(1).filter((b) => b.n >= minPixels));

    // 5. Crop each one from the full-resolution image.
    return kept.map((b) => {
      const x0 = Math.max(0, Math.floor(b.x0 / scale) - padding);
      const y0 = Math.max(0, Math.floor(b.y0 / scale) - padding);
      const x1 = Math.min(fullW, Math.ceil((b.x1 + 1) / scale) + padding);
      const y1 = Math.min(fullH, Math.ceil((b.y1 + 1) / scale) + padding);
      const c = document.createElement('canvas');
      c.width = x1 - x0; c.height = y1 - y0;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
      if (transparent) this.removeBackground(ctx, c.width, c.height, bg, tolerance);
      return { canvas: c, width: c.width, height: c.height };
    });
  },

  // Erases background-coloured pixels that are connected to the crop's edge.
  // (Connected-to-edge means white eyes or teeth *inside* the character stay.)
  removeBackground(ctx, w, h, bg, tolerance) {
    const data = ctx.getImageData(0, 0, w, h);
    const px = data.data;
    const dist = (i) => this.colorDist(px[i * 4], px[i * 4 + 1], px[i * 4 + 2], bg[0], bg[1], bg[2]);
    const isBg = (i) => px[i * 4 + 3] < 20 || dist(i) <= tolerance;

    const cleared = new Uint8Array(w * h);
    const stack = new Int32Array(w * h);
    let top = 0;
    const push = (i) => { if (!cleared[i] && isBg(i)) { cleared[i] = 1; stack[top++] = i; } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (top) {
      const i = stack[--top];
      const x = i % w, y = (i / w) | 0;
      if (x > 0) push(i - 1);
      if (x < w - 1) push(i + 1);
      if (y > 0) push(i - w);
      if (y < h - 1) push(i + w);
    }

    // Soften the edge: pixels next to erased ones that are *nearly* background
    // become partly see-through, which removes the white halo around the figure.
    const alpha = new Uint8ClampedArray(w * h);
    for (let i = 0; i < w * h; i++) {
      if (cleared[i]) { alpha[i] = 0; continue; }
      alpha[i] = px[i * 4 + 3];
      const x = i % w, y = (i / w) | 0;
      const nearCleared = (x > 0 && cleared[i - 1]) || (x < w - 1 && cleared[i + 1]) ||
                          (y > 0 && cleared[i - w]) || (y < h - 1 && cleared[i + w]);
      if (nearCleared) {
        const t = Math.min(1, (dist(i) - tolerance) / tolerance);
        alpha[i] = Math.round(alpha[i] * Math.max(0.15, t));
      }
    }
    for (let i = 0; i < w * h; i++) px[i * 4 + 3] = alpha[i];
    ctx.putImageData(data, 0, 0);
  },
};
