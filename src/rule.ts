import type { Element, Film } from "./film.ts";

export type Severity = "error" | "warn" | "off";

export interface RuleDocs {
  /** One line: what the rule requires. */
  summary: string;
  /** Why it matters to a viewer. */
  why: string;
  /** How to fix a finding, concretely. */
  fix: string;
}

export interface Rule<Options extends object = Record<string, unknown>> {
  id: string;
  /** `check` rules are the compiler: always on, no options, broken-or-not. */
  kind: "check" | "lint";
  severity: Exclude<Severity, "off">;
  docs: RuleDocs;
  /** Option defaults; config can override any of them. */
  options: Options;
  /** Needs the approved cut to compare against. */
  needsBaseline?: boolean;
  check(context: RuleContext<Options>): void;
}

export interface Report {
  element?: Element;
  /** Frames the finding spans. */
  frames: [number, number];
  /** What was measured, in words and numbers. */
  measured: string;
  /** What the rule needs instead. */
  need: string;
  /** Overrides the rule's severity for this finding, e.g. an error that's only a warning when close. */
  severity?: Exclude<Severity, "off">;
}

export interface RuleContext<Options> {
  film: Film;
  options: Options;
  /** The approved cut's film, when the rule needs one and a baseline exists. */
  baseline?: Film;
  report(finding: Report): void;
}

export interface Finding {
  rule: string;
  severity: Exclude<Severity, "off">;
  composition: string;
  element?: string;
  /** Seconds and frames. */
  from: number;
  to: number;
  frames: [number, number];
  measured: string;
  need: string;
  fix: string;
  /** The command that prints the rule's full why and fix. */
  docs: string;
  /** Set when a suppression applies: the reason it was accepted. */
  accepted?: string;
}

/** Declare a rule. Built-in and custom rules use the same API. */
export const defineRule = <Options extends object>(
  rule: Rule<Options>,
): Rule<Options> => rule;

/** A rule of any options shape, for lists of rules. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRule = Rule<any>;
