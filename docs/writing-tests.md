# Writing tests

The linter checks rules that apply to any film. Tests check what you intended for one particular film, for example that the cursor clicks _Send_ at 4.2 s or that the headline never overlaps the product window.

Test files end in `.mographc.ts` (or `.tsx`, `.js`). mographc runs them itself on Node, with the same `describe`, `test` and `expect` API as Vitest and Jest, so you don't need to install a test runner.

```ts
import { describe, expect, loadFilm, test } from "mographc/test";
const film = await loadFilm("Launch");

describe("section 2: the agent sends the message", () => {
  test("the agent clicks Send", () =>
    expect(film.get("cursor:agent")).toPointAt(film.get("button:send"), {
      at: 4.2,
    }));
  test("then leaves by moving off the canvas", () =>
    expect(film.get("cursor:agent")).toLeaveCanvas({ by: 5 }));
  test("the chat text is at least 18 px, large enough to read on a phone", () =>
    expect(film.get("window:chat")).toHaveTextAtLeast(18, { during: [3, 5] }));
});
test("the film passes the compiler and the linter", async () => {
  await expect(film).toPassLint();
});
```

The file name doesn't end in `.test.ts` on purpose. Vitest, Jest and Bun pick up every `*.test.ts` file by default, and they would try to run film tests that need mographc's runner.

## Film matchers

| Matcher                                    | Passes when                                                                                                                                                                                                                      |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `toBeVisible(when?)` / `toBeHidden(when?)` | its opacity is over 0.3 and some of it is on the canvas (or not), at every frame of `{ at }` or `{ during: [a, b] }`                                                                                                             |
| `toPointAt(target, { at, tolerance? })`    | the cursor's [tip](terms.md#elements) (its `data-motion-tip` element, or else its top-left corner) is inside the target element or box, or within `tolerance` px of it (default 0)                                               |
| `toLandAt({ x, y }, { at, tolerance? })`   | its centre is within `tolerance` px (default 8) of the point at that time                                                                                                                                                        |
| `toOverlap(other, when?)`                  | they overlap on screen at some frame; use `.not` for "never"                                                                                                                                                                     |
| `toStayInside(region, when?)`              | no part of it goes outside the region: another element (for example `film.get("window:chat")`), a box `[x, y, width, height]` in canvas px, or `"safe-area"`, the [safe area](terms.md#the-film) (the central 90% of the canvas) |
| `toHaveTextAtLeast(px, when?)`             | every visible line of text inside it has a font size of at least `px` on screen                                                                                                                                                  |
| `toMoveContinuously()`                     | it never moves more than 40 px at 1080p in one frame while moving less than a quarter of that in the frames on either side                                                                                                       |
| `toEaseOut({ between? })`                  | every [move](terms.md#motion) longer than 40 px that comes to rest on the canvas has an [ease-out](terms.md#motion) strength of at least 0.26 (moves under 0.4 s), 0.33 (0.4 to 0.8 s) or 0.40 (0.8 s or longer)                 |
| `toLeaveCanvas({ by })`                    | it's gone by that time, and its last position was off the canvas                                                                                                                                                                 |
| `toAppearAt(time, { within? })`            | its opacity first goes above 0.5 within `within` s (default 0.1) of `time`                                                                                                                                                       |
| `toHold({ seconds, from? })`               | it stays still (moving under 0.5 px a frame) and visible for at least that many seconds, from `from` or at any time                                                                                                              |
| `toPrecede(other)`                         | it becomes visible before the other does                                                                                                                                                                                         |
| `toBeRead()`                               | the [simulated viewer](terms.md#reading) finishes reading its text before it leaves (see `attention/unread-text`)                                                                                                                |
| `toBeTheFocus({ during, share? })`         | the simulated viewer is looking at it for at least `share` (default 0.6, meaning 60%) of the time range                                                                                                                          |
| `toPassLint()` (on the film)               | the film passes the compiler and the project's lint config                                                                                                                                                                       |

`expect` also has the common general matchers (`toBe`, `toEqual`, `toBeTruthy`, `toBeGreaterThan`, `toContain`, `toMatch` and others), every matcher supports `.not`, and `expect.extend` adds your own.

Times are in seconds. Elements are found by their `data-motion` tags with `film.get("cursor:agent")`, or by role or text with `film.find({ role: "headline", text: /Ask your agent/ })`. `loadFilm` captures the composition once per run and caches it on disk until the project's sources change.

When a matcher fails, its message gives the measured value, for example where the cursor's tip was compared with the target's box. When `toBeRead` or `toBeTheFocus` fails, the message also lists where the simulated viewer looked during that time, in the same form as `mographc gaze`:

```
✗ the reply is the focus while it streams
    expected the simulated viewer to be looking at text:answer for 90% of the time, but it is for 78%; the rest of the time it mostly looks at window:chat "Find out why the nightly build is fail…". Where it looks:
      3.50-4.40s             window:chat "Find out why the nightly build is fail…"  (read 4.5 → 7.7 of 8 words)
      4.40-7.53s    next     text:answer "The nightly build fails because the ca…"  (read 0 → 10.4 of 12 words)
```

[What to test in each section](../skills/mographc/references/testing.md), in the agent skill, has a table of common checks and a worked example.

---

[Documentation index](README.md)
