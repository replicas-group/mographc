import { defineConfig, recommended } from "mographc";
import { ACME_COLOURS, acme } from "./acme.ts";

export default defineConfig([
  recommended,
  acme,
  // A preset's rules take options like any other rule: here, a campaign adds one colour.
  {
    rules: {
      "acme/palette": ["warn", { colors: [...ACME_COLOURS, "#F59E0B"] }],
    },
  },
]);
