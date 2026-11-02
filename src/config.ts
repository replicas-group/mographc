/**
 * Flat config, like ESLint's: an array of blocks applied in order. Presets are blocks.
 *
 *   export default defineConfig([
 *     recommended,
 *     acme, // your team's brand preset
 *     { rules: { "easing/weak-out": ["error", { long: 0.45 }] } },
 *     { compositions: ["Teaser"], rules: { "cursor/dead-exit": "off" } },
 *     { between: [9.5, 13], rules: { "regression/content-removed": "off" }, reason: "zoomed in by request" },
 *   ]);
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { load } from "./load.ts";
import type { AnyRule, Severity } from "./rule.ts";
import { compilerRules } from "./rules/compiler.ts";
import { activityRules } from "./rules/activity.ts";
import { attentionRules } from "./rules/attention.ts";
import { spacingRules } from "./rules/spacing.ts";
import { motionRules } from "./rules/motion.ts";
import { regressionRules } from "./rules/regression.ts";
import { stagingRules } from "./rules/staging.ts";

export type RuleSetting =
  | Severity
  | [Severity]
  | [Severity, Record<string, unknown>];

export interface ConfigBlock {
  name?: string;
  /** Rules this block makes available (a preset's, or your own custom rules). */
  plugins?: AnyRule[];
  rules?: Record<string, RuleSetting>;
  /** Only for these compositions. */
  compositions?: string[];
  /** Only between these times, in seconds. A block with a time range must give a reason. */
  between?: [number, number];
  reason?: string;
}

export type Config = ConfigBlock[];

const CONFIG_FILES = [
  "mographc.config.ts",
  "mographc.config.mts",
  "mographc.config.js",
  "mographc.config.mjs",
];

export const defineConfig = (config: Config) => config;

const settings = (rules: AnyRule[]) =>
  Object.fromEntries(rules.map((r) => [r.id, r.severity])) as Record<
    string,
    RuleSetting
  >;

/** The compiler: what's broken in any video. Always on. */
export const compiler: ConfigBlock = {
  name: "compiler",
  plugins: compilerRules,
  rules: settings(compilerRules),
};

const recommendedRules = [
  ...motionRules,
  ...activityRules,
  ...attentionRules,
  ...spacingRules,
  ...stagingRules,
  ...regressionRules,
];

/** General motion principles: easing, squash and stretch, staging, pace, attention, regressions. */
export const recommended: ConfigBlock = {
  name: "recommended",
  plugins: recommendedRules,
  rules: settings(recommendedRules),
};

export const allRules = () => [...compilerRules, ...recommendedRules];

/** The project's mographc.config.ts, or `recommended` when there isn't one. */
export const loadConfig = async (
  root: string,
  file?: string,
): Promise<{ config: Config; file?: string }> => {
  const found = file
    ? path.resolve(file)
    : CONFIG_FILES.map((f) => path.join(root, f)).find(existsSync);
  if (!found) return { config: [recommended] };
  const mod = await load<{ default?: Config; config?: Config }>(found);
  const config = (mod.default ?? mod.config) as Config;
  if (!Array.isArray(config))
    throw new Error(
      `${found} must have a default export that is an array of config blocks. Wrap it in defineConfig([...]).`,
    );
  for (const b of config)
    if (b.between && !b.reason)
      throw new Error(
        `${found}: a config block with "between" must also have a "reason" that explains why the rules don't apply during that time.`,
      );
  return { config, file: found };
};

export interface ResolvedRule {
  rule: AnyRule;
  severity: Severity;
  options: Record<string, unknown>;
}

/** Rule settings for one composition, outside any time range. */
export const resolve = (config: Config, composition: string) => {
  const available = new Map<string, AnyRule>();
  for (const r of compilerRules) available.set(r.id, r);
  for (const b of config)
    for (const r of b.plugins ?? []) available.set(r.id, r);
  const out = new Map<string, ResolvedRule>();
  for (const r of compilerRules)
    out.set(r.id, { rule: r, severity: r.severity, options: {} });
  for (const b of config) {
    if (b.between || (b.compositions && !b.compositions.includes(composition)))
      continue;
    for (const [id, setting] of Object.entries(b.rules ?? {})) {
      const rule = available.get(id);
      if (!rule)
        throw new Error(
          `Unknown rule "${id}"${b.name ? ` in "${b.name}"` : ""}. If it's a custom rule, add it to a config block's "plugins". Run \`mographc rules\` to list the built-in rules.`,
        );
      const [severity, options] = Array.isArray(setting) ? setting : [setting];
      const prev = out.get(id);
      out.set(id, {
        rule,
        severity,
        options: { ...prev?.options, ...(options ?? {}) },
      });
    }
  }
  return out;
};

/** Time-ranged blocks for one composition: rules switched off or re-graded between two times, with why. */
export const ranges = (config: Config, composition: string) =>
  config.filter(
    (b) =>
      b.between && (!b.compositions || b.compositions.includes(composition)),
  );
