# Craft: decisions the tools can't measure

mographc measures how things move and whether text can be read. It can't tell you whether a shot shows the right thing, so this page covers the decisions you have to make yourself, and the reasoning behind each.

## The story

A film that only shows a feature works as a demo, but it doesn't explain why the feature matters. To explain that, show a moment before the feature and a moment after it, so the viewer sees what changed.

- **Write the story as one sentence about a change.** Describe what the viewer should understand as a before and an after, for example: "Explaining a slow checkout used to mean a wall of text; now the agent hands you a chart you can explore." If you can't write the "before" half, the film doesn't have a story yet.
- **Start with the problem, within the first 1.5 s.** Viewers decide quickly whether to keep watching, so open on the question, the pain or the surprising result. A typing animation in an empty window is setup, and it gives the viewer no reason to stay.
- **Order the rest as the turn, the proof and the payoff.** First the product acts (the turn). Then the result is shown concretely (the proof). Then a claim names what just happened (the payoff), followed by the brand. The claim comes after the proof because the viewer believes it more once they have seen it happen.
- **Give each idea its own section.** If there are three things to show, make three sections of 2 to 3 seconds each, each with its own composition, rather than one frame where three things happen in turn (`pace/long-shot`). Separate sections give each idea its own moment and keep the film moving.
- **Keep one idea per section.** Write each section's idea down, and remove anything on screen that doesn't support it, because every extra element competes for the viewer's attention.
- **Use believable example content.** A realistic problem, realistic names and a believable result make the film read as a real product. Placeholder text such as lorem ipsum makes it read as a mock-up.

## Movement and pace

In the product films we measured, the ones viewers liked had something moving most of the time and were never frozen for more than about 0.9 s. A film where less than about 60% of the time has movement tends to feel like a slideshow. mographc measures both (`pace/activity`, `pace/dead-air`), and doesn't count slow drift as movement.

- **During a hold, keep the content changing rather than the camera.** While a line is being read, the next element can build in, a detail can resolve, or a value can count up. A slow constant zoom or drift isn't counted as movement (`camera/creep`), because it doesn't show the viewer anything new.
- **Give every camera move a destination.** A push-in should go to a subject, ease, and settle. If you can't say what a move is going to, a cut is usually better, because a move without a destination makes the viewer look for something that isn't there.
- **Build screens up instead of showing them finished.** Let elements arrive in sequence: rows stagger in, a chart draws, a card grows into the next. A finished screen that the cursor then points at gives the viewer a few seconds where nothing happens.
- **Move on once a section's idea is clear.** A section rarely needs more than 3 s. Holding longer makes the film feel slow.
- **Make a large change every couple of seconds.** A new composition, a push-in or a transformation of the main surface resets the viewer's attention.

## Attention

The aim is to hold attention, which is not the same as being fast. The motion can be constant because the amount of text is kept small. A good product film might show six captions in 26 s, each one to eight words long and held for two to six seconds, and never ask the viewer to read the product's own text, because the product is shown as a picture.

- **Show one thing to read at a time.** If a caption and a typed message appear together, the viewer can't read either properly (`attention/competing`). Let the message finish before the caption appears, or remove one of them.
- **Hold the product still while a line is read.** People only read where they are looking. A caption can be on screen long enough and still go unread if the product keeps drawing the eye elsewhere while it's up (`attention/unread-text`). Either keep the product still while the line is read, or show the point with the product instead of words.
- **Treat product text as texture unless it's the subject.** If the viewer doesn't need to read the product's text, draw it as lines or make it too small to read, so it doesn't compete. If they do need it (the message that carries the story), it is the section's one thing to read, and there should be no caption beside it.
- **Keep each section to one question and its answer.** A section that needs a caption, a sub-caption and a message to make its point should be split in two, or simplified.

mographc simulates a viewer. It follows where the eye goes (to what just appeared or moved, or to the next unread line) and reads at 3.5 words a second. `toBeRead()` and `toBeTheFocus()` test this for each beat.

## Staging and framing

- **Frame the shot on the action.** If someone types into an input at the bottom of a window, push in on the input rather than showing the whole empty window (`staging/small-action` reports the region). Pull back when the next thing happens elsewhere.
- **Either give a subject room or crop it clearly.** A subject should either have space around it (at least about 32 px at 1080p) or be clearly cropped by the frame. An edge a few pixels inside the frame, or just past it, looks like the subject didn't quite fit (`framing/ambiguous-crop`).
- **Centre captions in their space or align them with the product.** A caption should be centred between the product's edge and the frame's edge, or share an edge with the product (`layout/unbalanced-space`). Either choice looks intentional; anything in between looks accidental.
- **Use the whole frame.** A small window in the middle of a large empty canvas wastes space and makes its text too small. Scale the subject up until it can be read on a phone.
- **Show the whole surface once, then isolate the subject.** One brief full view (1.5 s or less) shows that it's a real product. After that, lift out only the part that matters and let the rest leave.
- **Choose the framing so the text can be read.** Body text should be about 18 px or more at 1080p. If a surface is too big to read in full, zoom in and move through it toward a destination.
- **Transform one element into the next instead of swapping them.** A row that grows into a page, or a card that reshapes into the next card, keeps the viewer's eye in one place. One thing leaving and another arriving makes the viewer find the new subject.
- **Show one subject at a time.** The outgoing surface should be mostly gone before the incoming one is solid, so the viewer isn't looking at two things at once.
- **Make sure the cursor contrasts with what it points at.** A cursor should never sit on something of its own colour (`cursor/low-contrast`). Change the hovered element's state instead, so the cursor stays visible on top of it.
- **Give interface surfaces enough time to move.** A chat bubble crossing the frame needs 0.6 to 0.9 s, not a third of a second (`easing/harsh-settle`). Viewers read the time an object takes to stop as its weight, and only a cursor looks light enough to move that fast.

## Text

- **Place text as part of the composition, not as a subtitle.** Give it its own region (a side or a quadrant) near the action it describes, and move it when the layout changes.
- **Write active, concrete lines.** "Get a guided review of every PR" says what the viewer gets; "An agent walks you through it" doesn't. Aim for three to seven words a line.
- **Leave text on screen long enough to read.** Allow about 3.5 words a second. The linter checks this.

## The cursor

- Every move should have a reason the viewer can see. Idle hovering and wandering across the frame draw the eye without telling it anything.
- The cursor enters from off the canvas and leaves by moving quickly off the nearest edge, because fading it out where it stands ends its motion abruptly. The linter checks both.
- It stretches with its speed, and a longer move takes more time. It never covers text that is being read or written; a cursor that is "reading" sits beside the text.
- A click lands exactly on its target. Test this with `toPointAt`.
- If the cursor represents an agent or a person, it carries a name label. The label changes with a short animation when the name changes.

## Your brand

Brand rules (colours, fonts, shadows, the cursor's shape) belong in a preset, so the tool checks them on every cut and a person doesn't have to. `examples/brand-preset/` in the mographc repository is a worked example to copy. Take colours from your design system's source of truth, not from memory or a screenshot, because small differences in a colour are visible next to the real product.

## Sound

- Use sound effects for physical events: a click on a click, key taps for typing, and a soft whoosh for things that travel (a card flying in, a transition). Beeps and tonal blips tend to sound cheap.
- Not every move needs a sound. Choose the ones that carry the story, because too many sounds become noise.
- Match the music to the size of the announcement. A major launch can carry fast, energetic music, and a small improvement suits something calmer.

## Staging review

Before handing over a cut, answer these questions for the whole film:

- Can you state the story as a before and an after?
- Do the first 1.5 s give the viewer a reason to keep watching?
- Would someone who doesn't know the product understand why this matters?

Then answer these for each section, and write down every "no" (with the time and what's on screen) and fix it:

1. What should the viewer learn here? (One sentence.)
2. Can the subject that shows it be read on a phone at this framing?
3. Does everything on screen support that idea?
4. Is there one place for the eye to go at every moment?
5. Does each fast-moving object (the cursor, a card that's thrown in) have anticipation, stretch, and a quick exit?
6. If a person approved an earlier cut, has anything been lost that made this section fuller or clearer?
7. Is the copy active, concrete and short?
8. Is the shot on the action, and is something moving at every moment?
