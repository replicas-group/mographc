---
name: mographc
description: Use when making, editing or reviewing a motion graphics film in Remotion (a product launch video, a feature explainer, an animated demo). Covers planning the film, building it, and checking it with mographc, a compiler, linter and test framework for Remotion films, before anyone watches it.
---

# Making a Remotion film with mographc

Many of the notes a person gives on a version of a film are about things that can be measured: a cursor that jumps, a move that stops without slowing down, a title a few pixels off-centre, a window whose text touches its edges. mographc measures every element on every frame of the film and reports those problems. Fix everything it reports before showing the film to anyone, so that the person watching it doesn't have to point out mechanical problems and can comment on the idea instead.

`node_modules/mographc/docs/terms.md` defines the words mographc uses (element, role, section, move, ease-out, baseline and others). Findings and these instructions use them with those meanings.

## 1. Set up

Start from a Remotion project, or create one:

```bash
npx create-video@latest --yes --blank my-film && cd my-film
npm i -D mographc
npx mographc init          # writes mographc.config.ts and an example test
```

mographc runs on Node 22.13 or later and uses the project's own copy of Remotion, so the versions always match. If the film has a brand to follow, add a brand preset to `mographc.config.ts` (see "Adding a rule or a brand preset" below).

## 2. Plan before you animate

1. Write the story as a change. In one sentence, say what things were like before the feature and what they are like now. A film that only shows the feature doesn't tell the viewer why it matters. Read [references/craft.md](references/craft.md#the-story) before planning the sections.
2. Write a plan with one entry per section. A section is a part of the film, usually 2 to 3 seconds long, that shows one idea.
   - Order the sections like this: an opening that shows the problem within the first 1.5 s (not the setup), then the product acting, then the result shown concretely, then a claim that names what just happened, then the brand.
   - Give each idea its own section. Three things to show are three sections, not one shot where three things happen.
   - For each section, write down:
     - its start and end time
     - the one idea the viewer should learn
     - the one element the viewer should look at, and the one thing they should read: either a caption of 2 to 6 words or the product text the section is about, but not both at once
     - how many words the viewer has to read: allow about 0.3 s for each word, plus a moment to look at the product
     - what the shot is framed on (the action, not the whole window)
     - what moves at every moment
     - the headline text
     - the sound effect, if any
3. Write tests from the plan (step 4) before building each section. Before you build, you know exactly what each section is meant to do. After many renders, it becomes hard to see the film as anything other than what you made, so tests written then tend to check the result instead of the intention.

[references/craft.md](references/craft.md) covers framing, the words on screen and the cursor. Those are decisions mographc can't make for you.

## 3. Build, then verify until it's clean

Write each scene's motion as pure functions of `frame`: keyframes, paths and rectangles computed from the frame number, on eased curves (never call `interpolate` without an `easing`). [references/recipes.md](references/recipes.md) has code for motion that passes the rules:

- easing curves
- a camera that pushes in on the action
- a cursor that stretches with its speed, squashes on a click, and marks its tip
- easing the on-screen rectangle of a surface (a window, card or panel)
- one progress value for compound moves
- typing

Give every important element a tag, so that findings and tests can refer to it by name:

```tsx
<div data-motion="window:pr" style={…}>…</div>          // tags: window, card, panel, cursor, button, headline, logo…
<div data-motion="cursor:agent">… <div data-motion-tip style={{ position: "absolute", left: 3, top: 2 }} /> …</div>
```

Then repeat:

```bash
npx mographc verify      # compiler, linter and your tests; exits 1 on any error
```

- Fix every error. Each finding says what was measured, what the rule requires (after "Required:"), and how to fix it. `npx mographc explain <rule>` explains why the rule exists and what its options mean.
- Read every warning, and fix it unless you can say why the film is right as it is.
- Don't change a rule's options or turn it off to make the film pass, because the rule is there to catch something a viewer would notice. If breaking a rule is intended (for example, a cursor that turns into an element of the next shot instead of leaving), accept that one finding where it happens and give the reason:
  ```tsx
  <div data-motion="cursor:agent" data-motion-ignore="cursor/dead-exit: it turns into the share button">
  ```
  For a time range in seconds, add `{ between: [9.5, 13], rules: { "staging/no-padding": "off" }, reason: "…" }` to `mographc.config.ts`.
- `npx mographc elements` lists every element mographc sees, with ids, roles and times. Use it to decide what to tag, or to find out why a test can't find an element.
- `npx mographc gaze <composition>` prints where the simulated viewer looks at each moment, why, and how many words of each text it has read. Run it whenever an `attention/` finding, `toBeRead` or `toBeTheFocus` surprises you, before changing the film: it shows what took the eye away.
- `npx mographc activity <composition>` prints, second by second, how much of the film is changing and what changes, and lists the still stretches. Run it for `pace/activity` and `pace/dead-air` findings.

## 4. Write tests that record what you intended

The linter checks general rules about motion, but it can't know what a particular film is meant to show, such as the cursor clicking _Send_ at 4.2 s. Tests record those intentions. Put tests next to the composition in files ending in `.mographc.ts`:

```ts
import { describe, expect, loadFilm, test } from "mographc/test";
const film = await loadFilm("Launch");

describe("section 2: the agent sends the fix", () => {
  const cursor = film.get("cursor:agent");
  test("clicks Send", () =>
    expect(cursor).toPointAt(film.get("button:send"), { at: 4.2 }));
  test("then leaves by moving off the canvas", () =>
    expect(cursor).toLeaveCanvas({ by: 5 }));
  test("the claim never overlaps the chat window", () =>
    expect(film.get("headline:claim")).not.toOverlap(film.get("window:chat")));
  test("the chat text is at least 18 px, large enough to read on a phone", () =>
    expect(film.get("window:chat")).toHaveTextAtLeast(18, { during: [3, 5] }));
});
test("the whole film passes the compiler and the linter", async () => {
  await expect(film).toPassLint();
});
```

Each section should have tests for where its clicks land, its text size, which elements must not overlap, and its timing. It should also test what the viewer looks at and reads: each caption with `toBeRead()`, and the element the section is about with `toBeTheFocus({ during })`. [references/testing.md](references/testing.md) has the patterns and every matcher.

## 5. Watch it, then hand it over

mographc only catches problems that can be measured, so also do the following before showing the film to anyone:

- Render the film and look at still frames at every transition between sections, not only at the start and end of each section.
- Answer the review questions for each section, and write down any "no" (see [references/craft.md](references/craft.md#review-before-handing-over)):
  - What should the viewer learn here?
  - Can its text be read on a phone?
  - Does everything on screen support that idea?
  - Is there one element for the viewer to look at, and one thing to read?
- Share the render together with the summary from `verify`.

When a person approves the film, run `npx mographc baseline save` to save its measurements as the baseline. After that, `lint` also reports measurable changes for the worse since the baseline, such as text that was on screen during a headline and is now missing, a move that slows down less at the end, or a smaller cursor.

When a person points out a problem that mographc didn't catch, add a rule or a test for it so it can't happen again. If the note applies to films in general, consider proposing it as a rule in the mographc repository.

## Adding a rule or a brand preset

When a person asks for a check that applies to every film in a project (for example "our logo always has clear space around it" or "only these colours"), write a lint rule rather than a test, because a rule runs on every composition without anyone having to remember it. A test is the better fit for something specific to one film, such as a click at a particular time.

- Write the rule with `defineRule` from `mographc`, using the film model (mographc's measurements of every element on every frame) and the `px` and `area` helpers. The API is described in `node_modules/mographc/docs/writing-rules.md`.
- Put it in the project (for example `rules/logo-clearspace.ts`) and turn it on in `mographc.config.ts` with `plugins` and `rules`, as described in `node_modules/mographc/docs/configuration.md`.
- For a set of brand rules, group them into a preset: a config block with the rules in `plugins` and their severities in `rules`. [examples/brand-preset](https://github.com/replicas-group/mographc/tree/main/examples/brand-preset) is a complete example to copy.
- Check the new rule both ways: run `npx mographc lint` on a film that should break it and confirm it's reported, and on one that shouldn't and confirm nothing new is reported.
