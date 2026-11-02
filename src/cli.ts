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
import { capture, compositionIds, findProject } from "./capture.ts";
import { allRules, loadConfig } from "./config.ts";
import { Film, union } from "./film.ts";
import { failing, run } from "./lint.ts";
import { bold, dim, format } from "./report.ts";
import { changing, stillSpans } from "./rules/activity.ts";
import { runFiles } from "./runner.ts";
import type { Finding } from "./rule.ts";
import type { Box, RawFilm } from "./types.ts";
import { describe, gazePath, VIEWER, viewer } from "./viewer.ts";

const OPTIONS: Record<string, string> = {
  entry:
    "--entry <file>     The Remotion entry point. Default: the one set in remotion.config.ts, or src/index.ts.",
  config:
    "--config <file>    Use this config file instead of mographc.config.ts.",
  frames: "--frames <a-b>     Only capture frames a to b.",
  during:
    "--during <a-b>     Only print seconds a to b (the whole film is still measured).",
  json: "--json             Print the output as JSON.",
  all: "--all              Also list untagged graphics and the parts of a cursor.",
  warnings: "--warnings=false   Print errors only.",
  "no-cache":
    "--no-cache         Measure the film again even if its source files haven't changed.",
};
const CAPTURE = ["entry", "frames", "no-cache"];

const COMMANDS: Record<
  string,
  { usage: string; summary: string; detail?: string; options: string[] }
> = {
  verify: {
    usage: "verify [compositions...]",
    summary:
      "Run check, lint and test. Exits with 1 if there is any error or failing test.",
    options: [...CAPTURE, "config", "json", "warnings"],
  },
  check: {
    usage: "check [compositions...]",
    summary:
      "Run only the compiler rules, which report broken things such as images that didn't load.",
    options: [...CAPTURE, "json", "warnings"],
  },
  lint: {
    usage: "lint [compositions...]",
    summary:
      'Run the compiler rules and the rules in mographc.config.ts (or the "recommended" preset if there is no config).',
    options: [...CAPTURE, "config", "json", "warnings"],
  },
  test: {
    usage: "test",
    summary: "Run your *.mographc.ts test files.",
    options: [],
  },
  gaze: {
    usage: "gaze [compositions...]",
    summary:
      "Print where the simulated viewer looks over time, why it looks there, and how much of each text it reads.",
    detail:
      'Each line is a stretch of time the viewer spends on one thing. "why" says how the eye got there: pulled (something new appeared or moved and drew the eye), next (it went on to the next unread text), follows (nothing to read, so it follows what moves) or stays. "read" gives the words read at the start and end of the stretch, out of the text\'s words. The list after the timeline gives every text the viewer meets and how much of it it read before it left. The attention/ rules and the toBeRead and toBeTheFocus matchers use this same viewer.',
    options: [...CAPTURE, "during", "json"],
  },
  activity: {
    usage: "activity [compositions...]",
    summary:
      "Print, second by second, how much of the film is changing and what changes, and list the still stretches.",
    detail:
      "A frame is changing when something changes over at least 1% of the canvas, or legible text is typed or changes, the same test pace/activity and pace/dead-air use. Each line is one second: the share of its frames that are changing, the region where the change is (x, y, width and height in canvas px), and the elements that change most.",
    options: [...CAPTURE, "during", "json"],
  },
  elements: {
    usage: "elements [compositions...]",
    summary:
      "List every element mographc finds, with its tag or description, role, and the times it's on screen.",
    detail:
      "Untagged graphics (icons, small boxes) and the parts of a cursor are left out unless you pass --all, because a film usually has many of them. Untagged text is named by its text, with the line it sits in when that's longer.",
    options: [...CAPTURE, "json", "all"],
  },
  rules: {
    usage: "rules",
    summary: "List every built-in rule with a one-line summary.",
    options: ["json"],
  },
  explain: {
    usage: "explain <rule>",
    summary:
      "Print one rule's full documentation: what it checks, why, how to fix a finding, and its options.",
    options: [],
  },
  baseline: {
    usage: "baseline save [compositions...]",
    summary:
      "Save the current measurements as the baseline that the regression rules compare against.",
    options: CAPTURE,
  },
  init: {
    usage: "init",
    summary:
      "Write a mographc.config.ts and an example test file for the project's first composition.",
    options: ["entry"],
  },
};

const HELP = `mographc: a compiler, linter and test framework for Remotion films.

Usage: mographc <command> [compositions...] [options]

Commands
${Object.entries(COMMANDS)
  .map(([name, c]) => `  ${name.padEnd(11)} ${c.summary}`)
  .join("\n")}

Composition ids limit the run to those compositions. By default every composition is checked.
Run "mographc <command> --help" for a command's options.

Options
${Object.values(OPTIONS)
  .map((o) => `  ${o}`)
  .join("\n")}

Documentation: https://github.com/replicas-group/mographc/tree/main/docs
`;

const commandHelp = (name: string) => {
  const c = COMMANDS[name];
  return `Usage: mographc ${c.usage}${c.options.length ? " [options]" : ""}\n\n${c.summary}${c.detail ? `\n\n${c.detail}` : ""}${
    c.options.length
      ? `\n\nOptions\n${c.options.map((o) => `  ${OPTIONS[o]}`).join("\n")}`
      : ""
  }\n`;
};

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
      ["--entry", "--config", "--frames", "--during"].includes(args[i - 1])
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

/** Seconds a to b from --during, as frames of a film. */
const during = (film: Film): [number, number] => {
  const [a, b] = (flag("during") ?? "").split("-").map(Number);
  return [
    Number.isFinite(a) ? Math.round(a * film.fps) : film.frames[0],
    Number.isFinite(b) && flag("during")?.includes("-")
      ? Math.round(b * film.fps)
      : film.frames[film.frames.length - 1],
  ];
};
const secs = (film: Film, a: number, b: number) =>
  `${(a / film.fps).toFixed(2)}-${((b + 1) / film.fps).toFixed(2)}s`;
const clip = (text: string, n: number) =>
  text.length > n ? `${text.slice(0, n - 1)}…` : text;
const words = (n: number) => n.toFixed(1).replace(/\.0$/, "");

const main = async (): Promise<number> => {
  if (args.includes("--help") || args.includes("-h") || command === "help") {
    const name = command === "help" ? positional[1] : command;
    console.log(name && COMMANDS[name] ? commandHelp(name) : HELP);
    return 0;
  }
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
    case "gaze": {
      const { raws } = await films();
      const out = raws.map((raw) => {
        const film = new Film(raw);
        const [from, to] = during(film);
        const spans = gazePath(film, from, to);
        const end = film.frames[film.frames.length - 1];
        const reads = viewer(film).reads.filter(
          (r) => r.to >= from && r.from <= to,
        );
        return { film, spans, reads, end };
      });
      if (json) {
        console.log(
          JSON.stringify(
            out.map(({ film, spans, reads, end }) => ({
              composition: film.composition,
              gaze: spans.map((g) => ({
                from: +film.seconds(g.from).toFixed(2),
                to: +film.seconds(g.to + 1).toFixed(2),
                looksAt: g.label,
                why: g.why,
                read: g.progress && {
                  from: +g.progress.from.toFixed(1),
                  to: +g.progress.to.toFixed(1),
                  words: +g.progress.words.toFixed(1),
                },
              })),
              texts: reads.map((r) => ({
                text: describe(film, r),
                from: +film.seconds(r.from).toFixed(2),
                to: +film.seconds(r.to + 1).toFixed(2),
                words: +r.words.toFixed(1),
                read: +r.read.toFixed(1),
                untilEnd: r.to >= end - 1,
              })),
            })),
            null,
            1,
          ),
        );
        return 0;
      }
      for (const { film, spans, reads, end } of out) {
        console.log(
          `\n${bold(film.composition)}  where the simulated viewer looks, reading ${VIEWER.wordsPerSecond} words a second`,
        );
        console.log(
          dim(
            `  ${"time".padEnd(14)} ${"why".padEnd(8)} ${"looks at".padEnd(56)} read`,
          ),
        );
        for (const g of spans)
          console.log(
            `  ${secs(film, g.from, g.to).padEnd(14)} ${(g.why === "stays" ? "" : g.why).padEnd(8)} ${clip(g.label, 56).padEnd(56)} ${
              g.progress
                ? `${words(g.progress.from)} → ${words(g.progress.to)} of ${words(g.progress.words)} words`
                : ""
            }`.trimEnd(),
          );
        console.log(`\n  ${bold("Texts it meets")}`);
        for (const r of reads) {
          const left = r.words - r.read;
          console.log(
            `  ${secs(film, r.from, r.to).padEnd(14)} ${clip(describe(film, r), 65).padEnd(65)} read ${words(r.read)} of ${words(r.words)} words${
              r.to >= end - 1
                ? " (still on screen at the end)"
                : left > 0.25
                  ? `, ${words(left)} unread when it left`
                  : ""
            }`,
          );
        }
      }
      return 0;
    }
    case "activity": {
      const { raws } = await films();
      const out = raws.map((raw) => {
        const film = new Film(raw);
        const [from, to] = during(film);
        const act = film.activity();
        const moving = new Set(changing(film, 0.01));
        const seconds = [];
        for (let a = from; a <= to; a += Math.round(film.fps)) {
          const b = Math.min(to, a + Math.round(film.fps) - 1);
          const frames = film.frames.filter((f) => f >= a && f <= b);
          const busy = frames.filter((f) => moving.has(f));
          const regions = busy
            .map((f) => act.get(f)?.region)
            .filter((r): r is Box => !!r);
          const count = new Map<string, number>();
          for (const f of busy)
            for (const el of act.get(f)?.changed ?? [])
              count.set(el.label, (count.get(el.label) ?? 0) + 1);
          seconds.push({
            from: a,
            to: b,
            share: busy.length / Math.max(frames.length, 1),
            region: regions.length ? union(regions) : undefined,
            what: [...count]
              .sort((x, y) => y[1] - x[1])
              .slice(0, 3)
              .map(([label]) => label),
          });
        }
        const still = stillSpans(film, 0.01).filter(
          ([a, b]) => b >= from && a <= to && (b - a + 1) / film.fps >= 0.5,
        );
        return {
          film,
          seconds,
          still,
          share: moving.size / film.frames.length,
        };
      });
      if (json) {
        console.log(
          JSON.stringify(
            out.map(({ film, seconds, still, share }) => ({
              composition: film.composition,
              changing: +share.toFixed(3),
              seconds: seconds.map((x) => ({
                from: +film.seconds(x.from).toFixed(2),
                to: +film.seconds(x.to + 1).toFixed(2),
                changing: +x.share.toFixed(2),
                region: x.region?.map(Math.round),
                what: x.what,
              })),
              still: still.map(([a, b]) => ({
                from: +film.seconds(a).toFixed(2),
                to: +film.seconds(b + 1).toFixed(2),
              })),
            })),
            null,
            1,
          ),
        );
        return 0;
      }
      for (const { film, seconds, still, share } of out) {
        console.log(
          `\n${bold(film.composition)}  changing on ${(share * 100).toFixed(0)}% of frames (pace/activity asks for 60%)`,
        );
        console.log(
          dim(
            `  ${"time".padEnd(12)} ${"changing".padEnd(15)} ${"where (x, y w×h)".padEnd(22)} what changes`,
          ),
        );
        for (const x of seconds) {
          const bar = "█".repeat(Math.round(x.share * 10)).padEnd(10, "·");
          const r = x.region?.map(Math.round);
          console.log(
            `  ${secs(film, x.from, x.to).padEnd(12)} ${bar} ${`${(x.share * 100).toFixed(0)}%`.padStart(4)} ${(r ? `(${r[0]}, ${r[1]}) ${r[2]}×${r[3]}` : "").padEnd(22)} ${x.what.map((w) => clip(w, 40)).join(", ")}`.trimEnd(),
          );
        }
        console.log(
          `\n  ${bold("Still stretches")} of 0.5 s or more, longest first (pace/dead-air reports those over 1 s)`,
        );
        if (!still.length) console.log("  none");
        for (const [a, b] of still)
          console.log(
            `  ${secs(film, a, b).padEnd(12)} ${((b - a + 1) / film.fps).toFixed(1)} s`,
          );
      }
      return 0;
    }
    case "elements": {
      const { raws } = await films();
      const all = flag("all") === "true";
      const rows = raws.flatMap((raw) => {
        const film = new Film(raw);
        return film.elements
          .filter(
            (e) =>
              e.tagged ||
              (all
                ? true
                : !["graphic", "part", "cursor-label"].includes(e.role)),
          )
          .filter(
            (e) =>
              e.frames.length > 2 &&
              e.frames.some((f) => e.at(f)!.opacity > 0.3),
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
      const project = await findProject(process.cwd(), flag("entry"));
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
        const first = await compositionIds(project).then(
          (ids) => ids[0],
          () => undefined,
        );
        writeFileSync(
          test,
          `import { describe, expect, loadFilm, test } from "mographc/test";\n\n// Write down what each section of the film is meant to show. Tag elements with data-motion="role:name" to find them here.\nconst film = await loadFilm(${JSON.stringify(first ?? "YourComposition")});\n\ndescribe("the film", () => {\n  test("passes the compiler and the linter", async () => {\n    await expect(film).toPassLint();\n  });\n});\n`,
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
