/**
 * The rendered film: what the viewer actually sees and hears. The DOM gives exact boxes, but some
 * problems only exist in pixels and sound: text that shimmers as the renderer rounds it to the pixel
 * grid, how much of the picture changes, and whether the music builds to the moment the picture lands.
 * This reads any video file through ffmpeg: a film mographc rendered, or an mp4 on its own.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

export interface Picture {
  /** Analysis grid: the frame scaled to `width` x `height`, `scale` source px per grid px. */
  width: number;
  height: number;
  scale: number;
  /** Blocks of `block` grid px, `cols` x `rows` of them. */
  block: number;
  cols: number;
  rows: number;
  /** Per frame: the mean change in brightness from the previous frame, 0 to 1. */
  energy: Float32Array;
  /** Per frame: the share of the canvas whose brightness changed noticeably. */
  changed: Float32Array;
  /** Per frame and block: the share of the block's pixels that changed, 0 to 255. */
  changedBlocks: Uint8Array[];
  /** The same, counting only sharp changes (a third of the brightness range or more), as edges of text and shapes make. */
  sharpBlocks: Uint8Array[];
  /** Per frame and block: the share of the block's pixels on an edge (a sharp step to the next pixel), 0 to 255: text and shapes, not flat fills. */
  detailBlocks: Uint8Array[];
  /** Per frame and block: the share of the block's pixels that differ from a quarter of a second earlier, 0 to 255. */
  spanBlocks: Uint8Array[];
  /** Frames in that quarter of a second. */
  span: number;
}

export interface Sound {
  /** Per frame, in dB: the whole track, the highs (above 4 kHz) and the lows (below 150 Hz). */
  rms: Float32Array;
  high: Float32Array;
  low: Float32Array;
  /** Per frame: how sharply the sound rose into it, in dB summed over the bands. */
  onset: Float32Array;
}

export interface Rendered {
  file: string;
  fps: number;
  width: number;
  height: number;
  frames: number;
  picture: Picture;
  /** Absent when the video has no audio track. */
  sound?: Sound;
}

/** ffmpeg: MOGRAPHC_FFMPEG, the one on PATH, or the copy Remotion ships with its renderer. */
export const findFfmpeg = (from = process.cwd()) => {
  if (process.env.MOGRAPHC_FFMPEG) return process.env.MOGRAPHC_FFMPEG;
  if (!spawnSync("ffmpeg", ["-version"]).error) return "ffmpeg";
  const require = createRequire(path.join(from, "package.json"));
  for (const pkg of [
    "linux-x64-gnu",
    "linux-x64-musl",
    "linux-arm64-gnu",
    "linux-arm64-musl",
    "darwin-arm64",
    "darwin-x64",
    "win32-x64-msvc",
  ]) {
    try {
      const dir = path.dirname(
        require.resolve(`@remotion/compositor-${pkg}/package.json`),
      );
      const bin = path.join(
        dir,
        pkg.startsWith("win") ? "ffmpeg.exe" : "ffmpeg",
      );
      if (existsSync(bin)) return bin;
    } catch {
      // not installed for this platform
    }
  }
  throw new Error(
    "mographc needs ffmpeg to read the rendered film. Install it (it's on PATH on most systems), or set MOGRAPHC_FFMPEG to its path.",
  );
};

const probe = (ffmpeg: string, file: string) => {
  // ffmpeg prints the streams on stderr when given no output.
  const info = spawnSync(ffmpeg, ["-hide_banner", "-i", file], {
    encoding: "utf8",
  }).stderr;
  const video = info.match(/Video:.*?(\d{2,5})x(\d{2,5})/);
  const fps = info.match(/([\d.]+) fps/);
  const duration = info.match(/Duration: (\d+):(\d+):([\d.]+)/);
  if (!video || !fps || !duration)
    throw new Error(`${file} isn't a video ffmpeg can read.`);
  return {
    width: Number(video[1]),
    height: Number(video[2]),
    fps: Number(fps[1]),
    seconds:
      Number(duration[1]) * 3600 +
      Number(duration[2]) * 60 +
      Number(duration[3]),
    audio: /Audio:/.test(info),
  };
};

/** Stream raw output of an ffmpeg command, `size` bytes at a time. */
const stream = (
  ffmpeg: string,
  args: string[],
  size: number,
  each: (chunk: Buffer) => void,
) =>
  new Promise<void>((resolve, reject) => {
    const p = spawn(ffmpeg, ["-v", "error", ...args, "pipe:1"]);
    let pending: Buffer[] = [];
    let have = 0;
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.stdout.on("data", (d: Buffer) => {
      pending.push(d);
      have += d.length;
      if (have < size) return;
      let all = Buffer.concat(pending);
      while (all.length >= size) {
        each(all.subarray(0, size));
        all = all.subarray(size);
      }
      pending = [all];
      have = all.length;
    });
    p.on("error", reject);
    p.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg failed: ${err}`)),
    );
  });

// A brightness step (of 255) that counts as change.
const CHANGE = 10;
const SHARP = 80;

const analysePicture = async (
  ffmpeg: string,
  file: string,
  info: { width: number; height: number; fps: number },
): Promise<Picture> => {
  // Half of 1080p keeps a one-pixel wobble visible at a quarter of the work.
  const width = Math.min(info.width, 960);
  const height = Math.round((info.height * width) / info.width / 2) * 2;
  const n = width * height;
  const block = 16;
  const cols = Math.ceil(width / block);
  const rows = Math.ceil(height / block);
  const span = Math.max(2, Math.round(info.fps / 4));
  const blockOf = new Int32Array(n);
  const perBlock = new Float32Array(cols * rows);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const b = Math.floor(y / block) * cols + Math.floor(x / block);
      blockOf[y * width + x] = b;
      perBlock[b] += 1;
    }
  const energy: number[] = [];
  const changed: number[] = [];
  const changedBlocks: Uint8Array[] = [];
  const sharpBlocks: Uint8Array[] = [];
  const detailBlocks: Uint8Array[] = [];
  const spanBlocks: Uint8Array[] = [];
  const history: Buffer[] = [];
  const counts = new Float32Array(cols * rows);
  const far = new Float32Array(cols * rows);
  const sharp = new Float32Array(cols * rows);
  const detail = new Float32Array(cols * rows);
  const toBytes = (x: Float32Array) => {
    const out = new Uint8Array(x.length);
    for (let b = 0; b < x.length; b += 1)
      out[b] = Math.round((255 * x[b]) / perBlock[b]);
    return out;
  };
  await stream(
    ffmpeg,
    [
      "-i",
      file,
      "-vf",
      `scale=${width}:${height}:flags=area,format=gray`,
      "-f",
      "rawvideo",
    ],
    n,
    (chunk) => {
      const cur = Buffer.from(chunk);
      const prev = history[history.length - 1];
      const old =
        history.length >= span ? history[history.length - span] : undefined;
      counts.fill(0);
      far.fill(0);
      sharp.fill(0);
      detail.fill(0);
      for (let i = 0; i < n - width - 1; i += 1) {
        const dx = cur[i + 1] - cur[i];
        const dy = cur[i + width] - cur[i];
        if (
          dx > SHARP / 2 ||
          dx < -SHARP / 2 ||
          dy > SHARP / 2 ||
          dy < -SHARP / 2
        )
          detail[blockOf[i]] += 1;
      }
      let sum = 0;
      let moved = 0;
      for (let i = 0; prev && i < n; i += 1) {
        const d = cur[i] - prev[i];
        const ad = d < 0 ? -d : d;
        sum += ad;
        if (ad > CHANGE) {
          moved += 1;
          counts[blockOf[i]] += 1;
          if (ad > SHARP) sharp[blockOf[i]] += 1;
        }
        if (old) {
          const o = cur[i] - old[i];
          if (o > CHANGE || o < -CHANGE) far[blockOf[i]] += 1;
        }
      }
      energy.push(prev ? sum / n / 255 : 0);
      changed.push(moved / n);
      changedBlocks.push(toBytes(counts));
      sharpBlocks.push(toBytes(sharp));
      detailBlocks.push(toBytes(detail));
      spanBlocks.push(
        old ? toBytes(far) : new Uint8Array(cols * rows).fill(255),
      );
      history.push(cur);
      if (history.length > span) history.shift();
    },
  );
  return {
    width,
    height,
    scale: info.width / width,
    block,
    cols,
    rows,
    span,
    energy: Float32Array.from(energy),
    changed: Float32Array.from(changed),
    changedBlocks,
    sharpBlocks,
    detailBlocks,
    spanBlocks,
  };
};

/** A second-order filter (RBJ biquad), run in place. */
const biquad = (x: Float32Array, rate: number, hz: number, high: boolean) => {
  const w = (2 * Math.PI * hz) / rate;
  const a = Math.sin(w) / (2 * Math.SQRT1_2);
  const c = Math.cos(w);
  const b0 = high ? (1 + c) / 2 : (1 - c) / 2;
  const b1 = high ? -(1 + c) : 1 - c;
  const a0 = 1 + a;
  const a1 = -2 * c;
  const a2 = 1 - a;
  const out = new Float32Array(x.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i += 1) {
    const y = (b0 * x[i] + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = x[i];
    y2 = y1;
    y1 = y;
    out[i] = y;
  }
  return out;
};

const analyseSound = async (
  ffmpeg: string,
  file: string,
  fps: number,
  frames: number,
): Promise<Sound> => {
  const rate = 24000;
  const chunks: Buffer[] = [];
  // Collect the whole track (a minute of mono at 24 kHz is under 6 MB).
  await new Promise<void>((resolve, reject) => {
    const p = spawn(ffmpeg, [
      "-v",
      "error",
      "-i",
      file,
      "-vn",
      "-ac",
      "1",
      "-ar",
      String(rate),
      "-f",
      "f32le",
      "pipe:1",
    ]);
    p.stdout.on("data", (d: Buffer) => chunks.push(d));
    p.on("error", reject);
    p.on("close", () => resolve());
  });
  const buf = Buffer.concat(chunks);
  const samples = new Float32Array(
    buf.buffer,
    buf.byteOffset,
    Math.floor(buf.length / 4),
  ).slice();
  const high = biquad(samples, rate, 4000, true);
  const low = biquad(samples, rate, 150, false);
  const per = rate / fps;
  const db = (x: Float32Array, f: number) => {
    let s = 0;
    const a = Math.floor(f * per);
    const b = Math.min(x.length, Math.floor((f + 1) * per));
    for (let i = a; i < b; i += 1) s += x[i] * x[i];
    return 10 * Math.log10(s / Math.max(1, b - a) + 1e-10);
  };
  const env = (x: Float32Array) =>
    Float32Array.from({ length: frames }, (_, f) => db(x, f));
  const sound = {
    rms: env(samples),
    high: env(high),
    low: env(low),
    onset: new Float32Array(frames),
  };
  // A rise over the loudest of the previous 50 ms, in each band: drums, risers and hits all show.
  const back = Math.max(1, Math.round(fps * 0.05));
  for (let f = 1; f < frames; f += 1) {
    let s = 0;
    for (const band of [sound.rms, sound.high, sound.low]) {
      let before = -100;
      for (let k = Math.max(0, f - back); k < f; k += 1)
        before = Math.max(before, band[k]);
      s += Math.max(0, band[f] - Math.max(before, -70));
    }
    sound.onset[f] = s;
  }
  return sound;
};

/** Measure a video file: its picture on every frame, and its sound in windows of one frame. */
export const analyse = async (
  file: string,
  options: { ffmpeg?: string } = {},
): Promise<Rendered> => {
  const ffmpeg = options.ffmpeg ?? findFfmpeg();
  const info = probe(ffmpeg, file);
  const picture = await analysePicture(ffmpeg, file, info);
  const frames = picture.energy.length;
  return {
    file,
    fps: info.fps,
    width: info.width,
    height: info.height,
    frames,
    picture,
    sound: info.audio
      ? await analyseSound(ffmpeg, file, info.fps, frames)
      : undefined,
  };
};
