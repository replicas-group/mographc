# Writing a rule

Built-in rules and your own rules use the same API. A rule reads the film model, which is mographc's record of every [element](terms.md#elements) on every frame: its identity, [role](terms.md#elements), box (position and size), the part of it that is on the canvas, opacity, [stretch](terms.md#motion) and text. The film model also has helpers that find each element's [moves](terms.md#motion), speeds and headlines.

```ts
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
```

Boxes are `[x, y, width, height]` in canvas px (the `Box` type). Each element's sample in a frame has its `box` (as measured), `clipped` (the part its containers don't clip) and `visible` (the part of that on the canvas), and `raw.k`, its place in the page structure: an element whose `raw.k` starts with another's followed by `/` is inside it. A rule about the space around an element should leave out the element's own parts and what it sits on, as this one does, or it reports every film.

A rule reports a [finding](terms.md#checking) with `report`. Report one finding for each stretch of frames where the problem lasts, not one for every frame. `measured` is printed after the element's name and a colon, so write it as a clause about the element with the numbers you measured. `need` is printed after "Required:", so write it as a clause that states the requirement, starting in lowercase. The rule's `docs` are printed by `mographc explain` and in the rules reference: `summary` states the requirement and its threshold, `why` says why it matters to a viewer and how it is measured, `fix` gives concrete steps, and `options` describes each option with its unit.

`px(film, n)` converts a size given [at 1080p](terms.md#the-film) into the film's own pixels, and `area(box)` gives a box's area. The built-in rules use `px` so that their thresholds hold at any resolution.

[`examples/brand-preset`](../examples/brand-preset) is a complete brand preset (colours, typeface, type weight, no shadows) written only with the public API. Copy it to start your own.

Other rules a team might write:

- only the brand's fonts are used
- the call to action stays on screen for at least 2 s
- a legal disclaimer is visible for at least 3 s
- nothing important sits where TikTok draws its buttons and captions over the video
- the trademark symbol appears on the first mention
- text meets a minimum contrast ratio
- there are no more than three flashes a second

To make a rule available, add it to a config block's `plugins` and turn it on in `rules`, as shown in [Configuring the linter](configuration.md). A [preset](terms.md#checking) is a config block that does both for a set of rules.

---

[Documentation index](README.md)
