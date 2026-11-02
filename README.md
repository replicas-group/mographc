# mographc

mographc is a compiler, linter and test framework for motion graphics made with [Remotion](https://remotion.dev). It renders every frame of a film and measures every element on it (its position and size, opacity, stretch and text). From those measurements it reports what is broken, which rules of good motion the film breaks, and whether the film does what you intended.

mographc is designed to be used by coding agents. You install it with its agent skill, then ask your agent in plain language to check a film, add a rule or write a test. The agent writes the config, rules and tests, runs mographc, and fixes the film until the checks pass. Each finding reports what was measured, what the rule requires and how to fix it, so the agent can fix problems without a person having to watch the film and describe what's wrong.

## Using mographc with a coding agent

In a Remotion project, install mographc and add its agent skill with the [skills](https://skills.sh) CLI:

```bash
npm i -D mographc
npx skills add replicas-group/mographc -a universal -a claude-code -y
```

The second command puts the skill in `.agents/skills/mographc`, which Codex, Cursor, Gemini CLI, GitHub Copilot, OpenCode and most other coding agents read. Claude Code reads `.claude/skills/` instead, so `-a claude-code` also adds a link there that points to the same files. Commit both folders and `skills-lock.json` so everyone working on the project gets the skill. [Getting started](docs/getting-started.md#installing-the-agent-skill) covers other ways to install it.

The skill teaches the agent how to plan a film, run mographc, write tests and rules, and fix what mographc reports. Then ask for what you want, for example:

- "Check this film and fix what's wrong."
- "Make sure the cursor clicks Send before the headline appears."
- "Add a rule that our logo always has clear space around it, as wide as the logo is tall."
- "The cart total should be at least 18 px tall for the whole checkout scene, so it can be read on a phone. Add a test for that."
- "Our brand guide says no drop shadows and only these colours. Turn that into a lint preset."

For the second request, the agent gives the cursor, the button and the headline [`data-motion` tags](docs/terms.md#elements) if they don't have them yet, writes a test file, and runs it:

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
  2.80s          error  continuity/jump              cursor:person: moves or
                        changes size by 295 px in one frame, while the largest
                        change 2 to 3 frames before or after is 54 px
                        Required: a continuous path, with no single-frame change
                        over 40 px at 1080p that is more than 4 times the change
                        in the frames around it. Fix: Go to the frames in the
                        finding and make the motion before and after them start
                        and end at the same position and size. If one element
                        replaces another, start the new one exactly where the
                        old one ends.
  3.83-4.13s     error  cursor/dead-exit             cursor:person: disappears
                        while still on the canvas, moving at 0 px/s on its last
                        frame
                        Required: the cursor leaves by moving past the edge of
                        the canvas. Fix: After the cursor's last click, move it
                        off the nearest edge of the canvas with a short, fast
                        move that eases in, instead of fading it out.

2 errors, 0 warnings

— tests (*.mographc.ts)

src/demo.mographc.ts
  ✗ the click > the cursor clicks Send
      expected cursor:person to point at button:send at 3.33 s; its tip is at
      (1224, 540) px, and the target spans x 1526-1645, y 513-570
  ✓ the layout > the headline never touches the window (0 ms)
```

## What mographc checks

mographc has three tools, modelled on the ones commonly used for code:

- `mographc check` works like `tsc`. It reports what is broken: elements that jump or flicker, text that is cut off or drawn over other text, images that fail to load, and fonts that fail to load and fall back to another font.
- `mographc lint` works like ESLint. It checks the film against rules about motion, such as how strongly moves slow down at the end, how long text stays on screen, where elements are placed, and whether text is large enough to read. It has a flat config file, presets, plugins, per-rule options, and suppressions written next to the code.
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
- [Terms](docs/terms.md): what words such as element, role, section, move and baseline mean in mographc.
- [Configuring the linter](docs/configuration.md): `mographc.config.ts`, presets, rule options, and accepting findings.
- [Writing a rule](docs/writing-rules.md): the rule API and the film model, for your own rules and brand presets.
- [Writing tests](docs/writing-tests.md): test files, `loadFilm` and every matcher.
- [Baselines](docs/baselines.md): saving a film's measurements when a person approves it, and comparing later versions with them.
- [How it works](docs/how-it-works.md): how mographc measures a film.
- [Rules reference](docs/rules.md): every built-in rule.

## Examples

- [`examples/demo`](examples/demo) is a short film with a chat window, a cursor and a headline. Its `Demo` composition passes every check, and `DemoBroken` is the same film with three bugs added.
- [`examples/brand-preset`](examples/brand-preset) is a [preset](docs/terms.md#checking) of brand rules (colours, typeface, type weight, no shadows) written with the public API, as a starting point for your own.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). mographc is released under the [MIT license](LICENSE).
