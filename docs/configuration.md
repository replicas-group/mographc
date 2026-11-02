# Configuring the linter

`mographc.config.ts` is a flat config, in the same style as ESLint's. It is an array of blocks applied in order. A preset is an ordinary block, so later blocks can override any of its settings:

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

A block with `between` turns a rule off (or changes its severity) for a stretch of time, and must give a `reason`. To accept a single finding, put the reason on the element where it happens:

```tsx
<div data-motion="cursor:agent" data-motion-ignore="cursor/dead-exit: it turns into the share button">
```

Accepted findings are still printed, marked `ok` with their reason, but they never fail the run. They stay visible so that when a reason stops being true, someone reading the output can notice and remove the suppression.

To see every rule and its default severity, run `mographc rules` or read the [rules reference](rules.md).

---

[Documentation index](README.md)
