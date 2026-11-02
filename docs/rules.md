# Rules reference

Every built-in rule, with what it checks, why it matters and how to fix a finding. `mographc explain <rule>` prints the same text. Compiler rules always run. The others are in the `recommended` preset with the default severity shown, and can be configured as described in [Configuring the linter](configuration.md).

This page is generated from the rules' docs by `npm run docs:rules`.

## continuity

### `continuity/jump`

Compiler rule, always on.

No element moves or resizes far more in one frame than in the frames around it.

**Why:** A viewer sees a sudden jump as a glitch. It is almost always caused by two keyframes or two layouts that don't meet: a path that resumes from a different point than where it stopped, or a component swapped for another at a new position.

**Fix:** Find the frame in the finding and make the motion before and after it start and end at the same point. If one element hands off to another, start the second exactly where the first ends.

### `continuity/flicker`

Compiler rule, always on.

Nothing appears for only a frame or two.

**Why:** An element that is on screen for only a frame or two is too brief to read but long enough to notice, so it looks like a glitch.

**Fix:** Check the conditions that mount the element at that time. Usually a range boundary is off by one, or an exit and an entrance overlap by a frame.

## layout

### `layout/text-cut`

Compiler rule, always on.

Text that's held still is never cut off by its own box, a parent's clip or the canvas edge.

**Why:** Words that are cut off look like a layout bug, and on a phone they can't be read at all.

**Fix:** Give the container room for its text (wider, taller, or smaller type), move the text inside the visible area, or pan so the text is whole before you hold on it.

### `layout/text-overlap`

Compiler rule, always on.

Two different texts are never drawn on top of each other, whether by a crossfade in the same place, a line sliding under another, or labels stacked on each other.

**Why:** Overlapping words can't be read, even if they overlap only briefly, and the overlap looks like a glitch. It happens most often in handoffs, when an outgoing message fades out in the same place the incoming one fades in.

**Fix:** Let the outgoing text leave before the incoming one lands, move one out of the other's way (push the old line up and out), or put the incoming text on an opaque surface that covers the old one.

### `layout/subject-off-canvas`

Compiler rule, always on.

A tagged subject is on the canvas at some point while it's shown.

**Why:** If a tagged subject is never on screen, the shot shows nothing where something was meant to be. Waiting off screen before an entrance or after an exit is fine.

**Fix:** Check the subject's position; a coordinate is probably in the wrong space (canvas vs. a scaled parent), or its entrance never runs.

### `layout/unbalanced-space`

Default: warn.

Free text (a caption, a headline) is centred in the space it sits in, or lines up with something; it never floats at an unexplained offset.

**Why:** Viewers notice the space on each side of a line of text. Equal space, or an edge shared with the product, looks intentional. Uneven space with no alignment looks accidental.

**Fix:** Centre the text between what's on either side of it (the product's edge and the frame's), or align its edge with an edge of the product. The finding gives both gaps.

**Options:** `ratio` (default `1.6`), `align` (default `10`), `seconds` (default `0.5`), `minGap` (default `24`)

## assets

### `assets/missing-image`

Compiler rule, always on.

Every image loads.

**Why:** A broken image renders as nothing, or as the browser's broken-image box.

**Fix:** Check the path. Files in `public/` are referenced with `staticFile()`, and the file must exist at render time.

### `assets/fallback-font`

Compiler rule, always on.

Text renders in the font it asks for, never a fallback.

**Why:** A fallback font changes the width of every line and the look of the brand, so a layout tuned to the real font breaks.

**Fix:** Load the font before rendering: `@remotion/google-fonts` `loadFont()`, or a `FontFace` with `delayRender` until it has loaded.

## easing

### `easing/linear`

Default: error.

A move that comes to rest eases in and out instead of travelling at constant speed.

**Why:** Physical objects speed up and slow down, so a window or card that moves at constant speed and stops at full speed looks mechanical.

**Fix:** Drive the move with an eased curve (ease-in-out for a move between two rest points; ease-out for something arriving fast), not `interpolate` with no `easing`.

### `easing/weak-out`

Default: error.

The longer a move is, the more strongly it slows down at the end. A short flick needs little ease-out.

**Why:** A move that lasts a second but barely slows down at the end looks like it hits a wall. The rule measures the share of the move's time spent covering its last 20% of distance (0.20 for constant speed).

**Fix:** Use a stronger ease-out (e.g. a bezier ending around (0.1, 1) or (0.2, 1)), or lengthen the move's settle. Below the floor it's an error; between the floor and the target it's a warning.

**Options:** `long` (default `0.4`), `medium` (default `0.33`), `short` (default `0.26`), `floorLong` (default `0.3`), `floorMedium` (default `0.26`), `floorShort` (default `0.22`)

### `easing/no-ease-in`

Default: warn.

A slow move that starts from rest on screen eases in.

**Why:** An object that goes from standing still to full speed at once looks as if it was kicked. A fast start is only right when the start is hidden (the object enters from off screen) or the move is a quick flick.

**Fix:** Use ease-in-out instead of ease-out for moves that start visibly at rest.

### `easing/abrupt-stop`

Default: error.

A move slows down before it stops.

**Why:** If the last frames of a move are as fast as the frames before them, the object stops suddenly, as if it hit something.

**Fix:** End the move on an ease-out. Check that the move isn't cut short by a range that ends before its curve finishes.

### `easing/stutter`

Default: error.

A move is one continuous curve, with no stall in the middle.

**Why:** When the speed drops to almost zero in the middle of a move, the move looks like it hesitates. This usually means two animations are chained or added together (a layout change, then a transform; two ramps that don't overlap).

**Fix:** Drive the whole motion from one progress value, or overlap the two animations so the speed never collapses between them.

### `easing/edge-reversal`

Default: error.

Every edge of a moving surface travels one way, then settles.

**Why:** When a surface's scale and its layout change together, an edge can swell past where it lands and come back, or wind up against its travel. The result looks like a wobble that isn't in the easing curve.

**Fix:** Ease the surface's on-screen rectangle itself (x, y, width, height on one curve) and derive scale or clipping from it, instead of easing scale and size separately.

### `easing/harsh-settle`

Default: error.

A surface slows down gently as it lands, however far it travelled.

**Why:** A bubble or card that crosses the frame in a third of a second has to lose all that speed in a few frames, so it looks like it hits a wall even on an ease-out curve. Viewers read the time an object takes to stop as its weight, and only a cursor is light enough to stop that quickly. Measured as the peak deceleration while it lands, in px/s² at 1080p.

**Fix:** Give the move more time (duration grows with distance: a half-screen move wants 0.6–0.9 s), or a shorter path, or a curve with a longer tail (e.g. bezier(0.16, 1, 0.3, 1) over more frames).

**Options:** `warnAbove` (default `18000`), `errorAbove` (default `27000`)

## cursor

### `cursor/no-stretch`

Default: error.

A cursor moving fast stretches along its travel.

**Why:** Stretching a fast object along its direction of travel (squash and stretch, a standard animation technique) makes it look like it has weight. Without it, a fast cursor looks stiff.

**Fix:** Scale the cursor along its direction of travel in proportion to its speed (for example `1 + min(0.22, speed / 300)` per frame, smoothed), rotated to the travel angle.

**Options:** `speed` (default `900`), `stretch` (default `1.06`)

### `cursor/dead-exit`

Default: error.

A cursor leaves by moving off the canvas, not by fading where it stands.

**Why:** A cursor that fades out or vanishes where it stands ends its motion abruptly. Moving it off the canvas completes the motion and shows the viewer where it went.

**Fix:** After its last action, fling the cursor off the nearest edge (a short, fast, eased-in move) instead of fading it.

### `cursor/pops-in`

Default: error.

A cursor enters from off the canvas.

**Why:** A cursor that appears in the middle of the frame looks like a cut. Entering from the edge shows it arriving, the way it would when a person moves a mouse.

**Fix:** Start the cursor's path off the canvas edge nearest its first target.

### `cursor/low-contrast`

Default: error.

A cursor always stands out from what it's over.

**Why:** A cursor the same colour as the bar, button or chip under it disappears at the moment it matters most, when it points at something.

**Fix:** Change what's under the cursor (a different colour for the hovered element, or a hover state that lightens it), or point at a different spot. Keep the cursor's own colour, because the viewer recognises it by that colour throughout the film.

**Options:** `ratio` (default `1.6`), `seconds` (default `0.1`)

## pace

### `pace/activity`

Default: error.

Something meaningful is moving most of the time, so the film never plays like a slideshow.

**Why:** When nothing moves, viewers tend to stop watching. Films that hold attention have something changing almost all the time: a build, the next element arriving, or a camera move toward a subject. The rule measures the share of time at least 1% of the frame is changing, not counting slow drift (`camera/creep`).

**Fix:** Break long shots into back-to-back sections (three things to show are three beats, not one frame), build elements in rather than showing them complete, and bring the next element in while text is read. A slow zoom or drift does not count.

**Options:** `share` (default `0.01`), `warnBelow` (default `0.6`), `errorBelow` (default `0.45`)

### `pace/dead-air`

Default: error.

There is never more than about a second where nothing meaningful moves.

**Why:** A frame that stays frozen looks like the video has stalled. A slow zoom or drift isn't counted as movement, because it doesn't show the viewer anything new. The final hold on a logo or end card may be still.

**Fix:** Keep the shot alive with content (a build, a detail revealed, the next element arriving), make a deliberate eased camera move to the next subject, or cut to the next section sooner.

**Options:** `share` (default `0.01`), `warnAfter` (default `1`), `errorAfter` (default `2`), `endHold` (default `2.5`)

### `pace/long-shot`

Default: warn.

A shot is held for a few seconds at most before the composition changes.

**Why:** When one frame shows three things in turn, the film feels like a slideshow. Three short sections that each show one thing keep the film moving and give each idea its own moment.

**Fix:** Split the shot: give each thing it shows its own section, or move the camera (push in on what changes, pan to the next element) instead of changing details inside a still frame.

**Options:** `bigChange` (default `0.08`), `seconds` (default `3.5`)

### `pace/text-hold`

Default: warn.

A headline stays fully readable long enough to read: about 3.5 words a second, at least half a second.

**Why:** The time a line spends animating in doesn't count as reading time. A line that leaves as soon as it has fully appeared is noticed but not read.

**Fix:** Hold the line longer once it's fully shown, or cut words.

**Options:** `wordsPerSecond` (default `3.5`), `minimum` (default `0.5`)

### `pace/text-never-finishes`

Default: error.

Every headline fully appears before it leaves.

**Why:** A line that starts leaving before its last word lands is never read whole.

**Fix:** Start the exit after the last word has landed and been held.

## staging

### `staging/small-action`

Default: warn.

When the only thing happening is in a small part of a large still shot, the camera pushes in on it.

**Why:** If someone is typing in an input at the bottom of a big empty window, the eye has nothing to do with the rest of the frame. The shot should be on the input.

**Fix:** Push in (scale the composition about the action) or crop to the region that's changing, then pull back when the next thing happens elsewhere. The finding gives the region.

**Options:** `region` (default `0.06`), `surface` (default `0.25`), `seconds` (default `0.8`)

### `staging/title-off-centre`

Default: error.

A card with only type on it (an opening word, a title, an end lockup) is centred on the canvas.

**Why:** With nothing else in the frame, viewers judge the type's position against the frame's edges, so being a few dozen pixels off looks like a mistake.

**Fix:** Centre the group's measured glyphs, not its box: an icon, a gap or letter spacing shifts the visual centre. The finding gives the offset to correct.

**Options:** `tolerance` (default `16`), `vertical` (default `64`)

### `staging/no-padding`

Default: error.

Text sits inside its window with padding, never crammed against or cut by the edge.

**Why:** A window whose content touches its edges looks broken, even if the product does that at its own scale. The rule only checks frames where the window is held still, because a page scrolling past an edge is motion rather than framing.

**Fix:** Add padding between the window's edge and its content, or frame the window so the content sits inside it (pan, or zoom slightly less).

**Options:** `inset` (default `14`)

### `staging/text-too-small`

Default: error.

A product surface held on screen can be read on a phone, which means its body text is at least about 14 px at 1080p.

**Why:** Product videos are often watched on phones. A whole page shrunk to fit the frame shows that the page exists, but its text can't be read. One brief full view to show scale is fine.

**Fix:** Zoom in to the part that matters and move through it in place (pan or scroll toward a destination) instead of shrinking the whole surface to fit.

**Options:** `minSize` (default `14`), `briefSeconds` (default `1.5`)

### `staging/text-over-product`

Default: error.

Headline type never overlaps the product: no letter sits partly over a window or card.

**Why:** Type that cuts across the interface looks like a layout mistake, and makes both the words and the product harder to read.

**Fix:** Give the headline its own region of the frame, or clear the product before the type arrives (or the type before the product). A box drawn by the headline's own component is fine.

**Options:** `seconds` (default `0.2`)

### `staging/double-exposure`

Default: warn.

In a handoff, the outgoing surface is mostly gone before the incoming one is solid.

**Why:** When two large surfaces are both clearly visible while one fades over the other, the viewer has two subjects at once and takes in neither.

**Fix:** Fade or move the outgoing surface out faster, or start the incoming one later; or transform one surface into the next instead of crossfading.

### `staging/top-banner`

Default: warn.

Headlines are part of the composition, not a subtitle strip across the top.

**Why:** A one-line banner across the top, with the product filling the frame below, looks like a caption added afterwards rather than part of the shot.

**Fix:** Give the headline its own region beside or around the subject, sized to read at a glance.

## camera

### `camera/creep`

Default: error.

There is no slow, constant zoom or pan on the whole frame added just to keep it moving.

**Why:** A slow, constant zoom or pan makes the frame move without showing the viewer anything new, so it comes across as filler. A camera move should go to a subject (for example, push in on the action), ease, and settle. mographc doesn't count a creep as activity for `pace/activity`.

**Fix:** Keep the hold alive with content (build the next element in, reveal a detail, bring in the next beat) or make the camera move a deliberate eased push to a subject that then settles.

**Options:** `seconds` (default `1.2`), `area` (default `0.03`)

## attention

### `attention/unread-text`

Default: error.

Captions stay on screen until a viewer has read them, and product text that the viewer starts reading stays until they finish.

**Why:** A viewer reads about 3.5 words a second, and only where they're looking. A caption that's on screen long enough on its own can still go unread when something else holds the eye while it's up. When text leaves before it has been read, the film feels too fast.

**Fix:** Give the text time on its own, with nothing else new while it's read (hold the product still, or let the action finish first), fewer words, or more time. If the text doesn't matter, make it smaller or texture (lines instead of words).

**Options:** `minSeconds` (default `0.4`), `share` (default `0.3`)

### `attention/competing`

Default: error.

Two texts in different places rarely ask to be read at the same time.

**Why:** The eye reads one place at a time. When a caption appears while a message types out elsewhere, the viewer can't read either properly and feels rushed. In the films we measured, the ones people approved did this about 10% of the time, and the ones they found overwhelming did it a quarter of the time or more.

**Fix:** Show the texts one after the other: let one finish (its words at 3.5 a second) before the next one starts, or make one of them the visual (the action) and keep words out of it. Two short things side by side can share a moment only if one is already read.

**Options:** `warnAbove` (default `0.15`), `errorAbove` (default `0.25`), `place` (default `0.15`), `seconds` (default `0.4`)

## framing

### `framing/ambiguous-crop`

Default: warn.

A subject is either framed with room or clearly cropped by the frame, never just touching or barely cut by its edge.

**Why:** A subject with space around it looks deliberately placed, and one that is cropped deeply looks like a close-up. An edge just inside the frame, or just past it, looks like a mistake, as if the subject didn't quite fit.

**Fix:** Do one or the other: pull back until the edge has at least the room the finding gives, or push in until the frame clearly crops it.

**Options:** `room` (default `32`), `crop` (default `0.06`), `subject` (default `0.15`), `seconds` (default `0.5`)

## animate

### `animate/fade-only`

Default: warn.

A surface that arrives or leaves also moves, scales or builds, rather than only fading.

**Why:** A large surface that only fades in or out while standing still looks unfinished next to the elements that move.

**Fix:** Give the entrance or exit a small move or scale on the same curve as the fade, or build its contents in.

### `animate/pop-in`

Default: warn.

Content doesn't appear in a single frame on a container that's standing still.

**Why:** Something that appears at full opacity in one frame looks like a cut rather than the product responding.

**Fix:** Fade, scale or slide it in over a few frames, or build it with its container.

### `animate/pop-out`

Default: error.

Content doesn't vanish in a single frame from a container that's standing still.

**Why:** Something that disappears at full opacity while nothing moves looks like a glitch, because the viewer may have been looking at it and it's suddenly gone.

**Fix:** Fade, scale or slide it out over a few frames, or let it leave with its container (the window moving off, a cut to the next shot).

**Options:** `size` (default `70`), `settle` (default `0.1`)

## regression

### `regression/content-removed`

Default: error. Runs only when a [baseline](baselines.md) exists.

A beat keeps what made it full in the approved cut.

**Why:** Content removed from a beat a person already approved (a section of a sidebar, a label, a row) makes the shot emptier, and it's rarely what anyone meant to change.

**Fix:** Restore the missing items, or if removing them was the point, suppress the finding for that beat with the reason. A beat that changed wholesale is reported as a warning for the staging review instead.

### `regression/cursor-smaller`

Default: error. Runs only when a [baseline](baselines.md) exists.

Cursors aren't smaller than in the approved cut.

**Why:** The cursor is often the subject the viewer follows, so making it smaller without a reason makes it harder to follow.

**Fix:** Restore the approved size, or suppress with the reason if the change was deliberate.

**Options:** `tolerance` (default `0.1`)

### `regression/less-stretch`

Default: error. Runs only when a [baseline](baselines.md) exists.

Cursors stretch at speed at least as much as in the approved cut.

**Why:** With less stretch, a fast cursor looks stiffer than it did in the approved cut.

**Fix:** Restore the approved stretch, or check the cursor still moves as fast as it did.

### `regression/weaker-ease-out`

Default: error. Runs only when a [baseline](baselines.md) exists.

Each beat's main move eases out at least as strongly as in the approved cut.

**Why:** When the same move slows down less at the end than it did in the approved cut, people notice the film got worse even if they can't say why.

**Fix:** Restore the approved curve on that move.

---

[Documentation index](README.md)
