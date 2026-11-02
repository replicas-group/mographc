# Baselines

A [baseline](terms.md#checking) is a saved copy of a film's measurements. When a person approves a version of the film, run `mographc baseline save` to store its measurements in `.mographc/baselines/`. From then on, `lint` also compares the film with the baseline and reports changes for the worse:

- `regression/content-removed`: at least two pieces of text that were on screen while a headline was showing in the baseline are now missing while the same headline shows.
- `regression/weaker-ease-out`: the [move](terms.md#motion) of the largest moving element while a headline shows has an [ease-out](terms.md#motion) strength more than 0.05 lower than the same move in the baseline.
- `regression/cursor-smaller`: the largest or smallest cursor is more than 10% smaller than in the baseline.
- `regression/less-stretch`: the cursor's [stretch](terms.md#motion) while it moves at 600 px/s or more (averaged over the most stretched tenth of those frames) is more than 0.04 lower than in the baseline.

Commit the baseline so everyone on the project compares against the same approved version.

`mographc baseline save` saves every composition; pass composition ids to save only those. Save again whenever a person approves a new version, so later changes are compared with that one.

The `regression/` rules are described in full in the [rules reference](rules.md). They only run when a baseline exists for the composition. If a change from the baseline was deliberate, accept the finding with a reason, as described in [Configuring the linter](configuration.md).

---

[Documentation index](README.md)
