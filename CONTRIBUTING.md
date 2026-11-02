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
- Every finding says what was measured, what the rule requires, and how to fix it. Write `measured` as a clause about the element with the measured numbers, and `need` as a lowercase clause stating the requirement, because it is printed after "Required:".
- Write the rule's `docs` for someone who has never seen the rule, because `mographc explain` and the rules reference print them. `summary` states the requirement in one sentence, with what is measured and the threshold. `why` says why it matters to a viewer and how it is measured. `fix` gives concrete steps. `options` describes every option, with its unit. Use the words in [docs/terms.md](docs/terms.md) with the meanings given there.
- Measure time in seconds and speed in pixels per second, and write pixel thresholds at 1080p and scale them with `px(film, …)`, so the rule behaves the same at any frame rate and resolution.
- Run `npm run docs:rules` to update the [rules reference](docs/rules.md), which is generated from the rules' docs. CI fails if it's out of date.
- Check the rule on a film where it should report a finding and on a film where it shouldn't, and mention both in the pull request.

## Pull requests

- Use [Conventional Commits](https://www.conventionalcommits.org) for the title (`feat:`, `fix:`, `docs:` and so on).
- CI runs the type check, ESLint, and the demo film on Node 22.13, 24 and 26. Run `npm run check` before opening the pull request.
