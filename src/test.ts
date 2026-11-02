/**
 * The test API: the author writes down what each beat means, and the film is held to it.
 *
 *   import { describe, expect, loadFilm, test } from "mographc/test";
 *   const film = await loadFilm("Launch");
 *   test("the cursor clicks Add to chat", () => {
 *     expect(film.get("cursor:agent")).toPointAt(film.get("button:add"), { at: 24.5 });
 *   });
 *
 * Times are in seconds. Elements are found by their `data-motion` tags.
 */
import { capture, findProject } from "./capture.ts";
import { loadConfig } from "./config.ts";
import {
  area,
  centreOf,
  intersectArea,
  isAncestor,
  type Element,
  Film,
  type Sample,
} from "./film.ts";
import { failing, run } from "./lint.ts";
import { format, width } from "./report.ts";
import { expect, type Matcher } from "./runner.ts";
import { needOut } from "./rules/util.ts";
import type { Box } from "./types.ts";
import { viewer } from "./viewer.ts";

export {
  describe,
  expect,
  it,
  test,
  type Matcher,
  type MatcherResult,
  type Matchers,
} from "./runner.ts";

const films = new Map<string, Promise<Film>>();

/** The film of a composition in the current project, captured once per run (and cached on disk). */
export const loadFilm = (
  composition: string,
  options: { cwd?: string; entry?: string } = {},
) => {
  const key = `${options.cwd ?? process.cwd()}|${composition}`;
  if (!films.has(key))
    films.set(
      key,
      (async () => {
        const project = await findProject(
          options.cwd ?? process.cwd(),
          options.entry,
        );
        const [raw] = await capture(project, { compositions: [composition] });
        return new Film(raw);
      })(),
    );
  return films.get(key)!;
};

type Time = { at: number } | { during: [number, number] };
const span = (el: Element, when?: Time): number[] => {
  const fps = el.film.fps;
  if (!when) return el.film.frames;
  if ("at" in when) return [Math.round(when.at * fps)];
  const out = [];
  for (
    let f = Math.round(when.during[0] * fps);
    f <= Math.round(when.during[1] * fps);
    f += 1
  )
    out.push(f);
  return out;
};
const shown = (s?: Sample) => !!s && s.opacity > 0.3 && area(s.visible) > 0;
const tipOf = (s: Sample) =>
  s.raw.tp ? { x: s.raw.tp[0], y: s.raw.tp[1] } : { x: s.box[0], y: s.box[1] };
const inside = (p: { x: number; y: number }, b: Box, pad = 0) =>
  p.x >= b[0] - pad &&
  p.x <= b[0] + b[2] + pad &&
  p.y >= b[1] - pad &&
  p.y <= b[1] + b[3] + pad;
const sec = (el: Element, f: number) => `${(f / el.film.fps).toFixed(2)} s`;
const name = (el: Element) => el.label;
const result = (pass: boolean, yes: string, no: string) => ({
  pass,
  message: () => (pass ? yes : no),
});

const matchers = {
  toBeVisible(el: Element, when?: Time) {
    const missing = span(el, when).filter((f) => !shown(el.at(f)));
    return result(
      !missing.length,
      `expected ${name(el)} not to be visible`,
      `expected ${name(el)} to be visible, but it isn't at ${missing
        .slice(0, 3)
        .map((f) => sec(el, f))
        .join(", ")}`,
    );
  },
  toBeHidden(el: Element, when?: Time) {
    const seen = span(el, when).filter((f) => shown(el.at(f)));
    return result(
      !seen.length,
      `expected ${name(el)} to be visible`,
      `expected ${name(el)} to be hidden, but it's visible at ${seen
        .slice(0, 3)
        .map((f) => sec(el, f))
        .join(", ")}`,
    );
  },
  /** The pointer's hotspot (its `data-motion-tip`, else its top-left) is inside the target at that time. */
  toPointAt(
    el: Element,
    target: Element | Box,
    when: { at: number; tolerance?: number },
  ) {
    const f = Math.round(when.at * el.film.fps);
    const s = el.at(f);
    const box = Array.isArray(target) ? target : target.at(f)?.visible;
    if (!s || !box)
      return result(
        false,
        "",
        `${name(el)}${s ? "" : " isn't on screen"}${box ? "" : " / the target isn't on screen"} at ${sec(el, f)}`,
      );
    const p = tipOf(s);
    const pass = inside(p, box, when.tolerance ?? 0);
    return result(
      pass,
      `expected ${name(el)} not to point at the target at ${sec(el, f)}`,
      `expected ${name(el)} to point at ${Array.isArray(target) ? "the box" : name(target)} at ${sec(el, f)}; its tip is at (${p.x.toFixed(0)}, ${p.y.toFixed(0)}), the target spans x ${box[0].toFixed(0)}-${(box[0] + box[2]).toFixed(0)}, y ${box[1].toFixed(0)}-${(box[1] + box[3]).toFixed(0)}`,
    );
  },
  toLandAt(
    el: Element,
    point: { x: number; y: number },
    when: { at: number; tolerance?: number },
  ) {
    const f = Math.round(when.at * el.film.fps);
    const s = el.at(f);
    if (!s)
      return result(false, "", `${name(el)} isn't on screen at ${sec(el, f)}`);
    const c = centreOf(s);
    const d = Math.hypot(c.x - point.x, c.y - point.y);
    return result(
      d <= (when.tolerance ?? 8),
      `expected ${name(el)} not to land at (${point.x}, ${point.y})`,
      `expected ${name(el)} centred at (${point.x}, ${point.y}) at ${sec(el, f)}, but it's at (${c.x.toFixed(0)}, ${c.y.toFixed(0)}), ${d.toFixed(0)} px away`,
    );
  },
  toOverlap(el: Element, other: Element, when?: Time) {
    const hits = span(el, when).filter((f) => {
      const a = el.at(f);
      const b = other.at(f);
      return shown(a) && shown(b) && intersectArea(a!.visible, b!.visible) > 0;
    });
    return result(
      hits.length > 0,
      `expected ${name(el)} never to overlap ${name(other)}, but they overlap at ${hits
        .slice(0, 3)
        .map((f) => sec(el, f))
        .join(", ")}`,
      `expected ${name(el)} to overlap ${name(other)}`,
    );
  },
  /** Stays inside a box, or the title-safe area (the central 90%). */
  toStayInside(el: Element, region: Box | "safe-area", when?: Time) {
    const film = el.film;
    const box: Box =
      region === "safe-area"
        ? [
            film.width * 0.05,
            film.height * 0.05,
            film.width * 0.9,
            film.height * 0.9,
          ]
        : region;
    const out = span(el, when).filter((f) => {
      const s = el.at(f);
      if (!shown(s)) return false;
      const v = s!.visible;
      return (
        v[0] < box[0] ||
        v[1] < box[1] ||
        v[0] + v[2] > box[0] + box[2] ||
        v[1] + v[3] > box[1] + box[3]
      );
    });
    return result(
      !out.length,
      `expected ${name(el)} to leave the region`,
      `expected ${name(el)} inside the ${region === "safe-area" ? "safe area" : "box"}, but it's outside at ${out
        .slice(0, 3)
        .map((f) => sec(el, f))
        .join(", ")}`,
    );
  },
  /** Every line of text inside it is at least this size on screen. */
  toHaveTextAtLeast(el: Element, size: number, when?: Time) {
    let worst: [number, string, number] | undefined;
    for (const f of span(el, when)) {
      const s = el.at(f);
      if (!shown(s)) continue;
      for (const r of el.film.rows(f))
        if (
          r.t === "t" &&
          r.o > 0.5 &&
          area(r.v) > 0 &&
          (isAncestor(s!.raw.k, r.k) || r.k === s!.raw.k) &&
          (r.fs ?? 0) < size &&
          (!worst || r.fs! < worst[0])
        )
          worst = [r.fs!, r.x ?? "", f];
    }
    return result(
      !worst,
      `expected some text under ${size} px in ${name(el)}`,
      worst
        ? `expected text in ${name(el)} to be at least ${size} px, but "${worst[1].slice(0, 30)}" is ${worst[0]} px at ${sec(el, worst[2])}`
        : "",
    );
  },
  toMoveContinuously(el: Element) {
    const film = el.film;
    const jumps = el.frames.filter(
      (f) =>
        el.at(f - 1) &&
        el.step(f) > (40 * film.height) / 1080 &&
        el.step(f) > 4 * Math.max(el.step(f - 1), el.step(f + 1), 4),
    );
    return result(
      !jumps.length,
      `expected ${name(el)} to jump`,
      `expected ${name(el)} to move continuously, but it jumps ${jumps.map((f) => `${el.step(f).toFixed(0)} px at ${sec(el, f)}`).join(", ")}`,
    );
  },
  /** Every move that lands in the window eases out as strongly as its length needs. */
  toEaseOut(el: Element, when?: { between?: [number, number] }) {
    const fps = el.film.fps;
    const weak = el
      .moves()
      .filter(
        (m) =>
          m.lands &&
          m.distance > 40 &&
          (!when?.between ||
            (m.from >= when.between[0] * fps && m.to <= when.between[1] * fps)),
      )
      .filter((m) => m.easeOut < needOut(m.seconds));
    return result(
      !weak.length,
      `expected ${name(el)} not to ease out`,
      `expected ${name(el)} to ease out, but ${weak.map((m) => `its move at ${sec(el, m.from)} has ease-out ${m.easeOut.toFixed(2)} (needs ${needOut(m.seconds)})`).join("; ")}`,
    );
  },
  /** It's gone by this time, and it left by moving off the canvas. */
  toLeaveCanvas(el: Element, when: { by: number }) {
    const end = el.at(el.last)!;
    const by = Math.round(when.by * el.film.fps);
    const pass = el.last <= by && !el.film.onCanvas(end);
    const c = centreOf(end);
    return result(
      pass,
      `expected ${name(el)} not to leave the canvas by ${when.by} s`,
      `expected ${name(el)} to leave the canvas by ${when.by} s, but it ${el.last > by ? `is still on screen at ${sec(el, el.last)}` : `disappears on screen at (${c.x.toFixed(0)}, ${c.y.toFixed(0)})`}`,
    );
  },
  /** First fully visible within `within` seconds of a time. */
  toAppearAt(el: Element, time: number, opts: { within?: number } = {}) {
    const first = el.frames.find((f) => (el.at(f)!.opacity ?? 0) > 0.5);
    const t = first === undefined ? undefined : first / el.film.fps;
    const pass = t !== undefined && Math.abs(t - time) <= (opts.within ?? 0.1);
    return result(
      pass,
      `expected ${name(el)} not to appear at ${time} s`,
      `expected ${name(el)} to appear at ${time} s, but it ${t === undefined ? "never appears" : `appears at ${t.toFixed(2)} s`}`,
    );
  },
  /** On screen and still for at least this long, from a time (or anywhere). */
  toHold(el: Element, opts: { seconds: number; from?: number }) {
    const fps = el.film.fps;
    let best = 0;
    let run = 0;
    for (const f of el.frames) {
      if (opts.from !== undefined && f < opts.from * fps) continue;
      run = shown(el.at(f)) && el.step(f) < 0.5 ? run + 1 : 0;
      best = Math.max(best, run);
    }
    return result(
      best / fps >= opts.seconds,
      `expected ${name(el)} not to hold ${opts.seconds} s`,
      `expected ${name(el)} to hold still on screen for ${opts.seconds} s, but its longest hold is ${(best / fps).toFixed(2)} s`,
    );
  },
  toPrecede(el: Element, other: Element) {
    const a = el.frames.find((f) => shown(el.at(f)));
    const b = other.frames.find((f) => shown(other.at(f)));
    const pass = a !== undefined && (b === undefined || a < b);
    return result(
      pass,
      `expected ${name(el)} not to come before ${name(other)}`,
      `expected ${name(el)} before ${name(other)}, but they appear at ${a === undefined ? "never" : sec(el, a)} and ${b === undefined ? "never" : sec(el, b)}`,
    );
  },
  /** The simulated viewer is looking at it for most of the window (by default 60% of it). */
  toBeTheFocus(el: Element, when: Time & { share?: number }) {
    const v = viewer(el.film);
    const frames = span(el, when);
    const on = frames.filter((f) => {
      const g = v.gaze.get(f);
      const s = el.at(f);
      return (
        !!g && shown(s) && inside(g, s!.visible, (el.film.height * 24) / 1080)
      );
    });
    const share = on.length / Math.max(frames.length, 1);
    const need = when.share ?? 0.6;
    const elsewhere = new Map<string, number>();
    for (const f of frames)
      if (!on.includes(f)) {
        const label = v.gaze.get(f)?.label ?? "nothing";
        elsewhere.set(label, (elsewhere.get(label) ?? 0) + 1);
      }
    const top = [...elsewhere].sort((a, b) => b[1] - a[1])[0]?.[0];
    return result(
      share >= need,
      `expected the viewer not to be looking at ${name(el)}`,
      `expected the viewer to be looking at ${name(el)} ${(need * 100).toFixed(0)}% of the time, but it's ${(share * 100).toFixed(0)}%${top ? `; the eye is mostly on ${top}` : ""}`,
    );
  },
  /** A viewer finishes reading the text in it before it leaves. */
  toBeRead(el: Element) {
    const v = viewer(el.film);
    const mine = v.reads.filter((r) =>
      [...r.elements].some((e) => {
        if (e === el) return true;
        const s = el.at(r.from);
        const t = e.at(r.from);
        return !!s && !!t && isAncestor(s.raw.k, t.raw.k);
      }),
    );
    const end = el.film.frames[el.film.frames.length - 1];
    const missed = mine.filter((r) => r.to < end - 1 && r.words - r.read > 0.5);
    return result(
      !!mine.length && !missed.length,
      `expected some text in ${name(el)} to go unread`,
      mine.length
        ? `expected the text in ${name(el)} to be read, but ${missed.map((r) => `"${r.full.slice(0, 30)}" leaves at ${sec(el, r.to)} with ${Math.round(r.words - r.read)} of ${Math.round(r.words)} words unread`).join("; ")}`
        : `${name(el)} has no legible text`,
    );
  },
  /** The whole film passes the compiler and the project's lint config. */
  async toPassLint(film: Film) {
    const { config } = await loadConfig(
      (await findProject(process.cwd())).root,
    );
    const findings = run(film, config);
    const errors = failing(findings);
    return result(
      !errors.length,
      "expected lint errors",
      // Printed indented under the test name, so it wraps 6 columns sooner.
      format(errors, { warnings: false, columns: width && width - 6 }),
    );
  },
};

// Each matcher takes an Element (or a Film): say so plainly when a query found nothing.
const guarded = Object.fromEntries(
  Object.entries(matchers).map(([name, fn]) => [
    name,
    function (this: unknown, received: unknown, ...args: unknown[]) {
      if (
        !received ||
        typeof received !== "object" ||
        !("film" in received || "elements" in received)
      )
        return {
          pass: false,
          message: () =>
            `${name}: expected an element (from film.get or film.find) but got ${String(received)}; run \`mographc elements\` to see what's there`,
        };
      return (fn as (...a: unknown[]) => unknown).call(this, received, ...args);
    },
  ]),
);
expect.extend(guarded as Record<string, Matcher>);

declare module "./runner.ts" {
  interface Matchers {
    toBeVisible(when?: Time): void;
    toBeHidden(when?: Time): void;
    toPointAt(
      target: Element | Box,
      when: { at: number; tolerance?: number },
    ): void;
    toLandAt(
      point: { x: number; y: number },
      when: { at: number; tolerance?: number },
    ): void;
    toOverlap(other: Element, when?: Time): void;
    toStayInside(region: Box | "safe-area", when?: Time): void;
    toHaveTextAtLeast(size: number, when?: Time): void;
    toMoveContinuously(): void;
    toEaseOut(when?: { between?: [number, number] }): void;
    toLeaveCanvas(when: { by: number }): void;
    toAppearAt(time: number, opts?: { within?: number }): void;
    toHold(opts: { seconds: number; from?: number }): void;
    toPrecede(other: Element): void;
    toBeTheFocus(when: Time & { share?: number }): void;
    toBeRead(): void;
    toPassLint(): Promise<void>;
  }
}
