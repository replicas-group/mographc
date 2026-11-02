/**
 * Attention: what a viewer can actually take in, judged by the simulated viewer (`viewer.ts`).
 * Motion keeps a film alive; information has to be rationed. Calibrated on films a person
 * judged: a film people approved had two texts asking to be read at once about 10% of the time
 * and its captions were read; films judged overwhelming sat at 18–36%, and lost most captions.
 */
import type { Film } from "../film.ts";
import { defineRule } from "../rule.ts";
import { viewer, type Read } from "../viewer.ts";
import { runs } from "./util.ts";

const quote = (r: Read) =>
  `"${r.full.length > 40 ? `${r.full.slice(0, 38)}…` : r.full}"`;

/** Where the eye was while a read was up, other than on it. */
const elsewhere = (film: Film, r: Read) => {
  const v = viewer(film);
  const time = new Map<string, number>();
  for (let f = r.from; f <= r.to; f += 1) {
    const g = v.gaze.get(f);
    if (g && g.read !== r) time.set(g.label, (time.get(g.label) ?? 0) + 1);
  }
  return [...time]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([label]) => label);
};

export const unreadText = defineRule({
  id: "attention/unread-text",
  kind: "lint",
  severity: "error",
  options: { minSeconds: 0.4, share: 0.3 },
  docs: {
    summary:
      "A viewer gets to read the text the film asks them to: captions are read before they leave, and product text the eye starts on is finished.",
    why: "A viewer reads about 3.5 words a second, and only where they're looking. A caption that's on screen long enough on its own can still go unread when something else holds the eye while it's up. Text that leaves half-read is the feeling of a film being too fast.",
    fix: "Give the text its moment: nothing else new while it's read (hold the product still, or let the action finish first), fewer words, or more time. If the text doesn't matter, make it smaller or texture (lines instead of words).",
  },
  check({ film, options, report }) {
    const v = viewer(film);
    const end = film.frames[film.frames.length - 1];
    for (const r of v.reads) {
      const missed = r.words - r.read;
      const caption = !r.surface;
      if (
        r.to >= end - 1 ||
        (r.to - r.from + 1) / film.fps < options.minSeconds
      )
        continue;
      // Captions must be read; product text only when the eye started on it and had to leave.
      if (caption ? r.words < 1.5 : r.read === 0 || r.scale < 1 || r.words < 3)
        continue;
      if (missed < Math.max(caption ? 1 : 2, options.share * r.words)) continue;
      const away = elsewhere(film, r);
      report({
        element: [...r.elements][0],
        frames: [r.from, r.to],
        measured: `${quote(r)} leaves after ${((r.to - r.from + 1) / film.fps).toFixed(1)} s with ${Math.round(missed)} of ${Math.round(r.words)} words unread${away.length ? `; the eye was on ${away.join(" and ")}` : ""}`,
        need: "time to read it while nothing else new competes",
        severity: caption ? "error" : "warn",
      });
    }
  },
});

export const competing = defineRule({
  id: "attention/competing",
  kind: "lint",
  severity: "error",
  options: { warnAbove: 0.15, errorAbove: 0.25, place: 0.15, seconds: 0.4 },
  docs: {
    summary:
      "One thing to read at a time: two texts in different places rarely ask to be read at once.",
    why: "The eye reads one place at a time. When a caption lands while a message types out elsewhere, the viewer reads neither properly and feels rushed, however good the motion is. Films people approved did this about 10% of the time; films they found overwhelming did it a quarter of the time or more.",
    fix: "Sequence it: let one text finish (its words at 3.5 a second) before the next one starts, or make one of them the visual (the action) and keep words out of it. Two short things side by side can share a moment only if one is already read.",
  },
  check({ film, options, report }) {
    const v = viewer(film);
    const place = options.place * film.width;
    const both: number[] = [];
    const pairs = new Map<number, [Read, Read]>();
    for (const f of film.frames) {
      const asking = v.asking.get(f) ?? [];
      const centre = (r: Read) => [
        r.box[0] + r.box[2] / 2,
        r.box[1] + r.box[3] / 2,
      ];
      for (let i = 0; i < asking.length; i += 1)
        for (let j = i + 1; j < asking.length; j += 1) {
          const [a, b] = [centre(asking[i]), centre(asking[j])];
          if (Math.hypot(a[0] - b[0], a[1] - b[1]) > place && !pairs.has(f)) {
            both.push(f);
            pairs.set(f, [asking[i], asking[j]]);
          }
        }
    }
    const share = both.length / film.frames.length;
    if (share <= options.warnAbove) return;
    const spans = runs(both, 2).filter(
      ([a, b]) => (b - a + 1) / film.fps >= options.seconds,
    );
    report({
      frames: [film.frames[0], film.frames[film.frames.length - 1]],
      measured: `two texts in different places ask to be read at once ${(share * 100).toFixed(0)}% of the time (${spans.length} moments)`,
      need: `at most ${(options.warnAbove * 100).toFixed(0)}%`,
      severity: share > options.errorAbove ? "error" : "warn",
    });
    for (const [a, b] of spans) {
      const [x, y] = pairs.get(a)!;
      report({
        element: [...x.elements][0],
        frames: [a, b],
        measured: `${quote(x)} and ${quote(y)} both ask to be read for ${((b - a + 1) / film.fps).toFixed(1)} s`,
        need: "one finished before the other starts",
        severity: "warn",
      });
    }
  },
});

export const attentionRules = [unreadText, competing];
