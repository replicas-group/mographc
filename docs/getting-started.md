# Getting started

This page covers installing mographc and running it yourself. If you work with a coding agent, the [README](../README.md#using-mographc-with-a-coding-agent) explains how to set the agent up instead; the agent runs the same commands described here.

## Installing

In a Remotion project:

```bash
npm i -D mographc
npx mographc init      # writes mographc.config.ts and an example test
npx mographc verify    # runs the compiler, the linter and the tests; exits 1 on any error
```

mographc needs Node 22.13 or later. Bun users can run it with `bunx mographc`.

You don't need any other setup. mographc bundles the project with its own `remotion.config.ts` (so Tailwind and custom webpack settings still apply), wraps every [composition](terms.md#the-film) in a probe that measures its elements, and renders every frame without taking screenshots. The measurements are cached until the project's sources change.

mographc uses the project's own copy of Remotion rather than bringing its own, so there is only one version of Remotion in the project and it always matches.

## Installing the agent skill

mographc includes an agent skill in `skills/mographc/`. It teaches a coding agent how to plan a film, run mographc, write tests and rules, and fix what mographc reports. The [skills](https://skills.sh) CLI installs it:

```bash
npx skills add replicas-group/mographc -a universal -a claude-code -y
```

- `-a universal` installs the skill in `.agents/skills/mographc`. Most coding agents read skills from `.agents/skills/`, including Codex, Cursor, Gemini CLI, GitHub Copilot, OpenCode, Amp and Cline.
- `-a claude-code` adds `.claude/skills/mographc`, because Claude Code reads skills from `.claude/skills/` only. The CLI makes it a symbolic link to the copy in `.agents/skills/`, so there is one copy of the files. Add `--copy` if your system doesn't support symbolic links.
- `-y` skips the CLI's questions. Without it, the CLI asks which agents to install for.
- The CLI records the source in `skills-lock.json`. `npx skills update` updates the skill later.

`npx skills add` takes the skill from the repository's default branch, so it can be newer than the version of mographc you installed. To use the skill that ships inside the installed package instead, link it from `node_modules` with the CLI's sync command (marked experimental in the skills CLI):

```bash
npx skills experimental_sync -a universal -a claude-code -y
```

This makes `.agents/skills/mographc` a link to `node_modules/mographc/skills/mographc`, so the skill updates whenever you update mographc.

## The commands

| Command          | Similar to | What it checks                                                                                                                                                                                                                                                                                                                                                     | Setup                         |
| ---------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| `mographc check` | `tsc`      | Whether anything is broken: elements that jump or flicker, text cut off or drawn over other text, images that don't load, fonts that fall back to another font.                                                                                                                                                                                                    | none                          |
| `mographc lint`  | ESLint     | Whether the motion follows the rules: how strongly each move slows down at the end for its length, whether a fast cursor stretches, where elements are placed and how much room they have, text size, how long things stay on screen, what the [simulated viewer](terms.md#reading) manages to read, and changes for the worse since the [baseline](baselines.md). | optional `mographc.config.ts` |
| `mographc test`  | Vitest     | Whether the film does what you meant: the cursor clicks _Send_ at 4.2 s, the headline never overlaps the product window.                                                                                                                                                                                                                                           | `*.mographc.ts` files         |

`mographc verify` runs all three. `mographc rules` lists every rule, and `mographc explain <rule>` prints what a rule checks, why it matters and how to fix a finding. `mographc help` lists every command and option, and `mographc <command> --help` prints one command's options.

Every command takes composition ids to limit the run (`mographc lint Launch Teaser`), and these options:

| Option             | What it does                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `--entry <file>`   | The Remotion entry point, if it isn't the one in `remotion.config.ts` or `src/index.ts`. |
| `--config <file>`  | A config file other than `mographc.config.ts`.                                           |
| `--frames <a-b>`   | Only check these frames.                                                                 |
| `--json`           | Print findings as JSON, for scripts and agents.                                          |
| `--warnings=false` | Print errors only.                                                                       |
| `--no-cache`       | Capture the film again even if its sources haven't changed.                              |
| `--during <a-b>`   | For `gaze` and `activity`: only print seconds a to b. The whole film is still measured.  |

`mographc elements` lists every [element](terms.md#elements) mographc sees in the film, with its id, [role](terms.md#elements) and the times it's on screen. It's the quickest way to find what to tag, or to find out why a test can't find an element. Untagged graphics and the parts of a cursor are left out unless you pass `--all`.

Two commands show what the `attention/` and `pace/` rules are based on:

- `mographc gaze <composition>` prints where the [simulated viewer](terms.md#reading) looks over time, why it looks there, and how many words of each text it has read, then lists every text it meets and how much of it was read before it left. Use it when `attention/unread-text`, `attention/competing`, `toBeRead` or `toBeTheFocus` reports something you don't expect:

  ```
  Chat  where the simulated viewer looks, reading 3.5 words a second
    time           why      looks at                                                 read
    1.80-2.60s     next     window:chat "Find out why the nightly build is fail…"    0 → 2.2 of 8 words
    2.60-2.67s     pulled   surface 1102x300 at (409, 549)
    2.67-4.40s     next     window:chat "Find out why the nightly build is fail…"    2.2 → 7.7 of 8 words
    4.40-7.83s     next     text:answer "The nightly build fails because the ca…"    0 → 11.4 of 12 words
  ```

  `pulled` means something new appeared or moved and drew the eye, `next` that it went on to the next unread text, and `follows` that, with nothing to read, it follows what moves.

- `mographc activity <composition>` prints, for each second, the share of frames where something is changing, where on the canvas the change is, and what changes, then lists the still stretches. Use it to find where the film is still when `pace/activity` or `pace/dead-air` reports it.

In a terminal, output is coloured and wrapped to the window's width. When it's piped, colour and wrapping are off, so each finding stays on its own lines. Set `NO_COLOR` to turn colour off, or `FORCE_COLOR` to turn it on.

## Naming elements with `data-motion`

Findings and tests are much easier to read when the film's important elements have names. A [tag](terms.md#elements) is a `data-motion="role:name"` attribute:

```tsx
<div data-motion="window:pr">…</div>
<div data-motion="cursor:agent">…<div data-motion-tip style={{ position: "absolute", left: 3, top: 2 }} /></div>
<button data-motion="button:send">Send</button>
```

- The part before the colon is the role, which decides which rules apply to the element. For example, `window`, `card` and `panel` all give the role `surface` (a box that contains other elements), and `title` gives the role `headline`. [Terms](terms.md#elements) lists every role and the tags for it.
- The part after the colon is the name that findings and tests use.
- Elements without a tag are still checked. mographc follows them from frame to frame by their place in the page structure, their position and their size, and infers their role. For example, untagged text at least 40 px tall at 1080p that isn't inside a surface is a headline.
- `data-motion-tip` marks the [tip](terms.md#elements) of a cursor, the point that clicks, so that `toPointAt` can check exactly where a click lands.

---

[Documentation index](README.md)
