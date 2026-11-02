# A brand preset

[`acme.ts`](acme.ts) is a brand preset for a made-up company, Acme. It shows how a team can turn its brand guide into lint rules, using only mographc's public API (`defineRule`, `px`, `area` and the film model).

It has four rules:

| Rule               | What it checks                                                |
| ------------------ | ------------------------------------------------------------- |
| `acme/no-shadows`  | Surfaces are separated by borders or fills, not shadows.      |
| `acme/palette`     | Surfaces and headlines use the brand colours.                 |
| `acme/type-weight` | Headlines are weight 500 or lighter, and nothing is over 600. |
| `acme/typeface`    | Headlines are set in the brand typeface.                      |

The colours and the typeface are placeholders. To use the preset:

1. Copy `acme.ts` into your project and rename it.
2. Replace `ACME_COLOURS` with your design system's colour tokens, and the `headline` typeface option with your brand font.
3. Add it to `mographc.config.ts` after `recommended`, as [`mographc.config.ts`](mographc.config.ts) here does.

A preset is an ordinary config block, so its rules take options and can be switched off like any other rule. To try this one on the demo film:

```bash
cd examples/demo
npx mographc lint Demo --config ../brand-preset/mographc.config.ts
```

The demo isn't built to Acme's brand, so this reports its Helvetica headline and its off-palette text colour.
