# A brand preset

[`acme.ts`](acme.ts) is a brand [preset](../../docs/terms.md#checking) for a made-up company, Acme. It shows how a team can turn its brand guide into lint rules, using only mographc's public API (`defineRule`, `px`, `area` and the film model).

It has four rules:

| Rule               | What it checks                                                                                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `acme/no-shadows`  | No visible element has a shadow that is offset or blurred by more than 3 px.                                                                                                              |
| `acme/palette`     | The background of every surface (a window, card or panel) covering at least 1% of the canvas, and the text colour of every headline, is within a distance of 14 in RGB of a brand colour. |
| `acme/type-weight` | Headlines and text at least 40 px tall at 1080p have a font weight of 500 or less, and other text 600 or less.                                                                            |
| `acme/typeface`    | Headlines are set in the brand typeface.                                                                                                                                                  |

The colours and the typeface are placeholders. To use the preset:

1. Copy `acme.ts` into your project and rename it.
2. Replace `ACME_COLOURS` with your design system's colour tokens, and the `headline` typeface option with your brand font.
3. Add it to `mographc.config.ts` after `recommended`, as [`mographc.config.ts`](mographc.config.ts) here does.

A preset is an ordinary config block, so its rules take options and can be switched off like any other rule. To try this one on the demo film:

```bash
cd examples/demo
npx mographc lint Demo --config ../brand-preset/mographc.config.ts
```

The demo doesn't follow Acme's brand, so this reports its Helvetica headline and its text colour, which isn't one of Acme's colours.
