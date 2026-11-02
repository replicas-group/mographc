import { recommended, run } from "mographc";
import { describe, expect, loadFilm, test } from "mographc/test";

// Each problem has a film that shows it, which the rule must report, and a fixed film, which it
// must not. Other rules may report other things in these small films; only the one named is checked.
const cases: [rule: string, broken: string[], fixed: string[]][] = [
  ["layout/tight-spacing", ["TightSpacing"], ["TightSpacingFixed"]],
  [
    "layout/text-overlap",
    ["BriefOverlap", "BriefOverlapFaded"],
    ["BriefOverlapCrossfade", "BriefOverlapFixed"],
  ],
  ["staging/empty-surface", ["EmptySurface"], ["EmptySurfaceFixed"]],
  [
    "staging/small-focus",
    ["SmallFocus"],
    [
      "SmallFocusFixed",
      "SmallFocusReread",
      "SmallFocusLinger",
      "SmallFocusLinked",
    ],
  ],
  ["cursor/covers-text", ["CursorOnText"], ["CursorOnTextFixed"]],
  ["layout/text-cut", ["CutText"], ["CutTextFixed"]],
];

const findings = async (composition: string, rule: string) =>
  run(await loadFilm(composition), [recommended])
    .filter((f) => f.rule === rule)
    .map((f) => `${f.from.toFixed(2)}s ${f.element ?? ""}: ${f.measured}`);

for (const [rule, broken, fixed] of cases)
  describe(rule, () => {
    for (const c of broken)
      test(`reports ${c}`, async () =>
        expect((await findings(c, rule)).length).toBeGreaterThan(0));
    for (const c of fixed)
      test(`doesn't report ${c}`, async () =>
        expect(await findings(c, rule)).toEqual([]));
  });
