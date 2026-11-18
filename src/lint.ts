import { maxAccepted, ranges, resolve, type Config } from "./config.ts";
import type { Film } from "./film.ts";
import type { Rendered } from "./render.ts";
import type { Finding, Rule } from "./rule.ts";

export interface RunOptions {
  /** Which rules to run: the compiler only (`check`), or everything (`lint`). */
  kinds?: Rule["kind"][];
  baseline?: Film;
  rendered?: Rendered;
  /** Only the rules that read the rendered picture and sound: for a video file on its own. */
  renderOnly?: boolean;
}

/** Run every enabled rule on a film and return its findings, suppressions applied. */
export const run = (
  film: Film,
  config: Config,
  options: RunOptions = {},
): Finding[] => {
  const kinds = options.kinds ?? ["check", "lint"];
  const findings: Finding[] = [];
  const timed = ranges(config, film.composition);
  for (const { rule, severity, options: ruleOptions } of resolve(
    config,
    film.composition,
  ).values()) {
    if (
      severity === "off" ||
      !kinds.includes(rule.kind) ||
      (rule.needsBaseline && !options.baseline) ||
      (rule.needsRender && !options.rendered) ||
      (options.renderOnly && !rule.needsRender)
    )
      continue;
    rule.check({
      film,
      baseline: options.baseline,
      rendered: options.rendered,
      options: { ...rule.options, ...ruleOptions },
      report(r) {
        const from = film.seconds(r.frames[0]);
        const to = film.seconds(r.frames[1]);
        const finding: Finding = {
          rule: rule.id,
          severity: r.severity && severity !== "warn" ? r.severity : severity,
          composition: film.composition,
          element: r.element?.label,
          from,
          to,
          frames: r.frames,
          measured: r.measured,
          need: r.need,
          fix: rule.docs.fix,
          docs: `mographc explain ${rule.id}`,
        };
        // A suppression without a reason doesn't accept anything: the reason is what a reviewer reads.
        if (r.element?.ignored(rule.id)) {
          const why =
            r.element.ignores.get(rule.id) || r.element.ignores.get("*");
          if (why) finding.accepted = why;
          else
            finding.measured += ` (data-motion-ignore names this rule without a reason, so the finding still counts; write "${rule.id}: why")`;
        }
        for (const b of timed) {
          const setting = b.rules?.[rule.id];
          if (!setting || to < b.between![0] || from > b.between![1]) continue;
          const sev = Array.isArray(setting) ? setting[0] : setting;
          if (sev === "off") finding.accepted = b.reason;
          else finding.severity = sev;
        }
        findings.push(finding);
      },
    });
  }
  // Each distinct suppression (a rule and its reason) is a decision someone made; past a few, the
  // film is being waved through rather than fixed.
  const cap = maxAccepted(config);
  const decisions = new Set(
    findings.filter((f) => f.accepted).map((f) => `${f.rule}: ${f.accepted}`),
  );
  if (decisions.size > cap && options.kinds?.includes("lint") !== false) {
    const last = film.frames[film.frames.length - 1] ?? 0;
    findings.push({
      rule: "accepted/too-many",
      severity: "error",
      composition: film.composition,
      from: 0,
      to: film.seconds(last),
      frames: [0, last],
      measured: `${decisions.size} different findings are accepted (a rule with its reason), more than the ${cap} allowed`,
      need: `at most ${cap} accepted findings; fix the rest`,
      fix: "Fix findings instead of suppressing them. Keep a suppression only where breaking the rule is the point, and say why. Raise the cap with `{ maxAccepted: n }` in mographc.config.ts only when a person agrees.",
      docs: "docs/configuration.md (maxAccepted)",
    });
  }
  return findings.sort(
    (a, b) => a.from - b.from || a.rule.localeCompare(b.rule),
  );
};

export const failing = (findings: Finding[]) =>
  findings.filter((f) => f.severity === "error" && !f.accepted);
