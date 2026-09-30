// Pulls still frames out of a video, in the browser (nothing is uploaded).
// Used by Place from Video: film a walk-around of a room, keep the sharp frames,
// and use them as real angles of that place.

const VideoFrames = {
  // Returns [{ blob, url, time, sharpness }] for `count` evenly spaced moments.
  async extract(file, { count = 12, maxSide = 1280, onProgress = () => {} } = {}) {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = URL.createObjectURL(file);

    const loaded = await new Promise((resolve) => {
      video.onloadeddata = () => resolve(true);
      video.onerror = () => resolve(false);
      setTimeout(() => resolve(false), 15000);
    });
    if (!loaded || !video.videoWidth || !isFinite(video.duration)) {
      throw new Error("This browser can't open that video. On iPhone, set Settings → Camera → Formats → Most Compatible and film again, or try an MP4 file.");
    }

    const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const frames = [];
    for (let i = 0; i < count; i++) {
      // Skip the very start and end, which are often shaky.
      const time = video.duration * (0.04 + 0.92 * (i + 0.5) / count);
      await this.seek(video, time);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
      frames.push({ blob, url: URL.createObjectURL(blob), time, sharpness: this.sharpness(ctx, canvas.width, canvas.height) });
      onProgress(i + 1, count);
    }
    URL.revokeObjectURL(video.src);
    return frames;
  },

  seek(video, time) {
    return new Promise((resolve) => {
      const done = () => { video.removeEventListener('seeked', done); resolve(); };
      video.addEventListener('seeked', done);
      video.currentTime = Math.min(time, Math.max(0, video.duration - 0.05));
      setTimeout(done, 3000); // never hang on a stubborn frame
    });
  },

  // How sharp a frame is: the variance of edges on a small grey copy (blurry = low).
  sharpness(ctx, w, h) {
    const step = Math.max(1, Math.round(Math.max(w, h) / 320));
    const { data } = ctx.getImageData(0, 0, w, h);
    const gw = Math.floor(w / step), gh = Math.floor(h / step);
    const g = new Float32Array(gw * gh);
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const i = ((y * step) * w + x * step) * 4;
        g[y * gw + x] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
    }
    let sum = 0, sum2 = 0, n = 0;
    for (let y = 1; y < gh - 1; y++) {
      for (let x = 1; x < gw - 1; x++) {
        const c = y * gw + x;
        const lap = 4 * g[c] - g[c - 1] - g[c + 1] - g[c - gw] - g[c + gw];
        sum += lap; sum2 += lap * lap; n++;
      }
    }
    const mean = sum / n;
    return sum2 / n - mean * mean;
  },

  // Picks which frames to keep: drop clearly blurry ones, then keep up to `max`, spread evenly.
  autoPick(frames, max = 10) {
    const sorted = frames.map((f) => f.sharpness).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] || 0;
    let keep = frames.map((f, i) => (f.sharpness >= median * 0.5 ? i : -1)).filter((i) => i >= 0);
    if (keep.length > max) {
      const spread = [];
      for (let k = 0; k < max; k++) spread.push(keep[Math.round(k * (keep.length - 1) / (max - 1))]);
      keep = [...new Set(spread)];
    }
    return new Set(keep);
  },
};
