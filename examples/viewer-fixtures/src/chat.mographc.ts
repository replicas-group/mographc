import { expect, loadFilm, test } from "mographc/test";

const film = await loadFilm("Chat");

test("the streamed reply is read", () =>
  expect(film.get("text:answer")).toBeRead());
test("the reply is the focus while it streams", () =>
  expect(film.get("text:answer")).toBeTheFocus({
    during: [3.5, 7.5],
    share: 0.9,
  }));
