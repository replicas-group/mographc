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
    // Spaces around the words aren't glyphs: leaving them out keeps the gap between words set in
    // separate spans ("<span>error </span><span>continuity</span>"), so they read as two words.
    let measured: Box = [rect.left, rect.top, rect.width, rect.height];
    const node = Array.from(el.childNodes).find(
      (c) => c.nodeType === 3 && c.textContent?.trim(),
    );
    if (text && node) {
      const content = node.textContent ?? "";
      const range = document.createRange();
      range.setStart(node, content.length - content.trimStart().length);
      range.setEnd(node, content.trimEnd().length);
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
