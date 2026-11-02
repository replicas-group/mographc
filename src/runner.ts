/**
 * A small test runner with the describe/test/expect API of Vitest and Jest, so film tests
 * run on plain Node with nothing else installed. The CLI loads each test file, which
 * registers its tests here, then runs them in order.
 */
import path from "node:path";
import { isDeepStrictEqual, inspect } from "node:util";
import { load } from "./load.ts";
import { bold, dim, green, red, wrap } from "./report.ts";

type Fn = () => unknown;
interface Case {
  name: string;
  fn: Fn;
  skip: boolean;
  only: boolean;
}

// The CLI and a test file can each get their own copy of this module (the file is loaded
// through jiti), so the registered tests live on globalThis where both see them.
const state = ((globalThis as Record<symbol, unknown>)[
  Symbol.for("mographc.tests")
] ??= { cases: [], names: [], skip: false, only: false }) as {
  cases: Case[];
  names: string[];
  skip: boolean;
  only: boolean;
};

const group = (
  name: string,
  fn: Fn,
  mode: { skip?: boolean; only?: boolean },
) => {
  const saved = { skip: state.skip, only: state.only };
  state.names.push(name);
  state.skip ||= !!mode.skip;
  state.only ||= !!mode.only;
  try {
    fn();
  } finally {
    state.names.pop();
    Object.assign(state, saved);
  }
};
const add = (name: string, fn: Fn, mode: { skip?: boolean; only?: boolean }) =>
  state.cases.push({
    name: [...state.names, name].join(" > "),
    fn,
    skip: state.skip || !!mode.skip,
    only: state.only || !!mode.only,
  });

export const describe = Object.assign(
  (name: string, fn: Fn) => group(name, fn, {}),
  {
    skip: (name: string, fn: Fn) => group(name, fn, { skip: true }),
    only: (name: string, fn: Fn) => group(name, fn, { only: true }),
  },
);
export const test = Object.assign((name: string, fn: Fn) => add(name, fn, {}), {
  skip: (name: string, fn: Fn) => add(name, fn, { skip: true }),
  only: (name: string, fn: Fn) => add(name, fn, { only: true }),
});
export const it = test;

export interface MatcherResult {
  pass: boolean;
  /** Says what went wrong: why it failed, or (under `.not`) why it passed. */
  message: () => string;
}
export type Matcher = (
  received: unknown,
  ...args: never[]
) => MatcherResult | Promise<MatcherResult>;

const show = (v: unknown) => inspect(v, { depth: 3, breakLength: Infinity });
const compare =
  (op: string, ok: (a: number, b: number) => boolean) =>
  (received: unknown, expected: number): MatcherResult => ({
    pass: ok(received as number, expected),
    message: () => `expected ${show(received)} ${op} ${show(expected)}`,
  });

const matchers: Record<string, Matcher> = {
  toBe: (received, expected: unknown) => ({
    pass: Object.is(received, expected),
    message: () => `expected ${show(received)} to be ${show(expected)}`,
  }),
  toEqual: (received, expected: unknown) => ({
    pass: isDeepStrictEqual(received, expected),
    message: () => `expected ${show(received)} to equal ${show(expected)}`,
  }),
  toBeTruthy: (received) => ({
    pass: !!received,
    message: () => `expected ${show(received)} to be truthy`,
  }),
  toBeFalsy: (received) => ({
    pass: !received,
    message: () => `expected ${show(received)} to be falsy`,
  }),
  toBeDefined: (received) => ({
    pass: received !== undefined,
    message: () => `expected ${show(received)} to be defined`,
  }),
  toBeUndefined: (received) => ({
    pass: received === undefined,
    message: () => `expected ${show(received)} to be undefined`,
  }),
  toBeGreaterThan: compare("to be greater than", (a, b) => a > b),
  toBeGreaterThanOrEqual: compare("to be at least", (a, b) => a >= b),
  toBeLessThan: compare("to be less than", (a, b) => a < b),
  toBeLessThanOrEqual: compare("to be at most", (a, b) => a <= b),
  toBeCloseTo: (received, expected: number, digits = 2) => ({
    pass: Math.abs((received as number) - expected) < 10 ** -digits / 2,
    message: () =>
      `expected ${show(received)} to be close to ${show(expected)} (${digits} digits)`,
  }),
  toContain: (received, item: unknown) => ({
    pass: (received as unknown[] | string).includes(item as never),
    message: () => `expected ${show(received)} to contain ${show(item)}`,
  }),
  toHaveLength: (received, length: number) => ({
    pass: (received as unknown[]).length === length,
    message: () =>
      `expected length ${length}, but ${show(received)} has length ${(received as unknown[]).length}`,
  }),
  toMatch: (received, pattern: RegExp | string) => ({
    pass:
      typeof pattern === "string"
        ? String(received).includes(pattern)
        : pattern.test(String(received)),
    message: () => `expected ${show(received)} to match ${show(pattern)}`,
  }),
  toThrow: (received) => {
    let threw = false;
    try {
      (received as Fn)();
    } catch {
      threw = true;
    }
    return { pass: threw, message: () => "expected the function to throw" };
  },
};

class AssertionError extends Error {
  name = "AssertionError";
}

const assertions = (received: unknown, negate: boolean) =>
  Object.fromEntries(
    Object.entries(matchers).map(([name, matcher]) => [
      name,
      (...args: never[]) => {
        const check = (r: MatcherResult) => {
          if (r.pass === negate) throw new AssertionError(r.message());
        };
        const r = matcher(received, ...args);
        return r instanceof Promise ? r.then(check) : check(r);
      },
    ]),
  );

/** Matchers a value can be checked with. Augment this interface when you `expect.extend`. */
export interface Matchers {}
type Basic = {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeDefined(): void;
  toBeUndefined(): void;
  toBeGreaterThan(n: number): void;
  toBeGreaterThanOrEqual(n: number): void;
  toBeLessThan(n: number): void;
  toBeLessThanOrEqual(n: number): void;
  toBeCloseTo(n: number, digits?: number): void;
  toContain(item: unknown): void;
  toHaveLength(length: number): void;
  toMatch(pattern: RegExp | string): void;
  toThrow(): void;
};
export type Assertions = Basic & Matchers;

export const expect = Object.assign(
  (received: unknown) =>
    ({
      ...assertions(received, false),
      not: assertions(received, true),
    }) as unknown as Assertions & { not: Assertions },
  {
    /** Add matchers. Each returns `{ pass, message }`, like Vitest's and Jest's. */
    extend: (more: Record<string, Matcher>) => Object.assign(matchers, more),
  },
);

/** Load each test file, run its tests in order, and print the results. Returns the exit code. */
export const runFiles = async (files: string[], root: string) => {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  for (const file of files) {
    console.log(`\n${bold(path.relative(root, file))}`);
    state.cases = [];
    try {
      await load(file);
    } catch (error) {
      failed += 1;
      console.log(`  ${red("✗")} the file failed to load\n${indent(error)}`);
      continue;
    }
    const only = state.cases.some((c) => c.only);
    for (const c of state.cases) {
      if (c.skip || (only && !c.only)) {
        skipped += 1;
        console.log(`  ${dim(`- ${c.name} (skipped)`)}`);
        continue;
      }
      const start = performance.now();
      try {
        await c.fn();
        passed += 1;
        console.log(
          `  ${green("✓")} ${c.name} ${dim(`(${Math.round(performance.now() - start)} ms)`)}`,
        );
      } catch (error) {
        failed += 1;
        console.log(`  ${red("✗")} ${c.name}\n${indent(error)}`);
      }
    }
  }
  console.log(
    `\n${passed ? green(`${passed} passed`) : "0 passed"}, ${failed ? bold(red(`${failed} failed`)) : "0 failed"}${skipped ? `, ${skipped} skipped` : ""}`,
  );
  return failed ? 1 : 0;
};

const indent = (error: unknown) => {
  // Matched by name: the error may come from the test file's copy of this module.
  const assertion = error instanceof Error && error.name === "AssertionError";
  const text = assertion
    ? error.message
    : error instanceof Error
      ? (error.stack ?? error.message)
      : String(error);
  return text
    .split("\n")
    .flatMap((l) =>
      // Wrap the matcher's sentences; indented lines are formatted findings, wrapped already.
      assertion && !/^\s/.test(l) && !l.includes("\x1b") ? wrap(l, 6) : [l],
    )
    .map((l) => (l ? `      ${l}` : l))
    .join("\n");
};
