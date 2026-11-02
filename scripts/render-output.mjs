// Runs `mographc verify DemoBroken` on the demo film and saves its coloured terminal output
// as docs/verify-output.svg, plus a plain-text copy in the README for screen readers and agents.
// Run it with `npm run docs:output` after changing the CLI's output or the demo.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const demo = `${root}examples/demo`;
const COLUMNS = 100;
const COMMAND = "npx mographc verify DemoBroken";

if (!existsSync(`${demo}/node_modules`)) {
  console.error("Install the demo first: cd examples/demo && npm install");
  process.exit(1);
}

const run = spawnSync(
  process.execPath,
  [`${root}dist/cli.js`, "verify", "DemoBroken"],
  {
    cwd: demo,
    encoding: "utf8",
    env: {
      ...process.env,
      FORCE_COLOR: "1",
      NO_COLOR: "",
      COLUMNS: String(COLUMNS),
      MOGRAPHC_FILM: "DemoBroken",
    },
  },
);
const ansi = run.stdout.replace(/^\n+/, "").replace(/\s+$/, "");
const plain = ansi.replace(/\x1b\[[0-9;]*m/g, "");

// Each line becomes a list of runs of text with one style.
const lines = ansi.split("\n").map((line) => {
  const runs = [];
  let style = {};
  for (const part of line.split(/(\x1b\[[0-9;]*m)/)) {
    const code = part.match(/^\x1b\[([0-9;]*)m$/);
    if (!code) {
      if (part) runs.push({ text: part, ...style });
      continue;
    }
    for (const c of code[1].split(";").map(Number)) {
      if (c === 0) style = {};
      else if (c === 1) style = { ...style, bold: true };
      else if (c === 2) style = { ...style, dim: true };
      else style = { ...style, colour: c };
    }
  }
  return runs;
});

// GitHub's dark terminal palette. The image carries its own dark background, so it reads
// the same on GitHub's light and dark themes.
const PALETTE = {
  text: "#e6edf3",
  dim: "#8b949e",
  31: "#ff7b72",
  32: "#3fb950",
  33: "#e3b341",
  36: "#56d4dd",
};
const CHAR = 8.4;
const LINE = 20;
const PAD = 24;
const TOP = 52;
const width = Math.ceil(COLUMNS * CHAR + PAD * 2);
const height = TOP + (lines.length + 2) * LINE + PAD;
const escape = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const text = [
  // The prompt line, then the output.
  [{ text: "$ ", dim: true }, { text: COMMAND }],
  [],
  ...lines,
]
  .map((runs, i) => {
    let col = 0;
    const spans = runs.map((r) => {
      const fill = r.colour
        ? PALETTE[r.colour]
        : r.dim
          ? PALETTE.dim
          : PALETTE.text;
      // Place each run by its column: SVG renderers drop leading spaces.
      const lead = r.text.length - r.text.trimStart().length;
      const span = `<tspan x="${(PAD + (col + lead) * CHAR).toFixed(1)}" fill="${fill}"${r.bold ? ' font-weight="700"' : ""}>${escape(r.text.trimStart())}</tspan>`;
      col += [...r.text].length;
      return span;
    });
    return `  <text y="${TOP + (i + 1) * LINE}">${spans.join("")}</text>`;
  })
  .join("\n");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Terminal output of ${COMMAND}">
  <rect width="${width}" height="${height}" rx="10" fill="#0d1117"/>
  <circle cx="24" cy="24" r="6" fill="#ff5f57"/>
  <circle cx="44" cy="24" r="6" fill="#febc2e"/>
  <circle cx="64" cy="24" r="6" fill="#28c840"/>
  <g font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace" font-size="14" style="white-space: pre">
${text}
  </g>
</svg>
`;

mkdirSync(`${root}docs`, { recursive: true });
writeFileSync(`${root}docs/verify-output.svg`, svg);

const readme = `${root}README.md`;
const start = "<!-- verify-output:start -->";
const end = "<!-- verify-output:end -->";
const current = readFileSync(readme, "utf8");
if (!current.includes(start) || !current.includes(end)) {
  console.error(`README.md needs the ${start} and ${end} markers.`);
  process.exit(1);
}
writeFileSync(
  readme,
  current.replace(
    new RegExp(`${start}[\\s\\S]*${end}`),
    `${start}\n\n\`\`\`\n$ ${COMMAND}\n\n${plain}\n\`\`\`\n\n${end}`,
  ),
);
console.log(
  `wrote docs/verify-output.svg (${lines.length} lines) and updated README.md`,
);
