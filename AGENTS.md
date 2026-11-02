# Repository rules

This repository is **mographc**, a compiler, linter and test framework for Remotion films, and the **mographc** agent skill (`skills/mographc/`) that teaches agents to use it.

## Working on the tool

- Keep rules general: a rule states a principle and the condition it applies under, never one video's symptom, so that it holds for any film. Brand-specific rules go in a preset, outside the package (`examples/brand-preset/` shows how).
- When a person points out a problem in a real film that mographc missed, add a rule for it or fix the existing one. Then run `mographc lint` on that film to check the problem is reported, and on a film they approved to check that nothing new is reported.
- Every finding says what was measured, what the rule requires (printed after "Required:") and how to fix it. Write rule docs (`docs.summary`, `docs.why`, `docs.fix`, and `docs.options` for every option, with units) for an agent that has never seen the rule; `mographc explain` prints them. Use the words in `docs/terms.md` with the meanings given there.
- Measure in seconds and px/s, and write pixel thresholds at 1080p and scale them with `px(film, …)`, so rules give the same results at any frame rate and resolution.
- mographc runs on plain Node: no Bun APIs, no `bun:test`. User files (configs, tests, `remotion.config.ts`) are loaded through `src/load.ts`.
- Remotion packages are peer dependencies. Never import them directly in `src/`; resolve them from the user's project (`capture.ts` does this) so a project has only one Remotion.
- Run `npm run check` (tsc + eslint) and `npm run verify` in `examples/demo` before opening a PR.
