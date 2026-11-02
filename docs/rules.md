# Rules reference

Every built-in rule, with what it checks, why it matters and how to fix a finding. `mographc explain <rule>` prints the same text. Compiler rules always run. The others are in the `recommended` preset with the default severity shown, and can be configured as described in [Configuring the linter](configuration.md).

This page is generated from the rules' docs by `npm run docs:rules`.

## continuity

### `continuity/jump`

Compiler rule, always on.

No element moves or changes size by more than 40 px at 1080p in a single frame when that change is also more than 4 times the largest change 2 to 3 frames before or after it (or 4 px at 1080p, if that is larger).

**Why:** A viewer sees a sudden jump in position or size as a glitch. It is almost always caused by two keyframes or two layouts that don't meet: a path that resumes from a different point than where it stopped, or a component replaced by another at a new position. For each frame, the rule takes the larger of how far the element's centre moved and how much the diagonal of its box changed (for a cursor, only how far it moved, because a cursor shrinking as it clicks is intended). Frames where the element is below 30% opacity, or where its text changed (typing, a counter), are skipped, and a jump spread over two neighbouring frames, as when a 30 fps animation is rendered at 60 fps, counts as one jump.

**Fix:** Go to the frames in the finding and make the motion before and after them start and end at the same position and size. If one element replaces another, start the new one exactly where the old one ends.

### `continuity/flicker`

Compiler rule, always on.

No element is visible for 0.07 s or less (2 frames at 30 fps) and never again.

**Why:** An element that is on screen for only a frame or two is too brief to read but long enough to notice, so it looks like a glitch. The rule counts an element as visible in a frame when it is above 30% opacity and its visible part covers more than 0.3% of the canvas. It reports an element whose visible frames form a single unbroken run of 0.07 s or less, and that is present in the film, visible or not, for at most 2 frames longer than that.

**Fix:** Check the conditions that show the element at that time. Usually the end of a frame range is off by one, or an element's exit and the next element's entrance overlap by a frame.

## layout

### `layout/text-cut`

Compiler rule, always on.

Text that stays still for 0.5 s or longer has at least 85% of its area visible, not cut off by its own box, a container that clips it, or the edge of the canvas.

**Why:** Words that are cut off look like a layout bug, and on a phone they can't be read at all. The rule checks every text and headline in each frame where it is above 50% opacity and moves less than 0.5 px from the previous frame. It compares the area of the text's glyphs that is visible with the full area of the glyphs, and reports a run of such frames lasting 0.5 s or longer in which less than 85%, but more than none, is visible. Text that is cut off only while it moves, such as text scrolling past, is not reported.

**Fix:** Give the container room for its text (make it wider or taller, or the type smaller), move the text inside the visible area, or pan so the whole text is visible before it stops moving.

### `layout/text-overlap`

Compiler rule, always on.

Two different texts above 20% opacity never overlap by 30% or more of the smaller one's area for 0.1 s or longer (and at least 3 frames), unless an opaque background behind the upper text covers the overlap.

**Why:** Overlapping words can't be read, even if they overlap only briefly, and the overlap looks like a glitch. It happens most often when one message replaces another: the old one fades out in the same place the new one fades in, a line slides under another, or labels are stacked on each other. Words or letters set as separate pieces side by side on one line count as one text, and identical texts or texts nested inside each other are not compared.

**Fix:** Let the old text leave before the new one appears, move one out of the other's way (for example, push the old line up and off), or put the new text on an opaque background that covers the old one.

### `layout/subject-off-canvas`

Compiler rule, always on.

A tagged element (other than a cursor) that is shown above 50% opacity for at least 0.5 s has its centre on the canvas in at least one of those frames.

**Why:** A tagged element is one the film is about, so if it is never on screen the viewer sees nothing where something was meant to be. Being off the canvas for part of the time, such as before an entrance or after an exit, is fine; the rule only reports an element whose centre is outside the canvas in every frame where it is above 50% opacity.

**Fix:** Check the element's position. A coordinate is probably in the wrong space (canvas coordinates used inside a scaled or moved parent), or the animation that brings it onto the canvas never runs.

### `layout/unbalanced-space`

Default: warn.

Text that isn't inside a surface (a window, card or panel), such as a caption or headline, either has a larger side gap of no more than 1.6 times the smaller one, or has its left or right edge within 10 px at 1080p of another element's edge or centre, or of the canvas's.

**Why:** Viewers notice the space on each side of a line of text. Equal space, or an edge lined up with something else, looks intentional; uneven space with nothing to line up with looks accidental. For text of at least two words that has moved less than 2 px since the previous frame, the rule measures the gap from its left and right edges to the nearest element beside it at the same height, or to the canvas edge; small elements within one font size of the text and no more than twice its height, such as a logo beside a name, count as part of it. It reports when the larger gap is at least 24 px at 1080p and more than 1.6 times the smaller, nothing lines up, the text isn't centred on the canvas, and this lasts at least 0.5 s.

**Fix:** Centre the text between the elements on either side of it (or the canvas edge), or move it so its left or right edge lines up with the edge or centre of another element. The finding gives both gaps.

| Option    | Default | What it controls                                                                                                                           |
| --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `ratio`   | `1.6`   | How many times larger one side gap may be than the other before the text counts as unbalanced.                                             |
| `align`   | `10`    | How close, in px at 1080p, an edge of the text must be to another element's edge or centre, or the canvas's, to count as lined up with it. |
| `seconds` | `0.5`   | The shortest time, in seconds, the problem must last to be reported.                                                                       |
| `minGap`  | `24`    | The smallest size, in px at 1080p, the larger gap must have for the text to be checked.                                                    |

## assets

### `assets/missing-image`

Compiler rule, always on.

Every image in the film loads when the frames are rendered.

**Why:** An image that fails to load is drawn as nothing, or as the browser's broken-image icon, so the viewer sees an empty space or an obvious error. The rule reports every element whose image the browser marked as failed to load in any frame.

**Fix:** Check the image's path. Reference files in `public/` with `staticFile()`, and make sure the file exists when the film is rendered.

### `assets/fallback-font`

Compiler rule, always on.

All text is drawn in the font its CSS declares, never in a fallback font because the declared font didn't load.

**Why:** A fallback font changes the width of every line and the look of the brand, so a layout designed for the real font breaks. The rule reports each declared font family that the browser replaced with a fallback in any frame, with the first and last frame where that happened.

**Fix:** Load the font before the frames render: call `loadFont()` from `@remotion/google-fonts`, or load a `FontFace` and pause rendering with `delayRender` until it has loaded.

## easing

### `easing/linear`

Default: error.

A move that ends on the canvas speeds up at its start or slows down at its end: its ease-in or its ease-out is at least 0.24, where 0.20 means constant speed.

**Why:** Real objects speed up and slow down, so a window or card that travels at one constant speed and stops at full speed looks mechanical. The ease-in is the share of the move's time spent covering its first 20% of distance, and the ease-out the share spent on its last 20%; both are 0.20 at constant speed. The rule checks moves of at least 0.2 s and 60 px at 1080p that end with the element still on the canvas, ignoring cursors and elements carried along by a moving parent.

**Fix:** Drive the move with an easing curve instead of `interpolate` with no `easing`: use ease-in-out for a move between two positions where the element is still, and ease-out for an element that arrives fast from off the canvas.

### `easing/weak-out`

Default: error.

A move that ends on the canvas has an ease-out of at least 0.40 if it lasts 0.8 s or more, 0.33 if it lasts 0.4 to 0.8 s, and 0.26 if it is shorter, where 0.20 means constant speed.

**Why:** A long move that barely slows down before it stops looks as if it was stopped by force rather than coming to rest, while a very short move needs little slowing down to look natural. The ease-out is the share of the move's time spent covering its last 20% of distance. Below the target the finding is a warning; below a lower minimum (0.30, 0.26 and 0.22 for the same three durations) it is an error. Moves at nearly constant speed are reported by `easing/linear` instead.

**Fix:** Use a stronger ease-out curve, for example a cubic bezier whose last control point is around (0.1, 1) or (0.2, 1), or give the move more time to slow down at its end.

| Option        | Default | What it controls                                                                                                           |
| ------------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| `long`        | `0.4`   | The ease-out required for a move lasting 0.8 s or more (a share of the move's time, 0.20 being constant speed).            |
| `medium`      | `0.33`  | The ease-out required for a move lasting at least 0.4 s and under 0.8 s.                                                   |
| `short`       | `0.26`  | The ease-out required for a move lasting under 0.4 s.                                                                      |
| `floorLong`   | `0.3`   | For a move lasting 0.8 s or more, the ease-out below which the finding is an error rather than a warning.                  |
| `floorMedium` | `0.26`  | For a move lasting at least 0.4 s and under 0.8 s, the ease-out below which the finding is an error rather than a warning. |
| `floorShort`  | `0.22`  | For a move lasting under 0.4 s, the ease-out below which the finding is an error rather than a warning.                    |

### `easing/no-ease-in`

Default: warn.

A move that starts on the canvas, ends on the canvas, lasts at least 0.4 s and averages under 750 px/s has an ease-in of at least 0.12.

**Why:** An element that goes from standing still to full speed in a single frame looks as if it was struck. Starting at full speed is acceptable when the viewer can't see the start (the element enters from off the canvas) or when the move is fast. The ease-in is the share of the move's time spent covering its first 20% of distance; it is 0.20 at constant speed and near 0 when the move starts at full speed.

**Fix:** Use an ease-in-out curve instead of an ease-out curve for a move that starts where the viewer can see the element standing still.

### `easing/abrupt-stop`

Default: error.

A move that ends on the canvas is slower than 120 px/s on its last moving frame, or at most 60% of its speed three moving frames earlier.

**Why:** If the last frames of a move are as fast as the frames before them, the element stops all at once, as if it hit something. The rule compares the speed on the last frame where the element moves at least 1 px with its speed three such frames earlier.

**Fix:** End the move with an ease-out curve. Also check that the move isn't cut short: an `interpolate` input range or a `Sequence` that ends before the easing curve reaches its end stops the element at full speed.

### `easing/stutter`

Default: error.

During a move, the speed on any one frame never drops below 35% of the slower of the frames on either side when both of those are moving at 450 px/s or more.

**Why:** When the speed drops almost to zero for a frame in the middle of a fast move, the element looks like it hesitates. This usually means two animations run one after the other or are added together, for example a layout change followed by a transform, or two `interpolate` ranges that meet without overlapping.

**Fix:** Drive the whole motion from one progress value, or overlap the two animations so the speed never drops between them.

### `easing/edge-reversal`

Default: error.

When a surface (a window, card or panel) covering at least 3% of the canvas moves, each of its edges that travels 40 px or more at 1080p never moves backwards by more than 12 px at 1080p or 3% of its travel, whichever is larger.

**Why:** When a surface's scale and its layout size are animated separately, an edge can first move the opposite way to its travel, or go past its final position and come back. The viewer sees a wobble that isn't in the easing curve. The rule follows the left, right, top and bottom edges of the surface's visible rectangle through each move of at least 0.2 s and 60 px at 1080p, and measures the largest distance an edge moves back against its overall direction.

**Fix:** Animate the surface's on-screen rectangle itself (x, y, width and height on one easing curve) and compute any scale or clipping from it, instead of easing scale and size separately.

### `easing/harsh-settle`

Default: error.

An element other than a cursor or text that starts a move on the canvas and stops on the canvas slows down by no more than 18,000 px/s² at 1080p after reaching its top speed (an error above 27,000 px/s²).

**Why:** A card that crosses the canvas in a third of a second has to lose all that speed in a few frames, so it stops abruptly even on an ease-out curve. Viewers judge an object's mass by how long it takes to stop, and only a cursor is light enough to stop that quickly. The rule averages the element's speed over about a fifteenth of a second and measures the largest drop in speed per second after the peak, in px/s² at 1080p. Moves that start off the canvas and elements smaller than 0.2% of the canvas are not checked, because the viewer doesn't see the whole move.

**Fix:** Give the move more time (a move across half the canvas needs about 0.6 to 0.9 s), shorten its path, or use an easing curve that spends longer slowing down, such as a cubic bezier (0.16, 1, 0.3, 1) over more frames.

| Option       | Default | What it controls                                                                               |
| ------------ | ------- | ---------------------------------------------------------------------------------------------- |
| `warnAbove`  | `18000` | The deceleration, in px/s² at 1080p, above which the rule reports a warning.                   |
| `errorAbove` | `27000` | The deceleration, in px/s² at 1080p, above which the finding is an error instead of a warning. |

## cursor

### `cursor/no-stretch`

Default: error.

On frames where a cursor moves at 900 px/s or more, it is stretched to at least 1.06 along its direction of travel, on at least half of those frames.

**Why:** Stretching a fast-moving object along its direction of travel is a standard animation technique (squash and stretch) that makes the object look like it has mass and speed. Without it, a fast cursor looks rigid. Stretch is the cursor's long side divided by its short side after all its transforms. The rule reports a cursor when at least 3 of its fast frames, and at least half of them, are stretched less than the threshold.

**Fix:** Scale the cursor along its direction of travel in proportion to its speed, rotated to the angle of travel, and smooth the scale over a few frames. For example, scale it by `1 + min(0.22, speed / 300)`.

| Option    | Default | What it controls                                                                               |
| --------- | ------- | ---------------------------------------------------------------------------------------------- |
| `speed`   | `900`   | The speed, in px/s, at or above which a frame counts as fast and the cursor must be stretched. |
| `stretch` | `1.06`  | The minimum stretch (long side divided by short side) required on a fast frame.                |

### `cursor/dead-exit`

Default: error.

A cursor that disappears more than one frame before the film ends has its centre outside the canvas on its last frame, so it leaves past an edge.

**Why:** A cursor that fades out or vanishes in the middle of the canvas ends its motion abruptly, and the viewer doesn't see where it went. Moving it off the edge of the canvas completes the motion, the way a person moves a mouse away.

**Fix:** After the cursor's last click, move it off the nearest edge of the canvas with a short, fast move that eases in, instead of fading it out.

### `cursor/pops-in`

Default: error.

A cursor that first appears after the film's first frame has its centre outside the canvas on that frame, so it enters from an edge.

**Why:** A cursor that suddenly appears in the middle of the canvas looks like a jump in the video. Entering from an edge shows it arriving, the way it does when a person moves a mouse onto the screen.

**Fix:** Start the cursor's path outside the canvas, past the edge nearest its first target, and move it in.

### `cursor/low-contrast`

Default: error.

A cursor never spends 0.1 s or longer over a background whose WCAG contrast ratio with the cursor's fill, outline and drop shadow is below 1.6:1.

**Why:** A cursor the same colour as the bar, button or card under it disappears at the moment it matters most, when it points at something. On each frame where the cursor is at least 50% opaque, the rule takes the topmost background colour under the cursor's tip (or under a point 30% in from its top-left corner when it has no tip) and computes the WCAG contrast ratio with the cursor's fill. An outline or drop shadow that meets the ratio is enough.

**Fix:** Change what's under the cursor (give the hovered element a different colour, or a hover state that lightens it), or point at a different spot. Keep the cursor's own colour, because the viewer recognises the cursor by that colour throughout the film.

| Option    | Default | What it controls                                                                                                                  |
| --------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ratio`   | `1.6`   | The minimum WCAG contrast ratio between the cursor and the background under it (1 means identical colours, 21 is black on white). |
| `seconds` | `0.1`   | How long, in seconds, the contrast must stay below the ratio before the rule reports it.                                          |

## pace

### `pace/activity`

Default: error.

On at least 60% of the film's frames, something changes over at least 1% of the canvas or text is typed or changes (a warning below 60%, an error below 45%).

**Why:** When nothing changes on screen, viewers tend to stop watching, and the film looks like a slideshow. Films that hold attention have something changing almost all the time: elements appearing one by one, the next element arriving, or a zoom toward what matters next. A frame counts as changing when elements covering at least 1% of the canvas move faster than 45 px/s at 1080p, resize, fade, change their text, appear or disappear, or when legible text of any size appears or changes (typing, a streamed reply; text typed a few letters at a time counts as changing for 0.2 s after each step). A number changing in place, such as a counter, only counts when it covers 1% of the canvas, and slow, steady movement (see `camera/creep`) doesn't count. The finding lists the longest still stretches; `mographc activity` shows what changes in each second of the film.

**Fix:** Split long sections into shorter ones that each show one thing, bring elements in one at a time instead of showing them complete, and bring in the next element while the viewer reads text. A slow zoom or drift doesn't count as change.

| Option       | Default | What it controls                                                                                |
| ------------ | ------- | ----------------------------------------------------------------------------------------------- |
| `share`      | `0.01`  | The minimum share of the canvas (0.01 is 1%) that must change for a frame to count as changing. |
| `warnBelow`  | `0.6`   | The share of frames (0.6 is 60%) that must be changing; below it the rule reports a warning.    |
| `errorBelow` | `0.45`  | The share of changing frames below which the finding is an error instead of a warning.          |

### `pace/dead-air`

Default: error.

The film never goes more than 1.0 s without something changing over at least 1% of the canvas or text being typed or changing (an error after 2.0 s), except for a still ending of up to 2.5 s.

**Why:** A picture that stays frozen looks as if the video has stalled. A frame counts as changing when elements covering at least 1% of the canvas move faster than 45 px/s at 1080p, resize, fade, change their text, appear or disappear, and when legible text of any size appears or changes (typing, a streamed reply; text typed a few letters at a time counts as changing for 0.2 s after each step). A number changing in place, such as a counter, only counts when it covers 1% of the canvas. A slow zoom or drift doesn't count, because it doesn't show the viewer anything new. The end of the film, for example a logo or end card, may stay still for up to 2.5 s.

**Fix:** Add change to the still stretch (bring in the next element, reveal a detail, or animate part of what's shown), zoom toward the next thing that matters with an eased move, or start the next section sooner.

| Option       | Default | What it controls                                                                                |
| ------------ | ------- | ----------------------------------------------------------------------------------------------- |
| `share`      | `0.01`  | The minimum share of the canvas (0.01 is 1%) that must change for a frame to count as changing. |
| `warnAfter`  | `1`     | The longest time, in seconds, the film may go without change before the rule reports a warning. |
| `errorAfter` | `2`     | The time, in seconds, without change after which the finding is an error instead of a warning.  |
| `endHold`    | `2.5`   | How long, in seconds, the film may stay unchanged at its very end without a finding.            |

### `pace/long-shot`

Default: warn.

At least every 3.5 s, something changes substantially over at least 8% of the canvas.

**Why:** When the same layout stays on screen while three things happen in it one after another, the film feels like a slideshow. Three short sections that each show one thing keep the film moving and give each idea its own moment. A change counts as substantial when an element moves faster than 45 px/s at 1080p, resizes, appears, disappears, fades quickly or changes its text; small fades and slow drift don't count.

**Fix:** Give each thing the layout shows its own section, or zoom in on the part that changes and move across to the next element, instead of changing details inside a layout that stays still.

| Option      | Default | What it controls                                                                                                               |
| ----------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `bigChange` | `0.08`  | The minimum share of the canvas (0.08 is 8%) that must change substantially for a frame to count as a large change.            |
| `seconds`   | `3.5`   | The longest time, in seconds, allowed between two large changes (or between the start or end of the film and the nearest one). |

### `pace/text-hold`

Default: warn.

Each headline stays fully visible for at least 1 second per 3.5 words, and never less than 0.5 s.

**Why:** Viewers need time to read a line, and the time it spends animating in doesn't count because its words aren't all there yet. A line that leaves as soon as it is fully visible is noticed but not read. The rule measures the time from the first to the last frame in which every letter of the headline is on screen above 95% opacity, and counts words by splitting the text at spaces.

**Fix:** Keep the line fully visible for longer before it leaves, or use fewer words.

| Option           | Default | What it controls                                                                                                   |
| ---------------- | ------- | ------------------------------------------------------------------------------------------------------------------ |
| `wordsPerSecond` | `3.5`   | The assumed reading speed, in words per second. A headline needs its word count divided by this number of seconds. |
| `minimum`        | `0.5`   | The shortest time, in seconds, any headline must stay fully visible, however few words it has.                     |

### `pace/text-never-finishes`

Default: error.

Every headline is fully visible, with all its letters on screen above 95% opacity, in at least one frame before it leaves.

**Why:** A line that starts leaving before its last word has appeared is never seen whole, so it can't be read. Headlines on screen for fewer than 7 frames are not checked.

**Fix:** Start the headline's exit only after its last word has fully appeared, and keep it fully visible long enough to read (see pace/text-hold).

## staging

### `staging/small-action`

Default: warn.

While a surface covering 25% to 95% of the canvas is visible, the substantial changes on screen are not all inside one region of 6% of the canvas or less for 0.8 s or longer. When they are, the view should zoom in on that region.

**Why:** If someone is typing in an input at the bottom of a large, otherwise empty window, the viewer has nothing to look at in the rest of the canvas, and the text being typed is small. Zooming in on the input makes it large and shows only what matters. The rule takes, on each frame, the rectangle around everything that moves faster than 45 px/s at 1080p, resizes, appears, disappears, fades quickly or changes its text, and checks whether a surface (a window, card or panel) covering 25% to 95% of the canvas is visible at the same time.

**Fix:** Zoom in by scaling the whole film's content about the region that's changing, or crop to it, then zoom back out when something happens elsewhere. The finding gives the region's size and position in px.

| Option    | Default | What it controls                                                                                   |
| --------- | ------- | -------------------------------------------------------------------------------------------------- |
| `region`  | `0.06`  | The largest share of the canvas (0.06 is 6%) the changing region may cover for the rule to apply.  |
| `surface` | `0.25`  | The smallest share of the canvas (0.25 is 25%) a visible surface must cover for the rule to apply. |
| `seconds` | `0.8`   | How long, in seconds, the change must stay inside a small region before the rule reports it.       |

### `staging/title-off-centre`

Default: error.

When the canvas shows only text and graphics (no surface or button), the centre of the group they form is within 16 px at 1080p of the canvas centre horizontally and within 64 px at 1080p vertically.

**Why:** With nothing else on screen, viewers judge the position of a title against the edges of the canvas, so a title a few dozen pixels off centre looks like a mistake. The rule checks frames where no surface (a window, card or panel) covering more than 0.2% of the canvas and no button is above 30% opacity. It takes the bounding box of every other element above 30% opacity that covers less than half the canvas, skips frames with fewer than two such elements or a group wider than 80% of the canvas, and reports an offset that lasts at least 0.33 s. The vertical tolerance is larger because a title with a tagline below it is often placed slightly above centre on purpose.

**Fix:** Move the group by the offset the finding gives. Centre the visible letters and graphics rather than their layout box, because an icon, a gap or letter spacing inside the box can shift where the content actually sits.

| Option      | Default | What it controls                                                                        |
| ----------- | ------- | --------------------------------------------------------------------------------------- |
| `tolerance` | `16`    | How far, in px at 1080p, the group's centre may be from the canvas centre horizontally. |
| `vertical`  | `64`    | How far, in px at 1080p, the group's centre may be from the canvas centre vertically.   |

### `staging/no-padding`

Default: error.

When a surface (a window, card or panel) covering 12% to 90% of the canvas is standing still, the text inside it is at least 14 px at 1080p from its visible edges, and at most one line of that text is cut off by them.

**Why:** A window whose content touches or runs past its edges looks broken, even if the real product does that at its own size. The rule looks at text smaller than 40 px at 1080p and above 50% opacity inside a surface above 90% opacity, and measures the smallest distance from that text to the surface's visible edges; a line counts as cut off when less than 90% of it is visible. It only checks frames where the surface and the text have each moved 1 px or less since the previous frame, because a page scrolling past an edge is motion rather than a layout problem, and it reports problems that last at least 0.5 s.

**Fix:** Add padding between the surface's edge and its content, or move or zoom the view (pan, or zoom in slightly less) so the content sits inside the surface with room around it.

| Option  | Default | What it controls                                                                                              |
| ------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| `inset` | `14`    | The smallest distance, in px at 1080p, allowed between text and the visible edge of the surface it is inside. |

### `staging/text-too-small`

Default: error.

While a surface (a window, card or panel) covers 25% to 95% of the canvas, the median font size of the text inside it is at least 14 px at 1080p; stretches shorter than 1 s are ignored.

**Why:** Product videos are often watched on phones, where smaller text can't be read. A whole page shrunk to fit the canvas shows that the page exists, but nobody can read it. The rule takes the text inside surfaces above 90% opacity that is above 50% opacity and smaller than 40 px at 1080p, and only checks frames with at least 12 such pieces of text. The first stretch of small text is reported as a warning instead of an error if it lasts 1.5 s or less, so one short full view of a page to show its size is allowed.

**Fix:** Zoom in on the part of the surface that matters and pan or scroll through it, instead of shrinking the whole surface to fit the canvas.

| Option         | Default | What it controls                                                                                                |
| -------------- | ------- | --------------------------------------------------------------------------------------------------------------- |
| `minSize`      | `14`    | The smallest median font size, in px at 1080p, allowed for the text inside a large surface.                     |
| `briefSeconds` | `1.5`   | The longest time, in seconds, the first stretch of small text may last and still be reported only as a warning. |

### `staging/text-over-product`

Default: error.

A headline never lies partly over a surface (a window, card or panel) for 0.2 s or longer, where partly means that 5% to 85% of the headline's area is over the surface.

**Why:** Text that cuts across an interface looks like a layout mistake and makes both the words and the product harder to read. The rule compares each headline with every surface above 25% opacity that covers 2% to 90% of the canvas. A headline inside the surface, and a box drawn by the headline's own component (such as a highlight behind its words), don't count.

**Fix:** Give the headline its own area of the canvas, or move the surface off screen before the headline appears (or the headline before the surface appears).

| Option    | Default | What it controls                                    |
| --------- | ------- | --------------------------------------------------- |
| `seconds` | `0.2`   | The shortest overlap, in seconds, that is reported. |

### `staging/double-exposure`

Default: warn.

When one surface (a window, card or panel) fades in or out over another, the two are not both above 35% opacity for 3 frames or more.

**Why:** When two large surfaces are both clearly visible while one fades over the other, the viewer sees two things at once and can take in neither. The rule looks at surfaces that cover 6% to 95% of the canvas, aren't inside one another, and overlap by at least 30% of the smaller one's area. It counts frames where both are above 35% opacity, at least one is below 98%, and at least one changed opacity by more than 0.02 since the previous frame.

**Fix:** Fade or move the outgoing surface out faster, or start the incoming one later, so one is mostly gone before the other is mostly visible. Alternatively, animate one surface changing into the next instead of crossfading the two.

### `staging/top-banner`

Default: warn.

No headline starts in the top 19% of the canvas height while also being wider than 47% of the canvas width.

**Why:** A wide, single-line headline across the top of the canvas, with the product below it, looks like a subtitle added afterwards rather than part of the design. The rule uses each headline's box in the middle of the time it is fully visible.

**Fix:** Place the headline in its own area beside or around the main element on screen, or break it onto more lines so it is narrower than 47% of the canvas.

## camera

### `camera/creep`

Default: error.

Elements covering at least 3% of the canvas don't move or zoom slowly (slower than 45 px/s at 1080p and under 0.6% of their size per frame) for 1.2 s or longer.

**Why:** A slow, steady zoom or pan makes the picture move without showing the viewer anything new, so it looks like filler. A zoom or pan should go toward something, such as the part of the canvas where something is happening, with an eased curve, and then come to rest. The slow end of a real move that just happened is not reported. `pace/activity` and `pace/dead-air` don't count this slow movement as change.

**Fix:** Replace the slow movement with real change (bring in the next element, or reveal a detail), or make it an eased zoom or pan toward something specific that then comes to rest.

| Option    | Default | What it controls                                                                             |
| --------- | ------- | -------------------------------------------------------------------------------------------- |
| `seconds` | `1.2`   | How long, in seconds, the slow movement must last before the rule reports it.                |
| `area`    | `0.03`  | The minimum share of the canvas (0.03 is 3%) the slowly moving elements must cover together. |

## attention

### `attention/unread-text`

Default: error.

A caption (large text that isn't inside a box with a background or border) stays on screen until the simulated viewer, reading 3.5 words a second, has read at least 70% of its words, and other text that the viewer starts reading stays until it has read at least 70% of it.

**Why:** A viewer reads about 3.5 words a second, and only where they are looking. Text that is on screen long enough on its own can still go unread when something else draws the eye while it's there, and when text leaves before it has been read, the film feels too fast. The rule follows each line of text from when it appears until it leaves and counts the words the simulated viewer read. A caption is text at least 32 px tall at 1080p, not in a code font, and never inside a box with a background or border (other than a backdrop the size of the canvas); all other text is treated as part of the product being shown, such as a window, card or panel. A caption is an error when at least 1 word and at least 30% of its words are unread; other text is a warning, and only when the viewer started reading it, it has at least 3 words, it didn't arrive as part of a block of more than 12 words (which the viewer skims), and at least 2 words and 30% of its words are unread. Text on screen for less than 0.4 s, or still on screen at the end of the film, is not checked.

**Fix:** Give the text time on its own, with nothing else new on screen while it is read: keep the product still, or let the action finish first. Otherwise use fewer words or show the text for longer. If the text doesn't need to be read, make it smaller or replace it with placeholder lines instead of words.

| Option       | Default | What it controls                                                                                                                                                |
| ------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minSeconds` | `0.4`   | Text on screen for less time than this, in seconds, is not checked.                                                                                             |
| `share`      | `0.3`   | The share of a text's words, from 0 to 1, that may go unread; a finding needs at least this share unread (and at least 1 word for a caption, 2 for other text). |

### `attention/competing`

Default: error.

In at most 15% of the film's frames are there two unread texts, more than 15% of the canvas width apart, that are both waiting to be read (a warning above 15% of frames, an error above 25%).

**Why:** A viewer reads one place at a time. When a caption appears while a message types out elsewhere, the viewer can't read either properly and feels rushed. Using the simulated viewer, a text is waiting to be read when it appeared or changed in the last 1.5 s, has at least 2 words, and hasn't been read yet. In the films we measured, the ones people approved had two such texts in different places about 10% of the time, and the ones people found overwhelming had them 18% to 36% of the time. When the film is over the limit, each stretch of 0.4 s or longer where this happens is also reported as a warning naming the two texts.

**Fix:** Show the texts one after the other: let the viewer finish one (at 3.5 words a second) before the next appears or changes, or show one idea as an action on screen instead of in words. Two short texts can be on screen together if one of them has already been read.

| Option       | Default | What it controls                                                                                                                                    |
| ------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `warnAbove`  | `0.15`  | Share of the film's frames, from 0 to 1, with two texts waiting to be read in different places, above which the rule reports a warning.             |
| `errorAbove` | `0.25`  | Share of the film's frames, from 0 to 1, above which the finding is an error instead of a warning.                                                  |
| `place`      | `0.15`  | How far apart two texts' centres must be, as a share of the canvas width from 0 to 1, to count as being in different places.                        |
| `seconds`    | `0.4`   | Shortest stretch, in seconds, of two texts waiting to be read at once that gets its own finding naming them (only when the film is over warnAbove). |

## framing

### `framing/ambiguous-crop`

Default: warn.

Each edge of a large surface (a window, card or panel) that is standing still is either at least 32 px at 1080p inside the canvas edge, or past the canvas edge by more than 6% of the surface's width (left and right edges) or height (top and bottom edges).

**Why:** A surface with space around it looks deliberately placed, and one that runs well past the canvas edge looks like a deliberate close-up. An edge just inside the canvas or just past it looks like a mistake, as if the surface didn't quite fit. The rule checks surfaces above 90% opacity that cover at least 15% of the canvas and have moved or resized by less than 2 px since the previous frame, and reports an edge that stays in between for at least 0.5 s.

**Fix:** Either zoom out or move the surface until the edge is at least the required distance inside the canvas, or zoom in until the edge is well past the canvas edge.

| Option    | Default | What it controls                                                                                                                                                                 |
| --------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `room`    | `32`    | The smallest distance, in px at 1080p, a surface's edge must be inside the canvas edge.                                                                                          |
| `crop`    | `0.06`  | How far past the canvas edge a surface's edge must be to count as clearly cut off, as a fraction of the surface's width (left and right edges) or height (top and bottom edges). |
| `subject` | `0.15`  | The smallest fraction of the canvas (0.15 is 15%) a surface must cover to be checked.                                                                                            |
| `seconds` | `0.5`   | The shortest time, in seconds, an edge must stay in between to be reported.                                                                                                      |

## animate

### `animate/fade-only`

Default: warn.

A surface (a window, card or panel) that fades in or out also moves at least 6 px or changes its width by at least 4% during the fade, rather than only changing opacity.

**Why:** A large surface that only fades while standing still looks unfinished next to elements that move. The rule finds each fade in which a surface's opacity rises from 15% or less to 85% or more on consecutive frames (or falls the other way), and compares the surface's position and width at the start and end of the fade. It ignores surfaces that cover 3% of the canvas or less, and when surfaces inside one another fade together it reports only the outermost one.

**Fix:** Add a small move (6 px or more) or scale (4% or more) to the entrance or exit, with the same timing and easing as the fade.

### `animate/pop-in`

Default: warn.

An element at least as large as a 70 × 70 px square at 1080p does not appear in a single frame at 80% opacity or more inside a container element that is standing still.

**Why:** Something that becomes fully visible from one frame to the next while everything around it stays still looks like a jump in the video rather than the product responding. The rule checks each element on the frame it first appears, except cursors and elements already on screen in the film's first frame. It reports the element when it is at 80% opacity or more, its visible area is at least 70 × 70 px at 1080p, and its parent element was already on screen in the previous frame and moved less than 0.5 px.

**Fix:** Fade, scale or slide the element in over several frames, or bring it in together with its container so they arrive as one.

### `animate/pop-out`

Default: error.

An element at least as large as a 70 × 70 px square at 1080p does not disappear in a single frame while it is at 80% opacity or more and its container element stays on screen and still.

**Why:** Something that vanishes at full opacity while nothing around it moves looks like a glitch, because the viewer may have been looking at it and it is suddenly gone. The rule checks an element's last frame: it reports it when, over the preceding 0.1 s, it lost no more than 10% opacity and moved or resized by no more than 4 px at 1080p, while its nearest container element stays above 30% opacity and moves less than 0.5 px in the next frame. It skips cursors, elements still on screen at the end of the film, elements replaced within 0.1 s by an identical copy or by new content in the same place, and frames where more than half of the visible elements disappear together, which is a change of scene.

**Fix:** Fade, scale or slide the element out over several frames, or let it leave together with its container (for example, the window moving off screen, or a change to the next scene).

| Option   | Default | What it controls                                                                                                                                                                                                                                 |
| -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `size`   | `70`    | The side, in px at 1080p, of the smallest square whose area an element must cover to be checked.                                                                                                                                                 |
| `settle` | `0.1`   | The time, in seconds, before an element's last frame during which it must have stayed still and fully visible for the rule to apply (at least 2 frames). New content that arrives where the element was within this time counts as replacing it. |

## regression

### `regression/content-removed`

Default: error. Runs only when a [baseline](baselines.md) exists.

Compared with the saved baseline, while each headline is on screen the film shows the same smaller texts (under 40 px, such as labels and list rows) as the baseline did, with at most one of them missing.

**Why:** Labels, list rows or sidebar sections that disappear from a part of the film a person already approved make that part emptier, and that is rarely a change anyone meant to make. The rule pairs each headline in the film with the same headline in the baseline, in order, allowing for rewording (at least 50% of letters in common). For each pair it lists the texts in the baseline that are longer than 3 characters, have a font size under 40 px, are above 50% opacity and are on screen in at least 25% of the headline's time on screen (checked every second frame), and reports the ones the film no longer shows during its headline's time. A shortened text that keeps at least 60% of the original's length still counts as shown. Parts of the film where no headline is on screen are not compared.

**Fix:** Restore the missing texts. If removing them was intended, accept the finding with a time range and a reason in the config, or save a new baseline with `mographc baseline save`. When more than 40% of the baseline's texts are missing, that part of the film was probably redesigned rather than trimmed, so the finding is only a warning asking a person to look at the new version.

### `regression/cursor-smaller`

Default: error. Runs only when a [baseline](baselines.md) exists.

Compared with the saved baseline, neither the film's largest cursor nor its smallest cursor is more than 10% smaller than the largest or smallest cursor in the baseline.

**Why:** The cursor is often the element the viewer follows, so making it smaller without a reason makes it harder to follow. A cursor's size is the median, over the frames it is in, of the longer side of its box in px. The rule compares the largest cursor in the film with the largest in the baseline, and the smallest with the smallest.

**Fix:** Restore the cursor's size from the baseline. If the change was deliberate, accept the finding with a time range and a reason in the config, or save a new baseline with `mographc baseline save`.

| Option      | Default | What it controls                                                                                                               |
| ----------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `tolerance` | `0.1`   | How much smaller than in the baseline a cursor may be, as a share of the baseline's size from 0 to 1 (0.1 allows 10% smaller). |

### `regression/less-stretch`

Default: error. Runs only when a [baseline](baselines.md) exists.

Compared with the saved baseline, the cursors' stretch while moving fast (averaged over the fastest 10% of frames at 600 px/s or more) is no more than 0.04 lower than in the baseline.

**Why:** Stretching a fast cursor along its direction of travel makes its speed easier to follow; with less stretch than the version a person approved, a fast cursor looks stiffer. The rule takes every frame in which a cursor moves at 600 px/s or more, keeps the 10% of those frames with the most stretch (at least one), and averages their stretch. With no such frames the value is 1, meaning no stretch.

**Fix:** Restore the stretch from the baseline, and check that the cursor still moves as fast as it did, since slower moves have no frames to measure.

### `regression/weaker-ease-out`

Default: error. Runs only when a [baseline](baselines.md) exists.

Compared with the saved baseline, the main move while each headline is on screen has an ease-out strength no more than 0.05 lower than the same move in the baseline.

**Why:** When the same move slows down less before it stops than it did in the version a person approved, people notice the film got worse even if they can't say why. The rule pairs each headline in the film with the same headline in the baseline, in order, allowing for rewording. For each, the main move is the move by the largest element (by visible area, and covering more than 5% of the canvas, cursors excluded) that starts between 10 frames before the headline appears and when it leaves, lasts at least 0.25 s, travels more than 80 px, and ends with the element on the canvas. The rule compares the ease-out strength (the share of the move's time spent covering its last 20% of distance) of the two main moves.

**Fix:** Restore the easing curve from the baseline on that move, so it spends as much of its time slowing down before it stops.

---

[Documentation index](README.md)
