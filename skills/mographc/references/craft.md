# Craft: what the tools can't measure

mographc measures how things move and whether text can be read. It can't tell you whether a shot shows the right thing, so this page covers the judgment calls you have to make yourself.

## The story

A film that only _shows_ a feature is a demo. A film that explains a feature shows a moment before it and a moment after it, so the viewer sees what changed.

- **One sentence, as a change.** Write what the viewer should feel as a before and an after: "Explaining a slow checkout used to mean a wall of text; now the agent hands you a chart you can poke at." If you can't write the before, you don't have a story yet.
- **Hook in the first 1.5 s.** Open on the tension, not the setup: the question, the pain, the surprising result. A typing animation in an empty window is setup, not a hook.
- **Then turn, prove, pay off.** The product acts (the turn). The result is visible and concrete (the proof). The claim names what just happened (the payoff), and only then the brand.
- **Every idea is its own section.** If you have three things to show, that's three back-to-back sections of 2–3 seconds, each with its own composition. It's never one frame where three things happen in turn (`pace/long-shot`).
- **One idea per section.** Write each section's idea down. Every element on screen either proves it or goes.
- **Interesting example content.** A real-sounding problem and names, a believable result. Not lorem ipsum.

## Movement and pace

Films that hold attention are rarely still. In the product films we measured, the ones viewers liked had something moving most of the time and were never frozen for more than about 0.9 s. mographc measures this (`pace/activity`, `pace/dead-air`). A film where less than about 60% of the time has movement tends to feel like a slideshow. Slow drift isn't counted as movement.

- **Content keeps a hold alive, not the camera.** While a line is read, the next element builds in, a detail resolves, a value counts up. A slow constant zoom or drift is filler: it isn't counted as movement (`camera/creep`).
- **Camera moves are deliberate.** A push-in goes to a subject, eases, and settles. If you can't name what the move is going to, cut instead.
- **Build, don't present.** Elements arrive in sequence: rows stagger in, a chart draws, a card grows into the next. Showing a finished screen and then pointing at it is dead air.
- **Cut sooner.** When a section's idea has landed, move on. A section rarely needs more than 3 s.
- **Big changes often.** A new composition, a push-in, a transform of the main surface: something large changes every couple of seconds.

## Attention

The goal is to hold attention, not to be fast. The motion can be constant because the amount of text is kept small. A good product film might show six captions in 26 s, each one to eight words long and held for two to six seconds, and never ask the viewer to read the product's own text: the product is the picture.

- **One thing to read at a time.** A caption and a typed message landing together means neither gets read (`attention/competing`). Let the message finish, then the caption, or drop one.
- **Text is read only where the eye is.** A caption on screen long enough can still go unread if the product keeps pulling the eye elsewhere while it's up (`attention/unread-text`). Hold the product still while a line is read, or say it with the product instead of words.
- **Product text is texture unless it's the subject.** If the viewer doesn't need to read it, make it lines, or too small to read. If they do (the message that carries the story), it is the section's one thing to read, and there's no caption beside it.
- **Simple sections.** Each section asks one question and answers it. A section that needs a caption, a sub-caption and a message to make its point is two sections, or too complicated.

mographc simulates a viewer: it follows where the eye goes (to what just appeared or moved, to the next unread line) and reads at 3.5 words a second. `toBeRead()` and `toBeTheFocus()` test it per beat.

## Staging and framing

- **Frame the action.** The shot is wherever the change is. If someone types into an input at the bottom of a window, the shot is the input, pushed in, not the whole empty window (`staging/small-action` gives you the region). Pull back when the next thing happens elsewhere.
- **Framed or cropped, never in between.** A subject either has room around it (at least ~32 px at 1080p) or is clearly cropped by the frame. An edge a few pixels inside, or a sliver past, reads as crammed (`framing/ambiguous-crop`).
- **Text is placed, not dropped.** A caption is centred in the space it sits in (between the product's edge and the frame's), or shares an edge with the product (`layout/unbalanced-space`).
- **Use the whole frame.** A small window in the middle of a big empty canvas wastes the screen. Scale the subject up until it reads on a phone, and let the composition fill the frame.
- **Show the whole surface once, then isolate the subject.** One brief full view (1.5 s or less) proves it's a real product. After that, lift out only the subject and let the rest leave.
- **Legibility decides framing.** Body text around 18 px or more at 1080p. If a surface is too big to read whole, zoom in and move through it toward a destination.
- **Transform, don't swap.** A row growing into the page, or a card reshaping into the next card, beats one thing leaving and another arriving.
- **One subject at a time.** The outgoing surface is mostly gone before the incoming one is solid.
- **Contrast for what's pointed at.** A cursor never sits on something its own colour (`cursor/low-contrast`). The hovered element changes state, and the cursor stays readable on top of it.
- **Weight.** UI surfaces don't whip. A bubble crossing the frame needs 0.6–0.9 s, not a third of a second (`easing/harsh-settle`). Only cursors move like that.

## Text

- **It's part of the composition, not a subtitle.** Give it its own region (a side, a quadrant), near the action it describes. Move it when the layout changes.
- **Active and concrete.** "Get a guided review of every PR", not "An agent walks you through it". Three to seven words a line.
- **Readable before it leaves.** About 3.5 words a second (the linter checks this).

## The cursor

- Every move has a reason the viewer can see. No idle hovering, no wandering across the frame.
- It enters from off the canvas and leaves by flinging off the nearest edge. Never fade it in place (the linter checks this).
- It stretches with speed. Its duration grows with distance. It never covers text being read or written: a reading agent sits beside the text.
- A click lands exactly on its target. Test it with `toPointAt`.
- An agent's cursor carries its name label, which drops in when it changes.

## Your brand

Brand rules (colours, fonts, shadows, the cursor's shape) belong in a preset, so the tool checks them on every cut instead of a person. `examples/brand-preset/` in the mographc repository is a worked example to copy. Take colours from your design system's source of truth, never from memory or a screenshot.

## Sound

- Use sound effects for physical events only: a click on a click, key taps for typing, and a soft whoosh for things that travel (a card flying in, a transition). Beeps and tonal blips tend to sound cheap.
- Not every move needs a sound. Pick the ones that carry the story.
- Match the music to the size of the announcement: a major launch can carry fast, energetic music, and a small improvement suits something calmer.

## Staging review

Before handing over a cut, answer these for the whole film:

- Can you say the story as a before and an after?
- Does the first 1.5 s hook?
- Would someone who doesn't know the product understand why this matters?

Then for each section, writing down every "no" (with the time and what's on screen) and fixing it:

1. What should the viewer learn here? (One sentence.)
2. Does the subject that proves it read on a phone at this framing?
3. Is everything on screen serving that idea?
4. Is there one place for the eye to go at every moment?
5. Does each fast mover (the cursor, a flung card) have anticipation, stretch, and a fling when it leaves?
6. If a person approved an earlier cut, is anything lost that made this section fuller or clearer?
7. Is the copy active, concrete and short?
8. Is the shot on the action, and is something alive in every moment of it?
