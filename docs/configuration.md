# Configuring the linter

`mographc.config.ts` is a flat config, in the same style as ESLint's. It is an array of blocks applied in order. A [preset](terms.md#checking) is an ordinary block, so later blocks can override any of its settings:

```ts
import { defineConfig, recommended } from "mographc";
import { acme } from "./presets/acme";
import { logoClearspace } from "./rules/logo-clearspace";

export default defineConfig([
  recommended, // general motion principles
  acme, // your team's brand preset: colours, fonts, no shadows
  { plugins: [logoClearspace], rules: { "acme/logo-clearspace": "error" } },
  {
    rules: {
      "easing/weak-out": ["error", { long: 0.45 }],
      "pace/text-hold": "off",
    },
  },
  { compositions: ["Teaser"], rules: { "cursor/dead-exit": "off" } },
  {
    between: [9.5, 13],
    rules: { "staging/no-padding": "off" },
    reason: "the page is zoomed in by request",
  },
]);
```

The config can also be `.mts`, `.js` or `.mjs`. TypeScript configs are loaded with [jiti](https://github.com/unjs/jiti), the same way ESLint loads `eslint.config.ts`, so nothing needs to be compiled first.

A block with `between` turns a rule off, or changes its [severity](terms.md#checking), for a time range in seconds, and must give a `reason`. To accept a single finding, put the rule id and the reason on the element where it happens:

```tsx
<div data-motion="cursor:agent" data-motion-ignore="cursor/dead-exit: it turns into the share button">
```

[Accepted findings](terms.md#checking) are still printed, marked `ok` with their reason, but they never fail the run. They stay visible so that when a reason stops being true, someone reading the output can notice and remove the suppression. The summary at the end of the output lists every reason a finding was accepted.

A suppression must give a reason: `data-motion-ignore="cursor/dead-exit"` without one doesn't accept the finding.

A film may accept at most 8 different findings (a rule with its reason; one reason that covers several findings of the same rule counts once). Past that, `accepted/too-many` fails the run, because a film with that many exceptions is being waved through rather than fixed. Raise the limit only when a person agrees, with a block that sets `maxAccepted`:

```ts
{
  maxAccepted: 12;
}
```

## Rendering

`lint` and `verify` also render each composition to a video (cached like the measurements, in `node_modules/.cache/mographc`) and measure its pixels and sound, for the rules that the DOM can't answer: text that shimmers, motion that updates on fewer frames than the film has, an opening that looks like a screen recording, and whether the camera and the music build to a reveal. These rules need ffmpeg: the one on `PATH`, the copy Remotion installs with its renderer, or the path in `MOGRAPHC_FFMPEG`. Pass `--no-render` to skip them for a quicker run; `verify` before a person watches a cut should always render.

To check a video file on its own, without its Remotion project, run `mographc lint --video cut.mp4`. Only the rules that read pixels and sound run, with the config in the current folder if there is one.

To see every rule and its default severity, run `mographc rules` or read the [rules reference](rules.md).

---

[Documentation index](README.md)
