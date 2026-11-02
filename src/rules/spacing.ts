/**
 * Spacing: the room around things. A large surface's edge is either well inside the canvas or
 * clearly cut off by it, never just at it; text outside any surface is either centred in the
 * space beside it or lined up with something.
 */
import {
  area,
  intersect,
  isAncestor,
  readText,
  type Element,
} from "../film.ts";
import { defineRule } from "../rule.ts";
import type { Box } from "../types.ts";
import { viewer } from "../viewer.ts";
import { contains, frames as framesIn, overlay, px, runs } from "./util.ts";

/** Whether a box is standing still (moving under 2 px a frame), so its position is deliberate rather than part of a move. */
const held = (el: Element, f: number) => {
  const s = el.at(f);
  const p = el.at(f - 1);
  return !!s && !!p && s.box.every((v, i) => Math.abs(v - p.box[i]) < 2);
};

export const ambiguousCrop = defineRule({
  id: "framing/ambiguous-crop",
  kind: "lint",
  severity: "warn",
  options: { room: 32, crop: 0.06, subject: 0.15, seconds: 0.5 },
  docs: {
    summary:
      "Each edge of a large surface (a window, card or panel) that is standing still is either at least 32 px at 1080p inside the canvas edge, or past the canvas edge by more than 6% of the surface's width (left and right edges) or height (top and bottom edges).",
    why: "A surface with space around it looks deliberately placed, and one that runs well past the canvas edge looks like a deliberate close-up. An edge just inside the canvas or just past it looks like a mistake, as if the surface didn't quite fit. The rule checks surfaces above 90% opacity that cover at least 15% of the canvas and have moved or resized by less than 2 px since the previous frame, and reports an edge that stays in between for at least 0.5 s.",
    fix: "Either zoom out or move the surface until the edge is at least the required distance inside the canvas, or zoom in until the edge is well past the canvas edge.",
    options: {
      room: "The smallest distance, in px at 1080p, a surface's edge must be inside the canvas edge.",
      crop: "How far past the canvas edge a surface's edge must be to count as clearly cut off, as a fraction of the surface's width (left and right edges) or height (top and bottom edges).",
      subject:
        "The smallest fraction of the canvas (0.15 is 15%) a surface must cover to be checked.",
      seconds:
        "The shortest time, in seconds, an edge must stay in between to be reported.",
    },
  },
  check({ film, options, report }) {
    const room = px(film, options.room);
    const hits = new Map<Element, [number, string, number][]>();
    for (const el of film.elements.filter((e) => e.role === "surface")) {
      for (const f of el.frames) {
        const s = el.at(f)!;
        if (
          s.opacity < 0.9 ||
          !held(el, f) ||
          area(intersect(s.visible, [0, 0, film.width, film.height])) <
            options.subject * film.area
        )
          continue;
        const [x, y, w, h] = s.box;
        // Signed distance to each canvas edge: positive inside the canvas, negative past its edge.
        const edges: [string, number, number][] = [
          ["left", x, w],
          ["top", y, h],
          ["right", film.width - (x + w), w],
          ["bottom", film.height - (y + h), h],
        ];
        for (const [edge, m, size] of edges)
          if (m < room && m > -options.crop * size)
            hits.set(el, [...(hits.get(el) ?? []), [f, edge, m]]);
      }
    }
    for (const [el, list] of hits)
      for (const edge of ["left", "top", "right", "bottom"]) {
        const mine = list.filter((h) => h[1] === edge);
        for (const [a, b] of runs(
          mine.map((h) => h[0]),
          2,
        )) {
          if (b - a + 1 < framesIn(film, options.seconds)) continue;
          const m = mine.find((h) => h[0] === a)![2];
          report({
            element: el,
            frames: [a, b],
            measured: `its ${edge} edge is ${m >= 0 ? `${m.toFixed(0)} px inside` : `${(-m).toFixed(0)} px past`} the canvas edge`,
            need: `the edge at least ${options.room} px at 1080p inside the canvas edge, or past it by more than ${(options.crop * 100).toFixed(0)}% of the surface's width or height`,
          });
        }
      }
  },
});

export const unbalancedSpace = defineRule({
  id: "layout/unbalanced-space",
  kind: "lint",
  severity: "warn",
  options: { ratio: 1.6, align: 10, seconds: 0.5, minGap: 24 },
  docs: {
    summary:
      "Text that isn't inside a surface (a window, card or panel), such as a caption or headline, either has a larger side gap of no more than 1.6 times the smaller one, or has its left or right edge within 10 px at 1080p of another element's edge or centre, or of the canvas's.",
    why: "Viewers notice the space on each side of a line of text. Equal space, or an edge lined up with something else, looks intentional; uneven space with nothing to line up with looks accidental. For text of at least two words that has moved less than 2 px since the previous frame, the rule measures the gap from its left and right edges to the nearest element beside it at the same height, or to the canvas edge; small elements within one font size of the text and no more than twice its height, such as a logo beside a name, count as part of it. It reports when the larger gap is at least 24 px at 1080p and more than 1.6 times the smaller, nothing lines up, the text isn't centred on the canvas, and this lasts at least 0.5 s.",
    fix: "Centre the text between the elements on either side of it (or the canvas edge), or move it so its left or right edge lines up with the edge or centre of another element. The finding gives both gaps.",
    options: {
      ratio:
        "How many times larger one side gap may be than the other before the text counts as unbalanced.",
      align:
        "How close, in px at 1080p, an edge of the text must be to another element's edge or centre, or the canvas's, to count as lined up with it.",
      seconds:
        "The shortest time, in seconds, the problem must last to be reported.",
      minGap:
        "The smallest size, in px at 1080p, the larger gap must have for the text to be checked.",
    },
  },
  check({ film, options, report }) {
    const v = viewer(film);
    const tol = px(film, options.align);
    const hits = new Map<
      string,
      { frames: number[]; text: string; el?: Element; gaps: [number, number] }
    >();
    for (const r of v.reads.filter((x) => !x.surface && x.words >= 1.5)) {
      for (let f = r.from; f <= r.to; f += 1) {
        const own = r.boxes.get(f);
        if (!own) continue;
        // Its letters and words in this frame, and whether they're standing still.
        const mine = [...r.elements].filter((e) => {
          const s = e.at(f);
          return !!s && area(intersect(s.visible, own)) > 0.5 * area(s.visible);
        });
        const el = mine[0];
        if (!el || mine.some((e) => !held(e, f))) continue;
        const keys = mine.map((e) => e.at(f)!.raw.k);
        const others = film.elements
          .filter(
            (e) =>
              e.role !== "cursor" &&
              e.role !== "part" &&
              e.role !== "label" &&
              !mine.includes(e),
          )
          .map((e) => e.at(f))
          .filter(
            (s): s is NonNullable<typeof s> =>
              !!s &&
              s.opacity > 0.3 &&
              area(s.visible) > 0.002 * film.area &&
              area(s.visible) < 0.9 * film.area &&
              area(intersect(s.visible, own)) < 0.5 * area(s.visible) &&
              !keys.some((k) => isAncestor(s.raw.k, k)),
          )
          .map((s) => s.visible);
        // Something its own height within a letter's height of it belongs with it (a logo beside
        // its name), not a window beside a caption.
        let box: Box = own;
        for (let grew = true, n = 0; grew && n < 20; n += 1) {
          grew = false;
          for (const o of others) {
            const near =
              o[1] < box[1] + box[3] &&
              o[3] <= 2 * own[3] &&
              box[1] < o[1] + o[3] &&
              Math.max(o[0] - (box[0] + box[2]), box[0] - (o[0] + o[2])) <
                r.size &&
              !(
                o[0] >= box[0] &&
                o[0] + o[2] <= box[0] + box[2] &&
                o[1] >= box[1] &&
                o[1] + o[3] <= box[1] + box[3]
              );
            if (near) {
              const x0 = Math.min(box[0], o[0]);
              const y0 = Math.min(box[1], o[1]);
              box = [
                x0,
                y0,
                Math.max(box[0] + box[2], o[0] + o[2]) - x0,
                Math.max(box[1] + box[3], o[1] + o[3]) - y0,
              ];
              grew = true;
            }
          }
        }
        const group = box;
        const band = (b: Box) =>
          b[1] < group[1] + group[3] &&
          group[1] < b[1] + b[3] &&
          area(intersect(b, group)) === 0;
        const left = Math.max(
          0,
          ...others
            .filter((b) => band(b) && b[0] + b[2] <= box[0] + 1)
            .map((b) => b[0] + b[2]),
        );
        const right = Math.min(
          film.width,
          ...others
            .filter((b) => band(b) && b[0] >= box[0] + box[2] - 1)
            .map((b) => b[0]),
        );
        const gaps: [number, number] = [
          box[0] - left,
          right - (box[0] + box[2]),
        ];
        const [lo, hi] = [Math.min(...gaps), Math.max(...gaps)];
        if (
          hi < px(film, options.minGap) ||
          hi <= options.ratio * Math.max(lo, 1)
        )
          continue;
        // Lined up with something (an edge or a centre), or centred on the canvas: intended.
        const lines = [
          ...others,
          [0, 0, film.width, film.height] as Box,
        ].flatMap((b) => [b[0], b[0] + b[2], b[0] + b[2] / 2]);
        if (
          [box[0], box[0] + box[2]].some((x) =>
            lines.some((l) => Math.abs(l - x) <= tol),
          ) ||
          Math.abs(box[0] + box[2] / 2 - film.width / 2) <= tol
        )
          continue;
        const key = `${r.id}`;
        const h = hits.get(key) ?? { frames: [], text: r.full, el, gaps };
        h.frames.push(f);
        hits.set(key, h);
      }
    }
    for (const h of hits.values())
      for (const [a, b] of runs(h.frames, 2)) {
        if (b - a + 1 < framesIn(film, options.seconds)) continue;
        report({
          element: h.el,
          frames: [a, b],
          measured: `"${h.text.slice(0, 30)}" has ${h.gaps[0].toFixed(0)} px of space on its left and ${h.gaps[1].toFixed(0)} px on its right, and neither edge lines up with another element or the canvas`,
          need: `the larger gap no more than ${options.ratio} times the smaller, or an edge within ${options.align} px at 1080p of another element's edge or centre`,
        });
      }
  },
});

export const tightSpacing = defineRule({
  id: "layout/tight-spacing",
  kind: "lint",
  severity: "warn",
  options: { ratio: 0.5, seconds: 0.5 },
  docs: {
    summary:
      "Text standing still is at least 0.5 times its font size away from the text above or below it, and from a box (a panel, bubble, code block or button) beside, above or below it; with two texts, the larger font size counts, unless it is at least twice the smaller one. Gaps held for less than 0.5 s are ignored.",
    why: "Text squeezed against the next line or the next box reads as one crowded block, and on a small screen the two run together. `staging/no-padding` only measures text against the edges of the box it is inside; this rule measures the gap between neighbours: a heading and the panel under it, a chat bubble and the command line under it, a caption and the line after it. The threshold comes from line spacing: inside a paragraph set at a line height of 1.2 to 1.5, the gap between one line's letters and the next is at most about 0.4 times the font size, so two separate blocks closer than 0.5 times the font size read as lines of one paragraph rather than as two things. Between two texts the larger font size counts, because a heading's spacing is judged at its own size; but when one is at least twice the size of the other (a large title over its subtitle), the difference in size already sets them apart, and the smaller size counts. Lines of the same font size and family stacked within 0.6 times their font size are one paragraph and aren't compared with each other, and pieces of text side by side on one line are one line. A label right above or below the box it names (a speaker's name over their chat bubble, a caption under an image) isn't crowding it: one line of at most 4 words, at most 0.8 times the size of the text in the box (or of 40 px at 1080p when the box has no text), with its left edge, right edge or centre within one font size of the box's. Text that paints its own background or border (a chat bubble, a button) is measured by that painted box, and text clipped by a container by its visible part. Cursors and markers (elements tagged `marker`, `highlight` or `annotation`, such as a ring drawn around a card to point it out) are drawn over the layout rather than part of it, so neither they nor anything inside them count as neighbours. A box counts when it is at least 2 font sizes wide and 1.5 font sizes tall (for a box beside the text rather than above or below it, at least 3 font sizes tall, so an icon or a tag next to a word is left alone), and isn't the box the text is inside. The rule checks text at least 10 px tall at 1080p above 50% opacity, in frames where both the text and its neighbour moved less than 1 px since the previous frame.",
    fix: "Add space between the two: a margin or gap of at least the required size (the finding gives it in px), or move one of them. If the two belong together, set them as one paragraph in the same font size, or put the text inside the box with padding.",
    options: {
      ratio:
        "The smallest gap allowed, as a multiple of the font size (with two texts, the larger one, or the smaller one when the larger is at least twice its size).",
      seconds:
        "The shortest time, in seconds, a gap must stay too small to be reported.",
    },
  },
  check({ film, options, report }) {
    const legible = px(film, 10);
    const hits = new Map<
      string,
      {
        el: Element;
        text: string;
        other: string;
        side: string;
        frames: number[];
        gaps: number[];
        need: number;
      }
    >();
    const overlap = (a: number, al: number, b: number, bl: number) =>
      Math.min(a + al, b + bl) - Math.max(a, b);
    const quote = (x: string) =>
      `"${x.length > 32 ? `${x.slice(0, 30)}…` : x}"`;
    for (const f of film.frames) {
      const before = new Map(film.rows(f - 1).map((r) => [r.k, r]));
      const still = (r: (typeof rows)[number]) => {
        const p = before.get(r.k);
        return !!p && p.b.every((v, i) => Math.abs(v - r.b[i]) < 1);
      };
      const rows = film
        .rows(f)
        .filter((r) => r.o > 0.5 && !overlay(film, f, r.k));
      const texts = rows.filter(
        (r) =>
          r.t === "t" &&
          /[A-Za-z0-9]/.test(r.x ?? "") &&
          (r.fs ?? 0) >= legible &&
          area(r.v) > 0.5 * area(r.b) &&
          still(r),
      );
      // What the eye sees of a text: its painted box if it has one, else its visible glyphs.
      const outline = (r: (typeof texts)[number]) => r.pb ?? r.v;
      const boxes = rows
        .filter((r) => (r.t === "b" || r.pb) && still(r))
        .map((r) => ({ k: r.k, b: r.pb ?? r.v, painted: !!r.pb }))
        .filter((x) => area(x.b) > 0 && area(x.b) < 0.9 * film.area);
      // Pieces of one line, and lines of one paragraph, are one block of text.
      const block = texts.map((_, i) => i);
      const root = (i: number): number =>
        block[i] === i ? i : (block[i] = root(block[i]));
      texts.forEach((a, i) =>
        texts.forEach((b, j) => {
          if (j <= i) return;
          const fs = Math.max(a.fs!, b.fs!);
          const line =
            Math.abs(a.v[1] + a.v[3] / 2 - (b.v[1] + b.v[3] / 2)) <
              0.5 * Math.max(a.v[3], b.v[3]) &&
            -overlap(a.v[0], a.v[2], b.v[0], b.v[2]) < 1.2 * fs;
          const paragraph =
            !a.pb &&
            !b.pb &&
            Math.max(a.fs!, b.fs!) / Math.min(a.fs!, b.fs!) < 1.05 &&
            a.ff === b.ff &&
            overlap(a.v[0], a.v[2], b.v[0], b.v[2]) > 0 &&
            -overlap(a.v[1], a.v[3], b.v[1], b.v[3]) < 0.6 * fs;
          if (line || paragraph) block[root(j)] = root(i);
        }),
      );
      // A block's words, so a finding names the text by what it says.
      const words = (i: number) =>
        readText(texts.filter((_, j) => root(j) === root(i)));
      const name = (k: string, text?: string, painted = false) => {
        const e = film.elementOf(f, k);
        if (!text) return e?.label ?? "a box";
        const what = e?.tagged
          ? `${e.id} ${quote(text)}`
          : `text ${quote(text)}`;
        return painted ? `the box of ${what}` : what;
      };
      const hit = (
        i: number,
        otherKey: string,
        other: string,
        side: string,
        gap: number,
        need: number,
      ) => {
        const t = texts[i];
        const el = film.elementOf(f, t.k);
        const o = film.elementOf(f, otherKey);
        if (!el || !o || el === o) return;
        // One finding per pair, whichever of the two is measured from.
        const id = [el.id, o.id].sort().join("|");
        const h = hits.get(id) ?? {
          el,
          text: words(i),
          other,
          side,
          frames: [],
          gaps: [],
          need,
        };
        if (h.frames[h.frames.length - 1] !== f) {
          h.frames.push(f);
          h.gaps.push(gap);
        }
        hits.set(id, h);
      };
      /**
       * A label naming the box right above or below it (a speaker's name over their bubble, a
       * caption under an image): one short line, at most 0.8 times the size of the text in the box (or
       * of display type, when the box has none), lined up with the box's left edge, right edge or centre.
       */
      const caption = (i: number, tb: Box, box: Box, boxSize: number) => {
        const t = texts[i];
        const fs = t.fs!;
        const x = [tb[0], tb[0] + tb[2], tb[0] + tb[2] / 2];
        const y = [box[0], box[0] + box[2], box[0] + box[2] / 2];
        return (
          !t.pb &&
          t.v[3] <= 1.6 * fs &&
          words(i).split(/\s+/).length <= 4 &&
          fs <= 0.8 * (boxSize || px(film, 40)) &&
          x.some((v, k) => Math.abs(v - y[k]) <= fs)
        );
      };
      texts.forEach((t, i) => {
        const tb = outline(t);
        // The text below it, from another block.
        texts.forEach((o, j) => {
          const ob = outline(o);
          if (
            root(i) === root(j) ||
            isAncestor(t.k, o.k) ||
            isAncestor(o.k, t.k) ||
            ob[1] <= tb[1] ||
            overlap(tb[0], tb[2], ob[0], ob[2]) <= 0
          )
            return;
          const gap = ob[1] - (tb[1] + tb[3]);
          // A title at least twice its subtitle's size is set apart by size: the smaller one counts.
          const [lo, hi] = [t.fs!, o.fs!].sort((a, b) => a - b);
          const need = options.ratio * (hi >= 2 * lo ? lo : hi);
          if (
            (o.pb && caption(i, tb, o.pb, o.fs!)) ||
            (t.pb && caption(j, ob, t.pb, t.fs!))
          )
            return;
          if (gap >= 0 && gap < need)
            hit(i, o.k, name(o.k, words(j), !!o.pb), "above", gap, need);
        });
        // A box beside, above or below it that isn't the box it's in.
        const fs = t.fs!;
        const need = options.ratio * fs;
        for (const x of boxes) {
          if (
            x.k === t.k ||
            isAncestor(x.k, t.k) ||
            isAncestor(t.k, x.k) ||
            contains(x.b, t.v) ||
            x.b[2] < 2 * fs ||
            x.b[3] < 1.5 * fs
          )
            continue;
          const [gap, side]: [number, string] =
            overlap(tb[0], tb[2], x.b[0], x.b[2]) > 0
              ? x.b[1] >= tb[1] + tb[3] / 2
                ? [x.b[1] - (tb[1] + tb[3]), "above"]
                : [tb[1] - (x.b[1] + x.b[3]), "below"]
              : overlap(tb[1], tb[3], x.b[1], x.b[3]) > 0 && x.b[3] >= 3 * fs
                ? x.b[0] >= tb[0]
                  ? [x.b[0] - (tb[0] + tb[2]), "left of"]
                  : [tb[0] - (x.b[0] + x.b[2]), "right of"]
                : [Infinity, ""];
          if (gap < 0 || gap >= need) continue;
          const j = texts.findIndex((o) => o.k === x.k);
          const inside = rows.filter(
            (r) => r.t === "t" && (r.k === x.k || isAncestor(x.k, r.k)),
          );
          if (
            (side === "above" || side === "below") &&
            caption(
              i,
              tb,
              x.b,
              inside.length ? Math.max(...inside.map((r) => r.fs ?? 0)) : 0,
            )
          )
            continue;
          hit(
            i,
            x.k,
            x.painted && j >= 0 ? name(x.k, words(j), true) : name(x.k),
            side,
            gap,
            need,
          );
        }
      });
    }
    for (const h of hits.values())
      for (const [a, b] of runs(h.frames, 2)) {
        if (b - a + 1 < framesIn(film, options.seconds)) continue;
        const gaps = h.gaps
          .filter((_, i) => h.frames[i] >= a && h.frames[i] <= b)
          .sort((p, q) => p - q);
        report({
          element: h.el,
          frames: [a, b],
          measured: `${h.el.tagged ? `${quote(h.text)} ` : ""}is ${gaps[Math.floor(gaps.length / 2)].toFixed(0)} px ${h.side} ${h.other} for ${((b - a + 1) / film.fps).toFixed(1)} s`,
          need: `a gap of at least ${options.ratio} times the font size, ${h.need.toFixed(0)} px here, between text and the text or box next to it`,
        });
      }
  },
});

export const spacingRules = [ambiguousCrop, unbalancedSpace, tightSpacing];
