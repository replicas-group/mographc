# Writing tests that record what you intended

The linter checks rules that apply to any film. Tests check what you intended for this particular film: that the cursor clicks _Send_ at 4.2 s, that the claim appears in time with the music, that the text on the PR page is large enough to read on a phone. Write them from the plan of the film's sections, before or while you build each section, the way you would write tests for what a function promises to do.

When you write the tests matters. A test written after watching the render tends to describe what was made, including its mistakes. A test written from the plan records what you meant, so it can catch differences between the two.

Words such as section, tip, move and simulated viewer have the meanings given in `node_modules/mographc/docs/terms.md`.

## Setup

```ts
// src/launch.mographc.ts, next to the composition. Run it with `npx mographc test` (or `verify`).
import { describe, expect, loadFilm, test } from "mographc/test";

const film = await loadFilm("Launch"); // the composition id; captured once, cached until the sources change
```

- Times are in seconds. Name the times of the film's events once and use the names in both the scene and the tests (`const TIMES = { click: 4.2, … }`), so the two can't get out of step.
- Find elements by their `data-motion` tags with `film.get("cursor:agent")`, or by role or text with `film.find({ role: "headline", text: /Ask your agent/ })`.
- `npx mographc elements` lists every element, with ids, roles and times.
- Test files end in `.mographc.ts` (or `.tsx`, `.js`). mographc runs them itself on Node, so nothing else needs to be installed. Besides the film matchers below, `expect` has the common ones: `toBe`, `toEqual`, `toBeTruthy`, `toBeGreaterThan`, `toContain`, `toMatch` and so on, each with `.not`.

## What to test in every section

| The section has…                    | Test that…                                                             | Matcher                                                            |
| ----------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| a click                             | the cursor's tip is on the target at the time of the click             | `expect(cursor).toPointAt(button, { at })`                         |
| a cursor                            | it never jumps, and it leaves by moving off the canvas                 | `toMoveContinuously()`, `toLeaveCanvas({ by })`                    |
| product text the viewer must read   | its text is at least 18 px while it matters, large enough for a phone  | `toHaveTextAtLeast(18, { during })`                                |
| a headline                          | it never overlaps the product, and stays still and visible long enough | `not.toOverlap(window)`, `toHold({ seconds })`                     |
| a caption                           | the simulated viewer reads all of it before it leaves                  | `toBeRead()`                                                       |
| one element the viewer should watch | the simulated viewer looks at it for most of the section               | `toBeTheFocus({ during })`                                         |
| an important element                | it's visible when it matters, and inside the safe area                 | `toBeVisible({ during })`, `toStayInside("safe-area", { during })` |
| events in an order                  | the cause comes before the effect                                      | `expect(click).toPrecede(result)`                                  |
| a moment timed to the music         | the element becomes visible within 0.1 s of that moment in the music   | `toAppearAt(time, { within: 0.1 })`                                |
| a move that ends on screen          | it slows down at the end and stops at the right point                  | `toEaseOut({ between })`, `toLandAt({ x, y }, { at })`             |

End every film's tests with a test that the whole film passes the compiler and the linter, so a problem anywhere in the film fails the run:

```ts
test("the film passes the compiler and the linter", async () => {
  await expect(film).toPassLint();
});
```

## Example: one section

> Section 3, 7.0–10.5 s: "Ask your agent to change it." The person selects two lines and clicks _Add to chat_, and a chip with the selection flies into the chat. The headline is on the right of the canvas.

```ts
const SECTION3 = { select: 7.4, add: 8.6, chipLands: 9.4, end: 10.5 };

describe("section 3: ask your agent", () => {
  const cursor = film.get("cursor:person");
  const chat = film.get("window:chat");
  const headline = film.find({ role: "headline", text: /Ask your agent/ })[0];

  test("the person clicks Add to chat", () => {
    expect(cursor).toPointAt(film.get("button:add-to-chat"), {
      at: SECTION3.add,
    });
  });
  test("the chip slows down as it arrives in the chat", () => {
    expect(film.get("chip:selection")).toEaseOut({
      between: [SECTION3.add, SECTION3.chipLands],
    });
  });
  test("the cursor leaves by moving off the canvas", () => {
    expect(cursor).toLeaveCanvas({ by: SECTION3.end });
  });
  test("the chat text is at least 18 px, large enough to read on a phone", () => {
    expect(chat).toHaveTextAtLeast(18, {
      during: [SECTION3.chipLands, SECTION3.end],
    });
  });
  test("the headline stays clear of the chat", () => {
    expect(headline).not.toOverlap(chat);
    expect(headline).toHold({ seconds: 1.5 });
  });
});
```

## Matchers

| Matcher                                    | Passes when                                                                                                                                                                |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `toBeVisible(when?)` / `toBeHidden(when?)` | its opacity is over 0.3 and some of it is on the canvas (or not), at every frame of `{ at }` or `{ during: [a, b] }`                                                       |
| `toPointAt(target, { at, tolerance? })`    | the cursor's tip (its `data-motion-tip` element, or else its top-left corner) is inside the target element or box, or within `tolerance` px of it (default 0)              |
| `toLandAt({ x, y }, { at, tolerance? })`   | its centre is within `tolerance` px (default 8) of the point at that time                                                                                                  |
| `toOverlap(other, when?)`                  | they overlap on screen at some frame; use `.not` for "never"                                                                                                               |
| `toStayInside(box or "safe-area", when?)`  | no part of it goes outside the box or the safe area (the central 90% of the canvas)                                                                                        |
| `toHaveTextAtLeast(px, when?)`             | every visible line of text inside it has a font size of at least `px` on screen                                                                                            |
| `toMoveContinuously()`                     | it never moves more than 40 px at 1080p in one frame while moving less than a quarter of that in the frames on either side                                                 |
| `toEaseOut({ between? })`                  | every move longer than 40 px that comes to rest on the canvas has an ease-out strength of at least 0.26 (moves under 0.4 s), 0.33 (0.4 to 0.8 s) or 0.40 (0.8 s or longer) |
| `toLeaveCanvas({ by })`                    | it's gone by that time, and its last position was off the canvas                                                                                                           |
| `toAppearAt(time, { within? })`            | its opacity first goes above 0.5 within `within` s (default 0.1) of `time`                                                                                                 |
| `toHold({ seconds, from? })`               | it stays still (moving under 0.5 px a frame) and visible for at least that many seconds, from `from` or at any time                                                        |
| `toPrecede(other)`                         | it becomes visible before the other does                                                                                                                                   |
| `toBeRead()`                               | the simulated viewer finishes reading its text before it leaves (see `attention/unread-text`)                                                                              |
| `toBeTheFocus({ during, share? })`         | the simulated viewer is looking at it for at least `share` (default 0.6, meaning 60%) of the time range                                                                    |
| `toPassLint()` (on the film)               | the film passes the compiler and the project's lint config                                                                                                                 |

## When a test fails

The failure message gives the measured value, such as where the cursor's tip was compared with the target's box, or which line of text was 14 px. Fix the scene rather than the test, because the test records what you meant. Change a test only when what you intend has changed (the section moved, or its text changed), and update the plan at the same time.
