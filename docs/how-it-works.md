# How it works

1. mographc bundles the project with its own Remotion config and replaces Remotion's `<Composition>` with one that wraps every composition in a probe, a component that measures what is on the page.
2. Every frame is rendered without taking screenshots. Once a frame has finished rendering, the probe reads each [element](terms.md#elements) from the DOM: its box (position and size; text is measured by the outline of its letters), the part of it that is on the canvas, its opacity, its [stretch](terms.md#motion), its text, font size, colours and shadows, and its `data-motion` [tag](terms.md#elements).
3. mographc follows each element from frame to frame, by its tag when it has one, and otherwise by its place in the page structure, its position and its size. This record of every element on every frame is the film model. mographc then works out each element's [role](terms.md#elements), its [moves](terms.md#motion), and which text is a headline.
4. mographc estimates, for each frame, which element a viewer is looking at (something that just appeared or moved, or the next unread line of text) and how much text they read, at 3.5 words a second. See [simulated viewer](terms.md#reading).
5. `check` runs the [compiler rules](terms.md#checking). `lint` runs the rules in the config, applies suppressions, and compares the film with its [baseline](baselines.md) if there is one. `test` runs your test files.

mographc reads the DOM rather than analysing pixels, because the DOM gives exact boxes, text and identities. That makes each finding precise enough to name the element and the frame. Times are measured in seconds and speeds in pixels per second, and pixel thresholds are written [at 1080p](terms.md#the-film) and scaled to the canvas, so the rules give the same results at any frame rate and resolution.

---

[Documentation index](README.md)
