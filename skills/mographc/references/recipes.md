# Recipes: motion that passes

Each recipe is plain Remotion, written as pure functions of `frame`.

## Easing

```ts
import { Easing, interpolate } from "remotion";

export const CURVE = {
  move: Easing.bezier(0.4, 0, 0.2, 1), // A → B between two rest points: ease in and out
  arrive: Easing.bezier(0.16, 1, 0.3, 1), // something arriving fast or from off screen: strong ease-out
  leave: Easing.bezier(0.7, 0, 0.84, 0), // exits that clear the frame: ease in, no ease-out needed
};

/** `from` → `to` between frames a and b, clamped, on a curve. Never call interpolate without an easing. */
export const tween = (
  frame: number,
  a: number,
  b: number,
  from: number,
  to: number,
  easing = CURVE.move,
) =>
  interpolate(frame, [a, b], [from, to], {
    easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
```

How long a move takes is weight: a chip can snap in 6–8 frames, while a window travelling half the screen takes 20–30. The longer a move, the stronger its ease-out must be (`easing/weak-out`): above about 0.8 s, use a curve that ends flat, like `move` or `arrive`.

## A camera that's always on the action

Wrap each section in a camera that frames the region where the action is (`staging/small-action`). Move the focus and the scale between shots on one eased curve. Every camera move goes somewhere and settles. Never add a slow constant zoom or drift to keep a hold "moving": it isn't counted as movement, and `camera/creep` fails it. Keep holds alive with content instead.

```tsx
type Shot = { at: number; x: number; y: number; scale: number }; // frame, the canvas point to centre, zoom

/** Centres the shot's point and zooms by `scale`, easing between shots. */
export const Camera: React.FC<{
  frame: number;
  shots: Shot[];
  children: React.ReactNode;
}> = ({ frame, shots, children }) => {
  let { x, y, scale } = shots[0];
  for (let i = 1; i < shots.length; i += 1) {
    const t = tween(frame, shots[i - 1].at, shots[i].at, 0, 1);
    x += (shots[i].x - x) * t;
    y += (shots[i].y - y) * t;
    scale += (shots[i].scale - scale) * t;
  }
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `translate(${960 - x * scale}px, ${540 - y * scale}px) scale(${scale})`,
          transformOrigin: "0 0",
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Typing at the bottom of the chat: push in on the input, then pull back as the reply arrives.
<Camera
  frame={frame}
  shots={[
    { at: 0, x: 960, y: 900, scale: 1.8 }, // on the input while it's typed
    { at: 40, x: 960, y: 900, scale: 1.8 },
    { at: 64, x: 960, y: 540, scale: 1.0 }, // pull back for the reply
  ]}
>
  <ChatScene frame={frame} />
</Camera>;
```

## One progress value for compound motion

When a surface moves, scales and changes size at once, drive everything from **one** eased progress value. Ease its **on-screen rectangle**, not scale and size separately: easing them separately makes an edge swell past its landing and come back (`easing/edge-reversal`).

```ts
type Rect = { x: number; y: number; w: number; h: number };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: mix(a.x, b.x, t),
  y: mix(a.y, b.y, t),
  w: mix(a.w, b.w, t),
  h: mix(a.h, b.h, t),
});

const t = tween(frame, 30, 54, 0, 1); // one curve
const rect = mixRect(ROW, WINDOW, t); // the screen rect eases
const scale = rect.w / CONTENT_WIDTH; // content scale follows the rect
```

Chaining two animations so one starts as the other ends (a layout change, then a transform) leaves a stall between them (`easing/stutter`). Overlap them, or drive both from one value.

## A cursor with character

It enters from off the canvas, eases between targets, squashes on a click, stretches with its speed, and flings off the nearest edge when it's done. The `data-motion-tip` marker is its hotspot, so tests can check clicks land.

```tsx
// A plain arrow on a 32 x 32 grid, tip at (3, 2). Swap in your brand's cursor.
const ARROW = "M3 2 L3 26 L9.5 20 L14 30 L18 28 L13.5 18.5 L22 18.5 Z";
type Key = { at: number; x: number; y: number }; // frames, canvas px; keys at the same point hold it there

const pointAt = (frame: number, keys: Key[]) => {
  let { x, y } = keys[0];
  for (let i = 1; i < keys.length; i += 1) {
    x = tween(frame, keys[i - 1].at, keys[i].at, x, keys[i].x);
    y = tween(frame, keys[i - 1].at, keys[i].at, y, keys[i].y);
  }
  return { x, y };
};

export const Cursor: React.FC<{
  frame: number;
  keys: Key[];
  clicks?: number[];
  name: string;
  size?: number;
}> = ({ frame, keys, clicks = [], name, size = 96 }) => {
  if (frame < keys[0].at || frame > keys[keys.length - 1].at) return null;
  const p = pointAt(frame, keys);
  const q = pointAt(frame - 1, keys);
  const speed = Math.hypot(p.x - q.x, p.y - q.y); // px per frame
  const stretch = 1 + Math.min(0.22, speed / 150); // squash and stretch along the travel
  const angle = (Math.atan2(p.y - q.y, p.x - q.x) * 180) / Math.PI;
  const press = clicks.some((c) => frame >= c && frame < c + 4) ? 0.8 : 1;
  const tip = { x: (3 / 32) * size, y: (2 / 32) * size };
  return (
    <div
      data-motion={`cursor:${name}`}
      style={{
        height: size,
        left: p.x - tip.x,
        position: "absolute",
        top: p.y - tip.y,
        width: size,
        zIndex: 10,
      }}
    >
      <div
        style={{
          height: size,
          transform: `rotate(${angle}deg) scale(${stretch * press}, ${press / stretch}) rotate(${-angle - 22}deg)`,
          transformOrigin: `${tip.x}px ${tip.y}px`,
          width: size,
        }}
      >
        {/* The white outline keeps it readable on dark and light backgrounds (cursor/low-contrast). */}
        <svg
          viewBox="0 0 32 32"
          width={size}
          height={size}
          style={{ display: "block" }}
        >
          <path
            d={ARROW}
            fill="#111111"
            stroke="#FFFFFF"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </svg>
        <div
          data-motion-tip
          style={{
            height: 1,
            left: tip.x,
            position: "absolute",
            top: tip.y,
            width: 1,
          }}
        />
      </div>
    </div>
  );
};

// Usage: in from the bottom-right edge, click Send at frame 24, hold, fling off the left edge.
<Cursor
  frame={frame}
  name="agent"
  clicks={[24]}
  keys={[
    { at: 0, x: 2050, y: 1150 },
    { at: 24, x: 1180, y: 630 },
    { at: 40, x: 1182, y: 632 },
    { at: 56, x: -250, y: 900 },
  ]}
/>;
```

- **Path continuity.** When one path hands off to another (the cursor rides a page as it scales), start the new path exactly where the old one is at that frame. A different anchor point is a teleport (`continuity/jump`).
- **Never fade a cursor out where it stands.** If it has to vanish into something (it turns into the next shot's element), suppress `cursor/dead-exit` on it, with the reason.

## Entrances and exits

- Things arrive with an ease-out and a small move or scale on the same curve as their fade, never opacity alone (`animate/fade-only`).
- Things leave with an ease-in, or by being pushed out by what replaces them. Never unmount something mid-shot (`frame < T ? <Chip /> : null`) without fading or moving it out first (`animate/pop-out`).
- One text at a time in any spot: when a message replaces another in place, the old one is gone before the new one fades in, or is pushed clear of it (`layout/text-overlap`).
- A container and its contents build together: start the contents' reveal while the container is still growing.

## Typing

```tsx
const typed = TEXT.slice(0, Math.floor(Math.max(0, frame - start) * 1.2)); // about 36 characters a second
```

Keep the caret's position continuous as the text grows. Changing text never counts as motion, so a typed line won't trip the jump check.
