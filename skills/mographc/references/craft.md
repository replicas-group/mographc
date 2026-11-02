# Craft: decisions mographc can't measure

mographc measures how elements move and whether text can be read. It can't tell you whether a shot shows the right thing, so this page covers the decisions you have to make yourself, and the reasons behind each. Words such as section, element, surface, move and ease-out have the meanings given in `node_modules/mographc/docs/terms.md`.

## The story

A film that only shows a feature works as a demo, but it doesn't explain why the feature matters. To explain that, show a moment before the feature and a moment after it, so the viewer sees what changed.

- Write the story as one sentence about a change. Describe what the viewer should understand as a before and an after, for example: "Explaining a slow checkout used to mean a long page of text; now the agent hands you a chart you can explore." If you can't write the "before" half, the film doesn't have a story yet.
- Show the problem within the first 1.5 s. Viewers decide quickly whether to keep watching, so open on the question, the difficulty or the surprising result. A typing animation in an empty window is only setup, and it gives the viewer no reason to keep watching.
- Order the rest in three parts. First the product acts. Then the result is shown concretely. Then a claim names what just happened, followed by the brand. The claim comes after the result because the viewer believes it more once they have seen it happen.
- Give each idea its own section. If there are three things to show, make three sections of 2 to 3 seconds each, each with its own layout, rather than one shot where three things happen in turn. `pace/long-shot` warns when 3.5 s pass without a large change (at least 8% of the canvas changing at once).
- Keep one idea per section. Write each section's idea down, and remove anything on screen that doesn't support it, because every extra element competes for the viewer's attention.
- Use believable example content. A realistic problem, realistic names and a believable result make the film look like a real product. Placeholder text such as lorem ipsum makes it look like a mock-up.

## Movement and pace

In the product films we measured, the ones viewers liked had something changing about 65% of the time and were never completely still for more than about 0.9 s. Films viewers found boring had something changing about 40% of the time. mographc measures both: `pace/activity` reports a film where at least 1% of the canvas changes on less than 60% of frames (an error below 45%), and `pace/dead-air` reports any stretch of more than 1 s where less than 1% of the canvas changes (an error above 2 s; up to 2.5 s of stillness at the very end is allowed). A slow, constant zoom or pan doesn't count as change.

- While a line of text is being read, keep the content changing rather than the camera. The next element can build in, a detail can be revealed, or a value can count up. A slow, constant zoom or pan of an element covering at least 3% of the canvas for 1.2 s or more is reported by `camera/creep` and doesn't count as change, because it doesn't show the viewer anything new.
- Give every camera move a destination. A push-in should go to a specific element, slow down at the end, and stop there. If you can't say what a move is going to, switch straight to the next shot instead, because a move without a destination makes the viewer look for something that isn't there.
- Build screens up instead of showing them finished. Let elements arrive one after another: rows appear in turn, a chart draws itself, a card grows into the next card. A finished screen that the cursor then points at leaves the viewer a few seconds where nothing changes.
- Move on once a section's idea is clear. A section rarely needs more than 3 s, and keeping it on screen longer makes the film feel slow.
- Make a large change every 2 to 3 seconds: a new layout, a push-in, or a change to the main surface (a window, card or panel). A large change draws the viewer's attention back to the screen.

## Attention

The aim is to keep the viewer watching, which is not the same as being fast. The film can be moving constantly as long as the amount of text to read is kept small. A good product film might show six captions in 26 s, each one to eight words long and on screen for two to six seconds, and never ask the viewer to read the product's own text, because the product is shown as a picture.

mographc's simulated viewer estimates what a viewer looks at and reads. On each frame it picks the element the eye is most likely on (something that just appeared or moved, or the next unread line of text), and it reads at 3.5 words a second. `toBeRead()` and `toBeTheFocus()` test what it reads and looks at in each section, and `npx mographc gaze <composition>` prints it. `node_modules/mographc/docs/simulated-viewer.md` gives the details to plan with:

- Stacked lines of one size in one painted box (a terminal, a log, a wrapped message) are read as one paragraph, and pieces of text less than 1.2 times the font size apart on one baseline are read as one line unless they're in different painted boxes. Give texts that should be read separately their own card or more space.
- Reading cost counts characters as well as words: a text costs at least its letters ÷ 5 words. Budget prose at 0.3 s a word, but code, paths and hashes at about 17 characters a second; a 33-letter file path takes 1.9 s, not 0.3 s.
- While a text is being read, only large text (40 px or more at 1080p) or a large box (5% of the canvas or more) arriving or setting off takes the eye. Once it's read, anything new takes the eye, even one word, and an unfinished text pulls it back. Only small moving shapes (under 0.3% of the canvas) never do.
- A camera move doesn't take the eye off text that moves with it, but it does take it off a caption fixed on the canvas.

- Show one thing to read at a time. If a caption appears while a message types out elsewhere, the viewer can't read either properly. `attention/competing` measures how much of the film has two texts more than 15% of the canvas width apart asking to be read at once, and warns above 15% of the film's duration (an error above 25%). Let the message finish before the caption appears, or remove one of them.
- Keep the product still while a line is read. People only read where they are looking, so a caption can be on screen long enough and still go unread if something moving in the product keeps drawing the eye away. `attention/unread-text` reports a caption that leaves with 30% or more of its words unread by the simulated viewer. Keep the product still while the line is read, or show the point with the product instead of with words.
- Make product text unreadable unless the section is about it. If the viewer doesn't need to read the product's text, draw it as grey lines or make it too small to read, so it doesn't compete with the caption. If they do need it (for example, the message the story depends on), it is the section's one thing to read, and there should be no caption beside it.
- Keep each section to one question and its answer. A section that needs a caption, a second caption and a message to make its point should be split in two, or simplified.

## Framing and layout

- Frame the shot on the action. If someone types into an input at the bottom of a window, push in on the input rather than showing the whole empty window. `staging/small-action` warns when, for 0.8 s or more, the only change is in a region smaller than 6% of the canvas inside a surface that covers at least 25% of it, and the finding gives the region. Pull back when the next thing happens elsewhere.
- Either give a surface room or crop it clearly. Each edge of a surface should be either at least 32 px at 1080p inside the edge of the canvas, or past the canvas edge by more than 6% of the surface's width or height. An edge a few pixels inside the canvas, or just past it, looks as if the surface didn't quite fit (`framing/ambiguous-crop`, which checks surfaces covering at least 15% of the canvas that stay still for 0.5 s or more).
- Centre captions in their space or line them up with the product. A caption should be centred between the product's edge and the canvas edge, or share an edge or centre line with the product. `layout/unbalanced-space` warns when the larger gap beside a caption is more than 1.6 times the smaller one and neither of the caption's sides nor its centre is within 10 px at 1080p of another element's edge or centre. Either choice looks intentional; anything in between looks accidental.
- Use the whole canvas. A small window in the middle of a large empty canvas wastes space and makes its text too small. Scale the window up until its text can be read on a phone.
- Show the whole surface once, then show only the part that matters. One brief full view (1.5 s or less) shows that it's a real product. After that, enlarge only the part that matters and move the rest off screen.
- Choose the framing so the text can be read. Aim for body text of about 18 px or more at 1080p. `staging/text-too-small` reports a surface covering at least 25% of the canvas that stays on screen for 1 s or more with its typical text size under 14 px at 1080p; the first such view is only a warning if it lasts 1.5 s or less. If a surface is too big to read in full, zoom in and pan or scroll through it toward the part that matters.
- Turn one element into the next instead of swapping them. A row that grows into a page, or a card that changes shape into the next card, keeps the viewer's eye in one place. When one element leaves and another arrives, the viewer has to find the new one.
- Show one main element at a time. The outgoing surface should be mostly gone before the incoming one is fully visible, so the viewer isn't looking at two things at once.
- Make sure the cursor stands out from what it points at. `cursor/low-contrast` reports a cursor whose fill, outline and shadow all have a contrast ratio under 1.6:1 with the background under its tip for 0.1 s or more. Change the colour of the element under it (for example, with a hover state) rather than the cursor, so the cursor stays recognisable throughout the film.
- Give surfaces enough time to move. A chat bubble crossing the canvas needs 0.6 to 0.9 s, not a third of a second. `easing/harsh-settle` measures how fast a surface slows down at the end of a move, and warns above 18,000 px/s² at 1080p (an error above 27,000 px/s²). Viewers judge an object's weight by how quickly it stops, and only a cursor looks light enough to stop that quickly.

## Text

- Place text as part of the layout, not as a subtitle along the bottom. Give it its own region (one side or one quarter of the canvas) near the action it describes, and move it when the layout changes.
- Write active, concrete lines. "Get a guided review of every PR" says what the viewer gets; "An agent walks you through it" doesn't. Aim for three to seven words a line.
- Leave text on screen long enough to read. `pace/text-hold` warns when a headline stays fully visible for less than its word count divided by 3.5 words a second, or less than 0.5 s.

## The cursor

- Every cursor move should have a reason the viewer can see. A cursor that hovers or wanders draws the viewer's eye without showing them anything.
- The cursor enters from off the canvas (`cursor/pops-in`) and leaves by moving quickly off the nearest edge (`cursor/dead-exit`). A cursor that fades out where it stands ends its motion abruptly, without showing the viewer where it went.
- It stretches along its direction of travel when it moves fast, and a longer move takes more time. It never covers text that is being read or typed; while the viewer reads, the cursor waits beside the text.
- A click lands exactly on its target. Test this with `toPointAt`.
- If the cursor represents an agent or a person, it carries a name label. When the name changes, the label changes with a short animation.

## Your brand

Brand rules (colours, fonts, shadows, the cursor's shape) belong in a preset, so mographc checks them on every version of the film and a person doesn't have to. `examples/brand-preset/` in the mographc repository is a worked example to copy. Take colours from your design system's source files, not from memory or a screenshot, because a small difference in colour is visible next to the real product.

## Sound

- Use sound effects for physical events: a click sound on a click, key taps for typing, and a soft whoosh for things that travel (a card flying in, a transition). Beeps and tonal blips tend to sound cheap.
- Not every move needs a sound. Choose the ones that matter to the story, because too many sounds become noise.
- Match the music to the size of the announcement. A major launch can have fast, energetic music, and a small improvement suits something calmer.

## Review before handing over

Before showing the film to anyone, answer these questions for the whole film:

- Can you state the story as a before and an after?
- Do the first 1.5 s give the viewer a reason to keep watching?
- Would someone who doesn't know the product understand why this matters?

Then answer these for each section, write down every "no" (with the time and what's on screen), and fix it:

1. What should the viewer learn here? (One sentence.)
2. Can the text that shows it be read on a phone at this framing?
3. Does everything on screen support that idea?
4. Is there one element for the viewer to look at at every moment?
5. Does each fast-moving element (the cursor, a card thrown in) move back slightly before it sets off, stretch while it moves fast, and leave quickly?
6. If a person approved an earlier version, has this section lost anything that made it fuller or clearer since then?
7. Is the text active, concrete and short?
8. Is the shot framed on the action, and is something changing at every moment?
