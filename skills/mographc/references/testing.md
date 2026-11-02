# Writing tests that encode intent

The linter checks rules that apply to any film. Tests check what you intended for this particular film: that the cursor clicks _Send_ at 4.2 s, that the claim appears on the downbeat, that the PR page can be read on a phone. Write them from the beat sheet, before or while you build each beat, the way you would write tests for a function's contract.

The timing matters. A test written after watching the render tends to describe what was made, mistakes included. A test written from the beat sheet records what you meant, so it can catch the difference between the two.

## Setup

```ts
// src/launch.mographc.ts, next to the composition. Run it with `npx mographc test` (or `verify`).
import { describe, expect, loadFilm, test } from "mographc/test";

const film = await loadFilm("Launch"); // the composition id; captured once, cached until the sources change
```

- Times are in **seconds**. Name your beat times once and use the names in both the scene and the tests (`const BEAT = { click: 4.2, … }`), so they can't drift apart.
- Find elements by their tags with `film.get("cursor:agent")`, or by role or text with `film.find({ role: "headline", text: /Ask your agent/ })`.
- `npx mographc elements` lists every element, with ids and times.
- Test files end in `.mographc.ts` (or `.tsx`, `.js`). mographc runs them itself on Node, so nothing else needs to be installed. Besides the film matchers below, `expect` has the common ones: `toBe`, `toEqual`, `toBeTruthy`, `toBeGreaterThan`, `toContain`, `toMatch` and so on, each with `.not`.

## What to test in every beat

| The beat has…        | Test that…                                           | Matcher                                                            |
| -------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| a click              | the cursor's tip is on the target at the click       | `expect(cursor).toPointAt(button, { at })`                         |
| a cursor             | it moves continuously, and leaves by moving off      | `toMoveContinuously()`, `toLeaveCanvas({ by })`                    |
| product UI to read   | its text is phone-sized while it matters             | `toHaveTextAtLeast(18, { during })`                                |
| a headline           | it never touches the product, and holds long enough  | `not.toOverlap(window)`, `toHold({ seconds })`                     |
| a caption            | a viewer actually reads it before it leaves          | `toBeRead()`                                                       |
| one thing to look at | the viewer's eye is on it through the section        | `toBeTheFocus({ during })`                                         |
| a subject to look at | it's on screen when it matters, inside the safe area | `toBeVisible({ during })`, `toStayInside("safe-area", { during })` |
| an order of events   | cause comes before effect                            | `expect(click).toPrecede(result)`                                  |
| a sync point         | it lands on the music                                | `toAppearAt(time, { within: 0.1 })`                                |
| a landing move       | it settles                                           | `toEaseOut({ between })`, `toLandAt({ x, y }, { at })`             |

End every film's tests with the whole film passing lint, so a regression anywhere fails the run:

```ts
test("the film lints clean", async () => {
  await expect(film).toPassLint();
});
```

## Example: one beat

> **Beat 3, 7.0–10.5 s: "Ask your agent to change it."** The person selects two lines, clicks _Add to chat_, and the chip flies into the chat; the headline sits on the right.

```ts
const BEAT3 = { select: 7.4, add: 8.6, chipLands: 9.4, end: 10.5 };

describe("beat 3: ask your agent", () => {
  const cursor = film.get("cursor:person");
  const chat = film.get("window:chat");
  const headline = film.find({ role: "headline", text: /Ask your agent/ })[0];

  test("the person clicks Add to chat", () => {
    expect(cursor).toPointAt(film.get("button:add-to-chat"), { at: BEAT3.add });
  });
  test("the chip lands in the chat and settles", () => {
    expect(film.get("chip:selection")).toEaseOut({
      between: [BEAT3.add, BEAT3.chipLands],
    });
  });
  test("the cursor leaves by moving off", () => {
    expect(cursor).toLeaveCanvas({ by: BEAT3.end });
  });
  test("the chat reads on a phone", () => {
    expect(chat).toHaveTextAtLeast(18, {
      during: [BEAT3.chipLands, BEAT3.end],
    });
  });
  test("the headline keeps to its side", () => {
    expect(headline).not.toOverlap(chat);
    expect(headline).toHold({ seconds: 1.5 });
  });
});
```

## Matchers

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

## When a test fails

The message gives the measured value: where the tip was versus the target's box, or which line was 14 px. Fix the scene, not the test. Change a test only when the _intent_ changed (the beat moved, the copy changed), and then change the beat sheet too.
