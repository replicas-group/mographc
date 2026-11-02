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

You don't need any other setup, because mographc bundles the project with its own `remotion.config.ts` (so Tailwind and custom webpack settings still apply), wraps every composition in a probe, and steps through every frame without taking screenshots. The result is cached until the project's sources change.

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

| Command          | Similar to | What it checks                                                                                                                                                                      | Setup                         |
| ---------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `mographc check` | `tsc`      | Whether anything is broken: teleports, flicker, text cut off or drawn over other text, missing images, fallback fonts.                                                              | none                          |
| `mographc lint`  | ESLint     | Whether the motion follows the rules: easing strength by move length, squash and stretch, staging, spacing, legibility, pacing, attention, and regressions against an approved cut. | optional `mographc.config.ts` |
| `mographc test`  | Vitest     | Whether the film does what you meant: the cursor clicks _Send_ at 4.2 s, the headline never touches the product.                                                                    | `*.mographc.ts` files         |

`mographc verify` runs all three. `mographc rules` lists every rule, and `mographc explain <rule>` prints what a rule checks, why it matters and how to fix a finding. `mographc help` lists every command and option.

Every command takes composition ids to limit the run (`mographc lint Launch Teaser`), and these options:

| Option             | What it does                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `--entry <file>`   | The Remotion entry point, if it isn't the one in `remotion.config.ts` or `src/index.ts`. |
| `--config <file>`  | A config file other than `mographc.config.ts`.                                           |
| `--frames <a-b>`   | Only check these frames.                                                                 |
| `--json`           | Print findings as JSON, for scripts and agents.                                          |
| `--warnings=false` | Print errors only.                                                                       |
| `--no-cache`       | Capture the film again even if its sources haven't changed.                              |

`mographc elements` lists every element mographc sees in the film, with its id, role and the times it's on screen. It's the quickest way to find what to tag, or to find out why a test can't find an element.

In a terminal, output is coloured and wrapped to the window's width. When it's piped, colour and wrapping are off, so each finding stays on its own lines. Set `NO_COLOR` to turn colour off, or `FORCE_COLOR` to turn it on.

## Naming elements with `data-motion`

Findings and tests are much easier to read when the film's subjects have names:

```tsx
<div data-motion="window:pr">…</div>
<div data-motion="cursor:agent">…<div data-motion-tip style={{ position: "absolute", left: 3, top: 2 }} /></div>
<button data-motion="button:send">Send</button>
```

- **The part before the colon is the role.** It decides which rules apply. The roles are `cursor`, `window`/`card`/`panel` (surfaces), `button`, `headline`/`title`, `logo`, or anything else.
- **The part after the colon is the name.** Elements without a tag are still checked. mographc identifies them by their structure and by following them from frame to frame, and infers their role: large free-standing text is a headline, a painted box is a surface, and a small glyph that travels and stretches is a cursor.
- **`data-motion-tip`** marks a pointer's hotspot, so that `toPointAt` can check exactly where a click lands.

---

[Documentation index](README.md)
