/**
 * Reveals: the moments a film brings in what it is about. A reveal works when everything in the
 * film works on it together: the camera and the sound build toward it, the subject lands with the
 * camera's settle and the sound's hit, and the film holds on it. Calibrated on a launch film a person
 * called robotic ("zoom, pop it in, move on") and on one they approved and posted.
 */
import { area, type Element, type Film } from "../film.ts";
import type { Rendered } from "../render.ts";
import { defineRule } from "../rule.ts";
import type { Box } from "../types.ts";
import { px } from "./util.ts";

export interface Reveal {
  /** The element brought in, when the film model has one (a video file on its own has none). */
  element?: Element;
  /** When it starts to arrive, and the frame it lands (comes to rest, fully shown). */
  from: number;
  landed: number;
  /** Its box once landed (for a video file: the region of the picture that changed). */
  box: Box;
  /** The film's first reveal, of the subject its opening is about. */
  opening: boolean;
  /** Marked as a key reveal with `data-motion-reveal`. */
  marked: boolean;
}

const SKIP = new Set(["cursor", "logo", "label", "part", "text", "headline"]);

/** Tagged elements other than cursors, logos and text that animate in on their own, with where they land. */
export const arrivals = (film: Film) => {
  const still = px(film, 0.5);
  const out: Reveal[] = [];
  for (const el of film.elements) {
    const marked = el.frames.some((f) => el.at(f)!.raw.rv);
    if (!el.tagged || (SKIP.has(el.role) && !marked)) continue;
    const frames = el.frames.filter((f) => {
      const s = el.at(f)!;
      return s.opacity > 0.05 && area(s.visible) > 0;
    });
    // On screen from the film's first frame: it was not brought in.
    if (frames.length < 3 || frames[0] <= 1) continue;
    const first = frames[0];
    const a = el.at(first)!;
    // Lands: still to within half a pixel and fully shown for 3 frames, at most 1.5 s after it starts.
    let landed = -1;
    for (const f of frames) {
      if (f > first + 1.5 * film.fps) break;
      const ok = [0, 1, 2].every((k) => {
        const s = el.at(f + k);
        const p = el.at(f + k - 1);
        return (
          s &&
          p &&
          s.opacity >= 0.9 &&
          s.box.every((v, i) => Math.abs(v - p.box[i]) <= still)
        );
      });
      if (ok) {
        landed = f;
        break;
      }
    }
    if (landed < 0 || (landed <= first + 1 && !marked)) continue;
    const b = el.at(landed)!;
    // Animated in: its box or its opacity changes on the way.
    if (
      !marked &&
      a.opacity >= 0.9 &&
      a.box.every((v, i) => Math.abs(v - b.box[i]) <= px(film, 1))
    )
      continue;
    // Carried in by a surface that is itself arriving: that surface is the subject.
    const carried = film.elements.some((other) => {
      if (other === el) return false;
      const o1 = other.at(first);
      const o2 = other.at(landed);
      if (!o1 || !o2 || !a.raw.k.startsWith(`${o1.raw.k}/`)) return false;
      return (
        Math.hypot(o2.box[0] - o1.box[0], o2.box[1] - o1.box[1]) > px(film, 24)
      );
    });
    if (carried) continue;
    out.push({
      element: el,
      from: first,
      landed,
      box: b.visible,
      opening: false,
      marked,
    });
  }
  return out.sort((p, q) => p.from - q.from);
};

/** Runs of frames in which the picture changes over at least `share` of the canvas, merging gaps of up to 4 frames. */
export const bursts = (r: Rendered, share = 0.005) => {
  const out: { from: number; to: number; peak: number }[] = [];
  r.picture.changed.forEach((c, f) => {
    if (c < share) return;
    const last = out[out.length - 1];
    if (last && f - last.to <= 4) {
      last.to = f;
      last.peak = Math.max(last.peak, c);
    } else out.push({ from: f, to: f, peak: c });
  });
  return out;
};

/**
 * The share of the canvas that is new in a frame: blocks where at least a quarter of the pixels differ
 * from a quarter of a second earlier. Unlike the change from the previous frame, it sees a fade.
 */
export const newShare = (r: Rendered, f: number) => {
  const p = r.picture;
  if (f < p.span) return 0;
  let n = 0;
  for (const v of p.spanBlocks[f]) if (v >= 64) n += 1;
  return n / p.spanBlocks[f].length;
};

/** The box around the blocks that changed in a frame, in canvas px. */
const changedBox = (r: Rendered, f: number): Box => {
  const p = r.picture;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  p.changedBlocks[f].forEach((v, b) => {
    if (v < 13) return;
    const x = (b % p.cols) * p.block * p.scale;
    const y = Math.floor(b / p.cols) * p.block * p.scale;
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x + p.block * p.scale);
    y1 = Math.max(y1, y + p.block * p.scale);
  });
  return x1 > x0 ? [x0, y0, x1 - x0, y1 - y0] : [0, 0, 0, 0];
};

/**
 * The reveals a film's hero moments are judged on: its opening reveal (the first thing brought in,
 * unless the film is a cold open, starting on its subject) and every element marked
 * `data-motion-reveal`. A video file on its own has no elements, so its opening
 * reveal is the first burst of change over 3% of the canvas.
 */
export const heroReveals = (
  film: Film,
  rendered: Rendered | undefined,
  hero: number,
  openingWithin: number,
) => {
  const tall = px(film, hero);
  const cold = (film.fps * 0.5) | 0;
  if (film.elements.length) {
    const all = arrivals(film);
    // A cold open: the film starts on its subject. Rendered, that is 15% of the canvas new within
    // the first half second; without a render, what's on screen by then (other than backdrops and
    // windows the camera moves over) spans `hero` px. Either way, so is anything brought in within
    // the first quarter second.
    let coldOpen: boolean;
    if (rendered) {
      coldOpen = false;
      for (let f = 0; f <= cold && f < rendered.frames; f += 1)
        if (newShare(rendered, f) >= 0.15) coldOpen = true;
    } else {
      const shown = film.elements
        .filter((e) => !["cursor", "part", "label"].includes(e.role))
        .map((e) => e.at(cold))
        .filter(
          (s) => !!s && s.opacity > 0.5 && area(s.visible) < 0.25 * film.area,
        )
        .map((s) => s!.visible);
      const top = Math.min(...shown.map((b) => b[1]));
      const bottom = Math.max(...shown.map((b) => b[1] + b[3]));
      coldOpen = shown.length > 0 && bottom - top >= tall;
    }
    // Something brought in within the first quarter second: the film opens in motion on it.
    if (all.some((r) => r.from <= film.fps * 0.25)) coldOpen = true;
    const opening = coldOpen
      ? undefined
      : all.find((r) => r.from <= openingWithin * film.fps);
    return all
      .filter((r) => r === opening || r.marked)
      .map((r) => ({ ...r, opening: r === opening }));
  }
  if (!rendered) return [];
  const first = bursts(rendered).find((b) => b.peak >= 0.03);
  if (
    !first ||
    first.from < film.fps * 0.25 ||
    first.from > openingWithin * film.fps
  )
    return [];
  return [
    {
      from: first.from,
      landed: first.to,
      box: changedBox(rendered, first.to),
      opening: true,
      marked: false,
    },
  ];
};

const mean = (x: Float32Array, a: number, b: number) => {
  let s = 0;
  let n = 0;
  for (let f = Math.max(0, a); f <= Math.min(x.length - 1, b); f += 1) {
    s += x[f];
    n += 1;
  }
  return n ? s / n : NaN;
};

/**
 * The camera over a stretch of frames: of the painted boxes (backdrops, windows, panels) covering at
 * least a quarter of the canvas at both ends, the one whose width changes most, since that is what a
 * zoom scales. Its width on each frame, or 0 when it isn't there.
 */
const camera = (film: Film, a: number, b: number) => {
  let best: Element | undefined;
  let change = 0;
  for (const e of film.elements) {
    if (e.role === "cursor") continue;
    const p = e.at(a);
    const q = e.at(b);
    if (
      !p ||
      !q ||
      p.raw.t !== "b" ||
      p.opacity < 0.5 ||
      q.opacity < 0.5 ||
      area(p.visible) < 0.25 * film.area ||
      area(q.visible) < 0.25 * film.area
    )
      continue;
    const c = Math.abs(Math.log(q.box[2] / Math.max(1, p.box[2])));
    if (!best || c > change) {
      best = e;
      change = c;
    }
  }
  return (f: number) => best?.at(f)?.box[2] ?? 0;
};

export const flatReveal = defineRule({
  id: "reveal/no-build-up",
  kind: "lint",
  severity: "error",
  needsRender: true,
  options: {
    build: 1.5,
    push: 0.05,
    rise: 3,
    dropout: 6,
    hit: 12,
    together: 0.1,
    hold: 0.6,
    opening: 3,
  },
  docs: {
    summary:
      "Each hero reveal (the film's opening reveal, and every element marked `data-motion-reveal`) is built up to over the 1.5 s before it lands, by a camera push of at least 5% and by the sound (the highs rising 3 dB, or the track dropping out 6 dB); it lands within 0.1 s of a sound hit of at least 12 dB and of the camera's settle (a film with no sound track is judged on the camera alone); and nothing else on screen changes for 0.6 s after.",
    why: "A reveal is the moment a film shows what it is about, and it works when the picture and the sound work on it together: the camera eases in toward where the subject will be while the music builds (the highs open up, a riser climbs, or the beat drops out), the subject lands on the hit as the camera settles, and the film holds on it long enough to register. Without that, a reveal reads as 'zoom, pop it in, move on'. The rule finds the film's opening reveal (the first tagged element other than a cursor, logo or text that animates in during the first 3 s, unless the film is a cold open: something is brought in within the first 0.25 s, or 15% of the rendered picture is new within the first 0.5 s) and every element marked as a key reveal with `data-motion-reveal`, which lands when it is still and fully shown. It measures the camera as the width of the painted box (a backdrop, window or panel) covering at least 25% of the canvas whose width changes most over the build; the sound from the rendered track as the loudness of the whole track and of the highs above 4 kHz, in windows of one frame, and hits as sudden rises in loudness. On a video file alone, with no elements, it judges the first burst of change over 3% of the canvas, and the camera push as most of the picture changing.",
    fix: "Stage the reveal as one event. Start a slow, eased push in toward where the subject will land 1 to 2 s before it arrives; build the sound under it (a riser, a filter opening, or drop the kick out), and put the subject's landing, the end of the push and the hit or the return of the beat on the same frame. Then hold on the subject for at least 0.6 s, with nothing else arriving, before the next beat. If the reveal comes in the first second, open on the subject instead, or start the film earlier so there is time to build.",
    options: {
      build:
        "How long before the landing, in seconds, the camera and the sound must build.",
      push: "The smallest zoom in, as a share of the camera layer's width (0.05 is 5%), that counts as a push.",
      rise: "How many dB the highs (above 4 kHz) must rise over the build to count as building.",
      dropout:
        "How many dB the whole track must drop in the second before the landing to count as a drop-out building to the hit.",
      hit: "The smallest sudden rise, in dB summed over the whole track, the highs and the lows, that counts as a hit.",
      together:
        "How far apart, in seconds, the landing, the hit and the camera's settle may be.",
      hold: "How long, in seconds, nothing else may change after the landing.",
      opening:
        "The opening reveal is the first one that starts within this many seconds.",
    },
  },
  check({ film, rendered, options, report }) {
    if (!rendered) return;
    const fps = film.fps;
    const sound = rendered.sound;
    const sec = (f: number) => `${(f / fps).toFixed(2)} s`;
    for (const r of heroReveals(film, rendered, 360, options.opening)) {
      const L = r.landed;
      const B = Math.round(options.build * fps);
      const missing: string[] = [];
      const name = r.opening ? "the opening reveal" : "a hero reveal";
      let settle = -1;
      if (L < B * (2 / 3)) {
        report({
          element: r.element,
          frames: [r.from, L],
          measured: `${name} lands ${sec(L)} into the film, with no time to build up to it`,
          need: `${options.build} s of camera and sound building before a reveal lands, or a film that opens on its subject`,
        });
      } else {
        // The camera: a push in over the build.
        let push = 0;
        if (film.elements.length) {
          const width = camera(film, L - B, L);
          const w0 = width(L - B);
          const w1 = width(L);
          if (w0 && w1) push = w1 / w0 - 1;
          for (let f = L - B + 1; f <= L + fps * 0.25; f += 1) {
            const a = width(f - 1);
            const b = width(f);
            if (a && b && Math.abs(b - a) > px(film, 0.5)) settle = f;
          }
        } else {
          let wide = 0;
          for (let f = L - B; f <= L; f += 1)
            if (rendered.picture.changed[f] >= 0.25) wide += 1;
          if (wide >= 0.4 * B) push = options.push;
        }
        if (push < options.push)
          missing.push(
            push < 0
              ? `the camera pulls back ${(-push * 100).toFixed(0)}% instead of pushing in`
              : `the camera ${push > 0.005 ? `pushes in only ${(push * 100).toFixed(0)}%` : "doesn't push in"}`,
          );
        // The sound: the highs rising, or the track dropping out before the hit.
        if (sound) {
          const early = mean(sound.high, L - B, L - Math.round(B * 0.66));
          const late = mean(sound.high, L - Math.round(0.4 * fps), L - 1);
          const before = mean(sound.rms, L - B, L - Math.round(fps * 0.75));
          let dip = Infinity;
          for (let f = L - Math.round(0.75 * fps); f < L; f += 1)
            dip = Math.min(dip, mean(sound.rms, f - 2, f + 2));
          const rise = late - early;
          const drop = before - dip;
          if (rise < options.rise && drop < options.dropout)
            missing.push(
              `the sound doesn't build (the highs change ${rise >= 0 ? "+" : ""}${rise.toFixed(1)} dB, the track dips ${Math.max(0, drop).toFixed(1)} dB)`,
            );
        }
        if (missing.length)
          report({
            element: r.element,
            frames: [Math.max(0, L - B), L],
            measured: `${name} lands at ${sec(L)} without a build-up: ${missing.join("; ")} over the ${options.build} s before it`,
            need: `a camera push of at least ${(options.push * 100).toFixed(0)}% and the sound building (highs up ${options.rise} dB, or a ${options.dropout} dB drop-out) over the ${options.build} s before a reveal lands`,
          });
      }
      // Landing together: the hit and the camera's settle on the landing.
      const apart: string[] = [];
      const near = Math.round(fps * 0.25);
      let hitAt = -1;
      let hit = 0;
      if (sound)
        for (let f = L - near; f <= L + near; f += 1)
          if ((sound.onset[f] ?? 0) > hit) {
            hit = sound.onset[f];
            hitAt = f;
          }
      const together = options.together * fps;
      if (sound && hit < options.hit)
        apart.push(
          `no sound hit within 0.25 s of it (the sharpest rise is ${hit.toFixed(0)} dB)`,
        );
      else if (Math.abs(hitAt - L) > together)
        apart.push(
          `the hit comes ${((Math.abs(hitAt - L) / fps) * 1000).toFixed(0)} ms ${hitAt > L ? "after" : "before"} it`,
        );
      if (settle >= 0 && Math.abs(settle - L) > together)
        apart.push(
          `the camera settles ${((Math.abs(settle - L) / fps) * 1000).toFixed(0)} ms ${settle > L ? "after" : "before"} it`,
        );
      if (apart.length)
        report({
          element: r.element,
          frames: [L - near, L + near],
          measured: `${name} lands at ${sec(L)} out of step: ${apart.join("; ")}`,
          need: `the landing, a sound hit of at least ${options.hit} dB and the camera's settle within ${options.together} s of each other`,
        });
      // The hold: nothing else changes while the reveal registers.
      const H = Math.round(options.hold * fps);
      let broke = -1;
      let what = "";
      if (film.elements.length) {
        const act = film.activity();
        const k = r.element?.at(L)?.raw.k ?? "";
        for (let f = L + 1; f <= L + H && broke < 0; f += 1)
          for (const e of act.get(f)?.moved ?? []) {
            const s = e.at(f) ?? e.at(f - 1);
            if (!s || e === r.element) continue;
            const key = s.raw.k;
            if (key.startsWith(`${k}/`) || k.startsWith(`${key}/`)) continue;
            if (
              area(s.visible) <= 0 ||
              (area(s.visible) < 0.002 * film.area && e.role !== "cursor")
            )
              continue;
            broke = f;
            what = e.label;
            break;
          }
      } else {
        const next = bursts(rendered).find(
          (b) => b.from > L + 2 && b.from <= L + H && b.peak >= 0.01,
        );
        if (next) {
          broke = next.from;
          what = "the picture";
        }
      }
      if (broke >= 0)
        report({
          element: r.element,
          frames: [L, broke],
          measured: `${name} lands at ${sec(L)} and ${what} moves ${((broke - L) / fps).toFixed(2)} s later`,
          need: `a hold of at least ${options.hold} s on the reveal with nothing else moving or arriving`,
        });
    }
  },
});

export const smallSubject = defineRule({
  id: "staging/small-subject",
  kind: "lint",
  severity: "error",
  options: { hero: 360, hold: 0.5 },
  docs: {
    summary:
      "Each hero reveal (the film's opening reveal, and every element marked `data-motion-reveal`) is at least 360 px at 1080p on its longer side, a third of the canvas's height, once it has landed and for 0.5 s after.",
    why: "What a beat brings in is what the viewer is meant to look at. When it pops in as a small detail of a wide shot (a button in a header, a reaction the size of a thumbnail) the entrance is animated but nobody can see what arrived, and when the film's opening subject is small the hook has nothing to hold on to. The opening reveal is the first tagged element other than a cursor, logo or text that animates in during the first 3 s (skipping one carried in by a surface that is itself moving in, since the surface is then the subject), unless the film is a cold open (see `reveal/no-build-up`; without a rendered film, a cold open is what's on screen half a second in spanning 360 px). Size is the element's box, or, when the film is rendered, the part of the box whose pixels change as it arrives, since a padded button can be far larger than its icon.",
    fix: "Frame the shot on the element before it enters: push the camera in until it is large and near the centre, let it land, hold, then pull back to show where it lives. For the opening, make the subject fill about a third of the frame's height. If it really is a supporting detail, don't tag it or animate its entrance.",
    options: {
      hero: "The smallest longer side, in px at 1080p, of a hero reveal once landed.",
      hold: "How long after landing, in seconds, it must stay at least that size.",
    },
  },
  check({ film, rendered, options, report }) {
    for (const r of heroReveals(film, rendered, options.hero, 3)) {
      const el = r.element!;
      const min = px(film, options.hero);
      const until = r.landed + Math.round(options.hold * film.fps);
      if (el.last < until) continue;
      let largest = 0;
      for (let f = r.landed; f <= until; f += 1) {
        const s = el.at(f);
        if (s) largest = Math.max(largest, s.visible[2], s.visible[3]);
      }
      // An element's box can be far larger than what it paints (an icon in a padded button): where
      // the rendered picture changed inside the box as it arrived is what the viewer sees arrive.
      let painted = "";
      if (rendered) {
        const p = rendered.picture;
        const [bx, by, bw, bh] = r.box.map((v) => v / p.scale / p.block);
        let x0 = Infinity;
        let y0 = Infinity;
        let x1 = -Infinity;
        let y1 = -Infinity;
        for (let f = r.from; f <= r.landed && f < rendered.frames; f += 1)
          p.changedBlocks[f].forEach((v, b) => {
            const x = b % p.cols;
            const y = Math.floor(b / p.cols);
            if (
              v < 13 ||
              x < Math.floor(bx) ||
              y < Math.floor(by) ||
              x >= Math.ceil(bx + bw) ||
              y >= Math.ceil(by + bh)
            )
              return;
            x0 = Math.min(x0, x);
            y0 = Math.min(y0, y);
            x1 = Math.max(x1, x + 1);
            y1 = Math.max(y1, y + 1);
          });
        const side = Math.max(x1 - x0, y1 - y0) * p.block * p.scale;
        if (Number.isFinite(side) && side < largest) {
          largest = side;
          painted = " of what it paints (its box is larger)";
        }
      }
      if (largest >= min) continue;
      report({
        element: el,
        frames: [r.from, until],
        measured: `${r.opening ? "the film's opening reveal " : "a key reveal "}lands ${Math.round(largest)} px on its longer side${painted}, ${((largest / film.height) * 100).toFixed(0)}% of the canvas's height`,
        need: `at least ${Math.round(min)} px (a third of the canvas's height) once landed and for ${options.hold} s after`,
      });
    }
  },
});

export const robotic = defineRule({
  id: "opening/screen-recording",
  kind: "lint",
  severity: "error",
  needsRender: true,
  options: { seconds: 3, strong: 0.15, by: 1.5, small: 0.02 },
  docs: {
    summary:
      "The first 3 s don't open like a screen recording: something new covers at least 15% of the canvas within 1.5 s, before any cursor operates the interface, and the opening isn't mostly small changes (under 2% of the canvas).",
    why: "The first seconds decide whether anyone keeps watching. An opening that parks the camera on an app, pulls back slowly and has a cursor click a menu looks like a screen recording of someone using software, which reads as robotic however polished each move is. A strong opening has a focal action that fills the frame (a subject arriving large, a title hit, a dramatic push) before the product is operated. It is measured on the rendered picture: what is new is the share of the canvas (in blocks of 32 px at 1080p) where at least a quarter of the pixels differ noticeably from a quarter of a second earlier, so fades count; small changes are frame-to-frame changes over less than 2% of the canvas. When the film has elements, it also finds when a cursor first moves on screen. Films people judged robotic showed at most 7% new in their first 3 s; an approved film showed 27% within 0.3 s.",
    fix: "Open on the subject with a strong focal action: bring it in large with a push and a hit on the music, or open on a title moment, and only then show the interface being used. Move cursor-driven steps after the hook, and cut them short.",
    options: {
      seconds: "How long, in seconds, the opening is.",
      strong:
        "The share of the canvas (0.15 is 15%) that must be new to count as a strong focal action.",
      by: "How soon, in seconds, the first strong focal action must come.",
      small:
        "Changes under this share of the canvas (0.02 is 2%) are small: a cursor, a menu, a label.",
    },
  },
  check({ film, rendered, options, report }) {
    if (!rendered) return;
    const end = Math.min(
      rendered.frames,
      Math.round(options.seconds * film.fps),
    );
    const changed = rendered.picture.changed;
    let firstStrong = -1;
    let most = 0;
    let moving = 0;
    let small = 0;
    for (let f = 1; f < end; f += 1) {
      const fresh = newShare(rendered, f);
      most = Math.max(most, fresh);
      if (fresh >= options.strong && firstStrong < 0) firstStrong = f;
      if (changed[f] > 0.0005) {
        moving += 1;
        if (changed[f] < options.small) small += 1;
      }
    }
    const cursor = film.elements
      .filter((e) => e.role === "cursor")
      .map((c) => c.frames.find((f) => c.step(f) > px(film, 45) / film.fps))
      .filter((f): f is number => f !== undefined && f < end)
      .sort((a, b) => a - b)[0];
    const late = firstStrong < 0 || firstStrong > options.by * film.fps;
    const cursorFirst =
      cursor !== undefined && (firstStrong < 0 || cursor < firstStrong);
    const mostlySmall = moving > 0 && small / moving > 0.6;
    if (!late && !cursorFirst) return;
    if (!cursorFirst && !mostlySmall) return;
    const t = (f: number) => `${(f / film.fps).toFixed(2)} s`;
    report({
      frames: [0, end - 1],
      measured: `the opening ${cursorFirst ? `has a cursor operating the interface from ${t(cursor!)}, ` : ""}${firstStrong < 0 ? `never shows anything new over ${(options.strong * 100).toFixed(0)}% of the canvas in its first ${options.seconds} s (at most ${(most * 100).toFixed(0)}%)` : `first shows something new over ${(options.strong * 100).toFixed(0)}% of the canvas at ${t(firstStrong)}`}, and ${((small / Math.max(1, moving)) * 100).toFixed(0)}% of its changing frames change less than ${(options.small * 100).toFixed(0)}% of the canvas`,
      need: `something new over at least ${(options.strong * 100).toFixed(0)}% of the canvas within ${options.by} s, before any cursor operates the interface`,
    });
  },
});

export const revealRules = [flatReveal, smallSubject, robotic];
