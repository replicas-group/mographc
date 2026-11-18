# Terms

These are the terms mographc's documentation, rules and output use. Each one has a single meaning everywhere.

## The film

- **Composition**: one video defined in a Remotion project with `<Composition>`. mographc checks each composition separately, and most commands take composition ids to limit the run.
- **Frame**: one image of the video. Rules state their time thresholds in seconds, so they behave the same at any frame rate. A few short thresholds are a number of frames, and their documentation says so.
- **Canvas**: the full area of the video, for example 1920 × 1080 px.
- **Safe area**: the central 90% of the canvas. Text and important elements kept inside it aren't cut off on screens that crop the edges.
- **At 1080p**: pixel thresholds are written for a canvas 1080 px tall and scaled in proportion to the film's actual height. A 32 px threshold is 64 px on a 2160 px tall canvas.
- **Section**: a stretch of the film, usually 2 to 3 seconds long, that shows one idea. This is a writing and planning term; mographc doesn't detect sections.

## Elements

- **Element**: anything mographc measures on a frame: a piece of text, an image or SVG, or a box with a visible background or border. mographc follows each element from frame to frame.
- **Tag**: a `data-motion="role:name"` attribute on an element, which gives it a name for findings and tests, for example `data-motion="button:send"`.
- **Role**: the kind of element, which decides which rules apply to it. A tagged element takes its role from its tag. For an untagged element, mographc infers the role from what the element is. The roles are:
  - `cursor`: a mouse pointer. Tags `cursor` and `pointer`.
  - `surface`: a box with a visible background or border that contains other elements, such as an application window, a card or a panel. Tags `window`, `card`, `panel`, `sheet`, `modal`, `popover`, `page`, `chip` and `surface`. An untagged box with a background or border that covers between 2% and 95% of the canvas is a surface.
  - `headline`: large text that isn't inside a surface, such as a title. Tags `headline`, `title` and `claim`. Untagged text at least 40 px tall at 1080p that isn't inside a surface is a headline.
  - `text`: any other text. Tags `text`, `caption` and `label`.
  - `button`: something that is clicked. Tags `button`, `target` and `link`.
  - `logo`: a logo. Tag `logo`.
  - `graphic`: an untagged image, SVG or small box.

  Any other role in a tag is kept as written, and only the rules that apply to every element check it.

- **Film model**: mographc's record of a composition: every element on every frame, with its position and size (its box), the part of it that is visible, its opacity, stretch, text and tag. Rules and tests read the film model.
- **Tip**: the point of a cursor that clicks, marked with a `data-motion-tip` element inside it.

## Motion

- **Move**: a stretch of frames during which an element travels from one position where it is still to another.
- **Ease-in** and **ease-out**: speeding up at the start of a move, and slowing down at its end. mographc measures the strength of an ease-out as the share of a move's time spent covering its last 20% of distance. At constant speed this share is 0.20; higher values mean the move slows down more before it stops.
- **Zoom** and **pan**: scaling or moving all of the film's content at once, the way a camera would push in or move sideways.
- **Substantial change**: an element that, from one frame to the next, moves faster than 45 px/s at 1080p, changes its width and height by more than 0.6% in total, changes its opacity by more than 0.03, changes its stretch or its text, or appears or disappears. `pace/activity`, `pace/long-shot` and `staging/small-action` count substantial changes.
- **Stretch**: how much an element is scaled longer in one direction than the other, measured as its long side divided by its short side after all its transforms. A cursor stretched to 1.2 is 20% longer along its direction of travel than across it.

## Reveals

- **Reveal**: the moment an element is brought in: it animates in (its box or opacity changes) and **lands** on the first frame it is still and fully shown.
- **Opening reveal**: the film's first reveal in its first 3 s, of a tagged element other than a cursor, logo or text. A film has none when it is a cold open.
- **Cold open**: a film that starts on its subject: something is brought in within its first 0.25 s, or 15% of the rendered picture is new within its first 0.5 s.
- **Key reveal**: an element marked `data-motion-reveal`. With the opening reveal, these are the hero reveals that `reveal/no-build-up` and `staging/small-subject` check.
- **Build-up**: the 1 to 2 s before a reveal lands, when the camera eases in toward it and the sound builds (the highs rise, a riser climbs, or the beat drops out).
- **Hit**: a sudden rise in the sound's loudness, measured over the whole track, the highs above 4 kHz and the lows below 150 Hz.

## The rendered film

- **Rendered film**: the video `lint` and `verify` render from each composition, for the rules that read pixels and sound. `--no-render` skips it, and `--video <file>` lints a video file on its own.
- **New**: a part of the picture that differs from a quarter of a second earlier, measured in blocks of 32 px at 1080p where at least a quarter of the pixels changed. Unlike the change from one frame to the next, it counts fades.
- **Shimmer**: edges in the picture that keep jumping from frame to frame and coming back, as text does when the renderer snaps it to the pixel grid while it is pulsed or scaled by a pixel or two.

## Reading

- **Caption**: in the `attention/` rules, text at least 32 px tall at 1080p that isn't in a monospace font and isn't inside a surface. (As a tag, `caption` gives an element the `text` role.)
- **Simulated viewer**: mographc's estimate of what a person watching the film looks at and reads. On each frame it picks the element the eye is most likely on (something that just appeared or moved, or the next unread line of text) and assumes a reading speed of 3.5 words a second. Rules under `attention/` and the `toBeRead` and `toBeTheFocus` matchers use it.

## Checking

- **Finding**: one problem a rule reports. It names the rule, the time in the film, the element, what was measured, what the rule requires, and how to fix it.
- **Severity**: `error` (the run fails), `warn` (printed, but the run passes) or `off`.
- **Compiler rule**: a rule that reports something broken, such as an image that didn't load. Compiler rules always run and `mographc check` runs only these.
- **Preset**: a config block that makes a set of rules available and sets their severities. `recommended` is the built-in preset.
- **Accepted finding**: a finding that a suppression applies to, either a `data-motion-ignore` attribute on the element or a time range in the config, each with a reason. Accepted findings are printed with their reason but never fail the run. A suppression without a reason accepts nothing, and a film may accept at most 8 different findings (`maxAccepted` in the config).
- **Baseline**: a saved copy of a film's measurements, stored by `mographc baseline save`, usually when a person approves the film. The `regression/` rules compare the current film with its baseline.

---

[Documentation index](README.md)
