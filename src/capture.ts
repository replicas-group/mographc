/**
 * Turns a Remotion project into films: bundle it with every composition wrapped in
 * the probe, step through every frame without taking screenshots, and collect what
 * the probe logs. No change to the project is needed.
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";
import { load } from "./load.ts";
import type { RawFilm, RawFrame } from "./types.ts";

export interface Project {
  root: string;
  entry: string;
  require: NodeJS.Require;
  /** The project's own `remotion.config.ts` webpack override, if any. */
  webpackOverride?: (config: unknown) => unknown | Promise<unknown>;
}

const ENTRY_CANDIDATES = [
  "src/index.ts",
  "src/index.tsx",
  "src/index.js",
  "remotion/index.ts",
];

/** The nearest directory with a package.json that depends on Remotion. */
export const findProject = async (
  from: string,
  entry?: string,
): Promise<Project> => {
  let dir = path.resolve(from);
  while (true) {
    const pkg = path.join(dir, "package.json");
    if (existsSync(pkg)) {
      const json = JSON.parse(readFileSync(pkg, "utf8"));
      const deps = { ...json.dependencies, ...json.devDependencies };
      if (deps.remotion) break;
    }
    const up = path.dirname(dir);
    if (up === dir)
      throw new Error(
        `No Remotion project found from ${from}: no package.json depends on "remotion".`,
      );
    dir = up;
  }
  const require = createRequire(path.join(dir, "package.json"));
  let webpackOverride: Project["webpackOverride"];
  let configEntry: string | null = null;
  const configFile = [
    "remotion.config.ts",
    "remotion.config.js",
    "remotion.config.mjs",
  ]
    .map((f) => path.join(dir, f))
    .find(existsSync);
  if (configFile) {
    // Run the project's config against its own copy of @remotion/cli, then read back what it set.
    // Both through the same loader, so they share one instance of the config module.
    await load(configFile);
    const { ConfigInternals } = await load<{
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ConfigInternals: any;
    }>(require.resolve("@remotion/cli/config"));
    webpackOverride = ConfigInternals.getWebpackOverrideFn();
    configEntry = ConfigInternals.getEntryPoint();
  }
  const resolved =
    entry ??
    configEntry ??
    ENTRY_CANDIDATES.find((c) => existsSync(path.join(dir, c)));
  if (!resolved)
    throw new Error(
      `No entry point found in ${dir}. Pass --entry (looked for ${ENTRY_CANDIDATES.join(", ")}).`,
    );
  return {
    root: dir,
    entry: path.resolve(dir, resolved),
    require,
    webpackOverride,
  };
};

/**
 * The project's own copy of a Remotion package: mographc never brings its own, so the
 * versions always match. They usually sit at the top of node_modules; some package managers
 * keep them under @remotion/cli, which depends on them.
 */
const resolveRemotion = (project: Project, name: string) => {
  try {
    return project.require.resolve(name);
  } catch {
    try {
      return createRequire(
        project.require.resolve("@remotion/cli/package.json"),
      ).resolve(name);
    } catch {
      throw new Error(
        `Can't find ${name} in ${project.root}. Install @remotion/cli (it brings ${name}).`,
      );
    }
  }
};

/** Hash of everything that can change a render: sources, public assets, config. */
const sourceHash = (project: Project) => {
  const hash = createHash("sha1");
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir).sort()) {
      if (
        name === "node_modules" ||
        name.startsWith(".") ||
        name === "out" ||
        name === "renders"
      )
        continue;
      const p = path.join(dir, name);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else hash.update(`${p}:${s.size}:${s.mtimeMs}`);
    }
  };
  walk(path.dirname(project.entry));
  walk(path.join(project.root, "public"));
  for (const f of ["remotion.config.ts", "package.json"]) {
    const p = path.join(project.root, f);
    if (existsSync(p)) hash.update(readFileSync(p));
  }
  hash.update(readFileSync(new URL("./probe/Probe.js", import.meta.url)));
  return hash.digest("hex").slice(0, 12);
};

export interface CaptureOptions {
  compositions?: string[];
  /** Frame range to capture, inclusive. */
  frames?: [number, number];
  concurrency?: number;
  cache?: boolean;
  log?: (message: string) => void;
}

/** Capture every requested composition's film, from cache when the sources haven't changed. */
export const capture = async (
  project: Project,
  options: CaptureOptions = {},
): Promise<RawFilm[]> => {
  const log = options.log ?? (() => {});
  const cacheDir = path.join(
    project.root,
    "node_modules",
    ".cache",
    "mographc",
  );
  const hash = sourceHash(project);
  const { bundle } = await import(
    resolveRemotion(project, "@remotion/bundler")
  );
  const { getCompositions, renderFrames } = await import(
    resolveRemotion(project, "@remotion/renderer")
  );

  let serveUrl: string | undefined;
  const serve = async () => {
    if (serveUrl) return serveUrl;
    log("bundling");
    const shim = fileURLToPath(new URL("./probe/shim.js", import.meta.url));
    serveUrl = await bundle({
      entryPoint: project.entry,
      webpackOverride: async (input: {
        resolve?: { alias?: Record<string, string> };
      }) => {
        // The project's own override first (it may be async, e.g. Tailwind's), then ours on top.
        const config = (
          project.webpackOverride ? await project.webpackOverride(input) : input
        ) as typeof input;
        const alias = { ...config.resolve?.alias };
        // Remotion aliases `remotion` to one copy; the shim takes that name and re-exports the same copy.
        alias["remotion-original"] =
          alias.remotion ??
          path.dirname(project.require.resolve("remotion/package.json"));
        alias.remotion = shim;
        return { ...config, resolve: { ...config.resolve, alias } };
      },
    });
    return serveUrl!;
  };

  const all = await getCompositions(await serve(), { logLevel: "error" });
  const wanted = options.compositions?.length
    ? options.compositions.map((id) => {
        const c = all.find((x: { id: string }) => x.id === id);
        if (!c)
          throw new Error(
            `No composition "${id}". Found: ${all.map((x: { id: string }) => x.id).join(", ")}`,
          );
        return c;
      })
    : all;

  const films: RawFilm[] = [];
  for (const composition of wanted) {
    const range = options.frames ?? [0, composition.durationInFrames - 1];
    const file = path.join(
      cacheDir,
      `${composition.id}-${hash}-${range.join("_")}.json.gz`,
    );
    if (options.cache !== false && existsSync(file)) {
      films.push(JSON.parse(gunzipSync(readFileSync(file)).toString()));
      log(`${composition.id}: from cache`);
      continue;
    }
    log(`${composition.id}: probing ${range[1] - range[0] + 1} frames`);
    const frames = new Map<number, RawFrame>();
    // Remotion echoes every browser log line; the probe's are data, not output.
    const methods = ["log", "info", "warn", "error", "debug"] as const;
    const originals = methods.map((m) => console[m]);
    methods.forEach((m, i) => {
      console[m] = (...args: unknown[]) => {
        if (!args.some((a) => String(a).includes("MOGRAPHC")))
          originals[i](...args);
      };
    });
    await renderFrames({
      serveUrl: await serve(),
      composition,
      imageFormat: "none",
      outputDir: null,
      frameRange: range,
      concurrency: options.concurrency ?? null,
      logLevel: "error",
      onStart: () => {},
      onFrameUpdate: () => {},
      onBrowserLog: ({ text }: { text: string }) => {
        if (!text.startsWith("MOGRAPHC ")) return;
        const frame = JSON.parse(text.slice("MOGRAPHC ".length)) as RawFrame;
        frames.set(frame.f, frame);
      },
    }).finally(() => {
      methods.forEach((m, i) => (console[m] = originals[i]));
    });
    const film: RawFilm = {
      composition: composition.id,
      fps: composition.fps,
      width: composition.width,
      height: composition.height,
      durationInFrames: composition.durationInFrames,
      frames: [...frames.values()].sort((a, b) => a.f - b.f),
    };
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(file, gzipSync(JSON.stringify(film)));
    films.push(film);
  }
  return films;
};
