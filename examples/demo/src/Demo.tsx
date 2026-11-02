import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";

// The moments the film is built around, in frames at 30 fps. The tests use the same times.
export const TIMES = {
  typed: 94,
  click: 100,
  leave: 108,
  reply: 118,
  checks: 134,
};

const CURVE = {
  move: Easing.bezier(0.4, 0, 0.2, 1),
  arrive: Easing.bezier(0.16, 1, 0.3, 1),
  leave: Easing.bezier(0.7, 0, 0.84, 0),
};

const tween = (
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

const FONT = "Helvetica, Arial, sans-serif";
const WINDOW = { x: 760, y: 170, w: 1040, h: 740 };
const SEND = { x: WINDOW.x + 820, y: WINDOW.y + 610, w: 180, h: 80 };
const PROMPT = "Fix it and open a PR";

type Key = { at: number; x: number; y: number };

const pointAt = (frame: number, keys: Key[]) => {
  let { x, y } = keys[0];
  for (let i = 1; i < keys.length; i += 1) {
    const easing = i === keys.length - 1 ? CURVE.leave : CURVE.move;
    x = tween(frame, keys[i - 1].at, keys[i].at, x, keys[i].x, easing);
    y = tween(frame, keys[i - 1].at, keys[i].at, y, keys[i].y, easing);
  }
  return { x, y };
};

const ARROW = "M3 2 L3 26 L9.5 20 L14 30 L18 28 L13.5 18.5 L22 18.5 Z";

const Cursor: React.FC<{
  frame: number;
  keys: Key[];
  click: number;
  fadeOut?: boolean;
}> = ({ frame, keys, click, fadeOut }) => {
  const end = keys[keys.length - 1].at;
  if (frame < keys[0].at || (!fadeOut && frame > end)) return null;
  // The broken film stops the cursor at its last key and fades it out where it stands.
  const p = pointAt(frame, fadeOut ? keys.slice(0, -1) : keys);
  const q = pointAt(frame - 1, fadeOut ? keys.slice(0, -1) : keys);
  const speed = Math.hypot(p.x - q.x, p.y - q.y);
  const stretch = 1 + Math.min(0.22, speed / 150);
  const angle = (Math.atan2(p.y - q.y, p.x - q.x) * 180) / Math.PI;
  const press = frame >= click && frame < click + 4 ? 0.8 : 1;
  const size = 72;
  const tip = { x: (3 / 32) * size, y: (2 / 32) * size };
  const opacity = fadeOut ? tween(frame, end - 10, end, 1, 0) : 1;
  return (
    <div
      data-motion="cursor:person"
      style={{
        height: size,
        left: p.x - tip.x,
        opacity,
        position: "absolute",
        top: p.y - tip.y,
        width: size,
      }}
    >
      <div
        style={{
          height: size,
          transform: `rotate(${angle}deg) scale(${stretch * press}, ${press / stretch}) rotate(${-angle}deg)`,
          transformOrigin: `${tip.x}px ${tip.y}px`,
          width: size,
        }}
      >
        <svg viewBox="0 0 32 32" width={size} height={size}>
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

const Bubble: React.FC<{
  text: string;
  mine?: boolean;
  style?: React.CSSProperties;
}> = ({ text, mine, style }) => (
  <div
    style={{
      alignSelf: mine ? "flex-end" : "flex-start",
      background: mine ? "#1F6FEB" : "#EEF0F3",
      borderRadius: 20,
      color: mine ? "#FFFFFF" : "#111111",
      fontSize: 34,
      padding: "20px 28px",
      ...style,
    }}
  >
    {text}
  </div>
);

// The camera pushes in on the composer while the prompt is typed, then pulls back for the reply.
const SHOTS = [
  { at: 0, x: 960, y: 540, scale: 1 },
  { at: 60, x: 960, y: 540, scale: 1 },
  { at: 80, x: WINDOW.x + 520, y: SEND.y + 40, scale: 1.6 },
  { at: 104, x: WINDOW.x + 520, y: SEND.y + 40, scale: 1.6 },
  { at: 126, x: WINDOW.x + 520, y: 540, scale: 1 },
];
const camera = (frame: number) => {
  let { x, y, scale } = SHOTS[0];
  for (let i = 1; i < SHOTS.length; i += 1) {
    const t = tween(frame, SHOTS[i - 1].at, SHOTS[i].at, 0, 1);
    x += (SHOTS[i].x - x) * t;
    y += (SHOTS[i].y - y) * t;
    scale += (SHOTS[i].scale - scale) * t;
  }
  return { x, y, scale };
};
/** Where a point on the canvas appears on screen through the camera. */
const onScreen = (frame: number, p: { x: number; y: number }) => {
  const c = camera(frame);
  return { x: 960 + (p.x - c.x) * c.scale, y: 540 + (p.y - c.y) * c.scale };
};

export const Demo: React.FC<{ broken: boolean }> = ({ broken }) => {
  const frame = useCurrentFrame();
  const cam = camera(frame);

  // The headline is read on its own and leaves as the window arrives.
  const headlineIn = tween(frame, 0, 20, 0, 1, CURVE.arrive);
  const headlineOut = tween(frame, 30, 42, 0, 1, CURVE.leave);
  const windowIn = tween(frame, 40, 58, 0, 1, CURVE.move);
  const typed = PROMPT.slice(
    0,
    Math.floor(tween(frame, 78, TIMES.typed, 0, PROMPT.length, Easing.linear)),
  );
  const sent = frame >= TIMES.click;
  const inputOut = tween(frame, TIMES.click, TIMES.click + 8, 1, 0);
  const sentIn = tween(
    frame,
    TIMES.click,
    TIMES.click + 14,
    0,
    1,
    CURVE.arrive,
  );
  const replyIn = tween(
    frame,
    TIMES.reply,
    TIMES.reply + 18,
    0,
    1,
    CURVE.arrive,
  );
  const checksIn = tween(
    frame,
    TIMES.checks,
    TIMES.checks + 18,
    0,
    1,
    CURVE.arrive,
  );

  const send = onScreen(TIMES.click, {
    x: SEND.x + SEND.w / 2,
    y: SEND.y + SEND.h / 2,
  });
  // Bug 2: the cursor clicks to the left of the button.
  const target = { x: send.x - (broken ? 360 : 0), y: send.y };
  const keys: Key[] = [
    { at: 70, x: 2000, y: 1180 },
    // Bug 1: half way there, the cursor jumps 300 px in one frame.
    ...(broken
      ? [
          { at: 84, x: 1960, y: 1120 },
          { at: 85, x: 1700, y: 980 },
        ]
      : []),
    { at: TIMES.click, x: target.x, y: target.y },
    { at: TIMES.leave, x: target.x + 2, y: target.y + 2 },
    // Bug 3 (in Cursor): instead of leaving by the right edge, it fades out where it is.
    { at: TIMES.leave + 18, x: 2100, y: 900 },
  ];

  return (
    <AbsoluteFill style={{ background: "#F6F7F9", fontFamily: FONT }}>
      <AbsoluteFill
        style={{
          transform: `translate(${960 - cam.x * cam.scale}px, ${540 - cam.y * cam.scale}px) scale(${cam.scale})`,
          transformOrigin: "0 0",
        }}
      >
        <div
          data-motion="headline:claim"
          style={{
            color: "#111111",
            fontSize: 88,
            fontWeight: 500,
            left: 0,
            lineHeight: 1.1,
            opacity: headlineIn * (1 - headlineOut),
            position: "absolute",
            textAlign: "center",
            top: 480,
            transform: `translateY(${(1 - headlineIn) * 40 - headlineOut * 120}px)`,
            width: 1920,
          }}
        >
          Prompt to PR
        </div>
        <div
          data-motion="window:chat"
          style={{
            background: "#FFFFFF",
            border: "1px solid #D8DCE2",
            borderRadius: 24,
            height: WINDOW.h,
            left: WINDOW.x,
            opacity: windowIn,
            overflow: "hidden",
            position: "absolute",
            top: WINDOW.y,
            transform: `translateX(${(1 - windowIn) * 240}px)`,
            width: WINDOW.w,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
              padding: 48,
            }}
          >
            <Bubble
              mine
              text={PROMPT}
              style={{
                opacity: sentIn,
                transform: `translateY(${(1 - sentIn) * 30}px)`,
              }}
            />
            <Bubble
              text="Opened PR #482: fix the total"
              style={{
                opacity: replyIn,
                transform: `translateY(${(1 - replyIn) * 40}px)`,
              }}
            />
            <div
              data-motion="card:checks"
              style={{
                alignSelf: "flex-start",
                border: "1px solid #D8DCE2",
                borderRadius: 16,
                color: "#1A7F37",
                fontSize: 34,
                opacity: checksIn,
                padding: "16px 24px",
                transform: `translateY(${(1 - checksIn) * 40}px)`,
              }}
            >
              ✓ All checks passed
            </div>
          </div>
          <div
            style={{
              border: "1px solid #D8DCE2",
              borderRadius: 16,
              color: "#111111",
              fontSize: 32,
              height: SEND.h,
              left: 40,
              lineHeight: `${SEND.h}px`,
              opacity: inputOut,
              paddingLeft: 24,
              position: "absolute",
              top: SEND.y - WINDOW.y,
              width: SEND.x - WINDOW.x - 64,
            }}
          >
            {typed}
          </div>
          <div
            data-motion="button:send"
            style={{
              background: sent ? "#1A7F37" : "#1F6FEB",
              borderRadius: 16,
              color: "#FFFFFF",
              fontSize: 32,
              height: SEND.h,
              left: SEND.x - WINDOW.x,
              lineHeight: `${SEND.h}px`,
              position: "absolute",
              textAlign: "center",
              top: SEND.y - WINDOW.y,
              width: SEND.w,
            }}
          >
            Send
          </div>
        </div>
      </AbsoluteFill>
      <Cursor frame={frame} keys={keys} click={TIMES.click} fadeOut={broken} />
    </AbsoluteFill>
  );
};
