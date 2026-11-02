# Baselines

When a person approves a cut, `mographc baseline save` stores its film in `.mographc/baselines/`. From then on, `lint` also reports regressions against it: content removed from a beat, a weaker ease-out on the same move, a smaller cursor, or less stretch. Commit the baseline so everyone on the project compares against the same approved cut.

`mographc baseline save` saves every composition; pass composition ids to save only those. Save again whenever a person approves a new cut, so later regressions are measured against it.

The regression rules are listed under `regression/` in the [rules reference](rules.md). They only run when a baseline exists for the composition. If a change from the approved cut was deliberate, suppress the finding with a reason, as described in [Configuring the linter](configuration.md).

---

[Documentation index](README.md)
