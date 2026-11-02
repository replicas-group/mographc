import {
  area,
  isAncestor,
  type Element,
  type Film,
  type Sample,
} from "../film.ts";
import type { Box } from "../types.ts";

/** Group sorted frames into runs, allowing gaps of up to `gap` frames. */
export const runs = (frames: number[], gap = 2): [number, number][] => {
  const out: [number, number][] = [];
  for (const f of [...frames].sort((a, b) => a - b)) {
    const last = out[out.length - 1];
    if (last && f - last[1] <= gap) last[1] = f;
    else out.push([f, f]);
  }
  return out;
};

/** Canvas px scaled from a 1080p reference, so thresholds hold at any resolution. */
export const px = (film: Film, at1080: number) => (at1080 * film.height) / 1080;
/** Frames in `seconds` at the film's frame rate. */
export const frames = (film: Film, seconds: number) =>
  Math.max(1, Math.round(seconds * film.fps));
/** px per frame for a speed in px/s. */
export const perFrame = (film: Film, pxPerSecond: number) =>
  pxPerSecond / film.fps;

export const t = (film: Film, frame: number) =>
  `${(frame / film.fps).toFixed(2)} s`;

/** Painted surfaces visible in a frame, between `min` and `max` of the frame's area. */
export const surfacesAt = (film: Film, frame: number, min = 0.02, max = 0.9) =>
  film.elements
    .filter((e) => e.role === "surface")
    .map((e) => e.at(frame))
    .filter(
      (s): s is Sample =>
        !!s &&
        s.opacity > 0.3 &&
        area(s.visible) > min * film.area &&
        area(s.visible) < max * film.area,
    );

/** The element is moving at this frame (faster than rest). */
export const movingAt = (el: Element, frame: number) =>
  el.step(frame) >= perFrame(el.film, 45);

/** Is any ancestor of the row moving at this frame? Then the row's motion is its ancestor's. */
export const carried = (film: Film, frame: number, key: string) => {
  const parts = key.split("/");
  for (let i = parts.length - 1; i > 1; i -= 1) {
    const owner = film.elementOf(frame, parts.slice(0, i).join("/"));
    if (owner && movingAt(owner, frame)) return true;
  }
  return false;
};

export const contains = (outer: Box, inner: Box) =>
  inner[0] >= outer[0] &&
  inner[1] >= outer[1] &&
  inner[0] + inner[2] <= outer[0] + outer[2] &&
  inner[1] + inner[3] <= outer[1] + outer[3];

export { area, isAncestor };

/** The ease-out a move should have, by its length in seconds (linear is 0.20). */
export const needOut = (seconds: number) =>
  seconds >= 0.8 ? 0.4 : seconds >= 0.4 ? 0.33 : 0.26;

/** An rgb()/rgba()/#hex colour as [r, g, b, alpha], or null. */
export const parseColour = (
  c?: string,
): [number, number, number, number] | null => {
  if (!c) return null;
  const hex = c.match(/^#([0-9a-f]{6})$/i);
  if (hex)
    return [0, 2, 4]
      .map((i) => parseInt(hex[1].slice(i, i + 2), 16))
      .concat(1) as [number, number, number, number];
  const rgb = c.match(
    /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/,
  );
  return rgb
    ? [
        Number(rgb[1]),
        Number(rgb[2]),
        Number(rgb[3]),
        rgb[4] === undefined ? 1 : Number(rgb[4]),
      ]
    : null;
};

/** WCAG contrast ratio between two colours (1 = identical, 21 = black on white). */
export const contrast = (
  a: [number, number, number, number],
  b: [number, number, number, number],
) => {
  const lum = ([r, g, bl]: number[]) => {
    const ch = [r, g, bl].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
