# mographc

mographc is a compiler, linter and test framework for motion graphics made with [Remotion](https://remotion.dev). It renders every frame of a film, measures every element on every frame, and reports what is broken, which rules of good motion the film breaks, and whether it does what you intended.

mographc is designed to be used by coding agents. You install it with its agent skill, then ask your agent in plain language to check a film, add a rule or write a test. The agent writes the config, rules and tests, runs mographc, and fixes the film until the checks pass. Each finding reports what was measured, what the rule requires and how to fix it, so the agent can fix problems without a person watching the film and describing what's wrong.

## Using mographc with a coding agent

In a Remotion project, install mographc and copy its skill to where your agent reads skills. For Claude Code that is `.claude/skills/`; many other agents read `.agents/skills/`.

```bash
npm i -D mographc
mkdir -p .claude/skills
cp -r node_modules/mographc/skills/mographc .claude/skills/
```

The skill teaches the agent how to plan a film, run mographc, write tests and rules, and fix what mographc reports. Then ask for what you want, for example:

- "Check this film and fix what's wrong."
- "Make sure the cursor clicks Send before the headline appears."
- "Add a rule that our logo always has clear space around it."
- "The cart total should be readable on a phone for the whole checkout scene. Add a test for that."
- "Our brand guide says no drop shadows and only these colours. Turn that into a lint preset."

For the second request, the agent tags the cursor, the button and the headline with `data-motion` names if they don't have them yet, writes a test file, and runs it:

```ts
// src/launch.mographc.ts
import { expect, loadFilm, test } from "mographc/test";
const film = await loadFilm("Launch");

test("the cursor clicks Send before the headline appears", () => {
  expect(film.get("cursor:agent")).toPointAt(film.get("button:send"), {
    at: 4.2,
  });
  expect(film.get("cursor:agent")).toPrecede(film.get("headline:claim"));
});
```

## Example output

This is part of the output for the broken version of the [demo film](examples/demo), which has three bugs in it:

```
$ npx mographc verify DemoBroken

DemoBroken
  2.80s          error  continuity/jump              cursor:person: moves 295 px
                        in one frame (the frames around it: 54 px)
                        needs one continuous path. Fix: Find the frame in the
                        finding and make the motion before and after it start
                        and end at the same point. If one element hands off to
                        another, start the second exactly where the first ends.
  3.83-4.13s     error  cursor/dead-exit             cursor:person: it
                        disappears on screen, at 0 px/s
                        needs leave by moving off the canvas. Fix: After its
                        last action, fling the cursor off the nearest edge (a
                        short, fast, eased-in move) instead of fading it.

2 errors, 0 warnings

— tests (*.mographc.ts)

src/demo.mographc.ts
  ✗ the click > the cursor clicks Send
      expected cursor:person to point at button:send at 3.33 s; its tip is at
      (1224, 540), the target spans x 1526-1645, y 513-570
  ✓ the layout > the headline never touches the window (0 ms)
```

## What mographc checks

mographc has three tools, modelled on the ones commonly used for code:

- `mographc check` works like `tsc`. It reports what is broken: elements that jump, flicker, text that is cut off or drawn over other text, images that fail to load, and fonts that fall back.
- `mographc lint` works like ESLint. It checks the film against rules about motion, such as easing, pacing, staging and legibility. It has a flat config file, presets, plugins, per-rule options and suppressions written next to the code.
- `mographc test` works like Vitest. Tests record what a particular film is meant to do, such as "the cursor clicks _Send_ at 4.2 s".

`mographc verify` runs all three and exits with 1 if anything fails. mographc runs on Node 22.13 or later, needs no other setup, and uses the project's own copy of Remotion.

## Using mographc yourself

The CLI and the API that the agent uses are documented for people who want to write config, rules and tests by hand:

```bash
npm i -D mographc
npx mographc init      # writes mographc.config.ts and an example test
npx mographc verify
```

- [Getting started](docs/getting-started.md): installing, the commands and their options, and naming elements with `data-motion`.
- [Configuring the linter](docs/configuration.md): `mographc.config.ts`, presets, rule options, and accepting findings.
- [Writing a rule](docs/writing-rules.md): the rule API and the film model, for your own rules and brand presets.
- [Writing tests](docs/writing-tests.md): test files, `loadFilm` and every matcher.
- [Baselines](docs/baselines.md): comparing a film with the cut a person approved.
- [How it works](docs/how-it-works.md): how mographc measures a film.
- [Rules reference](docs/rules.md): every built-in rule.

## Examples

- [`examples/demo`](examples/demo) is a short film with a window, a cursor and a headline. Its `Demo` composition passes every check, and `DemoBroken` has three bugs added.
- [`examples/brand-preset`](examples/brand-preset) is a brand preset (colours, typeface, type weight, no shadows) written with the public API, as a starting point for your own.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). mographc is released under the [MIT license](LICENSE).
