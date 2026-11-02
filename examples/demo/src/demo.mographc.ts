import { describe, expect, loadFilm, test } from "mographc/test";
import { TIMES } from "./Demo";

// `npm run verify:broken` points the same tests at the broken film.
const film = await loadFilm(process.env.MOGRAPHC_FILM ?? "Demo");
const s = (frame: number) => +(frame / 30).toFixed(2);

describe("the click", () => {
  const cursor = film.get("cursor:person");
  test("the cursor clicks Send", () =>
    expect(cursor).toPointAt(film.get("button:send"), { at: s(TIMES.click) }));
  test("it moves without jumping", () => expect(cursor).toMoveContinuously());
  test("then leaves by moving off the canvas", () =>
    expect(cursor).toLeaveCanvas({ by: s(TIMES.leave + 20) }));
});

describe("the layout", () => {
  test("the headline never touches the window", () =>
    expect(film.get("headline:claim")).not.toOverlap(film.get("window:chat")));
  test("the chat reads on a phone", () =>
    expect(film.get("window:chat")).toHaveTextAtLeast(28));
});

test("the film passes the linter", async () => {
  await expect(film).toPassLint();
});
