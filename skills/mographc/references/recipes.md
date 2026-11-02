# Recipes: Remotion code that passes the rules

Each recipe is plain Remotion code, written as pure functions of `frame`, so every frame can be computed on its own and renders the same way each time. Words such as move, ease-out, stretch and tip have the meanings given in `node_modules/mographc/docs/terms.md`.

## Easing

```ts
import { Easing, interpolate } from "remotion";

export const CURVE = {
  move: Easing.bezier(0.4, 0, 0.2, 1), // from one still position to another: speeds up, then slows down
  arrive: Easing.bezier(0.16, 1, 0.3, 1), // arriving fast or from off the canvas: slows down strongly at the end
  leave: Easing.bezier(0.7, 0, 0.84, 0), // leaving the canvas: speeds up, and doesn't need to slow down
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

Viewers judge how heavy an object is by how long it takes to move, so the duration should suit the object: at 30 fps, a small chip can move into place in 6 to 8 frames (0.2 to 0.27 s), while a window travelling half the canvas should take 20 to 30 frames (0.67 to 1 s). The longer a move, the more strongly it must slow down at the end. `easing/weak-out` requires an ease-out strength (the share of the move's time spent on its last 20% of distance) of at least 0.26 for moves under 0.4 s, 0.33 for moves of 0.4 to 0.8 s, and 0.40 for moves of 0.8 s or longer. For moves of 0.8 s or longer, use a curve that ends flat, like `move` or `arrive`.

## A camera that frames the action

Wrap each section in a camera that frames the region where the action is (`staging/small-action`). Move the camera's centre and zoom between shots on one eased curve. Every camera move should go to a specific element, slow down, and stop there. Don't add a slow, constant zoom or pan to make a still shot look like it's moving: it isn't counted as change, and `camera/creep` reports it when it lasts 1.2 s or more. While a shot stays still, keep the content changing instead.

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

When a surface (a window, card or panel) moves, scales and changes size at once, drive everything from one eased progress value. Ease its on-screen rectangle, not its scale and size separately. Easing them separately can make an edge go past where it ends up and then come back, which `easing/edge-reversal` reports when an edge goes back by more than 12 px at 1080p or 3% of its travel.

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
const rect = mixRect(ROW, WINDOW, t); // the on-screen rectangle eases
const scale = rect.w / CONTENT_WIDTH; // content scale follows the rect
```

If two animations are chained so that one starts when the other ends (a layout change, then a transform), the speed drops to almost zero between them and the motion appears to hesitate. `easing/stutter` reports a frame whose speed is under 35% of the frames on either side when both are moving at 450 px/s or more. Overlap them, or drive both from one value.

## A cursor that stretches with its speed

This cursor enters from off the canvas, eases between targets, squashes slightly on a click, stretches along its direction of travel when it moves fast, and moves quickly off the nearest edge when it's done. The `data-motion-tip` element marks its tip, the point that clicks, so tests can check that clicks land on their targets. `cursor/no-stretch` requires a cursor to be stretched to at least 1.06 on at least half of the frames where it moves at 900 px/s or more.

```tsx
// A plain arrow on a 32 x 32 grid, tip at (3, 2). Swap in your brand's cursor.
const ARROW = "M3 2 L3 26 L9.5 20 L14 30 L18 28 L13.5 18.5 L22 18.5 Z";
type Key = { at: number; x: number; y: number }; // frames, canvas px; two keys at the same point keep it still between them

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
  const stretch = 1 + Math.min(0.22, speed / 150); // longer along the direction of travel, narrower across it
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
        {/* The white outline keeps it visible on dark and light backgrounds (cursor/low-contrast). */}
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

// Usage: in from the bottom-right edge, click Send at frame 24, stay still, then move quickly off the left edge.
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

- Start a new path where the old one ends. When the cursor switches from one path to another (for example, it starts moving with a page as the page scales), start the new path exactly where the old one is at that frame. If the two paths don't meet, the cursor jumps, and `continuity/jump` reports a move of more than 40 px at 1080p in one frame that is over four times the movement in the frames around it.
- Don't fade a cursor out where it stands. If it has to disappear into something (for example, it turns into an element of the next shot), accept the `cursor/dead-exit` finding on it with `data-motion-ignore` and the reason.

## Entrances and exits

- Bring elements in with an ease-out and a small move or scale on the same curve as their fade, rather than a fade alone (`animate/fade-only`). The movement shows where the element came from.
- Take elements out with an ease-in, or have them pushed out by what replaces them. Don't remove something in the middle of a shot (`frame < T ? <Chip /> : null`) without fading or moving it out first (`animate/pop-out`).
- Keep one text at a time in any spot. When a message replaces another in the same place, remove the old one before the new one fades in, or push it out of the way (`layout/text-overlap`), because overlapping words can't be read.
- Build a container and its contents together: start revealing the contents while the container is still growing, so there's no moment where an empty container stays still.

## Typing

```tsx
const typed = TEXT.slice(0, Math.floor(Math.max(0, frame - start) * 1.2)); // about 36 characters a second
```

Keep the caret's position continuous as the text grows. Changing text isn't counted as motion, so a typed line doesn't trigger the jump check.
