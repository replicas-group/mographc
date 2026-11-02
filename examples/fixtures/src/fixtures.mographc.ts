import { loadConfig, run } from "mographc";
import { describe, expect, loadFilm, test } from "mographc/test";

const { config } = await loadConfig(process.cwd());

/** The unaccepted findings of one rule on one composition, as "element @ seconds". */
const found = async (composition: string, rule: string) =>
  run(await loadFilm(composition), config)
    .filter((f) => f.rule === rule && !f.accepted)
    .map((f) => `${f.element} @ ${f.from.toFixed(2)}`);

describe("clipped and off-canvas elements are measured by what is visible", () => {
  test("a card sliding behind its window's edge doesn't jump or stop abruptly", async () => {
    expect(await found("ClipSlide", "continuity/jump")).toEqual([]);
    expect(await found("ClipSlide", "easing/weak-out")).toEqual([]);
    expect(await found("ClipSlide", "easing/abrupt-stop")).toEqual([]);
  });
  test("a headline isn't over a window by the part a mask hides", async () =>
    expect(await found("ClippedTitle", "staging/text-over-product")).toEqual(
      [],
    ));
  test("a cursor clipped to a window enters and leaves at the window's edges", async () => {
    expect(await found("ClippedCursor", "cursor/pops-in")).toEqual([]);
    expect(await found("ClippedCursor", "cursor/dead-exit")).toEqual([]);
  });
  test("a camera pan doesn't count as the cursor moving fast", async () =>
    expect(await found("ClippedCursor", "cursor/no-stretch")).toEqual([]));
  test("a hard ease-out entrance from past the edge isn't a jump or a pop-in", async () => {
    expect(await found("HardEaseOut", "continuity/jump")).toEqual([]);
    expect(await found("HardEaseOut", "animate/pop-in")).toEqual([]);
  });
});

describe("entrances that are animated aren't pop-ins", () => {
  test("a card sliding in from past the canvas edge, and a logo growing from nothing", async () =>
    expect(await found("NoPop", "animate/pop-in")).toEqual([]));
});

describe("what a frame is measured with", () => {
  test("a web font is loaded before the frame is measured", async () =>
    expect(await found("WebFont", "continuity/jump")).toEqual([]));
  test("a family that is neither declared nor installed is a fallback font", async () =>
    expect(await found("MissingFont", "assets/fallback-font")).toHaveLength(1));
  test("a neighbour reflowing around changed text doesn't jump", async () =>
    expect(await found("Reflow", "continuity/jump")).toEqual([]));
  test("a cursor on a button's padding points at the button", async () => {
    const film = await loadFilm("PointAtPadding");
    expect(film.get("cursor:pointer")).toPointAt(film.get("button:send"), {
      at: 1,
    });
  });
});

describe("identity", () => {
  test("a tag on two elements at once is reported, and neither jumps", async () => {
    expect(await found("DuplicateTags", "continuity/duplicate-tag")).toEqual([
      "card:item @ 0.00",
    ]);
    expect(await found("DuplicateTags", "continuity/jump")).toEqual([]);
  });
  test("one-frame flickers are reported; identical icons and crossing windows aren't", async () => {
    expect(await found("Flicker", "continuity/flicker")).toEqual([
      "graphic 120x50 at (1500, 80) @ 0.50",
      "chip:status @ 1.00",
    ]);
    expect(await found("Flicker", "easing/stutter")).toEqual([]);
  });
  test("a replay of a jump and a dead stop is reported each time", async () => {
    expect(await found("Replay", "continuity/jump")).toEqual([
      "card:glitch @ 0.30",
      "surface 400x200 at (1260, 300) @ 0.30",
      "card:glitch @ 2.30",
      "surface 400x200 at (1260, 300) @ 2.30",
    ]);
    expect(await found("Replay", "easing/abrupt-stop")).toEqual([
      "card:glitch @ 0.67",
      "surface 400x200 at (1260, 300) @ 0.67",
      "card:glitch @ 2.67",
      "surface 400x200 at (1260, 300) @ 2.67",
    ]);
  });
  test("data-motion-ignore on a container applies to everything inside it", async () =>
    expect(await found("IgnoreSubtree", "continuity/jump")).toEqual([]));
});
