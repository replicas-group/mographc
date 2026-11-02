---
name: mographc
description: Use when making, editing or reviewing a motion graphics film in Remotion (a product launch video, a feature explainer, an animated demo). Covers planning the film, building it, and checking it with mographc, a compiler, linter and test framework for Remotion films, before anyone watches it.
---

# Making a Remotion film with mographc

Most of the notes a person gives on a cut can be measured: a cursor that jumps, a move that stops without slowing down, a title a few pixels off-centre, a window with no padding around it. mographc measures every element on every frame of the film and reports those problems. Fix everything it reports before handing a cut over, so that the person watching it doesn't have to point out mechanical problems and can comment on the idea instead.

## 1. Set up

Start from a Remotion project, or create one:

```bash
npx create-video@latest --yes --blank my-film && cd my-film
npm i -D mographc
npx mographc init          # writes mographc.config.ts and an example test
```

mographc runs on Node 22.13 or later and uses the project's own copy of Remotion, so the versions always match. If the film has a brand to follow, add a brand preset to `mographc.config.ts` (see "Adding a rule or a brand preset" below).

## 2. Plan before you animate

1. **Write the story as a change.** In one sentence, say what things were like before the feature and what they are like now. A film that only shows the feature doesn't tell the viewer why it matters. Read [references/craft.md](references/craft.md#the-story) before writing the beats.
2. **Write a beat sheet.**
   - **Structure:** a **hook** in the first 1.5 s (the problem or the tension, not the setup), the **turn** (the product acts), the **proof** (the result, shown concretely), the **payoff** (the claim), then the brand.
   - **Sections:** each idea gets its own section of 2 to 3 seconds. Three things to show are three sections, not one frame where three things happen.
   - **For each section, write down:**
     - its start and end time
     - the one idea the viewer should learn
     - **the one place the eye should go** (the subject) and **the one thing to read** (a caption of 2 to 6 words, or the product text that is the subject, but not both at once)
     - its word budget: each word a viewer has to read costs about 0.3 s, on top of a moment to look at the product
     - where the shot is framed (on the action, not the whole window)
     - what moves at every moment
     - the headline copy
     - the sound cue, if any
3. **Write tests from the beat sheet** (step 4) before building each beat. Before you build, you know exactly what each beat is meant to do. After many renders, it becomes hard to see the film as anything other than what you made, so tests written then tend to check the result instead of the intention.

[references/craft.md](references/craft.md) covers staging, copy and the cursor. Those are judgment calls the tool can't make for you.

## 3. Build, then verify until it's clean

Write each scene's motion as **pure functions of `frame`**: keyframes, paths and rectangles computed from the frame number, on eased curves (never call `interpolate` without an `easing`). [references/recipes.md](references/recipes.md) has motion that passes the rules:

- easing curves
- a camera that pushes in on the action
- a cursor with squash and stretch and a tip marker
- easing a surface's on-screen rectangle
- one progress value for compound moves
- typing

Tag every subject so that findings and tests can refer to it by name:

```tsx
<div data-motion="window:pr" style={…}>…</div>          // roles: window, card, panel, cursor, button, headline, logo…
<div data-motion="cursor:agent">… <div data-motion-tip style={{ position: "absolute", left: 3, top: 2 }} /> …</div>
```

Then repeat:

```bash
npx mographc verify      # compiler, linter and your tests; exits 1 on any error
```

- **Fix every error.** Each finding says what was measured, what the rule needs, and how to fix it. `npx mographc explain <rule>` explains why the rule exists.
- **Read every warning,** and fix it unless you can say why the film is right as it is.
- **Don't weaken a rule to get a pass,** because the rule is there to catch something a viewer would notice. If breaking a rule is intended (for example, a cursor that turns into the next shot's element instead of leaving), suppress that one finding where it happens and give the reason:
  ```tsx
  <div data-motion="cursor:agent" data-motion-ignore="cursor/dead-exit: it turns into the share button">
  ```
  For a stretch of time, add `{ between: [9.5, 13], rules: { "staging/no-padding": "off" }, reason: "…" }` to `mographc.config.ts`.
- `npx mographc elements` lists everything the tool sees, with ids and times. Use it to decide what to tag, or to find out why a test can't find an element.

## 4. Write tests that record what you intended

The linter checks general rules about motion, but it can't know what a particular film is meant to show, such as the cursor clicking _Send_ at 4.2 s. Tests record those intentions. Put tests next to the composition in files ending in `.mographc.ts`:

```ts
import { describe, expect, loadFilm, test } from "mographc/test";
const film = await loadFilm("Launch");

describe("beat 2: the agent sends the fix", () => {
  const cursor = film.get("cursor:agent");
  test("clicks Send", () =>
    expect(cursor).toPointAt(film.get("button:send"), { at: 4.2 }));
  test("then leaves by moving off", () =>
    expect(cursor).toLeaveCanvas({ by: 5 }));
  test("the claim never touches the product", () =>
    expect(film.get("headline:claim")).not.toOverlap(film.get("window:chat")));
  test("the chat reads on a phone", () =>
    expect(film.get("window:chat")).toHaveTextAtLeast(18, { during: [3, 5] }));
});
test("the whole film lints clean", async () => {
  await expect(film).toPassLint();
});
```

Each beat should have tests for its clicks, its readability, its collisions and its timing, and for attention: each caption `toBeRead()`, and each section's subject `toBeTheFocus({ during })`. [references/testing.md](references/testing.md) has the patterns and every matcher.

## 5. Watch it, then hand it over

mographc only catches problems that can be measured, so also do the following before handing over a cut:

- **Render the film and look at stills** at every transition, not only at the ends of beats.
- **Answer the staging questions for each section,** and write down any "no" (see [references/craft.md](references/craft.md#staging-review)):
  - What should the viewer learn here?
  - Can it be read on a phone?
  - Does everything on screen serve that idea?
  - Is there one place for the eye to go, and one thing to read?
- **Share the render** together with the summary from `verify`.

When a person approves a cut, run `npx mographc baseline save`. After that, `lint` also reports anything that has become measurably worse than the approved cut, such as content removed from a beat, a weaker ease-out, or a smaller cursor.

When a person gives a note that the tool didn't catch, add a rule or a test for it so it can't happen again. If the note applies to films in general, consider proposing it as a rule in the mographc repository.

## Adding a rule or a brand preset

When a person asks for a check that applies to every film in a project (for example "our logo always has clear space around it" or "only these colours"), write a lint rule rather than a test, because a rule runs on every composition without anyone having to remember it. A test is the better fit for something specific to one film, such as a click at a particular time.

- Write the rule with `defineRule` from `mographc`, using the film model and the `px` and `area` helpers. The API is described in `node_modules/mographc/docs/writing-rules.md`.
- Put it in the project (for example `rules/logo-clearspace.ts`) and turn it on in `mographc.config.ts` with `plugins` and `rules`, as described in `node_modules/mographc/docs/configuration.md`.
- For a set of brand rules, group them into a preset: a config block with the rules in `plugins` and their severities in `rules`. [examples/brand-preset](https://github.com/replicas-group/mographc/tree/main/examples/brand-preset) is a complete example to copy.
- Check the new rule both ways: run `npx mographc lint` on a film that should break it and confirm it's reported, and on one that shouldn't and confirm nothing new is reported.
