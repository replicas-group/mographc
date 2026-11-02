import { defineRule, px, type Box } from "mographc";

const grow = (b: Box, by: number): Box => [
  b[0] - by,
  b[1] - by,
  b[2] + 2 * by,
  b[3] + 2 * by,
];
const overlaps = (a: Box, b: Box) =>
  a[0] < b[0] + b[2] &&
  b[0] < a[0] + a[2] &&
  a[1] < b[1] + b[3] &&
  b[1] < a[1] + a[3];
const contains = (a: Box, b: Box) =>
  a[0] <= b[0] &&
  a[1] <= b[1] &&
  a[0] + a[2] >= b[0] + b[2] &&
  a[1] + a[3] >= b[1] + b[3];

export const logoClearspace = defineRule({
  id: "acme/logo-clearspace",
  kind: "lint",
  severity: "error",
  options: { ratio: 1 },
  docs: {
    summary:
      "No other element comes closer to the logo, on any side, than the logo's height, or 8 px at 1080p if that is larger.",
    why: "The brand guide asks for clear space around the logo, because a logo with other elements close to it is harder to recognise. The rule grows the logo's box by the clear space on every side and reports any visible element that overlaps the grown box, other than the logo's own parts and what it sits on (an element that covers the whole grown box, such as its card or the backdrop).",
    fix: "Move the nearby element away from the logo, or scale the logo down.",
    options: {
      ratio:
        "The clear space as a multiple of the logo's height. 1 means clear space equal to the logo's height.",
    },
  },
  check({ film, options, report }) {
    for (const logo of film.find({ role: "logo" })) {
      // One finding for each stretch of frames that the same element crowds the logo.
      let run:
        | { from: number; to: number; label: string; pad: number }
        | undefined;
      const flush = () => {
        if (run)
          report({
            element: logo,
            frames: [run.from, run.to],
            measured: `${run.label} is within ${run.pad.toFixed(0)} px`,
            need: `at least ${run.pad.toFixed(0)} px of clear space around the logo`,
          });
        run = undefined;
      };
      for (const f of logo.frames) {
        const s = logo.at(f)!;
        const pad = Math.max(s.visible[3] * options.ratio, px(film, 8));
        const zone = grow(s.visible, pad);
        const crowded = film.elements.find((e) => {
          const o = e.at(f);
          return (
            !!o &&
            e !== logo &&
            o.opacity > 0.3 &&
            // The logo's own parts and the elements it's inside aren't crowding it.
            !o.raw.k.startsWith(`${s.raw.k}/`) &&
            !s.raw.k.startsWith(`${o.raw.k}/`) &&
            !contains(o.visible, zone) &&
            overlaps(o.visible, zone)
          );
        });
        if (run && (!crowded || crowded.label !== run.label || f > run.to + 1))
          flush();
        if (crowded) run ??= { from: f, to: f, label: crowded.label, pad };
        if (run) run.to = f;
      }
      flush();
    }
  },
});
