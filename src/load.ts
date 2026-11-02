import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, {
  moduleCache: true,
  // Tests import the film's own components and timings, which are often .tsx.
  jsx: { runtime: "automatic" },
});

/** Import a user's file (config, test, remotion.config.ts) whether it's TypeScript or JavaScript, like ESLint loads eslint.config.ts. */
export const load = <T = Record<string, unknown>>(file: string) =>
  jiti.import<T>(file);
