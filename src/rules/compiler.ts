/**
 * The compiler: what's broken in any video, whoever made it and whatever its taste.
 * Always on, no options.
 */
import { area, centreOf, intersect, isAncestor, readText } from "../film.ts";
import { defineRule } from "../rule.ts";
import { carried, contains, frames as framesIn, px, runs } from "./util.ts";

export const jump = defineRule({
  id: "continuity/jump",
  kind: "check",
  severity: "error",
  options: {},
  docs: {
    summary:
      "No element moves or resizes far more in one frame than in the frames around it.",
    why: "A viewer sees a sudden jump as a glitch. It is almost always caused by two keyframes or two layouts that don't meet: a path that resumes from a different point than where it stopped, or a component swapped for another at a new position.",
    fix: "Find the frame in the finding and make the motion before and after it start and end at the same point. If one element hands off to another, start the second exactly where the first ends.",
  },
  check({ film, report }) {
    for (const el of film.elements) {
      const fs = el.frames;
      const change = fs.map((f, i) => {
        const prev = el.at(fs[i - 1]);
        const cur = el.at(f)!;
        // Text that changes (typing, a counter) changes size without moving.
        if (
          !prev ||
          fs[i - 1] !== f - 1 ||
          prev.opacity < 0.3 ||
          cur.opacity < 0.3 ||
          prev.raw.x !== cur.raw.x
        )
          return 0;
        const size = (s: typeof cur) => Math.hypot(s.box[2], s.box[3]);
        // A cursor's press squash changes its size in a frame by design; its position is what jumps.
        return el.role === "cursor"
          ? el.step(f)
          : Math.max(el.step(f), Math.abs(size(cur) - size(prev)));
      });
      change.forEach((c, i) => {
        // Compared with motion two or three frames away, so a jump rendered across two frames (60 fps
        // from 30 fps keys) still stands out; its other half may be the frame right beside it.
        const around = Math.max(
          change[i - 2] ?? 0,
          change[i + 2] ?? 0,
          change[i - 3] ?? 0,
          change[i + 3] ?? 0,
          px(film, 4),
        );
        const pair = Math.max(change[i - 1] ?? 0, change[i + 1] ?? 0);
        const isJump =
          c > px(film, 40) &&
          c > 4 * around &&
          (pair < px(film, 40) || pair > 0.5 * c);
        const first =
          isJump && !(pair > 0.5 * c && (change[i - 1] ?? 0) > px(film, 40));
        // A child carried by a jumping parent is the parent's jump, reported once.
        if (first && !carried(film, fs[i], el.at(fs[i])!.raw.k)) {
          report({
            element: el,
            frames: [fs[i - 1], fs[i]],
            measured: `moves ${c.toFixed(0)} px in one frame (the frames around it: ${around.toFixed(0)} px)`,
            need: "one continuous path",
          });
        }
      });
    }
  },
});

export const flicker = defineRule({
  id: "continuity/flicker",
  kind: "check",
  severity: "error",
  options: {},
  docs: {
    summary: "Nothing appears for only a frame or two.",
    why: "An element that is on screen for only a frame or two is too brief to read but long enough to notice, so it looks like a glitch.",
    fix: "Check the conditions that mount the element at that time. Usually a range boundary is off by one, or an exit and an entrance overlap by a frame.",
  },
  check({ film, report }) {
    const longest = framesIn(film, 0.07);
    for (const el of film.elements) {
      const seen = el.frames.filter((f) => {
        const s = el.at(f)!;
        return s.opacity > 0.3 && area(s.visible) > 0.003 * film.area;
      });
      if (!seen.length) continue;
      const spans = runs(seen, 1);
      if (
        spans.length === 1 &&
        spans[0][1] - spans[0][0] + 1 <= longest &&
        el.frames.length <= longest + 2
      ) {
        report({
          element: el,
          frames: spans[0],
          measured: `on screen for ${spans[0][1] - spans[0][0] + 1} frame(s)`,
          need: "on screen long enough to read, or not at all",
        });
      }
    }
  },
});

export const textCut = defineRule({
  id: "layout/text-cut",
  kind: "check",
  severity: "error",
  options: {},
  docs: {
    summary:
      "Text that's held still is never cut off by its own box, a parent's clip or the canvas edge.",
    why: "Words that are cut off look like a layout bug, and on a phone they can't be read at all.",
    fix: "Give the container room for its text (wider, taller, or smaller type), move the text inside the visible area, or pan so the text is whole before you hold on it.",
  },
  check({ film, report }) {
    const hold = framesIn(film, 0.5);
    for (const el of film.elements) {
      if (el.role !== "text" && el.role !== "headline") continue;
      const cut = el.frames.filter((f) => {
        const s = el.at(f)!;
        return (
          s.opacity > 0.5 &&
          area(s.box) > 0 &&
          area(s.visible) < 0.85 * area(s.box) &&
          area(s.visible) > 0 &&
          el.step(f) < 0.5
        );
      });
      for (const [a, b] of runs(cut, 1)) {
        if (b - a + 1 < hold) continue;
        const s = el.at(a)!;
        report({
          element: el,
          frames: [a, b],
          measured: `${Math.round((1 - area(s.visible) / area(s.box)) * 100)}% of "${(s.raw.x ?? "").slice(0, 30)}" is cut off for ${(b - a + 1) / film.fps} s`,
          need: "whole text while it's held",
        });
      }
    }
  },
});

export const missingImage = defineRule({
  id: "assets/missing-image",
  kind: "check",
  severity: "error",
  options: {},
  docs: {
    summary: "Every image loads.",
    why: "A broken image renders as nothing, or as the browser's broken-image box.",
    fix: "Check the path. Files in `public/` are referenced with `staticFile()`, and the file must exist at render time.",
  },
  check({ film, report }) {
    for (const el of film.elements) {
      const broken = el.frames.filter((f) => el.at(f)!.raw.br);
      if (broken.length)
        report({
          element: el,
          frames: [broken[0], broken[broken.length - 1]],
          measured: "the image failed to load",
          need: "a loaded image",
        });
    }
  },
});

export const fallbackFont = defineRule({
  id: "assets/fallback-font",
  kind: "check",
  severity: "error",
  options: {},
  docs: {
    summary: "Text renders in the font it asks for, never a fallback.",
    why: "A fallback font changes the width of every line and the look of the brand, so a layout tuned to the real font breaks.",
    fix: "Load the font before rendering: `@remotion/google-fonts` `loadFont()`, or a `FontFace` with `delayRender` until it has loaded.",
  },
  check({ film, report }) {
    const seen = new Map<string, number[]>();
    for (const f of film.frames)
      for (const r of film.rows(f))
        if (r.fb) seen.set(r.fb, [...(seen.get(r.fb) ?? []), f]);
    for (const [family, fs] of seen) {
      report({
        frames: [fs[0], fs[fs.length - 1]],
        measured: `"${family}" is declared but didn't load; text fell back to another font`,
        need: "the declared font, loaded",
      });
    }
  },
});

export const offCanvas = defineRule({
  id: "layout/subject-off-canvas",
  kind: "check",
  severity: "error",
  options: {},
  docs: {
    summary:
      "A tagged subject is on the canvas at some point while it's shown.",
    why: "If a tagged subject is never on screen, the shot shows nothing where something was meant to be. Waiting off screen before an entrance or after an exit is fine.",
    fix: "Check the subject's position; a coordinate is probably in the wrong space (canvas vs. a scaled parent), or its entrance never runs.",
  },
  check({ film, report }) {
    for (const el of film.elements) {
      if (!el.tagged || el.role === "cursor") continue;
      const shown = el.frames.filter((f) => el.at(f)!.opacity > 0.5);
      if (
        shown.length < framesIn(film, 0.5) ||
        shown.some((f) => film.onCanvas(el.at(f)!))
      )
        continue;
      const c = centreOf(el.at(shown[0])!);
      report({
        element: el,
        frames: [shown[0], shown[shown.length - 1]],
        measured: `never on the canvas (first at (${c.x.toFixed(0)}, ${c.y.toFixed(0)}))`,
        need: "on the canvas while it's shown",
      });
    }
  },
});

/** A painted background you can't see through. */
const opaque = (bg?: string) => {
  if (!bg) return false;
  const alpha =
    bg.match(/rgba\([^)]*,\s*([\d.]+)\)/) ?? bg.match(/\/\s*([\d.]+)\s*\)/);
  return !alpha || Number(alpha[1]) >= 0.9;
};

export const textOverlap = defineRule({
  id: "layout/text-overlap",
  kind: "check",
  severity: "error",
  options: {},
  docs: {
    summary:
      "Two different texts are never drawn on top of each other, whether by a crossfade in the same place, a line sliding under another, or labels stacked on each other.",
    why: "Overlapping words can't be read, even if they overlap only briefly, and the overlap looks like a glitch. It happens most often in handoffs, when an outgoing message fades out in the same place the incoming one fades in.",
    fix: "Let the outgoing text leave before the incoming one lands, move one out of the other's way (push the old line up and out), or put the incoming text on an opaque surface that covers the old one.",
  },
  check({ film, report }) {
    const hits = new Map<
      string,
      { frames: number[]; key: string; a: string; b: string }
    >();
    for (const f of film.frames) {
      const rows = film.rows(f);
      const texts = rows
        .map((r, i) => ({ r, i }))
        .filter(
          ({ r }) =>
            r.t === "t" &&
            /[A-Za-z0-9]/.test(r.x ?? "") &&
            r.o > 0.2 &&
            area(r.v) > 0,
        )
        .sort((p, q) => p.r.v[0] - q.r.v[0]);
      // Spans set side by side on one baseline under one parent are one line of text (a word or
      // letter at a time), so a finding names the line, not each span.
      const lines: (typeof texts)[] = [];
      const lineOf = new Map<number, (typeof texts)[number][]>();
      const parent = (k: string) => k.slice(0, k.lastIndexOf("/"));
      for (const t of texts) {
        const line = lines.find(
          (l) =>
            l.every(
              (x) =>
                parent(x.r.k) === parent(t.r.k) &&
                Math.abs(x.r.v[1] + x.r.v[3] / 2 - (t.r.v[1] + t.r.v[3] / 2)) <
                  0.5 * Math.max(x.r.v[3], t.r.v[3]) &&
                area(intersect(x.r.v, t.r.v)) <
                  0.3 * Math.min(area(x.r.v), area(t.r.v)),
            ) &&
            t.r.v[0] - Math.max(...l.map((x) => x.r.v[0] + x.r.v[2])) <
              1.2 * (t.r.fs ?? 20),
        );
        if (line) line.push(t);
        else lines.push([t]);
        lineOf.set(t.i, line ?? lines[lines.length - 1]);
      }
      const covers = rows
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => r.t === "b" && r.o > 0.9 && opaque(r.bg));
      for (let i = 0; i < texts.length; i += 1)
        for (
          let j = i + 1;
          j < texts.length &&
          texts[j].r.v[0] < texts[i].r.v[0] + texts[i].r.v[2];
          j += 1
        ) {
          const [p, q] = [texts[i], texts[j]];
          if (
            (p.r.x ?? "").trim() === (q.r.x ?? "").trim() ||
            isAncestor(p.r.k, q.r.k) ||
            isAncestor(q.r.k, p.r.k)
          )
            continue;
          const shared = intersect(p.r.v, q.r.v);
          if (area(shared) < 0.3 * Math.min(area(p.r.v), area(q.r.v))) continue;
          // Hidden, not overlapping: an opaque surface painted after the lower text covers the overlap.
          const [lower, upper] = p.i < q.i ? [p, q] : [q, p];
          if (
            covers.some(
              (c) =>
                c.i > lower.i &&
                isAncestor(c.r.k, upper.r.k) &&
                !isAncestor(c.r.k, lower.r.k) &&
                contains(c.r.v, shared),
            )
          )
            continue;
          const [la, lb] = [lineOf.get(lower.i)!, lineOf.get(upper.i)!];
          if (la === lb) continue;
          const [a, b] = [la, lb].map((l) => readText(l.map((x) => x.r)));
          const id = [a, b].sort().join("\u0000");
          const h = hits.get(id) ?? { frames: [], key: lower.r.k, a, b };
          if (h.frames[h.frames.length - 1] !== f) h.frames.push(f);
          hits.set(id, h);
        }
    }
    for (const h of hits.values())
      for (const [a, b] of runs(h.frames, 1)) {
        if (b - a + 1 < Math.max(3, framesIn(film, 0.1))) continue;
        report({
          element: film.elementOf(a, h.key),
          frames: [a, b],
          measured: `"${h.a.slice(0, 30)}" and "${h.b.slice(0, 30)}" are drawn on top of each other for ${((b - a + 1) / film.fps).toFixed(2)} s`,
          need: "one text at a time in any spot",
        });
      }
  },
});

export const compilerRules = [
  jump,
  flicker,
  textCut,
  textOverlap,
  missingImage,
  fallbackFont,
  offCanvas,
];
