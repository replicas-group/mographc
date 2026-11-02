# Viewer fixtures

Small Remotion films that reproduce edge cases in mographc's simulated viewer, its pacing measurements and its output. Use them to check a change to mographc before and after.

```bash
npm run build                 # in the repository root, once
cd examples/viewer-fixtures && npm install
npx mographc gaze Chat        # or lint, activity, test…
```

| Composition  | What it has                                                                                                                            | What to check                                                                                                                                                                    |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Chat`       | a prompt typed in small type, a reply streamed word by word into a list that scrolls, a build log above it, a "Working for Ns" counter | `gaze`: the eye stays on the reply while the list scrolls, and the counter isn't read again each second. `activity`: typing counts as change. `test` runs `src/chat.mographc.ts` |
| `NearlyRead` | a caption, and a card arriving when 96% of the caption has been read                                                                   | `gaze`: the eye doesn't go back to the caption for its last word                                                                                                                 |
| `HiddenSvg`  | an svg at full opacity whose shapes are transparent while it slides in                                                                 | `gaze`: the svg doesn't draw the eye until its shapes show (the probe measures an svg by its visible shapes)                                                                     |
| `Cards`      | three chips in a row with each word in its own span, two cards, a terminal, and a camera push while the left card is read              | `gaze`: each chip is its own text, with spaces between its words; the push doesn't take the eye off the card                                                                     |
| `Logo`       | a logo on a card, and from 1 s a wordmark beside it                                                                                    | `lint --config logo.config.ts`: one clear-space finding for the wordmark, none for the card                                                                                      |
| `Settle`     | one box per curve, duration and distance                                                                                               | `lint --json`: the deceleration `easing/harsh-settle` measures for each                                                                                                          |
| `BadRange`   | `interpolate` with an input range that stops increasing at frame 10                                                                    | `check`: the error names the composition, the frame and `src/Errors.tsx`                                                                                                         |
| `BadElement` | an undefined component from frame 5 (React error #130)                                                                                 | `check`: the error names the frame and explains #130                                                                                                                             |
