/**
 * A brand preset for a made-up company, Acme, written only with mographc's public API.
 * Copy this file into your project, replace the colours and fonts with your brand's, and
 * add `acme` to your mographc.config.ts.
 */
import { area, defineRule, px, type ConfigBlock } from "mographc";

/** Placeholder colours. Use your design system's tokens, copied from its source of truth. */
export const ACME_COLOURS = [
  "#4F46E5", // primary
  "#FFFFFF", // background
  "#F4F4F5", // canvas
  "#E4E4E7", // border
  "#18181B", // text
  "#71717A", // muted text
];

const parse = (c: string): [number, number, number, number] | null => {
  const hex = c.match(/^#([0-9a-f]{6})$/i);
  if (hex)
    return [0, 2, 4]
      .map((i) => parseInt(hex[1].slice(i, i + 2), 16))
      .concat(1) as [number, number, number, number];
  const rgb = c.match(
    /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/,
  );
  if (rgb)
    return [
      Number(rgb[1]),
      Number(rgb[2]),
      Number(rgb[3]),
      rgb[4] === undefined ? 1 : Number(rgb[4]),
    ];
  return null;
};

/**
 * A shadow is offset or soft. `0 0 0 1px` is a ring (Tailwind draws borders and focus
 * rings this way) and a zero-offset blur of a couple of pixels is a halo, not a shadow.
 */
export const castsShadow = (computed: string) =>
  computed.split(" | ").some((value) =>
    value.split(/,(?![^(]*\))/).some((one) => {
      const lengths = (one.match(/-?[\d.]+px/g) ?? []).map(parseFloat);
      const [x = 0, y = 0, blur = 0] = lengths;
      const transparent = /rgba\([^)]*,\s*0\)|transparent/.test(one);
      return !transparent && (Math.abs(x) + Math.abs(y) > 0 || blur > 3);
    }),
  );

export const noShadows = defineRule({
  id: "acme/no-shadows",
  kind: "lint",
  severity: "error",
  options: {},
  docs: {
    summary:
      "No shadows: surfaces separate by a hairline border or fill contrast.",
    why: "Acme's look is flat: surfaces are separated by borders and fills, and a shadow makes the film look unlike the product.",
    fix: "Replace `box-shadow`, `drop-shadow` and `text-shadow` with a 1 px border in the border token, or a fill contrast between the surface and the canvas.",
  },
  check({ film, report }) {
    for (const el of film.elements) {
      const fs = el.frames.filter((f) => {
        const s = el.at(f)!;
        return (
          s.raw.sh &&
          castsShadow(s.raw.sh) &&
          s.opacity > 0.3 &&
          area(s.visible) > 0
        );
      });
      if (fs.length)
        report({
          element: el,
          frames: [fs[0], fs[fs.length - 1]],
          measured: "has a shadow",
          need: "a border or fill contrast instead",
        });
    }
  },
});

export const palette = defineRule({
  id: "acme/palette",
  kind: "lint",
  severity: "warn",
  options: { colors: ACME_COLOURS, tolerance: 14, minArea: 0.01 },
  docs: {
    summary: "Surfaces, canvases and headline type use brand colours.",
    why: "An off-palette fill (a near-miss green, a grey that isn't a token) is visibly off-brand next to the real product.",
    fix: "Use the colour from the brand's source of truth (its design tokens), not a value from memory or a screenshot.",
  },
  check({ film, options, report }) {
    const allowed = options.colors
      .map(parse)
      .filter((c): c is [number, number, number, number] => !!c);
    const near = (c: [number, number, number, number]) =>
      c[3] < 0.05 ||
      allowed.some(
        (a) =>
          Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]) <=
          options.tolerance,
      );
    for (const el of film.elements) {
      if (el.role !== "surface" && el.role !== "headline") continue;
      const off = new Map<string, number[]>();
      for (const f of el.frames) {
        const s = el.at(f)!;
        if (s.opacity < 0.9) continue;
        const colour = el.role === "headline" ? s.raw.c : s.raw.bg;
        if (
          !colour ||
          (el.role === "surface" &&
            area(s.visible) < options.minArea * film.area)
        )
          continue;
        const c = parse(colour);
        if (c && !near(c)) off.set(colour, [...(off.get(colour) ?? []), f]);
      }
      for (const [colour, fs] of off)
        report({
          element: el,
          frames: [fs[0], fs[fs.length - 1]],
          measured: `uses ${colour}`,
          need: "a palette colour",
        });
    }
  },
});

export const typeWeight = defineRule({
  id: "acme/type-weight",
  kind: "lint",
  severity: "error",
  options: { headline: 500, any: 600, display: 40 },
  docs: {
    summary:
      "Type is light: headlines at weight 500 at most, and nothing heavier than 600.",
    why: "Acme sets its type medium and regular, so bold headlines look heavier than the product they sit next to.",
    fix: "Set headlines to `fontWeight: 500` and body text to 400. Use 600 only for the product's own interface labels, where the product itself uses it.",
  },
  check({ film, options, report }) {
    // One finding for the film: type weight is a setting, not something each word gets wrong on its own.
    const heavy: {
      el: (typeof film.elements)[number];
      frame: number;
      weight: number;
      max: number;
    }[] = [];
    for (const el of film.elements) {
      if (el.role !== "headline" && el.role !== "text") continue;
      const limit = (f: number) =>
        el.role === "headline" ||
        (el.at(f)!.raw.fs ?? 0) >= px(film, options.display)
          ? options.headline
          : options.any;
      const f = el.frames.find(
        (g) => (el.at(g)!.raw.fw ?? 400) > limit(g) && el.at(g)!.opacity > 0.3,
      );
      if (f !== undefined)
        heavy.push({ el, frame: f, weight: el.at(f)!.raw.fw!, max: limit(f) });
    }
    if (!heavy.length) return;
    const frames = heavy.map((h) => h.frame).sort((a, b) => a - b);
    const examples = [
      ...new Set(heavy.map((h) => (h.el.at(h.frame)!.raw.x ?? "").trim())),
    ]
      .slice(0, 5)
      .join(" ");
    const weights = [...new Set(heavy.map((h) => h.weight))].sort().join("/");
    report({
      frames: [frames[0], frames[frames.length - 1]],
      measured: `${heavy.length} text elements set at weight ${weights}, e.g. "${examples.slice(0, 50)}"`,
      need: `headlines and display type at ${options.headline} or lighter, nothing over ${options.any}`,
    });
  },
});

export const typeface = defineRule({
  id: "acme/typeface",
  kind: "lint",
  severity: "warn",
  options: { headline: ["Inter"] },
  docs: {
    summary: "Headlines are set in the brand typeface.",
    why: "A system font or a near-miss sans under the headline reads as someone else's brand.",
    fix: "Load the brand font with a FontFace (or `@remotion/google-fonts`), hold the render with `delayRender` until it has loaded, and set headlines in it.",
  },
  check({ film, options, report }) {
    for (const el of film.elements.filter((e) => e.role === "headline")) {
      const s = el.at(el.first)!;
      if (s.raw.ff && !options.headline.includes(s.raw.ff))
        report({
          element: el,
          frames: [el.first, el.last],
          measured: `set in ${s.raw.ff}`,
          need: options.headline.join(" or "),
        });
    }
  },
});

const rules = [noShadows, palette, typeWeight, typeface];

/** The preset: a config block that makes Acme's rules available and turns them on. */
export const acme: ConfigBlock = {
  name: "acme",
  plugins: rules,
  rules: Object.fromEntries(rules.map((r) => [r.id, r.severity])),
};
