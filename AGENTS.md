# Repository rules

This repository is **mographc**, a compiler, linter and test framework for Remotion films, and the **mographc** agent skill (`skills/mographc/`) that teaches agents to use it.

## Working on the tool

- Rules are general: a rule states a principle and its condition, never one video's symptom, so it holds for any film. Brand-specific rules go in a preset, outside the package (`examples/brand-preset/` shows how).
- A person's note on a real cut that the tool missed is a missing rule: add or fix the rule, then run `mographc lint` on that cut to check it's caught, and on a cut they approved to check nothing new fires.
- Every finding says what was measured, what's needed and how to fix it. Write rule docs (`docs.summary`, `docs.why`, `docs.fix`) for an agent that has never seen the rule; `mographc explain` prints them.
- Measure in seconds and px/s, and scale pixel thresholds with `px(film, …)`, so rules hold at any fps and resolution.
- mographc runs on plain Node: no Bun APIs, no `bun:test`. User files (configs, tests, `remotion.config.ts`) are loaded through `src/load.ts`.
- Remotion packages are peer dependencies. Never import them directly in `src/`; resolve them from the user's project (`capture.ts` does this) so a project has only one Remotion.
- Run `npm run check` (tsc + eslint) and `npm run verify` in `examples/demo` before opening a PR.
