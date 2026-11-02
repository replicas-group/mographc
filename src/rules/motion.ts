/**
 * Slow in and slow out, squash and stretch: the measurable principles of how things move.
 */
import { area, type Element, type Move } from "../film.ts";
import { defineRule } from "../rule.ts";
import {
  carried,
  contrast,
  isAncestor,
  parseColour,
  perFrame,
  px,
  runs,
  t,
} from "./util.ts";

/** Moves worth judging: a real distance and duration, by a top-level mover (not carried by a moving parent). */
const judged = (el: Element, minDistance = 60) =>
  el.moves().filter((m) => {
    if (m.seconds < 0.2 || m.distance < px(el.film, minDistance)) return false;
    const s = el.at(m.from)!;
    if (Math.max(area(s.visible), area(s.box)) < 400) return false;
    const mid = Math.round((m.from + m.to) / 2);
    return !carried(el.film, mid, el.at(mid)?.raw.k ?? s.raw.k);
  });

const movers = (film: { elements: Element[] }) =>
  film.elements.filter((e) => e.role !== "cursor");

const strength = (
  m: Move,
  o: { long: number; medium: number; short: number },
) => (m.seconds >= 0.8 ? o.long : m.seconds >= 0.4 ? o.medium : o.short);

export const linear = defineRule({
  id: "easing/linear",
  kind: "lint",
  severity: "error",
  options: {},
  docs: {
    summary:
      "A move that comes to rest eases in and out instead of travelling at constant speed.",
    why: "Physical objects speed up and slow down, so a window or card that moves at constant speed and stops at full speed looks mechanical.",
    fix: "Drive the move with an eased curve (ease-in-out for a move between two rest points; ease-out for something arriving fast), not `interpolate` with no `easing`.",
  },
  check({ film, report }) {
    for (const el of movers(film))
      for (const m of judged(el))
        if (m.lands && m.easeIn < 0.24 && m.easeOut < 0.24)
          report({
            element: el,
            frames: [m.from, m.to],
            measured: `ease-in ${m.easeIn.toFixed(2)}, ease-out ${m.easeOut.toFixed(2)} over ${m.seconds.toFixed(2)} s (linear is 0.20)`,
            need: "both above 0.24",
          });
  },
});

export const weakOut = defineRule({
  id: "easing/weak-out",
  kind: "lint",
  severity: "error",
  options: {
    long: 0.4,
    medium: 0.33,
    short: 0.26,
    floorLong: 0.3,
    floorMedium: 0.26,
    floorShort: 0.22,
  },
  docs: {
    summary:
      "The longer a move is, the more strongly it slows down at the end. A short flick needs little ease-out.",
    why: "A move that lasts a second but barely slows down at the end looks like it hits a wall. The rule measures the share of the move's time spent covering its last 20% of distance (0.20 for constant speed).",
    fix: "Use a stronger ease-out (e.g. a bezier ending around (0.1, 1) or (0.2, 1)), or lengthen the move's settle. Below the floor it's an error; between the floor and the target it's a warning.",
  },
  check({ film, options, report }) {
    for (const el of movers(film))
      for (const m of judged(el)) {
        const need = strength(m, options);
        if (
          !m.lands ||
          m.easeOut >= need ||
          (m.easeIn < 0.24 && m.easeOut < 0.24)
        )
          continue;
        const floor = strength(m, {
          long: options.floorLong,
          medium: options.floorMedium,
          short: options.floorShort,
        });
        report({
          element: el,
          frames: [m.from, m.to],
          measured: `ease-out ${m.easeOut.toFixed(2)} over a ${m.seconds.toFixed(2)} s move of ${m.distance.toFixed(0)} px${m.easeOut >= floor ? " (could be stronger)" : ""}`,
          need: `>= ${need.toFixed(2)}`,
          severity: m.easeOut >= floor ? "warn" : "error",
        });
      }
  },
});

export const noEaseIn = defineRule({
  id: "easing/no-ease-in",
  kind: "lint",
  severity: "warn",
  options: {},
  docs: {
    summary: "A slow move that starts from rest on screen eases in.",
    why: "An object that goes from standing still to full speed at once looks as if it was kicked. A fast start is only right when the start is hidden (the object enters from off screen) or the move is a quick flick.",
    fix: "Use ease-in-out instead of ease-out for moves that start visibly at rest.",
  },
  check({ film, report }) {
    for (const el of movers(film))
      for (const m of judged(el)) {
        const start = el.at(m.from)!;
        const speed = m.distance / m.seconds;
        if (
          film.onCanvas(start) &&
          m.lands &&
          m.easeIn < 0.12 &&
          speed < 750 &&
          m.seconds >= 0.4
        )
          report({
            element: el,
            frames: [m.from, m.to],
            measured: `ease-in ${m.easeIn.toFixed(2)} at ${speed.toFixed(0)} px/s`,
            need: ">= 0.12",
          });
      }
  },
});

export const abruptStop = defineRule({
  id: "easing/abrupt-stop",
  kind: "lint",
  severity: "error",
  options: {},
  docs: {
    summary: "A move slows down before it stops.",
    why: "If the last frames of a move are as fast as the frames before them, the object stops suddenly, as if it hit something.",
    fix: "End the move on an ease-out. Check that the move isn't cut short by a range that ends before its curve finishes.",
  },
  check({ film, report }) {
    const fast = perFrame(film, 120);
    for (const el of movers(film))
      for (const m of judged(el)) {
        const moving = m.steps.filter((s) => s >= 1);
        if (!m.lands || moving.length < 4) continue;
        const last = moving[moving.length - 1];
        const before = moving[moving.length - 4];
        if (last >= fast && last >= 0.6 * before)
          report({
            element: el,
            frames: [m.from, m.to],
            measured: `stops from ${(last * film.fps).toFixed(0)} px/s (3 frames earlier: ${(before * film.fps).toFixed(0)} px/s)`,
            need: "decelerating into rest",
          });
      }
  },
});

export const stutter = defineRule({
  id: "easing/stutter",
  kind: "lint",
  severity: "error",
  options: {},
  docs: {
    summary: "A move is one continuous curve, with no stall in the middle.",
    why: "When the speed drops to almost zero in the middle of a move, the move looks like it hesitates. This usually means two animations are chained or added together (a layout change, then a transform; two ramps that don't overlap).",
    fix: "Drive the whole motion from one progress value, or overlap the two animations so the speed never collapses between them.",
  },
  check({ film, report }) {
    const quick = perFrame(film, 450);
    for (const el of film.elements)
      for (const m of judged(el)) {
        const s = m.steps;
        for (let i = 1; i < s.length - 1; i += 1) {
          const side = Math.min(s[i - 1], s[i + 1]);
          if (side >= quick && s[i] < 0.35 * side) {
            report({
              element: el,
              frames: [m.from, m.to],
              measured: `speed ${(s[i - 1] * film.fps).toFixed(0)} → ${(s[i] * film.fps).toFixed(0)} → ${(s[i + 1] * film.fps).toFixed(0)} px/s at ${t(film, m.from + i + 1)}`,
              need: "one continuous curve",
            });
            break;
          }
        }
      }
  },
});

export const edgeReversal = defineRule({
  id: "easing/edge-reversal",
  kind: "lint",
  severity: "error",
  options: {},
  docs: {
    summary: "Every edge of a moving surface travels one way, then settles.",
    why: "When a surface's scale and its layout change together, an edge can swell past where it lands and come back, or wind up against its travel. The result looks like a wobble that isn't in the easing curve.",
    fix: "Ease the surface's on-screen rectangle itself (x, y, width, height on one curve) and derive scale or clipping from it, instead of easing scale and size separately.",
  },
  check({ film, report }) {
    for (const el of film.elements.filter((e) => e.role === "surface"))
      for (const m of judged(el)) {
        const span = [];
        for (let f = m.from; f <= m.to; f += 1)
          if (el.at(f)) span.push(el.at(f)!.visible);
        if (!span.length || area(span[0]) < 0.03 * film.area) continue;
        let worst: [number, string] | undefined;
        for (const [name, edge] of [
          ["left", (b: number[]) => b[0]],
          ["right", (b: number[]) => b[0] + b[2]],
          ["top", (b: number[]) => b[1]],
          ["bottom", (b: number[]) => b[1] + b[3]],
        ] as const) {
          const e = span.map(edge);
          const sign = e[e.length - 1] >= e[0] ? 1 : -1;
          const along = e.map((v) => v * sign);
          const travel = Math.abs(e[e.length - 1] - e[0]);
          if (travel < px(film, 40)) continue;
          let peak = -Infinity;
          let against = 0;
          for (const v of along) {
            peak = Math.max(peak, v);
            against = Math.max(against, peak - v);
          }
          if (
            against > Math.max(px(film, 12), 0.03 * travel) &&
            (!worst || against > worst[0])
          ) {
            const kind =
              along[0] - Math.min(...along) >=
              Math.max(...along) - along[along.length - 1]
                ? "winds up against its travel"
                : "overshoots its landing and comes back";
            worst = [
              against,
              `the ${name} edge ${kind} by ${against.toFixed(0)} px`,
            ];
          }
        }
        if (worst)
          report({
            element: el,
            frames: [m.from, m.to],
            measured: worst[1],
            need: "every edge moving one way",
          });
      }
  },
});

const cursors = (film: { elements: Element[] }) =>
  film.elements.filter((e) => e.role === "cursor");

export const cursorStretch = defineRule({
  id: "cursor/no-stretch",
  kind: "lint",
  severity: "error",
  options: { speed: 900, stretch: 1.06 },
  docs: {
    summary: "A cursor moving fast stretches along its travel.",
    why: "Stretching a fast object along its direction of travel (squash and stretch, a standard animation technique) makes it look like it has weight. Without it, a fast cursor looks stiff.",
    fix: "Scale the cursor along its direction of travel in proportion to its speed (for example `1 + min(0.22, speed / 300)` per frame, smoothed), rotated to the travel angle.",
  },
  check({ film, options, report }) {
    for (const el of cursors(film)) {
      const flat = el.frames.filter(
        (f) =>
          el.step(f) * film.fps >= options.speed &&
          el.at(f)!.stretch < options.stretch,
      );
      const fast = el.frames.filter(
        (f) => el.step(f) * film.fps >= options.speed,
      );
      if (flat.length >= 3 && flat.length >= 0.5 * fast.length)
        report({
          element: el,
          frames: [flat[0], flat[flat.length - 1]],
          measured: `${flat.length} of ${fast.length} fast frames (>= ${options.speed} px/s) stretch under ${options.stretch}`,
          need: "stretch with speed",
        });
    }
  },
});

export const deadExit = defineRule({
  id: "cursor/dead-exit",
  kind: "lint",
  severity: "error",
  options: {},
  docs: {
    summary:
      "A cursor leaves by moving off the canvas, not by fading where it stands.",
    why: "A cursor that fades out or vanishes where it stands ends its motion abruptly. Moving it off the canvas completes the motion and shows the viewer where it went.",
    fix: "After its last action, fling the cursor off the nearest edge (a short, fast, eased-in move) instead of fading it.",
  },
  check({ film, report }) {
    for (const el of cursors(film)) {
      const last = el.last;
      if (last >= film.frames[film.frames.length - 1] - 1) continue;
      const end = el.at(last)!;
      if (!film.onCanvas(end)) continue;
      report({
        element: el,
        frames: [Math.max(el.first, last - Math.round(film.fps * 0.3)), last],
        measured: `it disappears on screen, at ${(el.step(last) * film.fps).toFixed(0)} px/s`,
        need: "leave by moving off the canvas",
      });
    }
  },
});

export const popsIn = defineRule({
  id: "cursor/pops-in",
  kind: "lint",
  severity: "error",
  options: {},
  docs: {
    summary: "A cursor enters from off the canvas.",
    why: "A cursor that appears in the middle of the frame looks like a cut. Entering from the edge shows it arriving, the way it would when a person moves a mouse.",
    fix: "Start the cursor's path off the canvas edge nearest its first target.",
  },
  check({ film, report }) {
    for (const el of cursors(film)) {
      const first = el.at(el.first)!;
      if (el.first > film.frames[0] && film.onCanvas(first))
        report({
          element: el,
          frames: [el.first, el.first],
          measured: `appears on screen${first.opacity < 0.5 ? ", fading in" : ""}`,
          need: "enter from off the canvas",
        });
    }
  },
});

export const harshSettle = defineRule({
  id: "easing/harsh-settle",
  kind: "lint",
  severity: "error",
  options: { warnAbove: 18000, errorAbove: 27000 },
  docs: {
    summary:
      "A surface slows down gently as it lands, however far it travelled.",
    why: "A bubble or card that crosses the frame in a third of a second has to lose all that speed in a few frames, so it looks like it hits a wall even on an ease-out curve. Viewers read the time an object takes to stop as its weight, and only a cursor is light enough to stop that quickly. Measured as the peak deceleration while it lands, in px/s² at 1080p.",
    fix: "Give the move more time (duration grows with distance: a half-screen move wants 0.6–0.9 s), or a shorter path, or a curve with a longer tail (e.g. bezier(0.16, 1, 0.3, 1) over more frames).",
  },
  check({ film, options, report }) {
    const scale = 1080 / film.height;
    // Speeds averaged over about a fifteenth of a second, so a film rendered at 60 fps from
    // 30 fps keys (every other frame a repeat) doesn't read as braking on every frame.
    const w = Math.max(1, Math.round(film.fps / 15));
    for (const el of movers(film).filter(
      (e) => e.role !== "text" && e.role !== "headline" && e.role !== "label",
    ))
      for (const m of judged(el)) {
        const s0 = el.at(m.from)!;
        // An entrance from off screen can arrive fast: the eye never sees it start. Hard braking
        // reads as a wall when the whole trip happens in view.
        if (
          !m.lands ||
          !film.onCanvas(s0) ||
          Math.max(area(s0.visible), area(el.at(m.to)!.visible)) <
            0.002 * film.area
        )
          continue;
        const v = m.steps.map((_, i) => {
          const run = m.steps.slice(Math.max(0, i - w + 1), i + 1);
          return run.reduce((x, y) => x + y, 0) / run.length;
        });
        const peak = v.indexOf(Math.max(...v));
        let worst = 0;
        for (let i = Math.max(peak, 1); i < v.length; i += 1)
          worst = Math.max(
            worst,
            (v[i - 1] - v[i]) * film.fps * film.fps * scale,
          );
        if (worst <= options.warnAbove) continue;
        report({
          element: el,
          frames: [m.from, m.to],
          measured: `brakes at ${Math.round(worst / 1000)}k px/s² landing a ${m.distance.toFixed(0)} px move in ${m.seconds.toFixed(2)} s`,
          need: `under ${options.warnAbove / 1000}k px/s²`,
          severity: worst > options.errorAbove ? "error" : "warn",
        });
      }
  },
});

export const cursorContrast = defineRule({
  id: "cursor/low-contrast",
  kind: "lint",
  severity: "error",
  options: { ratio: 1.6, seconds: 0.1 },
  docs: {
    summary: "A cursor always stands out from what it's over.",
    why: "A cursor the same colour as the bar, button or chip under it disappears at the moment it matters most, when it points at something.",
    fix: "Change what's under the cursor (a different colour for the hovered element, or a hover state that lightens it), or point at a different spot. Keep the cursor's own colour, because the viewer recognises it by that colour throughout the film.",
  },
  check({ film, options, report }) {
    for (const el of film.elements.filter((e) => e.role === "cursor")) {
      const blend: number[] = [];
      let what = "";
      for (const f of el.frames) {
        const s = el.at(f)!;
        const glyph = [s.raw, ...el.contents(f)].find(
          (r) => r.pf && parseColour(r.pf),
        );
        const fill = parseColour(glyph?.pf);
        if (!fill || s.opacity < 0.5) continue;
        const p = s.raw.tp
          ? { x: s.raw.tp[0], y: s.raw.tp[1] }
          : { x: s.box[0] + s.box[2] * 0.3, y: s.box[1] + s.box[3] * 0.3 };
        // The topmost painted surface under the pointer, outside the cursor itself.
        const under = film
          .rows(f)
          .filter(
            (r) =>
              r.t !== "t" &&
              r.bg &&
              !isAncestor(s.raw.k, r.k) &&
              r.k !== s.raw.k &&
              r.o > 0.5,
          )
          .filter(
            (r) =>
              p.x >= r.v[0] &&
              p.x <= r.v[0] + r.v[2] &&
              p.y >= r.v[1] &&
              p.y <= r.v[1] + r.v[3],
          )
          .map((r) => ({ r, c: parseColour(r.bg) }))
          .filter((x) => x.c && x.c[3] > 0.5)
          .pop();
        // An outline or halo (a stroke, or a drop-shadow around the wedge) that stands out from
        // the surface separates the cursor even when its fill matches.
        const edges = [
          glyph?.ps,
          ...(glyph?.sh ?? "")
            .split(" | ")
            .filter((x) => x.includes("drop-shadow"))
            .map((x) => x.match(/rgba?\([^)]*\)/)?.[0]),
        ]
          .map((c) => parseColour(c ?? undefined))
          .filter(
            (c): c is [number, number, number, number] => !!c && c[3] > 0.5,
          );
        const separated =
          under && edges.some((e) => contrast(e, under.c!) >= options.ratio);
        if (under && !separated && contrast(fill, under.c!) < options.ratio) {
          blend.push(f);
          what = `${under.r.bg} under a ${glyph!.pf} cursor`;
        }
      }
      for (const [a, b] of runs(blend, 2))
        if ((b - a + 1) / film.fps >= options.seconds)
          report({
            element: el,
            frames: [a, b],
            measured: `it blends into what it's over (${what})`,
            need: `contrast of at least ${options.ratio}:1`,
          });
    }
  },
});

export const motionRules = [
  linear,
  weakOut,
  noEaseIn,
  abruptStop,
  stutter,
  edgeReversal,
  cursorStretch,
  deadExit,
  popsIn,
  cursorContrast,
  harshSettle,
];
