/**
 * Regressions: against the cut a person last approved (the baseline), what got
 * measurably worse. Beats are matched by their headlines, in order, like a diff.
 */
import { area, intersect, type Film, type Headline } from "../film.ts";
import { defineRule } from "../rule.ts";

const letters = (s: string) => {
  const m = new Map<string, number>();
  for (const c of s.toLowerCase().replace(/\s/g, ""))
    m.set(c, (m.get(c) ?? 0) + 1);
  return m;
};
const similarity = (a: string, b: string) => {
  const ca = letters(a);
  const cb = letters(b);
  let common = 0;
  for (const [c, n] of ca) common += Math.min(n, cb.get(c) ?? 0);
  return (
    common /
    Math.max(a.replace(/\s/g, "").length, b.replace(/\s/g, "").length, 1)
  );
};

/** Align two cuts' headline beats in order, so a reworded line still pairs with its beat. */
export const alignBeats = (cur: Headline[], base: Headline[]) => {
  const n = cur.length;
  const m = base.length;
  const best = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i -= 1)
    for (let j = m - 1; j >= 0; j -= 1) {
      const s = similarity(cur[i].text, base[j].text);
      best[i][j] = Math.max(
        best[i + 1][j],
        best[i][j + 1],
        s >= 0.5 ? best[i + 1][j + 1] + s : 0,
      );
    }
  const pairs: [Headline, Headline][] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    const s = similarity(cur[i].text, base[j].text);
    if (s >= 0.5 && best[i][j] === best[i + 1][j + 1] + s) {
      pairs.push([cur[i], base[j]]);
      i += 1;
      j += 1;
    } else if (best[i][j] === best[i + 1][j]) i += 1;
    else j += 1;
  }
  return pairs;
};

/** Text a beat holds on screen for at least a quarter of its length. */
const inventory = (film: Film, from: number, to: number) => {
  const seen = new Map<string, number>();
  let n = 0;
  for (let f = from; f <= to; f += 2) {
    n += 1;
    const here = new Set(
      film
        .rows(f)
        .filter(
          (r) =>
            r.t === "t" &&
            r.o > 0.5 &&
            (r.x ?? "").length > 3 &&
            (r.fs ?? 0) < 40 &&
            area(intersect(r.v, [0, 0, film.width, film.height])) > 0,
        )
        .map((r) => r.x!),
    );
    for (const x of here) seen.set(x, (seen.get(x) ?? 0) + 1);
  }
  return new Set([...seen].filter(([, c]) => c >= 0.25 * n).map(([x]) => x));
};
const rendered = (film: Film, from: number, to: number) => {
  const out = new Set<string>();
  for (let f = from; f <= to; f += 2)
    for (const r of film.rows(f)) if (r.t === "t" && r.x) out.add(r.x);
  return out;
};

export const contentRemoved = defineRule({
  id: "regression/content-removed",
  kind: "lint",
  severity: "error",
  needsBaseline: true,
  options: {},
  docs: {
    summary: "A beat keeps what made it full in the approved cut.",
    why: "Content removed from a beat a person already approved (a section of a sidebar, a label, a row) makes the shot emptier, and it's rarely what anyone meant to change.",
    fix: "Restore the missing items, or if removing them was the point, suppress the finding for that beat with the reason. A beat that changed wholesale is reported as a warning for the staging review instead.",
  },
  check({ film, baseline, report }) {
    if (!baseline) return;
    for (const [h, g] of alignBeats(film.headlines(), baseline.headlines())) {
      const now = inventory(film, h.from, h.to);
      const kept = new Set([...now, ...rendered(film, h.from, h.to)]);
      const before = inventory(baseline, g.from, g.to);
      // A truncated label still counts as kept; a short word inside a longer one doesn't.
      const lost = [...before].filter(
        (x) =>
          !now.has(x) &&
          ![...kept].some(
            (y) =>
              (x.includes(y) || y.includes(x)) &&
              Math.min(x.length, y.length) >=
                0.6 * Math.max(x.length, y.length),
          ),
      );
      if (lost.length < 2) continue;
      const wholesale = lost.length > 0.4 * before.size;
      report({
        frames: [h.from, h.to],
        measured: wholesale
          ? `${lost.length} of ${before.size} items differ from the approved cut's "${g.text.slice(0, 24)}"`
          : `${lost.length} items gone since the approved cut: ${lost
              .slice(0, 4)
              .map((x) => `"${x.slice(0, 24)}"`)
              .join(", ")}`,
        need: wholesale
          ? "check the new composition in the staging review"
          : "keep what made the approved beat full",
        severity: wholesale ? "warn" : "error",
      });
    }
  },
});

const cursorCast = (film: Film) => {
  const cs = film.elements.filter((e) => e.role === "cursor");
  const sizes = cs
    .map((e) => {
      const s = e.frames
        .map((f) => Math.max(e.at(f)!.box[2], e.at(f)!.box[3]))
        .sort((a, b) => a - b);
      return s[Math.floor(s.length / 2)];
    })
    .sort((a, b) => a - b);
  const fast = cs
    .flatMap((e) =>
      e.frames
        .filter((f) => e.step(f) * film.fps >= 600)
        .map((f) => e.at(f)!.stretch),
    )
    .sort((a, b) => a - b);
  const top = fast.slice(-Math.max(1, Math.floor(fast.length / 10)));
  return {
    sizes,
    stretch: top.length ? top.reduce((a, b) => a + b, 0) / top.length : 1,
  };
};

export const smaller = defineRule({
  id: "regression/cursor-smaller",
  kind: "lint",
  severity: "error",
  needsBaseline: true,
  options: { tolerance: 0.1 },
  docs: {
    summary: "Cursors aren't smaller than in the approved cut.",
    why: "A cursor is a character; shrinking it without a reason costs it presence.",
    fix: "Restore the approved size, or suppress with the reason if the change was deliberate.",
  },
  check({ film, baseline, options, report }) {
    if (!baseline) return;
    const now = cursorCast(film).sizes;
    const before = cursorCast(baseline).sizes;
    if (!now.length || !before.length) return;
    for (const [role, a, b] of [
      ["largest", now[now.length - 1], before[before.length - 1]],
      ["smallest", now[0], before[0]],
    ] as const)
      if (a < (1 - options.tolerance) * b)
        report({
          frames: [0, film.durationInFrames - 1],
          measured: `the ${role} cursor is ${a.toFixed(0)} px`,
          need: `the approved ${b.toFixed(0)} px`,
        });
  },
});

export const lessStretch = defineRule({
  id: "regression/less-stretch",
  kind: "lint",
  severity: "error",
  needsBaseline: true,
  options: {},
  docs: {
    summary:
      "Cursors stretch at speed at least as much as in the approved cut.",
    why: "Losing squash and stretch takes the character out of a cursor.",
    fix: "Restore the approved stretch, or check the cursor still moves as fast as it did.",
  },
  check({ film, baseline, report }) {
    if (!baseline) return;
    const a = cursorCast(film).stretch;
    const b = cursorCast(baseline).stretch;
    if (a < b - 0.04)
      report({
        frames: [0, film.durationInFrames - 1],
        measured: `peak stretch at speed ${a.toFixed(2)}`,
        need: `the approved ${b.toFixed(2)}`,
      });
  },
});

export const weakerEaseOut = defineRule({
  id: "regression/weaker-ease-out",
  kind: "lint",
  severity: "error",
  needsBaseline: true,
  options: {},
  docs: {
    summary:
      "Each beat's main move eases out at least as strongly as in the approved cut.",
    why: "A weaker settle on the same beat is the kind of change a person notices as 'it was better before'.",
    fix: "Restore the approved curve on that move.",
  },
  check({ film, baseline, report }) {
    if (!baseline) return;
    const main = (f: Film, from: number, to: number) =>
      f.elements
        .filter((e) => e.role !== "cursor")
        .flatMap((e) =>
          e
            .moves()
            .filter(
              (m) =>
                m.lands &&
                m.from >= from - 10 &&
                m.from <= to &&
                m.seconds >= 0.25 &&
                m.distance > 80,
            )
            .map((m) => ({ m, size: area(e.at(m.from)!.visible), e })),
        )
        .filter((x) => x.size > 0.05 * f.area)
        .sort((a, b) => b.size - a.size)[0];
    for (const [h, g] of alignBeats(film.headlines(), baseline.headlines())) {
      const a = main(film, h.from, h.to);
      const b = main(baseline, g.from, g.to);
      if (a && b && a.m.easeOut < b.m.easeOut - 0.05)
        report({
          element: a.e,
          frames: [a.m.from, a.m.to],
          measured: `ease-out ${a.m.easeOut.toFixed(2)}`,
          need: `the approved ${b.m.easeOut.toFixed(2)} on this beat`,
        });
    }
  },
});

export const regressionRules = [
  contentRemoved,
  smaller,
  lessStretch,
  weakerEaseOut,
];
