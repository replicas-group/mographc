/**
 * Runs inside the rendered page. After each frame settles it logs one `MOGRAPHC`
 * line describing every visible element, so the film can be measured from the
 * composition's own DOM rather than guessed from pixels.
 */
import { useLayoutEffect, useRef } from "react";
import {
  continueRender,
  delayRender,
  useCurrentFrame,
  useVideoConfig,
} from "remotion-original";
import type { Box, RawElement } from "../types.ts";

const intersect = (a: Box, b: Box): Box => {
  const x = Math.max(a[0], b[0]);
  const y = Math.max(a[1], b[1]);
  return [
    x,
    y,
    Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - x),
    Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - y),
  ];
};

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * A cut-out's matte, measured once per image: the opaque pieces apart from the largest, and how many
 * of them end in a straight, hard edge inside the image (a piece chopped off by a bad cut).
 */
const mattes = new Map<string, [number, number] | null>();
const matte = (img: HTMLImageElement): [number, number] | null => {
  const key = img.currentSrc || img.src;
  if (mattes.has(key)) return mattes.get(key)!;
  let out: [number, number] | null = null;
  try {
    if (/\.svg(\?|$)|^data:image\/svg/i.test(key)) throw new Error("vector");
    const scale = 256 / Math.max(img.naturalWidth, img.naturalHeight, 1);
    const w = Math.max(1, Math.round(img.naturalWidth * Math.min(1, scale)));
    const h = Math.max(1, Math.round(img.naturalHeight * Math.min(1, scale)));
    const ctx = Object.assign(document.createElement("canvas"), {
      width: w,
      height: h,
    }).getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const solid = new Uint8Array(w * h);
    let opaque = 0;
    for (let i = 0; i < w * h; i += 1)
      if (data[i * 4 + 3] >= 128) {
        solid[i] = 1;
        opaque += 1;
      }
    // Only images with transparency are cut-outs.
    if (opaque > 0 && opaque < 0.97 * w * h) {
      const label = new Int32Array(w * h);
      const pieces: number[][] = [];
      for (let i = 0; i < w * h; i += 1) {
        if (!solid[i] || label[i]) continue;
        const piece = [i];
        label[i] = pieces.length + 1;
        for (let k = 0; k < piece.length; k += 1) {
          const j = piece[k];
          const x = j % w;
          for (const n of [
            x > 0 ? j - 1 : -1,
            x < w - 1 ? j + 1 : -1,
            j - w,
            j + w,
          ])
            if (n >= 0 && n < w * h && solid[n] && !label[n]) {
              label[n] = pieces.length + 1;
              piece.push(n);
            }
        }
        pieces.push(piece);
      }
      pieces.sort((a, b) => b.length - a.length);
      const fragments = pieces
        .slice(1)
        .filter((p) => p.length >= 0.002 * opaque);
      // A straight cut: a run of edge pixels along one row or column, away from the image's border.
      const run = Math.max(8, Math.round(0.06 * Math.max(w, h)));
      const chopped = fragments.filter((p) => {
        const lines = new Map<string, number[]>();
        const add = (k: string, v: number) => {
          const l = lines.get(k);
          if (l) l.push(v);
          else lines.set(k, [v]);
        };
        for (const j of p) {
          const x = j % w;
          const y = (j - x) / w;
          if (x > 1 && !solid[j - 1]) add(`l${x}`, y);
          if (x < w - 2 && !solid[j + 1]) add(`r${x}`, y);
          if (y > 1 && !solid[j - w]) add(`t${y}`, x);
          if (y < h - 2 && !solid[j + w]) add(`b${y}`, x);
        }
        for (const at of lines.values()) {
          at.sort((a, b) => a - b);
          let n = 1;
          for (let k = 1; k < at.length; k += 1) {
            n = at[k] === at[k - 1] + 1 ? n + 1 : 1;
            if (n >= run) return true;
          }
        }
        return false;
      }).length;
      out = [fragments.length, chopped];
    }
  } catch {
    out = null;
  }
  mattes.set(key, out);
  return out;
};

/** Tag and class, so a sibling mounting doesn't rename the elements after it. */
const signature = (el: Element) => {
  let hash = 0;
  for (const c of el.getAttribute("class") ?? "") {
    hash = (hash * 31 + c.charCodeAt(0)) | 0;
  }
  return `${el.tagName.toLowerCase()}${(hash >>> 0).toString(36)}`;
};

type Linear = [number, number, number, number];
const multiply = (p: Linear, q: Linear): Linear => [
  p[0] * q[0] + p[2] * q[1],
  p[1] * q[0] + p[3] * q[1],
  p[0] * q[2] + p[2] * q[3],
  p[1] * q[2] + p[3] * q[3],
];

/** The element's own linear transform: `transform`, then the individual `rotate` and `scale`. */
const ownLinear = (style: CSSStyleDeclaration): Linear => {
  let m: Linear = [1, 0, 0, 1];
  const t = style.transform.match(/^matrix\(([^)]+)\)/);
  if (t) {
    const [a, b, c, d] = t[1].split(",").map(Number);
    m = [a, b, c, d];
  }
  const rotate = style.rotate.match(/^(-?[\d.]+)deg$/);
  if (rotate) {
    const r = (Number(rotate[1]) * Math.PI) / 180;
    m = multiply(m, [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r)]);
  }
  if (style.scale && style.scale !== "none") {
    const [sx, sy = sx] = style.scale.split(" ").map(Number);
    m = multiply(m, [sx, 0, 0, sy]);
  }
  return m;
};

/** Long axis over short axis of the linear transform: 1 when undistorted. */
const stretchOf = ([a, b, c, d]: Linear) => {
  const s = a * a + b * b + c * c + d * d;
  const det = Math.abs(a * d - b * c);
  const disc = Math.sqrt(Math.max(s * s - 4 * det * det, 0));
  const s1 = Math.sqrt((s + disc) / 2);
  const s2 = Math.sqrt(Math.max((s - disc) / 2, 1e-9));
  return Math.sqrt(s1 / s2);
};

const fontStatus = () => {
  const loaded = new Map<string, boolean>();
  document.fonts.forEach((face) => {
    const family = face.family.replace(/["']/g, "");
    loaded.set(
      family,
      (loaded.get(family) ?? false) || face.status === "loaded",
    );
  });
  return loaded;
};

const dump = (root: HTMLElement, frame: number, w: number, h: number) => {
  const fonts = fontStatus();
  // Measure against the composition's canvas, not the browser window: the renderer may
  // park or scale the page.
  const rect = root.getBoundingClientRect();
  const sx = rect.width / w || 1;
  const sy = rect.height / h || 1;
  // While parked the canvas may report no size; its size is the composition's.
  const canvas = {
    left: rect.left,
    top: rect.top,
    width: w * sx,
    height: h * sy,
  };
  const local = (b: Box): Box => [
    (b[0] - canvas.left) / sx,
    (b[1] - canvas.top) / sy,
    b[2] / sx,
    b[3] / sy,
  ];
  const opacity = new Map<Element, number>([[root, 1]]);
  // Clipped by its containers only; the canvas edge is applied when the film is read, so an
  // element half off screen keeps its true position.
  const unbounded: Box = [-1e6, -1e6, 2e6, 2e6];
  const clip = new Map<Element, Box>([[root, unbounded]]);
  const linear = new Map<Element, Linear>([[root, [1, 0, 0, 1]]]);
  const path = new Map<Element, string>([[root, "r"]]);
  const rows: RawElement[] = [];
  for (const el of Array.from(root.querySelectorAll("*"))) {
    const parent = el.parentElement ?? root;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const sig = signature(el);
    let n = 0;
    for (const o of Array.from(parent.children)) {
      if (o === el) break;
      if (signature(o) === sig) n += 1;
    }
    path.set(el, `${path.get(parent) ?? "?"}/${sig}#${n}`);
    const op =
      (opacity.get(parent) ?? 1) *
      Number(style.opacity) *
      (style.visibility === "hidden" || style.display === "none" ? 0 : 1);
    opacity.set(el, op);
    linear.set(
      el,
      multiply(linear.get(parent) ?? [1, 0, 0, 1], ownLinear(style)),
    );
    let box = clip.get(parent) ?? unbounded;
    const html = el as HTMLElement;
    const scale = html.offsetWidth ? rect.width / html.offsetWidth : 1;
    if (style.overflow !== "visible" && el.tagName !== "svg") {
      box = intersect(box, [rect.left, rect.top, rect.width, rect.height]);
    }
    const inset = style.clipPath.match(
      /^inset\(([-\d.]+)px(?: ([-\d.]+)px)?(?: ([-\d.]+)px)?(?: ([-\d.]+)px)?/,
    );
    if (inset && html.offsetWidth) {
      const [t, r = t, b = t, l = r] = inset
        .slice(1)
        .map((v) => (v === undefined ? undefined : Number(v))) as number[];
      box = intersect(box, [
        rect.left + l * scale,
        rect.top + t * scale,
        rect.width - (l + r) * scale,
        rect.height - (t + b) * scale,
      ]);
    }
    clip.set(el, box);
    const tag = el.getAttribute("data-motion");
    if (op < 0.01 || (rect.width * rect.height < 4 && !tag)) continue;
    if (el.closest("svg") && el.tagName !== "svg") continue;
    const text = Array.from(el.childNodes)
      .filter((node) => node.nodeType === 3)
      .map((node) => node.textContent ?? "")
      .join("")
      .trim();
    const shadows = [
      style.boxShadow,
      style.textShadow,
      ...(style.filter.match(/drop-shadow\([^)]*\)[^)]*\)?/g) ?? []),
    ].filter((x) => x && x !== "none");
    const shadow = shadows.length > 0;
    const paints =
      !/rgba\(0, 0, 0, 0\)|transparent/.test(style.backgroundColor) ||
      style.borderTopWidth !== "0px" ||
      shadow ||
      el.tagName === "svg" ||
      el.tagName === "IMG";
    if (!text && !paints && !tag) continue;
    // Text is measured by its glyphs: a flex row's box spans the full width even when its words don't.
    let measured: Box = [rect.left, rect.top, rect.width, rect.height];
    const node = Array.from(el.childNodes).find((c) => c.nodeType === 3);
    if (text && node) {
      const range = document.createRange();
      range.selectNodeContents(node);
      const g = range.getBoundingClientRect();
      if (g.width * g.height > 0) measured = [g.left, g.top, g.width, g.height];
    }
    const visible = intersect(box, measured);
    if (visible[2] * visible[3] < 1 && !tag) continue;
    const family = style.fontFamily.split(",")[0].replace(/["']/g, "").trim();
    const row: RawElement = {
      k: path.get(el)!,
      t: text ? "t" : el.tagName === "svg" || el.tagName === "IMG" ? "g" : "b",
      b: local(measured).map(r1) as Box,
      v: local(visible).map(r1) as Box,
      o: Math.round(op * 1000) / 1000,
    };
    if (text) {
      row.x = text.slice(0, 80);
      row.fs = r1((parseFloat(style.fontSize) * scale) / sy);
      row.c = style.color;
      row.fw = Number(style.fontWeight) || 400;
      row.ff = family;
      if (fonts.has(family) && !fonts.get(family)) row.fb = family;
    }
    if (paints && !text) row.bg = style.backgroundColor;
    if (el.tagName === "svg") {
      row.fill = el.querySelector("path")?.getAttribute("fill") ?? "";
      // The colour it actually paints, with currentColor resolved.
      const path = el.querySelector("path");
      if (path) {
        const ps = getComputedStyle(path);
        row.pf = ps.fill;
        // An outline drawn on the path separates it from what's behind it.
        if (ps.stroke !== "none" && parseFloat(ps.strokeWidth) > 0)
          row.ps = ps.stroke;
      }
      row.d = el.querySelector("path")?.getAttribute("d")?.slice(0, 120) ?? "";
    }
    const img = el as HTMLImageElement;
    if (el.tagName === "IMG" && img.complete && !img.naturalWidth) row.br = 1;
    else if (el.tagName === "IMG" && img.complete) {
      const m = matte(img);
      if (m && m[0]) row.mt = m;
    }
    if (shadow) row.sh = shadows.join(" | ").slice(0, 200);
    const stretch = stretchOf(linear.get(el)!);
    if (stretch > 1.001) row.st = Math.round(stretch * 1000) / 1000;
    if (tag) {
      row.id = tag;
      // A pointer's hotspot: a marker inside it that moves with all its transforms.
      const tip = el
        .querySelector("[data-motion-tip]")
        ?.getBoundingClientRect();
      if (tip)
        row.tp = [
          r1((tip.left + tip.width / 2 - canvas.left) / sx),
          r1((tip.top + tip.height / 2 - canvas.top) / sy),
        ];
    }
    if (el.hasAttribute("data-motion-reveal")) row.rv = 1;
    const ignore = el.getAttribute("data-motion-ignore");
    if (ignore) row.ig = ignore;
    rows.push(row);
  }
  console.debug(`MOGRAPHC ${JSON.stringify({ f: frame, c: [w, h], e: rows })}`);
};

export const Probe: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const handle = delayRender("mographc probe");
    const root = ref.current;
    // Fonts and images settle first, so a frame is measured as it renders.
    const images = Array.from(root.querySelectorAll("img")).map((img) =>
      img.complete ? null : img.decode().catch(() => null),
    );
    Promise.all([document.fonts.ready, ...images]).then(() =>
      requestAnimationFrame(() => {
        dump(root, frame, width, height);
        continueRender(handle);
      }),
    );
  }, [frame, width, height]);
  return (
    // Sized to the composition, not its container: some renderer tabs give the container no size.
    <div
      ref={ref}
      style={{ height, left: 0, position: "absolute", top: 0, width }}
    >
      {children}
    </div>
  );
};
