/**
 * Pace and framing: how much of the film is changing, and whether the view is zoomed in on
 * where the change is. Calibrated on product films people judged: the ones that held attention
 * were never still for more than about 0.9 s and had something changing about 65% of the time
 * (slow drift aside) with a large change half the time; films judged boring sat near 40%.
 */
import {
  area,
  intersect,
  isAncestor,
  union,
  type Element,
  type Film,
} from "../film.ts";
import { defineRule } from "../rule.ts";
import type { Box } from "../types.ts";
import { viewer, type Read } from "../viewer.ts";
import { px, runs, surfacesAt } from "./util.ts";

/** Frames where at least `share` of the canvas changes. */
const activeFrames = (film: Film, share: number, substantial = false) => {
  const act = film.activity();
  return film.frames.filter(
    (f) =>
      ((substantial ? act.get(f)?.bigShare : act.get(f)?.share) ?? 0) >= share,
  );
};

export const activity = defineRule({
  id: "pace/activity",
  kind: "lint",
  severity: "error",
  options: { share: 0.01, warnBelow: 0.6, errorBelow: 0.45 },
  docs: {
    summary:
      "On at least 60% of the film's frames, something changes over at least 1% of the canvas (a warning below 60%, an error below 45%).",
    why: "When nothing changes on screen, viewers tend to stop watching, and the film looks like a slideshow. Films that hold attention have something changing almost all the time: elements appearing one by one, the next element arriving, or a zoom toward what matters next. A frame counts as changing when elements covering at least 1% of the canvas move faster than 45 px/s at 1080p, resize, fade, change their text, appear or disappear. Slow, steady movement (see `camera/creep`) doesn't count.",
    fix: "Split long sections into shorter ones that each show one thing, bring elements in one at a time instead of showing them complete, and bring in the next element while the viewer reads text. A slow zoom or drift doesn't count as change.",
    options: {
      share:
        "The minimum share of the canvas (0.01 is 1%) that must change for a frame to count as changing.",
      warnBelow:
        "The share of frames (0.6 is 60%) that must be changing; below it the rule reports a warning.",
      errorBelow:
        "The share of changing frames below which the finding is an error instead of a warning.",
    },
  },
  check({ film, options, report }) {
    const share = activeFrames(film, options.share).length / film.frames.length;
    if (share >= options.warnBelow) return;
    report({
      frames: [film.frames[0], film.frames[film.frames.length - 1]],
      measured: `something changes over at least 1% of the canvas on only ${(share * 100).toFixed(0)}% of the frames`,
      need: `something changing on at least ${(options.warnBelow * 100).toFixed(0)}% of the frames`,
      severity: share < options.errorBelow ? "error" : "warn",
    });
  },
});

export const deadAir = defineRule({
  id: "pace/dead-air",
  kind: "lint",
  severity: "error",
  options: { share: 0.01, warnAfter: 1.0, errorAfter: 2.0, endHold: 2.5 },
  docs: {
    summary:
      "The film never goes more than 1.0 s without something changing over at least 1% of the canvas (an error after 2.0 s), except for a still ending of up to 2.5 s.",
    why: "A picture that stays frozen looks as if the video has stalled. A frame counts as changing when elements covering at least 1% of the canvas move faster than 45 px/s at 1080p, resize, fade, change their text, appear or disappear. A slow zoom or drift doesn't count, because it doesn't show the viewer anything new. The end of the film, for example a logo or end card, may stay still for up to 2.5 s.",
    fix: "Add change to the still stretch (bring in the next element, reveal a detail, or animate part of what's shown), zoom toward the next thing that matters with an eased move, or start the next section sooner.",
    options: {
      share:
        "The minimum share of the canvas (0.01 is 1%) that must change for a frame to count as changing.",
      warnAfter:
        "The longest time, in seconds, the film may go without change before the rule reports a warning.",
      errorAfter:
        "The time, in seconds, without change after which the finding is an error instead of a warning.",
      endHold:
        "How long, in seconds, the film may stay unchanged at its very end without a finding.",
    },
  },
  check({ film, options, report }) {
    const act = film.activity();
    const still = film.frames.filter(
      (f) => (act.get(f)?.share ?? 0) < options.share,
    );
    const last = film.frames[film.frames.length - 1];
    for (const [a, b] of runs(still, 1)) {
      const seconds = (b - a + 1) / film.fps;
      if (seconds <= options.warnAfter) continue;
      if (b >= last - 1 && seconds <= options.endHold) continue;
      report({
        frames: [a, b],
        measured: `nothing changes over 1% or more of the canvas for ${seconds.toFixed(1)} s`,
        need: `no more than ${options.warnAfter} s without change`,
        severity: seconds > options.errorAfter ? "error" : "warn",
      });
    }
  },
});

export const longShot = defineRule({
  id: "pace/long-shot",
  kind: "lint",
  severity: "warn",
  options: { bigChange: 0.08, seconds: 3.5 },
  docs: {
    summary:
      "At least every 3.5 s, something changes substantially over at least 8% of the canvas.",
    why: "When the same layout stays on screen while three things happen in it one after another, the film feels like a slideshow. Three short sections that each show one thing keep the film moving and give each idea its own moment. A change counts as substantial when an element moves faster than 45 px/s at 1080p, resizes, appears, disappears, fades quickly or changes its text; small fades and slow drift don't count.",
    fix: "Give each thing the layout shows its own section, or zoom in on the part that changes and move across to the next element, instead of changing details inside a layout that stays still.",
    options: {
      bigChange:
        "The minimum share of the canvas (0.08 is 8%) that must change substantially for a frame to count as a large change.",
      seconds:
        "The longest time, in seconds, allowed between two large changes (or between the start or end of the film and the nearest one).",
    },
  },
  check({ film, options, report }) {
    const big = activeFrames(film, options.bigChange, true);
    const marks = [film.frames[0], ...big, film.frames[film.frames.length - 1]];
    for (let i = 1; i < marks.length; i += 1) {
      const seconds = (marks[i] - marks[i - 1]) / film.fps;
      if (seconds > options.seconds)
        report({
          frames: [marks[i - 1], marks[i]],
          measured: `for ${seconds.toFixed(1)} s, nothing changes substantially over a large part of the canvas`,
          need: `a change over at least ${(options.bigChange * 100).toFixed(0)}% of the canvas at least every ${options.seconds} s`,
        });
    }
  },
});

export const smallAction = defineRule({
  id: "staging/small-action",
  kind: "lint",
  severity: "warn",
  options: { region: 0.06, surface: 0.25, seconds: 0.8 },
  docs: {
    summary:
      "While a surface covering 25% to 95% of the canvas is visible, the substantial changes on screen are not all inside one region of 6% of the canvas or less for 0.8 s or longer. When they are, the view should zoom in on that region.",
    why: "If someone is typing in an input at the bottom of a large, otherwise empty window, the viewer has nothing to look at in the rest of the canvas, and the text being typed is small. Zooming in on the input makes it large and shows only what matters. The rule takes, on each frame, the rectangle around everything that moves faster than 45 px/s at 1080p, resizes, appears, disappears, fades quickly or changes its text, and checks whether a surface (a window, card or panel) covering 25% to 95% of the canvas is visible at the same time.",
    fix: "Zoom in by scaling the whole film's content about the region that's changing, or crop to it, then zoom back out when something happens elsewhere. The finding gives the region's size and position in px.",
    options: {
      region:
        "The largest share of the canvas (0.06 is 6%) the changing region may cover for the rule to apply.",
      surface:
        "The smallest share of the canvas (0.25 is 25%) a visible surface must cover for the rule to apply.",
      seconds:
        "How long, in seconds, the change must stay inside a small region before the rule reports it.",
    },
  },
  check({ film, options, report }) {
    const act = film.activity();
    const hits: [number, Box][] = [];
    for (const f of film.frames) {
      // Slow drift doesn't show anything: judge where the substantial change is.
      const a = act.get(f);
      if (!a?.bigRegion || a.bigShare <= 0) continue;
      const surfaces = surfacesAt(film, f, options.surface, 0.95);
      if (!surfaces.length || area(a.bigRegion) > options.region * film.area)
        continue;
      hits.push([f, a.bigRegion]);
    }
    for (const [a, b] of runs(
      hits.map((h) => h[0]),
      3,
    )) {
      if ((b - a + 1) / film.fps < options.seconds) continue;
      // The typical region, not their union: the change may move around inside the large surface.
      const boxes = hits
        .filter((h) => h[0] >= a && h[0] <= b)
        .map((h) => h[1])
        .sort((p, q) => area(p) - area(q));
      const r = boxes[Math.floor(boxes.length / 2)];
      report({
        frames: [a, b],
        measured: `for ${((b - a + 1) / film.fps).toFixed(1)} s, everything that changes is inside a ${r[2].toFixed(0)}x${r[3].toFixed(0)} px region at (${r[0].toFixed(0)}, ${r[1].toFixed(0)}) while a large surface is visible`,
        need: `a view zoomed in or cropped so the changing region covers more than ${(options.region * 100).toFixed(0)}% of the canvas`,
      });
    }
  },
});

const quoteRead = (r: Read) =>
  `"${r.full.length > 40 ? `${r.full.slice(0, 38)}…` : r.full}"`;

export const smallFocus = defineRule({
  id: "staging/small-focus",
  kind: "lint",
  severity: "warn",
  options: { focus: 0.05, surface: 0.25, seconds: 1.5 },
  docs: {
    summary:
      "The simulated viewer doesn't spend longer than 1.5 s reading or following one thing covering less than 5% of the canvas inside a surface covering 25% to 95% of it. When it does, the view should push in on that thing.",
    why: "When the moment that matters is one line in a large window (a request in a chat bubble, a status, a number), a wide shot leaves it small, and the rest of the canvas shows nothing the viewer needs while they read it. `staging/small-action` can't see this, because it measures the area that changes, and nothing changes while still text is read. This rule follows the simulated viewer (see `docs/terms.md`) and counts only the time the eye needs to spend on the thing: for a line of text, the frames in which the viewer, reading 3.5 words a second, still has words of it left to read; for another element (cursors aside), the frames in which it changes. These don't count: looking on after a line is read; reading again what the viewer already read of a text when the same text comes back into view (it scrolled away, or a list above it collapsed); finishing a line after the camera pulls back from it (it was shown at least 1.5 times as tall earlier, so the film did push in on it); and text joined by a connector to another element, because pushing in would hide what it points to. A connector is a line drawn in an svg (of any size), such as a leader line to a marker, with one end within 12 px at 1080p of the text's box, or of the small card the text sits in, and the other end at least 150 px at 1080p away from it; or a line that leaves a surface the text is in from the edge beside the text, with one end within 12 px of that edge and level with the text (within a font size above or below it, or beside it for a top or bottom edge), and the other end outside the surface and at least 150 px away; a bar 6 px thick or less reaching as far counts too. The rule reports more than 1.5 s on the same thing while its box covers less than 5% of the canvas and its centre lies inside a visible surface (a window, card or panel) covering 25% to 95% of the canvas. The finding quotes the text and gives its words, so a line read together with the lines around it as one paragraph is easy to recognise.",
    fix: "Push in on the thing being looked at: scale the film's content up about it with an eased move, so it covers well over 5% of the canvas, then pull back when the eye has to move on. Cropping to the part of the surface around it works too. Don't accept this finding as a pause for reading: the pause is fine, the framing is what is wrong.",
    options: {
      focus:
        "The largest share of the canvas (0.05 is 5%) the thing being looked at may cover for the rule to apply.",
      surface:
        "The smallest share of the canvas (0.25 is 25%) a visible surface must cover for the rule to apply.",
      seconds:
        "The longest time, in seconds, the eye may spend on one small thing in a wide shot.",
    },
  },
  check({ film, options, report }) {
    const v = viewer(film);
    const act = film.activity();
    const near = px(film, 12);
    const reach = px(film, 150);
    // How far the viewer has read each line; the share of each text it has read, over every time
    // that text was on screen; and that share when each line was first looked at.
    const progress = new Map<Read, number>();
    const share = new Map<string, number>();
    const prior = new Map<Read, number>();
    /** The film already pushed in on the line: earlier it was shown at least 1.5 times as tall. */
    const pushedIn = (r: Read, f: number, box: Box) => {
      for (const [k, b] of r.boxes) {
        if (k >= f) break;
        if (b[3] >= 1.5 * box[3]) return true;
      }
      return false;
    };
    const text = (r: Read) => r.full.replace(/\s+/g, " ").trim();
    /** A connector (an svg, or a thin bar) from the text, or the small card it's in, to somewhere else. */
    const linked = (r: Read, f: number, box: Box) => {
      const rows = film.rows(f);
      const keys = [...r.elements].map((e) => e.at(f)?.raw.k ?? "");
      const card = rows
        .filter(
          (x) =>
            x.t === "b" &&
            area(x.v) < 0.1 * film.area &&
            keys.some((k) => isAncestor(x.k, k)),
        )
        .sort((a, b) => area(a.v) - area(b.v))[0];
      // Text that paints its own card (a bubble, a tag) is anchored by that card.
      const own = rows.find((x) => x.pb && keys.includes(x.k))?.pb;
      const anchor = own ?? card?.v ?? box;
      const grown: Box = [
        anchor[0] - near,
        anchor[1] - near,
        anchor[2] + 2 * near,
        anchor[3] + 2 * near,
      ];
      const away = (x: number, y: number) =>
        Math.hypot(
          Math.max(anchor[0] - x, 0, x - anchor[0] - anchor[2]),
          Math.max(anchor[1] - y, 0, y - anchor[1] - anchor[3]),
        );
      const touches = (x: number, y: number) => away(x, y) <= near;
      // Or a line that leaves a surface the text is in from the edge beside the text: its near end
      // on that edge, level with the text (within a font size), and its far end outside the surface.
      const surfaces = rows
        .filter((x) => x.t === "b" && keys.some((k) => isAncestor(x.k, k)))
        .map((x) => x.v);
      const inside = (b: Box, x: number, y: number) =>
        x > b[0] && x < b[0] + b[2] && y > b[1] && y < b[1] + b[3];
      const leaves = (x0: number, y0: number, x1: number, y1: number) =>
        surfaces.some((b) => {
          const onSide =
            (Math.abs(x0 - b[0]) <= near ||
              Math.abs(x0 - b[0] - b[2]) <= near) &&
            y0 >= box[1] - r.size &&
            y0 <= box[1] + box[3] + r.size;
          const onTopOrBottom =
            (Math.abs(y0 - b[1]) <= near ||
              Math.abs(y0 - b[1] - b[3]) <= near) &&
            x0 >= box[0] - r.size &&
            x0 <= box[0] + box[2] + r.size;
          return (
            (onSide || onTopOrBottom) &&
            !inside(b, x1, y1) &&
            Math.hypot(x1 - x0, y1 - y0) >= reach
          );
        });
      return rows.some((x) => {
        if (
          x.o < 0.3 ||
          keys.some((k) => isAncestor(k, x.k) || isAncestor(x.k, k)) ||
          (card && isAncestor(card.k, x.k))
        )
          return false;
        // A line drawn in an svg of any size: one end at the text, the other far from it.
        if (x.sk)
          return x.sk.some(
            ([x0, y0, x1, y1]) =>
              (touches(x0, y0) && away(x1, y1) >= reach) ||
              (touches(x1, y1) && away(x0, y0) >= reach) ||
              leaves(x0, y0, x1, y1) ||
              leaves(x1, y1, x0, y0),
          );
        // A thin bar from the text reaching away.
        const b = x.v;
        if (
          x.t !== "b" ||
          Math.min(b[2], b[3]) > px(film, 6) ||
          area(intersect(b, grown)) <= 0
        )
          return false;
        const u = union([anchor, b]);
        return u[2] - anchor[2] >= reach || u[3] - anchor[3] >= reach;
      });
    };
    const spans: {
      key: string;
      read?: Read;
      element?: Element;
      frames: number[];
      boxes: Box[];
    }[] = [];
    for (const f of film.frames) {
      const g = v.gaze.get(f);
      if (!g) continue;
      let box: Box | undefined;
      if (g.read) {
        const r = g.read;
        // What the viewer had read of the line before this frame, and by its end.
        const before = progress.get(r) ?? 0;
        const now = g.progress?.read ?? before;
        const words = g.progress?.words ?? r.words;
        progress.set(r, now);
        // Text that scrolled away and came back is the same text: what was read of it still counts.
        if (!prior.has(r)) prior.set(r, share.get(text(r)) ?? 0);
        const readBy = (x: number) => Math.min(1, prior.get(r)! + x / words);
        share.set(text(r), Math.max(share.get(text(r)) ?? 0, readBy(now)));
        // Looking on after reading it, or reading it again, shows nothing new.
        if (readBy(before) * words >= words - 0.25) continue;
        box = r.boxes.get(f);
        if (!box || pushedIn(r, f, box) || linked(r, f, box)) continue;
      } else if (
        g.element &&
        !["cursor", "part", "label"].includes(g.element.role) &&
        act.get(f)?.moved.has(g.element)
      )
        box = g.element.at(f)?.visible;
      if (!box || area(box) <= 0 || area(box) >= options.focus * film.area)
        continue;
      const c = [box[0] + box[2] / 2, box[1] + box[3] / 2];
      const wide = surfacesAt(film, f, options.surface, 0.95).some(
        (s) =>
          c[0] >= s.visible[0] &&
          c[0] <= s.visible[0] + s.visible[2] &&
          c[1] >= s.visible[1] &&
          c[1] <= s.visible[1] + s.visible[3],
      );
      if (!wide) continue;
      const key = g.read ? `read ${g.read.id}` : g.element!.id;
      const last = spans[spans.length - 1];
      if (
        last &&
        last.key === key &&
        f - last.frames[last.frames.length - 1] <= 2
      ) {
        last.frames.push(f);
        last.boxes.push(box);
      } else
        spans.push({
          key,
          read: g.read,
          element: g.element ?? [...g.read!.elements][0],
          frames: [f],
          boxes: [box],
        });
    }
    for (const { read: r0, element, frames, boxes } of spans) {
      const [a, b] = [frames[0], frames[frames.length - 1]];
      const seconds = (b - a + 1) / film.fps;
      if (seconds <= options.seconds) continue;
      const r = [...boxes].sort((p, q) => area(p) - area(q))[
        Math.floor(boxes.length / 2)
      ];
      report({
        element,
        frames: [a, b],
        measured: `${r0 && !element?.label.includes(r0.full.slice(0, 24)) ? `the text ${quoteRead(r0)} ` : ""}holds the simulated viewer's eye for ${seconds.toFixed(1)} s${r0 ? ` (${r0.words.toFixed(0)} words to read)` : ""} while covering only ${((area(r) / film.area) * 100).toFixed(1)}% of the canvas (${r[2].toFixed(0)}x${r[3].toFixed(0)} px at (${r[0].toFixed(0)}, ${r[1].toFixed(0)})), inside a large surface`,
        need: `a view pushed in or cropped so what the eye spends more than ${options.seconds} s on covers at least ${(options.focus * 100).toFixed(0)}% of the canvas`,
      });
    }
  },
});

export const creep = defineRule({
  id: "camera/creep",
  kind: "lint",
  severity: "error",
  options: { seconds: 1.2, area: 0.03 },
  docs: {
    summary:
      "Elements covering at least 3% of the canvas don't move or zoom slowly (slower than 45 px/s at 1080p and under 0.6% of their size per frame) for 1.2 s or longer.",
    why: "A slow, steady zoom or pan makes the picture move without showing the viewer anything new, so it looks like filler. A zoom or pan should go toward something, such as the part of the canvas where something is happening, with an eased curve, and then come to rest. The slow end of a real move that just happened is not reported. `pace/activity` and `pace/dead-air` don't count this slow movement as change.",
    fix: "Replace the slow movement with real change (bring in the next element, or reveal a detail), or make it an eased zoom or pan toward something specific that then comes to rest.",
    options: {
      seconds:
        "How long, in seconds, the slow movement must last before the rule reports it.",
      area: "The minimum share of the canvas (0.03 is 3%) the slowly moving elements must cover together.",
    },
  },
  check({ film, options, report }) {
    const act = film.activity();
    // Frames where something sizeable drifts: a slow zoom or pan on the frame, a title, a card.
    const creeping = film.frames.filter(
      (f) => (act.get(f)?.drift?.share ?? 0) >= options.area,
    );
    // A sub-pixel drift sometimes rounds to no motion for a frame or two: bridge those.
    for (const [a, b] of runs(
      creeping,
      Math.max(2, Math.round(film.fps / 10)),
    )) {
      const seconds = (b - a + 1) / film.fps;
      if (seconds < options.seconds) continue;
      // What drifted most of the time.
      const count = new Map<Element, number>();
      for (let f = a; f <= b; f += 1)
        for (const el of act.get(f)?.drift?.elements ?? [])
          if (el.role !== "cursor") count.set(el, (count.get(el) ?? 0) + 1);
      const main = [...count].sort((x, y) => y[1] - x[1])[0]?.[0];
      if (!main) continue;
      // The long, slow end of a real move isn't reported: it carries on from that move and slows
      // to a stop. Slow movement that is reported speeds up on its own, or keeps its pace.
      const rates: number[] = [];
      for (let f = a; f <= b; f += 1) {
        const s = main.at(f);
        const p = main.at(f - 1);
        if (s && p)
          rates.push(Math.max(...s.box.map((v, i) => Math.abs(v - p.box[i]))));
      }
      const span = Math.max(1, Math.round(film.fps / 6));
      const smooth = rates.map(
        (_, i) => rates.slice(i, i + span).reduce((x, y) => x + y, 0) / span,
      );
      const settling = film.frames.some(
        (f) =>
          f < a &&
          f >= a - Math.round(film.fps / 5) &&
          act.get(f)?.moved.has(main),
      );
      if (
        settling &&
        Math.max(...smooth) < 1.5 * smooth[0] &&
        smooth[smooth.length - span] < smooth[0] / 3
      )
        continue;
      const s0 = main!.at(a) ?? main!.at(main!.first)!;
      const s1 = main!.at(b) ?? main!.at(main!.last)!;
      const zoom = ((s1.box[2] / s0.box[2]) ** (1 / seconds) - 1) * 100;
      report({
        element: main,
        frames: [a, b],
        measured: `moves slowly and steadily for ${seconds.toFixed(1)} s${Math.abs(zoom) > 0.1 ? `, zooming ${zoom.toFixed(1)}% a second` : ""}, slower than 45 px/s at 1080p`,
        need: "either an eased move faster than 45 px/s at 1080p that comes to rest, or no movement",
      });
    }
  },
});

export const activityRules = [
  activity,
  deadAir,
  longShot,
  smallAction,
  smallFocus,
  creep,
];
