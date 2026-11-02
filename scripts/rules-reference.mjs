// Writes docs/rules.md from each built-in rule's own docs, so the reference can't drift
// from the code. Run it with `npm run docs:rules` after changing a rule.
import { writeFileSync } from "node:fs";
import { allRules } from "../dist/index.js";

const groups = new Map();
for (const rule of allRules()) {
  const group = rule.id.split("/")[0];
  groups.set(group, [...(groups.get(group) ?? []), rule]);
}

const lines = [
  "# Rules reference",
  "",
  "Every built-in rule, with what it checks, why it matters and how to fix a finding. `mographc explain <rule>` prints the same text. Compiler rules always run. The others are in the `recommended` preset with the default severity shown, and can be configured as described in [Configuring the linter](configuration.md).",
  "",
  "This page is generated from the rules' docs by `npm run docs:rules`.",
];
for (const [group, rules] of groups) {
  lines.push("", `## ${group}`);
  for (const r of rules) {
    lines.push(
      "",
      `### \`${r.id}\``,
      "",
      `${r.kind === "check" ? "Compiler rule, always on." : `Default: ${r.severity}.`}${r.needsBaseline ? " Runs only when a [baseline](baselines.md) exists." : ""}`,
      "",
      r.docs.summary,
      "",
      `**Why:** ${r.docs.why}`,
      "",
      `**Fix:** ${r.docs.fix}`,
    );
    if (Object.keys(r.options).length)
      lines.push(
        "",
        `**Options:** ${Object.entries(r.options)
          .map(([k, v]) => `\`${k}\` (default \`${JSON.stringify(v)}\`)`)
          .join(", ")}`,
      );
  }
}
lines.push("", "---", "", "[Documentation index](README.md)", "");
writeFileSync(new URL("../docs/rules.md", import.meta.url), lines.join("\n"));
console.log(`wrote docs/rules.md (${allRules().length} rules)`);
