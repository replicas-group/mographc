/**
 * What only shows in the rendered pixels: text that shimmers as the renderer snaps it to the pixel
 * grid, and motion that updates on fewer frames than the film has.
 */
import { defineRule } from "../rule.ts";
import { runs } from "./util.ts";

export const shimmer = defineRule({
  id: "render/shimmer",
  kind: "lint",
  severity: "error",
  needsRender: true,
  options: { seconds: 0.3, area: 0.002 },
  docs: {
    summary:
      "No part of the picture with text or edges in it shimmers for 0.3 s or longer: keeps changing sharply from frame to frame while ending up where it was a quarter of a second earlier, over at least 0.2% of the canvas.",
    why: "When text or a surface carrying text is pulsed, nudged or redrawn at each step of a small scale change, the renderer snaps every glyph to the pixel grid on its own, so the text visibly shakes even though in the DOM it barely moves. This is measured on the rendered picture, which the DOM can't show: in blocks of 32 px at 1080p that contain edges (text, outlines), a block shimmers on a frame when it changed sharply (a step of at least a third of the brightness range) on at least a third of the last quarter of a second, while differing from a quarter of a second earlier on almost none of its pixels. Frames where more than 3% of the canvas changes, during a move or a cut, aren't counted, since motion hides it.",
    fix: "Find what moves by a pixel or two and back at the reported time: a pulse, an overshoot or a slow scale on a surface with text. Animate a border, fill or shape that carries no text instead, or put moving text on a layer of its own (`will-change: transform`, drawn at its largest size and only scaled down), so the renderer moves a finished picture of it.",
    options: {
      seconds: "How long, in seconds, the shimmer must last to be reported.",
      area: "The smallest share of the canvas (0.002 is 0.2%) that must shimmer on a frame.",
    },
  },
  check({ film, rendered, options, report }) {
    if (!rendered) return;
    const p = rendered.picture;
    const blocks = p.cols * p.rows;
    const blockShare = (p.block * p.block) / (p.width * p.height);
    const hits: number[] = [];
    const worst = new Map<number, number>();
    for (let t = p.span; t < rendered.frames; t += 1) {
      let busy = 0;
      for (let k = t - p.span + 1; k <= t; k += 1)
        busy = Math.max(busy, p.changed[k]);
      if (busy > 0.03) continue;
      let n = 0;
      for (let b = 0; b < blocks; b += 1) {
        if (p.spanBlocks[t][b] > 3 || p.detailBlocks[t][b] < 13) continue;
        let c = 0;
        for (let k = t - p.span + 1; k <= t; k += 1)
          if (p.sharpBlocks[k][b] >= 3) c += 1;
        if (c >= p.span / 3) n += 1;
      }
      if (n * blockShare >= options.area) {
        hits.push(t);
        worst.set(t, n);
      }
    }
    for (const [a, b] of runs(hits, Math.round(film.fps / 10))) {
      const seconds = (b - a + 1) / film.fps;
      if (seconds < options.seconds) continue;
      const most = Math.max(
        ...hits.filter((f) => f >= a && f <= b).map((f) => worst.get(f)!),
      );
      report({
        frames: [Math.max(0, a - p.span), b],
        measured: `the picture shimmers for ${seconds.toFixed(2)} s, over up to ${(most * blockShare * 100).toFixed(1)}% of the canvas: edges keep jumping from frame to frame and coming back`,
        need: `edges that hold still or move one way, with no shimmer lasting ${options.seconds} s`,
      });
    }
  },
});

export const lowFrameRate = defineRule({
  id: "render/low-frame-rate",
  kind: "lint",
  severity: "error",
  needsRender: true,
  options: { share: 0.005, held: 6 },
  docs: {
    summary:
      "Motion updates on every frame: the picture never holds still on every other frame, 6 times in a row, while the frames around the held ones change over at least 0.5% of the canvas.",
    why: "A move that only updates on every other frame (a screen recording at 30 fps in a 60 fps film, an animation stepped by hand, or a frame rate set per layer) judders next to the smooth motion around it, and viewers read it as low quality. It is measured on the rendered picture: a frame that is identical to the one before, between two frames that each change over at least 0.5% of the canvas, is a held frame, and motion stepped at half the frame rate holds on every other frame for as long as it moves. Held frames at an irregular rhythm, as typing makes, aren't reported.",
    fix: "Render every moving layer at the film's frame rate: record or export product footage at the film's frame rate, interpolate keyframes on every frame instead of stepping them, and don't round `frame` to a coarser step for anything that moves.",
    options: {
      share:
        "The share of the canvas (0.005 is 0.5%) the frames around a held frame must change for it to count.",
      held: "How many held frames in a row, each two frames after the last, are reported.",
    },
  },
  check({ film, rendered, options, report }) {
    if (!rendered) return;
    const c = rendered.picture.changed;
    const held: number[] = [];
    for (let f = 1; f < c.length - 1; f += 1)
      if (
        c[f] < 0.0002 &&
        c[f - 1] >= options.share &&
        c[f + 1] >= options.share
      )
        held.push(f);
    for (const [a, b] of runs(held, 2)) {
      const n = held.filter((f) => f >= a && f <= b).length;
      if (n < options.held) continue;
      report({
        frames: [a - 1, b + 1],
        measured: `the picture holds still on ${n} frames between frames that move, as if it updates at ${Math.round(film.fps / 2)} fps or less`,
        need: `motion that updates on every frame, at the film's ${film.fps} fps`,
      });
    }
  },
});

export const cutoutFragments = defineRule({
  id: "assets/cutout-fragments",
  kind: "lint",
  severity: "error",
  options: { area: 0.01 },
  docs: {
    summary:
      "A cut-out image (one with transparency) shown over at least 1% of the canvas is one piece: none of its opaque parts are detached from the largest one and end in a straight cut.",
    why: "When a photo is cut out by a background remover, parts of the subject that were overlapped or touched the edge (fingertips around a phone, hair over a shoulder) come out as separate islands with flat, chopped edges. Composited over the film they float next to the subject and look broken. It is measured on the image's own transparency, once per image: the opaque pieces apart from the largest (each at least 0.2% of its opaque area), and whether a piece has a straight edge at least 4% of the image's size long along a row or column inside the image. Images whose largest piece is less than 70% of their opaque area (a wordmark, an illustration of many parts) and logos aren't checked.",
    fix: "Fix the matte, not the film: cut the image out again with a better mask, paint the detached pieces back onto the subject or delete them, or crop or cover the part where they are so they're never on screen.",
    options: {
      area: "The smallest share of the canvas (0.01 is 1%) the image must cover to be checked.",
    },
  },
  check({ film, options, report }) {
    for (const el of film.elements) {
      if (el.role === "logo") continue;
      const fs = el.frames.filter((f) => {
        const s = el.at(f)!;
        return (
          (s.raw.mt?.[1] ?? 0) > 0 &&
          s.opacity > 0.3 &&
          s.visible[2] * s.visible[3] >= options.area * film.area
        );
      });
      if (!fs.length) continue;
      const [pieces, chopped] = el.at(fs[0])!.raw.mt!;
      report({
        element: el,
        frames: [fs[0], fs[fs.length - 1]],
        measured: `is a cut-out with ${pieces} piece${pieces === 1 ? "" : "s"} detached from the main one, ${chopped} of them ending in a straight cut`,
        need: "a cut-out in one piece, with no detached, chopped parts",
      });
    }
  },
});
export const renderedRules = [shimmer, lowFrameRate, cutoutFragments];
