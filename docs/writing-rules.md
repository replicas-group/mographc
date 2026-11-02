# Writing a rule

Built-in rules and your own rules use the same API. A rule reads the **film model**: every element across every frame, with its identity, role, box, visible area, opacity, stretch and text, plus helpers for moves, speeds and headlines.

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

export const logoClearspace = defineRule({
  id: "acme/logo-clearspace",
  kind: "lint",
  severity: "error",
  options: { ratio: 1 },
  docs: {
    summary: "The logo keeps clear space equal to its height on every side.",
    why: "The brand guide asks for clear space around the logo, because crowding makes it harder to recognise.",
    fix: "Move nearby elements away from the logo, or scale the logo down.",
  },
  check({ film, options, report }) {
    for (const logo of film.find({ role: "logo" }))
      for (const f of logo.frames) {
        const box = logo.at(f)!.visible;
        const pad = Math.max(box[3] * options.ratio, px(film, 8));
        const crowded = film.elements.find(
          (e) =>
            e !== logo && e.at(f) && overlaps(e.at(f)!.visible, grow(box, pad)),
        );
        if (crowded)
          report({
            element: logo,
            frames: [f, f],
            measured: `${crowded.label} is within ${pad.toFixed(0)} px`,
            need: `${pad.toFixed(0)} px of clear space`,
          });
      }
  },
});
```

`px(film, n)` converts a size measured at 1080p into the film's own pixels, and `area(box)` gives a box's area. The built-in rules use both so that their thresholds hold at any resolution.

[`examples/brand-preset`](../examples/brand-preset) is a complete brand preset (colours, typeface, type weight, no shadows) written only with the public API. Copy it to start your own.

Other rules a team might write:

- only the brand's fonts are used
- the call to action stays on screen for at least 2 s
- a legal disclaimer is visible for at least 3 s
- nothing sits under TikTok's interface overlays
- the trademark symbol appears on the first mention
- text meets a minimum contrast ratio
- there are no more than three flashes a second

To make a rule available, add it to a config block's `plugins` and turn it on in `rules`, as shown in [Configuring the linter](configuration.md). A preset is a config block that does both for a set of rules.

---

[Documentation index](README.md)
