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
 * A shadow is offset or blurred by more than 3 px. `0 0 0 1px` is a ring (Tailwind draws
 * borders and focus rings this way), and a blur of a few pixels with no offset is a soft
 * outline, so neither counts as a shadow.
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
      "No visible element has a box, drop or text shadow that is offset from it or blurred by more than 3 px.",
    why: "Acme's product is flat: it separates surfaces with 1 px borders and background colours, never shadows, so a shadow in the film makes it look unlike the product. The rule checks every element with opacity above 0.3 that is on the canvas, and ignores rings and soft outlines with no offset and a blur of 3 px or less.",
    fix: "Replace `box-shadow`, `drop-shadow` and `text-shadow` with a 1 px border in the border colour, or give the surface a background colour that differs from the canvas behind it.",
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
          need: "a border or a different background colour instead of a shadow",
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
    summary:
      "The background colour of every surface covering at least 1% of the canvas, and the text colour of every headline, is within a distance of 14 in RGB of one of the brand's colours.",
    why: "A colour that is close to a brand colour but not the same (a slightly different green, a grey that isn't in the design system) is visible next to the real product. The rule measures the straight-line distance between colours in RGB (each channel 0 to 255) on frames where the element's opacity is at least 0.9, and ignores colours that are almost fully transparent.",
    fix: "Use the colour from the brand's design tokens, copied from the design system's source files, not a value from memory or a screenshot.",
    options: {
      colors: "The brand's colours, as `#rrggbb` or `rgb()`/`rgba()` strings.",
      tolerance:
        "How far, as a distance in RGB (each channel 0 to 255), a colour may be from the nearest brand colour.",
      minArea:
        "The smallest surface checked, as a share of the canvas area. 0.01 is 1% of the canvas.",
    },
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
          need: `one of the brand colours, within a distance of ${options.tolerance} in RGB`,
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
      "Headlines and other text at least 40 px tall at 1080p have a font weight of 500 or less, and all other text has a font weight of 600 or less.",
    why: "Acme's product uses weights 400 and 500, so bold headlines look heavier than the product next to them. The rule checks every visible headline and text element (opacity above 0.3) and reports all the elements that are too heavy in one finding, because the weight is usually set in one place for the whole film.",
    fix: "Set headlines to `fontWeight: 500` and body text to 400. Use 600 only for the product's own interface labels, where the product itself uses it.",
    options: {
      headline:
        "The heaviest font weight allowed for headlines and for text at least `display` px tall.",
      any: "The heaviest font weight allowed for any other text.",
      display:
        "The font size, in px at 1080p, from which text is held to the `headline` weight.",
    },
  },
  check({ film, options, report }) {
    // One finding for the film: the font weight is usually set in one place, not word by word.
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
      need: `headlines and text at least ${options.display} px tall at weight ${options.headline} or less, and all other text at ${options.any} or less`,
    });
  },
});

export const typeface = defineRule({
  id: "acme/typeface",
  kind: "lint",
  severity: "warn",
  options: { headline: ["Inter"] },
  docs: {
    summary:
      "Every headline is set in one of the brand typefaces listed in the `headline` option, judged by its font family on the first frame it appears.",
    why: "A headline in a system font, or in a typeface that only looks similar to the brand's, makes the film look like another company's. The rule compares the headline's computed font family with the allowed names.",
    fix: "Load the brand font with a FontFace (or `@remotion/google-fonts`), pause the render with `delayRender` until it has loaded, and set headlines in it.",
    options: {
      headline:
        "The font family names allowed for headlines, as they appear in CSS.",
    },
  },
  check({ film, options, report }) {
    for (const el of film.elements.filter((e) => e.role === "headline")) {
      const s = el.at(el.first)!;
      if (s.raw.ff && !options.headline.includes(s.raw.ff))
        report({
          element: el,
          frames: [el.first, el.last],
          measured: `set in ${s.raw.ff}`,
          need: `the headline set in ${options.headline.join(" or ")}`,
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
