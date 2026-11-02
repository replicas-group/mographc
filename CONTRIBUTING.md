# Contributing to mographc

Thanks for helping. Bug reports, new rules and fixes are all welcome.

## Setting up

```bash
git clone https://github.com/replicas-group/mographc && cd mographc
npm install          # also builds dist/
npm run check        # TypeScript and ESLint
```

To try a change on a real film, use the demo:

```bash
cd examples/demo
npm install          # links mographc from the repository root
npm run verify       # should pass
npm run verify:broken  # should fail with the demo's three bugs
```

Run `npm run build` at the repository root after each change to `src/`, because the demo uses the built `dist/`.

## Adding or changing a rule

- A rule states a general principle and the condition it applies under, so that it holds for any film. A rule that only describes one video's symptom will misfire on other films. Brand-specific rules belong in a preset (see `examples/brand-preset`), not in mographc itself.
- Every finding says what was measured, what the rule needs, and how to fix it. Write the rule's `docs` (`summary`, `why`, `fix`) for someone who has never seen the rule, because `mographc explain` prints them.
- Measure time in seconds and speed in pixels per second, and scale pixel thresholds with `px(film, …)`, so the rule behaves the same at any frame rate and resolution.
- Check the rule on a film where it should fire and on a film where it shouldn't, and mention both in the pull request.

## Pull requests

- Use [Conventional Commits](https://www.conventionalcommits.org) for the title (`feat:`, `fix:`, `docs:` and so on).
- CI runs the type check, ESLint, and the demo film on Node 22.13, 24 and 26. Run `npm run check` before opening the pull request.
