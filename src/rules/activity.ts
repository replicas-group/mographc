/**
 * Energy and framing: how much of the film is alive, and whether the camera is where the
 * action is. Calibrated on product films people judged: the ones that held attention were
 * never still for more than about 0.9 s and had something changing about 65% of the time
 * (slow drift aside) with a big change half the time; films judged boring sat near 40%.
 */
import { area, type Element, type Film } from "../film.ts";
import { defineRule } from "../rule.ts";
import type { Box } from "../types.ts";
import { runs, surfacesAt } from "./util.ts";

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
      "Something meaningful is moving most of the time, so the film never plays like a slideshow.",
    why: "When nothing moves, viewers tend to stop watching. Films that hold attention have something changing almost all the time: a build, the next element arriving, or a camera move toward a subject. The rule measures the share of time at least 1% of the frame is changing, not counting slow drift (`camera/creep`).",
    fix: "Break long shots into back-to-back sections (three things to show are three beats, not one frame), build elements in rather than showing them complete, and bring the next element in while text is read. A slow zoom or drift does not count.",
  },
  check({ film, options, report }) {
    const share = activeFrames(film, options.share).length / film.frames.length;
    if (share >= options.warnBelow) return;
    report({
      frames: [film.frames[0], film.frames[film.frames.length - 1]],
      measured: `something is moving ${(share * 100).toFixed(0)}% of the time`,
      need: `at least ${(options.warnBelow * 100).toFixed(0)}%`,
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
      "There is never more than about a second where nothing meaningful moves.",
    why: "A frame that stays frozen looks like the video has stalled. A slow zoom or drift isn't counted as movement, because it doesn't show the viewer anything new. The final hold on a logo or end card may be still.",
    fix: "Keep the shot alive with content (a build, a detail revealed, the next element arriving), make a deliberate eased camera move to the next subject, or cut to the next section sooner.",
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
        measured: `nothing meaningful moves for ${seconds.toFixed(1)} s`,
        need: `at most ${options.warnAfter} s of stillness`,
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
      "A shot is held for a few seconds at most before the composition changes.",
    why: "When one frame shows three things in turn, the film feels like a slideshow. Three short sections that each show one thing keep the film moving and give each idea its own moment.",
    fix: "Split the shot: give each thing it shows its own section, or move the camera (push in on what changes, pan to the next element) instead of changing details inside a still frame.",
  },
  check({ film, options, report }) {
    const big = activeFrames(film, options.bigChange, true);
    const marks = [film.frames[0], ...big, film.frames[film.frames.length - 1]];
    for (let i = 1; i < marks.length; i += 1) {
      const seconds = (marks[i] - marks[i - 1]) / film.fps;
      if (seconds > options.seconds)
        report({
          frames: [marks[i - 1], marks[i]],
          measured: `one composition held for ${seconds.toFixed(1)} s with no big change`,
          need: `a new section or camera move every ${options.seconds} s or less`,
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
      "When the only thing happening is in a small part of a large still shot, the camera pushes in on it.",
    why: "If someone is typing in an input at the bottom of a big empty window, the eye has nothing to do with the rest of the frame. The shot should be on the input.",
    fix: "Push in (scale the composition about the action) or crop to the region that's changing, then pull back when the next thing happens elsewhere. The finding gives the region.",
  },
  check({ film, options, report }) {
    const act = film.activity();
    const hits: [number, Box][] = [];
    for (const f of film.frames) {
      // A drifting camera doesn't frame anything: judge where the substantial change is.
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
      // The typical region, not their union: the action may move around inside the still shot.
      const boxes = hits
        .filter((h) => h[0] >= a && h[0] <= b)
        .map((h) => h[1])
        .sort((p, q) => area(p) - area(q));
      const r = boxes[Math.floor(boxes.length / 2)];
      report({
        frames: [a, b],
        measured: `for ${((b - a + 1) / film.fps).toFixed(1)} s the only action is a ${r[2].toFixed(0)}x${r[3].toFixed(0)} region at (${r[0].toFixed(0)}, ${r[1].toFixed(0)}) inside a still surface`,
        need: "the shot framed on where the action is",
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
      "There is no slow, constant zoom or pan on the whole frame added just to keep it moving.",
    why: "A slow, constant zoom or pan makes the frame move without showing the viewer anything new, so it comes across as filler. A camera move should go to a subject (for example, push in on the action), ease, and settle. mographc doesn't count a creep as activity for `pace/activity`.",
    fix: "Keep the hold alive with content (build the next element in, reveal a detail, bring in the next beat) or make the camera move a deliberate eased push to a subject that then settles.",
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
      // The long settle at the end of a real move isn't a creep: it carries on from that move and
      // slows to rest. A creep picks up speed on its own, or holds its pace.
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
        measured: `creeps for ${seconds.toFixed(1)} s${Math.abs(zoom) > 0.1 ? `, zooming ${zoom.toFixed(1)}% a second` : ""}: too slow to read as a move`,
        need: "a deliberate eased move, or content that moves",
      });
    }
  },
});

export const activityRules = [activity, deadAir, longShot, smallAction, creep];
