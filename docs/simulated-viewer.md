# The simulated viewer

The [simulated viewer](terms.md#reading) estimates, frame by frame, where a person watching the film is looking and how much of each text they have read. The `attention/` rules and the `toBeRead` and `toBeTheFocus` matchers use it. `mographc gaze <composition>` prints what it does over time, and is the first thing to run when one of those reports something you don't expect.

This page describes what it does, with the numbers it uses, so that you can plan text and motion that it can follow.

## What it reads

It reads legible text: text at least 10 px tall at 1080p, with an opacity over 0.5, and mostly on the canvas and not clipped by its container. It doesn't read text in a cursor, in the parts of a cursor or in the label that travels with a cursor (the `cursor`, `part` and `cursor-label` [roles](terms.md#elements)). Text tagged `label:` has the `text` role and is read.

### Lines and paragraphs

It groups text the way a reader takes it in. Pieces of text (often one per `<span>`) join into one line when all of these are true:

- they're in the same painted box: the nearest element around them with a background or border, such as a card, a bubble or a panel, is the same one;
- their vertical centres are within half a line height of each other, and their font sizes within 1.25× of each other;
- the horizontal gap between them is less than 1.2 times the font size.

Lines then join into one paragraph, which is read as one text, when all of these are true:

- they're in the same painted box;
- their font sizes are within 1.2× of each other;
- each line starts less than 0.9 times its font size below the line above it, and the two overlap horizontally;
- one isn't arriving while the other leaves.

So stacked terminal or log lines in one panel are one paragraph, and so are the lines of a wrapped message. Two cards side by side are read separately even when their text sits on one baseline, but two labels set close together in the same box are read as one line. Give texts that should be read separately their own painted box, or more space between them.

### How long a text takes to read

The viewer reads 3.5 words a second. A text costs the larger of two counts:

- its words, where a word longer than 7 letters counts as its letters ÷ 7;
- its letters, not counting spaces, ÷ 5.

For prose the two are about the same, so budget 0.3 s a word. Code, paths, flags and hashes cost by their length, so budget by characters instead, about 17 characters a second:

| Text                                | Words | Cost in words | Time to read |
| ----------------------------------- | ----- | ------------- | ------------ |
| `Every pull request gets a preview` | 6     | 6.0           | 1.7 s        |
| `$ git push origin fix/cache-key`   | 5     | 5.9           | 1.7 s        |
| `src/components/CheckoutButton.tsx` | 1     | 6.6           | 1.9 s        |

A paragraph is skimmed, not read: it never costs more than 12 words, however long it is. Texts that arrive together in one surface (within 0.5 s of each other) and add up to more than 12 words are glanced at as a page, and each is scaled down to share those 12 words.

A text counts as read once 95% of its words are read. A text that grows (typed, streamed, or changed in a few words) stays the same text, and its new words are added to it. A number changing in place, such as a counter, a clock or a timer, is the same text and adds nothing to read.

## Where it looks

On each frame the eye is on one thing. Moving the eye further than 15% of the canvas width costs 0.15 s, during which nothing is read.

### What pulls the eye

Something new pulls the eye. Each kind of event has a strength:

| Strength | Event                                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------------- |
| 3        | new text at least 40 px tall at 1080p; a box covering at least 5% of the canvas that appears, starts to move or moves off |
| 2        | any other new text, even a single word; the cursor appearing or starting to move                                          |
| 1        | a smaller box, image or SVG (0.3% to 5% of the canvas) that appears or starts to move                                     |
| none     | anything smaller than 0.3% of the canvas; anything that has been moving for the last 0.2 s; text moving without changing  |

Movement counts only when it starts, so a long slide pulls once. A move doesn't pull at all when it carries the thing the eye is on (a window sliding with the text being read inside it) or moves along with it by the same zoom and shift (a camera push, a list scrolling).

### What takes the eye during a read

While the viewer is reading a text that still has unread words, or that changed in the last 0.5 s, only a strength 3 event takes the eye: large text arriving, or a large box arriving or setting off. When several things pull at once, the strongest wins, and the nearest one breaks a tie.

As soon as the text is read, the eye is free, and it goes to:

1. anything new on this frame, even one new word, the cursor setting off, or a small box moving;
2. otherwise, the next unread text on screen: the largest type first, then the highest on the canvas, then the leftmost. A text left part-read earlier pulls the eye back here;
3. otherwise, whatever is moving, the largest first.

So while one text should be read, nothing else should arrive in large type or as a large box. When the viewer finishes that text, the next thing to arrive or the next unread text decides where it goes. Small moving shapes, such as a spinner, a caret or a progress dot, never take the eye.

### Camera moves

A camera push or pan moves everything inside the camera by the same zoom and shift. If the thing the eye is on moves with the camera, the eye moves with it and keeps reading. If it doesn't, the push is a large box starting to move, and it takes the eye even in the middle of a read. That happens, for example, when the camera zooms the product behind a caption that is fixed on the canvas. So while a caption is being read, either put it inside the camera or keep the camera still. Anything that arrives during a push still pulls the eye as usual.

## Text asking to be read

`attention/competing` counts the frames where two texts more than 15% of the canvas width apart are both asking to be read. A text asks to be read when it has at least 2 words, arrived or changed in the last 1.5 s, hasn't been read yet, and wasn't glanced at as part of a page. A counter ticking doesn't count as a change.

## Changing the numbers

The numbers above are the defaults in `VIEWER` (`src/viewer.ts`): `wordsPerSecond` 3.5, `legible` 10 px, `skimWords` 12, `asks` 1.5 s, `fovea` 0.15 of the canvas width, `saccade` 0.15 s and `done` 0.95. They aren't options yet; they were calibrated on films that people judged.

---

[Documentation index](README.md)
