import { defineConfig } from "mographc";
import { logoClearspace } from "./logo-clearspace";

export default defineConfig([
  { plugins: [logoClearspace], rules: { "acme/logo-clearspace": "error" } },
]);
