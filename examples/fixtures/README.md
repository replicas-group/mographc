# Measurement fixtures

Small Remotion films, each reproducing a case mographc once measured wrongly, with tests that pin the right result. Run them after changing the probe, the film model or a rule:

```bash
npm run build                 # in the repository root
cd examples/fixtures && npm install
npm run verify                # runs src/fixtures.mographc.ts
```

| Composition      | What it checks                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| `ClipSlide`      | A card sliding behind its window's clipped edge doesn't jump or stop abruptly when it goes out of view.          |
| `ClippedTitle`   | Only the visible part of a masked headline counts as over a window.                                              |
| `ClippedCursor`  | A cursor clipped to a window enters and leaves at the window's edges, and a camera pan isn't the cursor's speed. |
| `NoPop`          | A card sliding in from past the canvas edge and an SVG logo growing from nothing aren't pop-ins.                 |
| `HardEaseOut`    | Hard ease-out entrances from past a clipped edge aren't jumps or pop-ins.                                        |
| `WebFont`        | Frames are measured after a font from `@remotion/google-fonts` has loaded.                                       |
| `MissingFont`    | A font family that is neither declared nor installed is reported as a fallback.                                  |
| `Reflow`         | Neighbours reflowing around text that changes don't jump.                                                        |
| `PointAtPadding` | `toPointAt` counts a click on a button's padding.                                                                |
| `DuplicateTags`  | A tag on two elements at once is reported, and neither element appears to jump.                                  |
| `Flicker`        | One-frame flickers are reported; identical icons and identical windows crossing paths aren't.                    |
| `Replay`         | A jump and a dead stop are reported every time they play.                                                        |
| `IgnoreSubtree`  | `data-motion-ignore` on a container applies to everything inside it.                                             |
