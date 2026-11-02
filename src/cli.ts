#!/usr/bin/env node
/**
 * mographc: a compiler, linter and test runner for Remotion films.
 * Run `mographc help` for usage.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { capture, findProject } from "./capture.ts";
import { allRules, loadConfig } from "./config.ts";
import { Film } from "./film.ts";
import { failing, run } from "./lint.ts";
import { bold, format } from "./report.ts";
import { runFiles } from "./runner.ts";
import type { Finding } from "./rule.ts";
import type { RawFilm } from "./types.ts";

const HELP = `mographc: a compiler, linter and test framework for Remotion films.

Usage: mographc <command> [compositions...] [options]

Commands
  verify      Run check, lint and test. Exits with 1 if there is any error or failing test.
  check       Run only the compiler rules, which report broken things such as images that didn't load.
  lint        Run the compiler rules and the rules in mographc.config.ts (or the "recommended" preset if there is no config).
  test        Run your *.mographc.ts test files.
  elements    List every element mographc finds, with its tag or description, role, and the times it's on screen.
  rules       List every built-in rule with a one-line summary.
  explain     Print one rule's full documentation: what it checks, why, how to fix a finding, and its options.
  baseline    "mographc baseline save [compositions...]" saves the current measurements as the baseline that the regression rules compare against.
  init        Write a mographc.config.ts and an example test file.

Composition ids limit the run to those compositions. By default every composition is checked.

Options
  --entry <file>     The Remotion entry point. Default: the one set in remotion.config.ts, or src/index.ts.
  --config <file>    Use this config file instead of mographc.config.ts.
  --frames <a-b>     Only check frames a to b.
  --json             Print findings as JSON.
  --warnings=false   Print errors only.
  --no-cache         Measure the film again even if its source files haven't changed.

Documentation: https://github.com/replicas-group/mographc/tree/main/docs
`;

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.findIndex(
    (a) => a === `--${name}` || a.startsWith(`--${name}=`),
  );
  if (i < 0) return undefined;
  const a = args[i];
  if (a.includes("=")) return a.split("=")[1];
  const next = args[i + 1];
  return next && !next.startsWith("--") ? next : "true";
};
const positional = args.filter(
  (a, i) =>
    !a.startsWith("--") &&
    !(
      i > 0 &&
      args[i - 1].startsWith("--") &&
      !args[i - 1].includes("=") &&
      ["--entry", "--config", "--frames"].includes(args[i - 1])
    ),
);
const command = positional[0] ?? "help";
const json = flag("json") === "true";
const log = (m: string) => {
  if (json) return;
  const { NO_COLOR, FORCE_COLOR } = process.env;
  const colour = !NO_COLOR && (!!FORCE_COLOR || process.stderr.isTTY);
  process.stderr.write(colour ? `\x1b[2m${m}\x1b[0m\n` : `${m}\n`);
};

const baselinePath = (root: string, composition: string) =>
  path.join(root, ".mographc", "baselines", `${composition}.json.gz`);

const films = async () => {
  const project = await findProject(process.cwd(), flag("entry"));
  const frames = flag("frames")?.split("-").map(Number) as
    | [number, number]
    | undefined;
  const raws = await capture(project, {
    compositions: positional.slice(1),
    frames,
    cache: flag("no-cache") !== "true",
    log,
  });
  return { project, raws };
};

const lintAll = async (kinds: ("check" | "lint")[]) => {
  const { project, raws } = await films();
  const { config, file } = await loadConfig(project.root, flag("config"));
  if (kinds.includes("lint"))
    log(
      file
        ? `config: ${path.relative(process.cwd(), file)}`
        : 'config: none found, using "recommended"',
    );
  const findings: Finding[] = [];
  for (const raw of raws) {
    const base = baselinePath(project.root, raw.composition);
    const baseline =
      kinds.includes("lint") && existsSync(base)
        ? new Film(
            JSON.parse(gunzipSync(readFileSync(base)).toString()) as RawFilm,
          )
        : undefined;
    if (baseline)
      log(`${raw.composition}: comparing against the approved baseline`);
    findings.push(...run(new Film(raw), config, { kinds, baseline }));
  }
  return { findings, project };
};

const output = (findings: Finding[]) => {
  if (json) console.log(JSON.stringify(findings, null, 1));
  else
    console.log(
      format(findings, {
        warnings: flag("warnings") !== "false",
        accepted: true,
      }),
    );
  return failing(findings).length ? 1 : 0;
};

const TEST_FILE = /\.mographc\.(ts|tsx|mts|js|mjs)$/;

const runTests = async (root: string) => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (TEST_FILE.test(entry.name)) files.push(p);
    }
  };
  walk(root);
  if (!files.length) {
    console.log(
      'No test files found. Tests go in files ending in .mographc.ts; run "mographc init" to write an example.',
    );
    return 0;
  }
  return runFiles(files.sort(), root);
};

const main = async (): Promise<number> => {
  switch (command) {
    case "check":
      return output((await lintAll(["check"])).findings);
    case "lint":
      return output((await lintAll(["check", "lint"])).findings);
    case "test":
      return runTests((await findProject(process.cwd())).root);
    case "verify": {
      const { findings, project } = await lintAll(["check", "lint"]);
      const lintCode = output(findings);
      if (json) return lintCode;
      console.log(`\n${bold("— tests (*.mographc.ts)")}`);
      const testCode = await runTests(project.root);
      return lintCode || testCode ? 1 : 0;
    }
    case "elements": {
      const { raws } = await films();
      const rows = raws.flatMap((raw) => {
        const film = new Film(raw);
        return film.elements
          .filter(
            (e) =>
              e.tagged ||
              ["cursor", "headline", "surface", "button"].includes(e.role),
          )
          .map((e) => ({
            composition: film.composition,
            id: e.id,
            role: e.role,
            tagged: e.tagged,
            from: +(e.first / film.fps).toFixed(2),
            to: +(e.last / film.fps).toFixed(2),
            label: e.label,
          }));
      });
      if (json) console.log(JSON.stringify(rows, null, 1));
      else
        for (const r of rows)
          console.log(
            `${r.composition}  ${`${r.from}-${r.to}s`.padEnd(13)} ${r.role.padEnd(9)} ${r.tagged ? r.id : `${r.label}  (untagged)`}`,
          );
      return 0;
    }
    case "rules": {
      const rules = allRules();
      if (json)
        console.log(
          JSON.stringify(
            rules.map((r) => ({
              id: r.id,
              kind: r.kind,
              severity: r.severity,
              options: r.options,
              docs: r.docs,
            })),
            null,
            1,
          ),
        );
      else
        for (const r of rules)
          console.log(
            `${r.id.padEnd(30)} ${r.kind === "check" ? "compiler" : r.severity.padEnd(8)} ${r.docs.summary}`,
          );
      return 0;
    }
    case "explain": {
      const r = allRules().find((x) => x.id === positional[1]);
      if (!r) {
        console.error(
          `There is no rule called "${positional[1]}". Run \`mographc rules\` to list them.`,
        );
        return 2;
      }
      console.log(
        `${r.id} (${r.kind === "check" ? "compiler, always on" : `default: ${r.severity}`})\n\n${r.docs.summary}\n\nWhy: ${r.docs.why}\n\nFix: ${r.docs.fix}${
          Object.keys(r.options).length
            ? `\n\nOptions:\n${Object.entries(r.options)
                .map(
                  ([k, v]) =>
                    `  ${k} (default ${JSON.stringify(v)})${r.docs.options?.[k] ? `: ${r.docs.options[k]}` : ""}`,
                )
                .join("\n")}`
            : ""
        }`,
      );
      return 0;
    }
    case "baseline": {
      if (positional[1] !== "save") {
        console.error("Usage: mographc baseline save [compositions...]");
        return 2;
      }
      positional.splice(1, 1);
      const { project, raws } = await films();
      for (const raw of raws) {
        const file = baselinePath(project.root, raw.composition);
        mkdirSync(path.dirname(file), { recursive: true });
        writeFileSync(file, gzipSync(JSON.stringify(raw)));
        console.log(
          `${raw.composition}: saved as the approved baseline (${path.relative(process.cwd(), file)})`,
        );
      }
      return 0;
    }
    case "init": {
      const project = await findProject(process.cwd());
      const config = path.join(project.root, "mographc.config.ts");
      if (!existsSync(config)) {
        writeFileSync(
          config,
          `import { defineConfig, recommended } from "mographc";\n\nexport default defineConfig([\n  recommended,\n  // Change a rule's severity or options: { rules: { "easing/weak-out": ["error", { long: 0.45 }] } },\n  // Turn a rule off between two times (in seconds), with the reason: { between: [9.5, 13], rules: { "staging/no-padding": "off" }, reason: "…" },\n]);\n`,
        );
        console.log(`wrote ${path.relative(process.cwd(), config)}`);
      }
      const test = path.join(path.dirname(project.entry), "film.mographc.ts");
      if (!existsSync(test)) {
        writeFileSync(
          test,
          `import { describe, expect, loadFilm, test } from "mographc/test";\n\n// Write down what each section of the film is meant to show. Tag elements with data-motion="role:name" to find them here.\nconst film = await loadFilm("YourComposition");\n\ndescribe("the film", () => {\n  test("passes the compiler and the linter", async () => {\n    await expect(film).toPassLint();\n  });\n});\n`,
        );
        console.log(`wrote ${path.relative(process.cwd(), test)}`);
      }
      return 0;
    }
    default:
      console.log(HELP);
      return command === "help" ? 0 : 2;
  }
};

main().then(
  (code) => process.exit(code),
  (error: Error) => {
    console.error(`mographc: ${error.message}`);
    process.exit(2);
  },
);
