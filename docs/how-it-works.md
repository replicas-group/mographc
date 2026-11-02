# How it works

1. **Bundling.** mographc bundles the project with its own Remotion config and swaps Remotion's `<Composition>` for one that wraps every composition in a probe.
2. **Probing.** Every frame is rendered without taking screenshots. After each frame settles, the probe reads each element from the DOM: its box (text is measured by its glyphs), the part of it that is visible, its opacity, the stretch of its transforms, its text, font size, colours and shadows, and its `data-motion` tags.
3. **The film model.** Elements are tracked from frame to frame, by their tag when they have one, and otherwise by the continuity of their structure, position and size. mographc then works out roles, moves and headlines.
4. **The simulated viewer.** mographc estimates where a viewer's eye goes on each frame (to what just appeared or moved, or the next unread line) and how much text they manage to read at 3.5 words a second.
5. **The checks.** `check` runs the compiler rules, `lint` runs the configured rules with suppressions and the baseline, and `test` runs your files.

We read the DOM rather than analysing pixels because the DOM gives exact boxes, text and identities, which makes each finding precise enough to name the element and the frame. Measurements are in seconds and pixels per second, and thresholds scale with the canvas, so the rules hold at any frame rate and resolution.

---

[Documentation index](README.md)
