/**
 * Staging, pace and animation: whether the viewer can read what's shown, in time,
 * and whether everything that changes is animated with intent.
 */
import {
  area,
  intersect,
  intersectArea,
  isAncestor,
  type Element,
} from "../film.ts";
import { defineRule } from "../rule.ts";
import type { Box } from "../types.ts";
import { frames as framesIn, px, runs, surfacesAt } from "./util.ts";

export const titleOffCentre = defineRule({
  id: "staging/title-off-centre",
  kind: "lint",
  severity: "error",
  options: { tolerance: 16, vertical: 64 },
  docs: {
    summary:
      "A card with only type on it (an opening word, a title, an end lockup) is centred on the canvas.",
    why: "With nothing else in the frame, viewers judge the type's position against the frame's edges, so being a few dozen pixels off looks like a mistake.",
    fix: "Centre the group's measured glyphs, not its box: an icon, a gap or letter spacing shifts the visual centre. The finding gives the offset to correct.",
  },
  check({ film, options, report }) {
    const tol = px(film, options.tolerance);
    const bad: [number, number, number][] = [];
    for (const f of film.frames) {
      // Any product surface in frame, even a thin row about to grow, means it isn't a title card.
      if (
        surfacesAt(film, f, 0.002).length ||
        film.find({ role: "button" }).some((b) => (b.at(f)?.opacity ?? 0) > 0.3)
      )
        continue;
      const items = film.elements
        .filter(
          (e) =>
            !["cursor", "part", "label", "surface", "button"].includes(e.role),
        )
        .map((e) => e.at(f))
        .filter(
          (s) =>
            s &&
            s.opacity > 0.3 &&
            area(s.visible) > 0 &&
            area(s.visible) < 0.5 * film.area,
        ) as { visible: Box }[];
      if (items.length < 2) continue;
      const x0 = Math.min(...items.map((s) => s.visible[0]));
      const x1 = Math.max(...items.map((s) => s.visible[0] + s.visible[2]));
      const y0 = Math.min(...items.map((s) => s.visible[1]));
      const y1 = Math.max(...items.map((s) => s.visible[1] + s.visible[3]));
      const dx = (x0 + x1) / 2 - film.width / 2;
      const dy = (y0 + y1) / 2 - film.height / 2;
      // Vertically, a lockup sits on the optical centre with its tagline below; horizontally there's no excuse.
      if (
        (Math.abs(dx) > tol || Math.abs(dy) > px(film, options.vertical)) &&
        x1 - x0 < 0.8 * film.width
      )
        bad.push([f, dx, dy]);
    }
    for (const [a, b] of runs(
      bad.map((x) => x[0]),
      1,
    )) {
      if (b - a + 1 < framesIn(film, 0.33)) continue;
      const mid = bad.filter((x) => x[0] >= a && x[0] <= b);
      const med = (i: 1 | 2) =>
        mid.map((x) => x[i]).sort((p, q) => p - q)[Math.floor(mid.length / 2)];
      report({
        frames: [a, b],
        measured: `the type is off-centre by (${med(1) > 0 ? "+" : ""}${med(1).toFixed(0)}, ${med(2) > 0 ? "+" : ""}${med(2).toFixed(0)}) px`,
        need: `within ${options.tolerance} px of the centre horizontally, ${options.vertical} px vertically`,
      });
    }
  },
});

export const noPadding = defineRule({
  id: "staging/no-padding",
  kind: "lint",
  severity: "error",
  options: { inset: 14 },
  docs: {
    summary:
      "Text sits inside its window with padding, never crammed against or cut by the edge.",
    why: "A window whose content touches its edges looks broken, even if the product does that at its own scale. The rule only checks frames where the window is held still, because a page scrolling past an edge is motion rather than framing.",
    fix: "Add padding between the window's edge and its content, or frame the window so the content sits inside it (pan, or zoom slightly less).",
  },
  check({ film, options, report }) {
    const inset = px(film, options.inset);
    for (const el of film.elements.filter((e) => e.role === "surface")) {
      const hits: [number, number, number][] = [];
      for (const f of el.frames) {
        const s = el.at(f)!;
        const prev = el.at(f - 1);
        const v = s.visible;
        if (
          s.opacity < 0.9 ||
          area(v) < 0.12 * film.area ||
          area(v) > 0.9 * film.area
        )
          continue;
        if (
          !prev ||
          prev.visible.some((x, i) => Math.abs(x - v[i]) > 1) ||
          prev.box.some((x, i) => Math.abs(x - s.box[i]) > 1)
        )
          continue;
        let gap = Infinity;
        let cut = 0;
        for (const r of film.rows(f)) {
          if (
            r.t !== "t" ||
            r.o < 0.5 ||
            (r.fs ?? 0) >= px(film, 40) ||
            !isAncestor(s.raw.k, r.k)
          )
            continue;
          if (area(r.v) <= 0) continue;
          const before = film.rows(f - 1).find((p) => p.k === r.k);
          if (!before || before.b.some((x, i) => Math.abs(x - r.b[i]) > 1))
            continue;
          if (area(r.v) < 0.9 * area(r.b)) cut += 1;
          gap = Math.min(
            gap,
            r.v[0] - v[0],
            r.v[1] - v[1],
            v[0] + v[2] - r.v[0] - r.v[2],
            v[1] + v[3] - r.v[1] - r.v[3],
          );
        }
        if (gap < inset || cut >= 2) hits.push([f, gap, cut]);
      }
      for (const [a, b] of runs(
        hits.map((h) => h[0]),
        2,
      )) {
        if (b - a + 1 < framesIn(film, 0.5)) continue;
        const mid = hits.filter((h) => h[0] >= a && h[0] <= b);
        const gap = mid.map((h) => h[1]).sort((p, q) => p - q)[
          Math.floor(mid.length / 2)
        ];
        const cut = Math.max(...mid.map((h) => h[2]));
        report({
          element: el,
          frames: [a, b],
          measured: `text ${Math.max(0, gap).toFixed(0)} px from the window's edge${cut ? `, ${cut} lines cut by it` : ""}`,
          need: `>= ${options.inset} px inset, nothing cut`,
        });
      }
    }
  },
});

export const textTooSmall = defineRule({
  id: "staging/text-too-small",
  kind: "lint",
  severity: "error",
  options: { minSize: 14, briefSeconds: 1.5 },
  docs: {
    summary:
      "A product surface held on screen can be read on a phone, which means its body text is at least about 14 px at 1080p.",
    why: "Product videos are often watched on phones. A whole page shrunk to fit the frame shows that the page exists, but its text can't be read. One brief full view to show scale is fine.",
    fix: "Zoom in to the part that matters and move through it in place (pan or scroll toward a destination) instead of shrinking the whole surface to fit.",
  },
  check({ film, options, report }) {
    const small: [number, number][] = [];
    for (const f of film.frames) {
      const surfaces = surfacesAt(film, f, 0.25, 0.95).filter(
        (s) => s.opacity > 0.9,
      );
      if (!surfaces.length) continue;
      const sizes = film
        .rows(f)
        .filter(
          (r) =>
            r.t === "t" &&
            (r.fs ?? 0) > 0 &&
            (r.fs ?? 0) < px(film, 40) &&
            r.o > 0.5 &&
            surfaces.some((s) => isAncestor(s.raw.k, r.k)),
        )
        .map((r) => r.fs!)
        .sort((a, b) => a - b);
      if (
        sizes.length >= 12 &&
        sizes[Math.floor(sizes.length / 2)] < px(film, options.minSize)
      )
        small.push([f, sizes[Math.floor(sizes.length / 2)]]);
    }
    let first = true;
    for (const [a, b] of runs(
      small.map((s) => s[0]),
      2,
    )) {
      const seconds = (b - a + 1) / film.fps;
      if (seconds < 1) continue;
      const brief = first && seconds <= options.briefSeconds;
      first = false;
      const med = small
        .filter((s) => s[0] >= a && s[0] <= b)
        .map((s) => s[1])
        .sort((p, q) => p - q);
      report({
        frames: [a, b],
        measured: `a product surface is held ${seconds.toFixed(1)} s with its text at a median ${med[Math.floor(med.length / 2)].toFixed(0)} px${brief ? " (allowed once, briefly, to show scale)" : ""}`,
        need: `>= ${options.minSize} px at 1080p`,
        severity: brief ? "warn" : "error",
      });
    }
  },
});

/** Headline letters on screen in a frame: large type that isn't part of a product surface. */
const headlineLetters = (film: Element["film"], f: number) =>
  film.find({ role: "headline" }).filter((e) => {
    const s = e.at(f);
    return s && s.opacity > 0.05 && s.raw.x;
  });

export const textOverProduct = defineRule({
  id: "staging/text-over-product",
  kind: "lint",
  severity: "error",
  options: { seconds: 0.2 },
  docs: {
    summary:
      "Headline type never overlaps the product: no letter sits partly over a window or card.",
    why: "Type that cuts across the interface looks like a layout mistake, and makes both the words and the product harder to read.",
    fix: "Give the headline its own region of the frame, or clear the product before the type arrives (or the type before the product). A box drawn by the headline's own component is fine.",
  },
  check({ film, options, report }) {
    const hits = new Map<
      string,
      { el: Element; other: Element; frames: number[] }
    >();
    for (const f of film.frames) {
      const surfaces = film.elements.filter((e) => {
        const s = e.at(f);
        return (
          e.role === "surface" &&
          s &&
          s.opacity > 0.25 &&
          area(s.visible) > 0.02 * film.area &&
          area(s.visible) < 0.9 * film.area
        );
      });
      for (const h of headlineLetters(film, f)) {
        const hs = h.at(f)!;
        for (const sEl of surfaces) {
          const ss = sEl.at(f)!;
          // A backdrop drawn by the type's own component (a highlight behind its words) is part of the type.
          const root = ss.raw.k.split("/").slice(0, -2).join("/");
          const container = film.rows(f).find((r) => r.k === root);
          const own =
            isAncestor(root, hs.raw.k) &&
            (!container
              ? root.split("/").length > 2
              : area(container.v) < 0.5 * film.area);
          if (isAncestor(ss.raw.k, hs.raw.k) || own) continue;
          const ov = intersectArea(hs.box, ss.visible);
          if (ov > 0.05 * area(hs.box) && ov < 0.85 * area(hs.box)) {
            const key = `${h.id}|${sEl.id}`;
            const hit = hits.get(key) ?? { el: h, other: sEl, frames: [] };
            hit.frames.push(f);
            hits.set(key, hit);
          }
        }
      }
    }
    for (const { el, other, frames } of hits.values())
      for (const [a, b] of runs(frames, 2)) {
        if ((b - a + 1) / film.fps < options.seconds) continue;
        report({
          element: el,
          frames: [a, b],
          measured: `"${(el.at(a)!.raw.x ?? "").slice(0, 24)}" overlaps ${other.label} for ${b - a + 1} frames`,
          need: "type and product never overlapping",
        });
      }
  },
});

export const doubleExposure = defineRule({
  id: "staging/double-exposure",
  kind: "lint",
  severity: "warn",
  options: {},
  docs: {
    summary:
      "In a handoff, the outgoing surface is mostly gone before the incoming one is solid.",
    why: "When two large surfaces are both clearly visible while one fades over the other, the viewer has two subjects at once and takes in neither.",
    fix: "Fade or move the outgoing surface out faster, or start the incoming one later; or transform one surface into the next instead of crossfading.",
  },
  check({ film, report }) {
    const hits: number[] = [];
    for (const f of film.frames) {
      const big = film.elements.filter((e) => {
        const s = e.at(f);
        return (
          e.role === "surface" &&
          s &&
          s.opacity > 0.35 &&
          area(s.visible) > 0.06 * film.area &&
          area(s.visible) < 0.95 * film.area
        );
      });
      const found = big.some((a, i) =>
        big.slice(i + 1).some((b) => {
          const sa = a.at(f)!;
          const sb = b.at(f)!;
          if (isAncestor(sa.raw.k, sb.raw.k) || isAncestor(sb.raw.k, sa.raw.k))
            return false;
          if (
            intersectArea(sa.visible, sb.visible) <
            0.3 * Math.min(area(sa.visible), area(sb.visible))
          )
            return false;
          const fading = [a, b].some((e) => {
            const p = e.at(f - 1);
            return p && Math.abs(p.opacity - e.at(f)!.opacity) > 0.02;
          });
          return fading && Math.min(sa.opacity, sb.opacity) < 0.98;
        }),
      );
      if (found) hits.push(f);
    }
    for (const [a, b] of runs(hits))
      if (b - a >= 2)
        report({
          frames: [a, b],
          measured: `two overlapping surfaces both above 35% opacity while one fades, for ${b - a + 1} frames`,
          need: "one solid subject at a time",
        });
  },
});

export const topBanner = defineRule({
  id: "staging/top-banner",
  kind: "lint",
  severity: "warn",
  options: {},
  docs: {
    summary:
      "Headlines are part of the composition, not a subtitle strip across the top.",
    why: "A one-line banner across the top, with the product filling the frame below, looks like a caption added afterwards rather than part of the shot.",
    fix: "Give the headline its own region beside or around the subject, sized to read at a glance.",
  },
  check({ film, report }) {
    for (const h of film.headlines())
      if (h.box[1] < 0.19 * film.height && h.box[2] > 0.47 * film.width)
        report({
          frames: [h.from, h.to],
          measured: `"${h.text.slice(0, 30)}" runs across the top`,
          need: "headline in its own region of the frame",
        });
  },
});

export const textHold = defineRule({
  id: "pace/text-hold",
  kind: "lint",
  severity: "warn",
  options: { wordsPerSecond: 3.5, minimum: 0.5 },
  docs: {
    summary:
      "A headline stays fully readable long enough to read: about 3.5 words a second, at least half a second.",
    why: "The time a line spends animating in doesn't count as reading time. A line that leaves as soon as it has fully appeared is noticed but not read.",
    fix: "Hold the line longer once it's fully shown, or cut words.",
  },
  check({ film, options, report }) {
    for (const h of film.headlines()) {
      if (!h.full) continue;
      const held = (h.full[1] - h.full[0]) / film.fps;
      const words = Math.max(1, h.text.split(/\s+/).length);
      const need = Math.max(options.minimum, words / options.wordsPerSecond);
      if (held < need)
        report({
          frames: h.full,
          measured: `"${h.text.slice(0, 30)}" is fully readable for ${held.toFixed(2)} s`,
          need: `${need.toFixed(2)} s for ${words} words`,
        });
    }
  },
});

export const neverFinishes = defineRule({
  id: "pace/text-never-finishes",
  kind: "lint",
  severity: "error",
  options: {},
  docs: {
    summary: "Every headline fully appears before it leaves.",
    why: "A line that starts leaving before its last word lands is never read whole.",
    fix: "Start the exit after the last word has landed and been held.",
  },
  check({ film, report }) {
    for (const h of film.headlines())
      if (!h.full)
        report({
          frames: [h.from, h.to],
          measured: `"${h.text.slice(0, 30)}" is never fully on screen`,
          need: "fully shown before it leaves",
        });
  },
});

export const fadeOnly = defineRule({
  id: "animate/fade-only",
  kind: "lint",
  severity: "warn",
  options: {},
  docs: {
    summary:
      "A surface that arrives or leaves also moves, scales or builds, rather than only fading.",
    why: "A large surface that only fades in or out while standing still looks unfinished next to the elements that move.",
    fix: "Give the entrance or exit a small move or scale on the same curve as the fade, or build its contents in.",
  },
  check({ film, report }) {
    const found: {
      el: Element;
      kind: string;
      from: number;
      to: number;
      key: string;
    }[] = [];
    for (const el of film.elements.filter((e) => e.role === "surface")) {
      for (const [kind, from, to] of opacitySpans(el)) {
        const a = el.at(from)!;
        const b = el.at(to)!;
        const moved = Math.hypot(a.box[0] - b.box[0], a.box[1] - b.box[1]);
        const scaled = Math.abs(b.box[2] / Math.max(a.box[2], 1) - 1);
        const s = kind === "appear" ? b : a;
        if (
          moved < 6 &&
          scaled < 0.04 &&
          area(s.visible) > 0.03 * film.area &&
          el.frames.length > 2
        )
          found.push({ el, kind, from, to, key: s.raw.k });
      }
    }
    // A surface fading with its contents is one fade.
    for (const x of found)
      if (
        !found.some(
          (o) =>
            o !== x &&
            isAncestor(o.key, x.key) &&
            o.from <= x.to &&
            o.to >= x.from,
        )
      )
        report({
          element: x.el,
          frames: [x.from, x.to],
          measured: `${x.kind === "appear" ? "appears" : "leaves"} by opacity alone over ${x.to - x.from} frames`,
          need: "a move, scale or build with the fade",
        });
  },
});

const opacitySpans = (el: Element): ["appear" | "leave", number, number][] => {
  const fs = el.frames;
  const out: ["appear" | "leave", number, number][] = [];
  let i = 0;
  while (i < fs.length - 1) {
    let j = i;
    const op = (k: number) => el.at(fs[k])!.opacity;
    if (op(i + 1) > op(i) + 0.01) {
      while (
        j + 1 < fs.length &&
        op(j + 1) >= op(j) - 0.005 &&
        fs[j + 1] === fs[j] + 1
      )
        j += 1;
      if (op(i) <= 0.15 && op(j) >= 0.85) out.push(["appear", fs[i], fs[j]]);
    } else if (op(i + 1) < op(i) - 0.01) {
      while (
        j + 1 < fs.length &&
        op(j + 1) <= op(j) + 0.005 &&
        fs[j + 1] === fs[j] + 1
      )
        j += 1;
      if (op(i) >= 0.85 && op(j) <= 0.15) out.push(["leave", fs[i], fs[j]]);
    }
    i = Math.max(j, i + 1);
  }
  return out;
};

export const popIn = defineRule({
  id: "animate/pop-in",
  kind: "lint",
  severity: "warn",
  options: {},
  docs: {
    summary:
      "Content doesn't appear in a single frame on a container that's standing still.",
    why: "Something that appears at full opacity in one frame looks like a cut rather than the product responding.",
    fix: "Fade, scale or slide it in over a few frames, or build it with its container.",
  },
  check({ film, report }) {
    for (const el of film.elements) {
      if (el.role === "cursor" || el.first === film.frames[0]) continue;
      const s = el.at(el.first)!;
      if (s.opacity < 0.8 || area(s.visible) < px(film, 70) * px(film, 70))
        continue;
      const parent = s.raw.k.split("/").slice(0, -1).join("/");
      const owner = film.elementOf(el.first, parent);
      const before = film.rows(el.first - 1).some((r) => r.k === parent);
      if (owner && before && owner.step(el.first) < 0.5)
        report({
          element: el,
          frames: [el.first, el.first],
          measured: "appears at full opacity in one frame",
          need: "an entrance over a few frames",
        });
    }
  },
});

export const popOut = defineRule({
  id: "animate/pop-out",
  kind: "lint",
  severity: "error",
  options: { size: 70, settle: 0.1 },
  docs: {
    summary:
      "Content doesn't vanish in a single frame from a container that's standing still.",
    why: "Something that disappears at full opacity while nothing moves looks like a glitch, because the viewer may have been looking at it and it's suddenly gone.",
    fix: "Fade, scale or slide it out over a few frames, or let it leave with its container (the window moving off, a cut to the next shot).",
  },
  check({ film, options, report }) {
    const end = film.frames[film.frames.length - 1];
    const settle = Math.max(2, framesIn(film, options.settle));
    // A cut: most of what's on screen ends in the same frame.
    const cut = new Map<number, boolean>();
    const isCut = (f: number) => {
      if (!cut.has(f)) {
        const shown = film.elements.filter(
          (e) => (e.at(f)?.opacity ?? 0) > 0.3,
        );
        cut.set(
          f,
          shown.filter((e) => !e.at(f + 1)).length > 0.5 * shown.length,
        );
      }
      return cut.get(f)!;
    };
    for (const el of film.elements) {
      if (el.role === "cursor" || el.role === "part" || el.last >= end)
        continue;
      const s = el.at(el.last)!;
      if (
        s.opacity < 0.8 ||
        area(s.visible) < px(film, options.size) * px(film, options.size)
      )
        continue;
      // Still, at the end: no fade, move or scale in its last frames.
      const before = el.at(el.last - settle);
      if (
        !before ||
        before.opacity - s.opacity > 0.1 ||
        Math.max(...s.box.map((v, i) => Math.abs(v - before.box[i]))) >
          px(film, 4)
      )
        continue;
      // Handed off: something identical takes its place in the next frame, so nothing visibly changes.
      const twin = film
        .rows(el.last + 1)
        .some(
          (r) =>
            r.t === s.raw.t &&
            r.x === s.raw.x &&
            r.o > 0.8 &&
            r.v.every((v, i) => Math.abs(v - s.visible[i]) <= px(film, 4)),
        );
      // Replaced: new content arrives where it was, or a line or two from it (placeholder lines
      // becoming a paragraph, a value swapping).
      const [x, y, w, h] = s.visible;
      const near: Box = [x, y - 2 * h, w, 5 * h];
      const replaced = film.elements.some(
        (e) =>
          e.first > el.last &&
          e.first <= el.last + settle &&
          area(intersect(e.at(e.first)!.visible, near)) > 0,
      );
      if (twin || replaced || isCut(el.last)) continue;
      // Its nearest container: if that goes too, it left with it. Otherwise the container must
      // stay, standing still.
      const parts = s.raw.k.split("/");
      let owner: Element | undefined;
      for (let i = parts.length - 1; i > 1 && !owner; i -= 1) {
        const o = film.elementOf(el.last, parts.slice(0, i).join("/"));
        if (o && o !== el) owner = o;
      }
      const next = owner?.at(el.last + 1);
      if (
        !owner ||
        !next ||
        next.opacity < 0.3 ||
        owner.step(el.last + 1) >= 0.5
      )
        continue;
      report({
        element: el,
        frames: [el.last, el.last],
        measured: `disappears at full opacity in one frame while ${owner.label} stays`,
        need: "an exit over a few frames, or leaving with its container",
      });
    }
  },
});

export const stagingRules = [
  titleOffCentre,
  noPadding,
  textTooSmall,
  textOverProduct,
  doubleExposure,
  topBanner,
  textHold,
  neverFinishes,
  fadeOnly,
  popIn,
  popOut,
];
