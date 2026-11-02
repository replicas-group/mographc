/**
 * Spacing: the room around things. A subject is either framed with room or clearly cropped,
 * never in between; free text is either centred in the space it sits in or lined up with
 * something, never floating at an unexplained offset.
 */
import { area, intersect, isAncestor, type Element } from "../film.ts";
import { defineRule } from "../rule.ts";
import type { Box } from "../types.ts";
import { viewer } from "../viewer.ts";
import { frames as framesIn, px, runs } from "./util.ts";

/** Frames where a box is held (moving under 2 px a frame), so framing is a choice, not motion. */
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
      "A subject is either framed with room or clearly cropped by the frame, never just touching or barely cut by its edge.",
    why: "A subject with space around it looks deliberately placed, and one that is cropped deeply looks like a close-up. An edge just inside the frame, or just past it, looks like a mistake, as if the subject didn't quite fit.",
    fix: "Do one or the other: pull back until the edge has at least the room the finding gives, or push in until the frame clearly crops it.",
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
        // Signed room to each frame edge: positive inside the frame, negative cropped.
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
            measured: `its ${edge} edge is ${m >= 0 ? `${m.toFixed(0)} px inside` : `${(-m).toFixed(0)} px past`} the frame's edge`,
            need: `at least ${options.room} px of room, or cropped clearly (past the edge by over ${(options.crop * 100).toFixed(0)}% of its size)`,
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
      "Free text (a caption, a headline) is centred in the space it sits in, or lines up with something; it never floats at an unexplained offset.",
    why: "Viewers notice the space on each side of a line of text. Equal space, or an edge shared with the product, looks intentional. Uneven space with no alignment looks accidental.",
    fix: "Centre the text between what's on either side of it (the product's edge and the frame's), or align its edge with an edge of the product. The finding gives both gaps.",
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
        // Its letters and words in this frame, and whether they're held still.
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
        // Lined up with something (an edge or a centre), or centred on the frame: intended.
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
          measured: `"${h.text.slice(0, 30)}" has ${h.gaps[0].toFixed(0)} px of space on its left and ${h.gaps[1].toFixed(0)} px on its right, and lines up with nothing`,
          need: "the same space on both sides, or an edge shared with the product",
        });
      }
  },
});

export const spacingRules = [ambiguousCrop, unbalancedSpace];
