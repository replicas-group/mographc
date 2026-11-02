# Writing tests

The linter checks rules that apply to any film. Tests check what you intended for one particular film, for example that the cursor clicks _Send_ at 4.2 s or that the headline never overlaps the product window.

Test files end in `.mographc.ts` (or `.tsx`, `.js`). mographc runs them itself on Node, with the same `describe`, `test` and `expect` API as Vitest and Jest, so you don't need to install a test runner.

```ts
import { describe, expect, loadFilm, test } from "mographc/test";
const film = await loadFilm("Launch");

describe("beat 2", () => {
  test("the agent clicks Send", () =>
    expect(film.get("cursor:agent")).toPointAt(film.get("button:send"), {
      at: 4.2,
    }));
  test("then flings off", () =>
    expect(film.get("cursor:agent")).toLeaveCanvas({ by: 5 }));
  test("the chat reads on a phone", () =>
    expect(film.get("window:chat")).toHaveTextAtLeast(18, { during: [3, 5] }));
});
test("the film lints clean", async () => {
  await expect(film).toPassLint();
});
```

The file name doesn't end in `.test.ts` on purpose. Vitest, Jest and Bun pick up every `*.test.ts` file by default, and they would try to run film tests that need mographc's runner.

## Film matchers

| Matcher                                    | Passes when                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `toBeVisible(when?)` / `toBeHidden(when?)` | opacity over 0.3 with some of it on screen (or not), at every frame of `{ at }` or `{ during: [a, b] }` |
| `toPointAt(target, { at, tolerance? })`    | the pointer's `data-motion-tip` (else its top-left) is inside the target element or box                 |
| `toLandAt({ x, y }, { at, tolerance? })`   | its centre is within `tolerance` px (default 8) of the point                                            |
| `toOverlap(other, when?)`                  | they overlap on screen at some frame; use `.not` for "never"                                            |
| `toStayInside(box or "safe-area", when?)`  | it never leaves the box (the safe area is the central 90%)                                              |
| `toHaveTextAtLeast(px, when?)`             | every visible line of text inside it is at least `px` on screen                                         |
| `toMoveContinuously()`                     | it never jumps                                                                                          |
| `toEaseOut({ between? })`                  | every move that lands eases out as strongly as its length needs                                         |
| `toLeaveCanvas({ by })`                    | it's gone by then, and it left by moving off the canvas                                                 |
| `toAppearAt(time, { within? })`            | it's first fully visible within `within` s (default 0.1) of `time`                                      |
| `toHold({ seconds, from? })`               | it's on screen and still for at least that long                                                         |
| `toPrecede(other)`                         | it's visible before the other is                                                                        |
| `toBeRead()`                               | the simulated viewer finishes reading its text before it leaves (see `attention/unread-text`)           |
| `toBeTheFocus({ during, share? })`         | the simulated viewer is looking at it for `share` (default 60%) of the window                           |
| `toPassLint()` (on the film)               | the film passes the compiler and the project's lint config                                              |

`expect` also has the common general matchers (`toBe`, `toEqual`, `toBeTruthy`, `toBeGreaterThan`, `toContain`, `toMatch` and others), every matcher supports `.not`, and `expect.extend` adds your own.

Times are in seconds. Elements are found by their `data-motion` tags with `film.get("cursor:agent")`, or by role or text with `film.find({ role: "headline", text: /Ask your agent/ })`. `loadFilm` captures the composition once per run and caches it on disk until the project's sources change.

When a matcher fails, its message gives the measured value, for example where the cursor's tip was compared with the target's box.

[What to test in each beat](../skills/mographc/references/testing.md), in the agent skill, has a table of common checks and a worked example.

---

[Documentation index](README.md)
