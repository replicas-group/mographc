import type { Finding } from "./rule.ts";

const colour = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: number, s: string) =>
  colour ? `\x1b[${code}m${s}\x1b[0m` : s;
export const red = (s: string) => paint(31, s);
export const green = (s: string) => paint(32, s);
const yellow = (s: string) => paint(33, s);
export const dim = (s: string) => paint(2, s);
export const bold = (s: string) => paint(1, s);

const time = (f: Finding) =>
  f.to - f.from < 0.05
    ? `${f.from.toFixed(2)}s`
    : `${f.from.toFixed(2)}-${f.to.toFixed(2)}s`;

/** Human output: grouped by composition, in time order, each finding with what to do about it. */
export const format = (
  findings: Finding[],
  { warnings = true, accepted = false } = {},
) => {
  const lines: string[] = [];
  const shown = findings.filter(
    (f) => (warnings || f.severity === "error") && (accepted || !f.accepted),
  );
  for (const composition of [...new Set(shown.map((f) => f.composition))]) {
    lines.push("", bold(composition));
    for (const f of shown.filter((x) => x.composition === composition)) {
      const sev = f.accepted
        ? dim("ok   ")
        : f.severity === "error"
          ? red("error")
          : yellow("warn ");
      lines.push(
        `  ${time(f).padEnd(14)} ${sev}  ${f.rule.padEnd(28)} ${f.element ? `${f.element}: ` : ""}${f.measured}`,
      );
      lines.push(
        dim(
          `  ${"".padEnd(14)}        needs ${f.need}.${f.accepted ? ` Accepted: ${f.accepted}` : ` Fix: ${f.fix}`}`,
        ),
      );
    }
  }
  const errors = findings.filter(
    (f) => f.severity === "error" && !f.accepted,
  ).length;
  const warns = findings.filter(
    (f) => f.severity === "warn" && !f.accepted,
  ).length;
  const ok = findings.filter((f) => f.accepted).length;
  lines.push(
    "",
    `${errors ? red(`${errors} error${errors === 1 ? "" : "s"}`) : "0 errors"}, ${warns} warning${warns === 1 ? "" : "s"}${ok ? `, ${ok} accepted` : ""}`,
  );
  return lines.join("\n");
};
