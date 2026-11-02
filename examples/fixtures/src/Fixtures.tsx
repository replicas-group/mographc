import { loadFont } from "@remotion/google-fonts/Inter";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
} from "remotion";

const FONT = "Helvetica, Arial, sans-serif";
const BG = "#101418";
const INOUT = Easing.bezier(0.4, 0, 0.2, 1);
const OUT = Easing.bezier(0.16, 1, 0.3, 1);

const tween = (
  frame: number,
  a: number,
  b: number,
  from: number,
  to: number,
  easing = INOUT,
) =>
  interpolate(frame, [a, b], [from, to], {
    easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const Stage: React.FC<{ children: React.ReactNode; clip?: boolean }> = ({
  children,
  clip,
}) => (
  <AbsoluteFill
    style={{
      backgroundColor: BG,
      fontFamily: FONT,
      overflow: clip ? "hidden" : undefined,
    }}
  >
    {children}
  </AbsoluteFill>
);

const card = (
  left: number,
  top: number,
  width = 400,
  height = 200,
): React.CSSProperties => ({
  backgroundColor: "#2b6cb0",
  borderRadius: 16,
  height,
  left,
  position: "absolute",
  top,
  width,
});

const ARROW = "M3 2 L3 26 L9.5 20 L14 30 L18 28 L13.5 18.5 L22 18.5 Z";

/** A tagged pointer with a tip, stretched along its own direction of travel. */
const Cursor: React.FC<{
  x: number;
  y: number;
  px: number;
  py: number;
}> = ({ x, y, px, py }) => {
  const speed = Math.hypot(x - px, y - py);
  const angle = (Math.atan2(y - py, x - px) * 180) / Math.PI;
  const stretch = 1 + Math.min(0.22, speed / 150);
  return (
    <div
      data-motion="cursor:pointer"
      style={{
        height: 64,
        left: x - 6,
        position: "absolute",
        top: y - 4,
        width: 64,
      }}
    >
      <div
        style={{
          height: 64,
          transform: `rotate(${angle}deg) scale(${stretch}, ${1 / stretch}) rotate(${-angle}deg)`,
          transformOrigin: "6px 4px",
          width: 64,
        }}
      >
        <svg viewBox="0 0 32 32" width={64} height={64}>
          <path d={ARROW} fill="#fff" stroke="#000" strokeWidth={1.5} />
        </svg>
        <div
          data-motion-tip
          style={{ height: 2, left: 5, position: "absolute", top: 3, width: 2 }}
        />
      </div>
    </div>
  );
};

/** 1. A card slides out behind its window's clipped edge and back; a chip leaves past the top of a clipped canvas. */
export const ClipSlide: React.FC = () => {
  const frame = useCurrentFrame();
  const down = tween(frame, 20, 50, 0, 1) - tween(frame, 70, 90, 0, 1, OUT);
  const up = tween(frame, 100, 112, 0, 1, Easing.in(Easing.cubic));
  return (
    <Stage clip>
      <div
        data-motion="window:main"
        style={{
          ...card(460, 200, 1000, 680),
          backgroundColor: "#f4f4f5",
          overflow: "hidden",
        }}
      >
        <div data-motion="card:note" style={card(300, 240 + 700 * down)} />
      </div>
      <div
        data-motion="chip:toast"
        style={{
          ...card(760, 60 - 400 * up, 400, 100),
          backgroundColor: "#38a169",
        }}
      />
    </Stage>
  );
};

/** 2. A headline revealed upwards from behind a mask, above a window: its hidden part would overlap the window. */
export const ClippedTitle: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Stage>
      <div
        style={{
          height: 200,
          left: 0,
          overflow: "hidden",
          position: "absolute",
          top: 300,
          width: 1920,
        }}
      >
        <div
          style={{
            color: "#fff",
            fontSize: 140,
            fontWeight: 700,
            left: 0,
            position: "absolute",
            textAlign: "center",
            top: tween(frame, 10, 40, 160, 20, OUT),
            width: 1920,
          }}
        >
          Ship it today
        </div>
      </div>
      <div
        style={{ ...card(460, 520, 1000, 500), backgroundColor: "#f4f4f5" }}
      />
    </Stage>
  );
};

/** 3. A cursor that lives inside a clipping window: it enters and leaves past the window's edges, and the camera pans it. */
export const ClippedCursor: React.FC = () => {
  const frame = useCurrentFrame();
  const at = (f: number) => ({
    x:
      tween(f, 10, 22, -80, 400) +
      tween(f, 95, 107, 0, 700, Easing.in(Easing.cubic)),
    y: tween(f, 10, 22, 500, 300),
  });
  const p = at(frame);
  const q = at(frame - 1);
  const pan = tween(frame, 35, 60, 0, -600) + tween(frame, 65, 90, 0, 600);
  return (
    <Stage>
      <div style={{ left: pan, position: "absolute", top: 0 }}>
        <div
          data-motion="window:app"
          style={{
            ...card(660, 190, 1000, 700),
            backgroundColor: "#f4f4f5",
            overflow: "hidden",
          }}
        >
          {frame >= 10 && frame <= 109 ? (
            <Cursor x={p.x} y={p.y} px={q.x} py={q.y} />
          ) : null}
        </div>
      </div>
    </Stage>
  );
};

/** 4. A card that slides in from past the canvas edge, and a logo whose parts grow from nothing. */
export const NoPop: React.FC = () => {
  const frame = useCurrentFrame();
  const grow = tween(frame, 40, 56, 0, 1, OUT);
  return (
    <Stage clip>
      <div style={card(tween(frame, 10, 30, 1960, 1300, OUT), 400, 400, 300)} />
      {frame >= 40 ? (
        <svg
          viewBox="0 0 100 100"
          width={300}
          height={300}
          style={{ left: 300, position: "absolute", top: 390 }}
        >
          <g transform={`translate(50 50) scale(${grow}) translate(-50 -50)`}>
            <circle cx={50} cy={50} r={46} fill="#ecc94b" />
            <path
              d="M30 50 L45 65 L72 35"
              stroke={BG}
              strokeWidth={8}
              fill="none"
            />
          </g>
        </svg>
      ) : null}
    </Stage>
  );
};

/** 5. Cards that enter from below a clipped canvas on hard ease-out curves; one comes to rest peeking in from the edge. */
export const HardEaseOut: React.FC = () => {
  const frame = useCurrentFrame();
  const rise = (
    from: number,
    frames: number,
    easing: (t: number) => number,
    to = 400,
  ) => tween(frame, from, from + frames, 1700, to, easing);
  return (
    <Stage clip>
      <div
        data-motion="card:exp"
        style={card(260, rise(10, 24, Easing.out(Easing.exp)), 500, 320)}
      />
      <div
        data-motion="card:quint"
        style={card(1160, rise(10, 18, Easing.out(Easing.poly(5))), 500, 320)}
      />
      <div style={card(710, rise(50, 24, Easing.out(Easing.exp)), 500, 320)} />
      <div
        data-motion="card:peek"
        style={card(710, rise(50, 24, Easing.out(Easing.exp), 900), 500, 320)}
      />
    </Stage>
  );
};

/** 6. A static title set in a web font from @remotion/google-fonts, loaded when the title first renders. */
const LateTitle: React.FC = () => {
  const { fontFamily } = loadFont("normal", {
    weights: ["700"],
    subsets: ["latin"],
  });
  return (
    <div
      data-motion="headline:title"
      style={{
        color: "#fff",
        fontFamily,
        fontSize: 120,
        fontWeight: 700,
        left: 0,
        position: "absolute",
        textAlign: "center",
        top: 440,
        width: 1920,
      }}
    >
      Measured as it renders
    </div>
  );
};

export const WebFont: React.FC = () => (
  <Stage>
    <Sequence from={3} layout="none">
      <LateTitle />
    </Sequence>
  </Stage>
);

const Chevron: React.FC = () => (
  <svg viewBox="0 0 24 24" width={48} height={48}>
    <path d="M9 6 L15 12 L9 18" stroke="#a0aec0" strokeWidth={3} fill="none" />
  </svg>
);

/** 7. A status line whose verb changes from "Running" to "Ran", so the chevron and the rest of the line reflow. */
export const Reflow: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Stage>
      <div
        style={{
          alignItems: "center",
          color: "#fff",
          display: "flex",
          fontSize: 64,
          gap: 16,
          justifyContent: "center",
          left: 0,
          position: "absolute",
          top: 480,
          width: 1920,
        }}
      >
        <span data-motion="text:verb">{frame < 30 ? "Running" : "Ran"}</span>
        <Chevron />
        <span>three checks</span>
      </div>
    </Stage>
  );
};

/** 8. A cursor that clicks a button on its padding, away from its label. */
export const PointAtPadding: React.FC = () => {
  const frame = useCurrentFrame();
  const at = (f: number) => ({
    x: tween(f, 5, 25, 300, 1440),
    y: tween(f, 5, 25, 900, 560),
  });
  const p = at(frame);
  const q = at(frame - 1);
  return (
    <Stage>
      <button
        data-motion="button:send"
        style={{
          backgroundColor: "#2b6cb0",
          border: "none",
          borderRadius: 12,
          color: "#fff",
          fontFamily: FONT,
          fontSize: 32,
          height: 80,
          left: 1400,
          position: "absolute",
          top: 500,
          width: 220,
        }}
      >
        Send
      </button>
      <Cursor x={p.x} y={p.y} px={q.x} py={q.y} />
    </Stage>
  );
};

/** 9. Two cards on screen at once with the same tag; the first one leaves. */
export const DuplicateTags: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Stage>
      {frame < 30 ? (
        <div data-motion="card:item" style={card(300, 400)} />
      ) : null}
      <div data-motion="card:item" style={card(1200, 400)} />
    </Stage>
  );
};

const Icon: React.FC<{ left: number; top: number }> = ({ left, top }) => (
  <svg
    viewBox="0 0 24 24"
    width={96}
    height={96}
    style={{ left, position: "absolute", top }}
  >
    <circle cx={12} cy={12} r={10} fill="#a0aec0" />
  </svg>
);

/** 10. A badge shown for one frame by mistake, and one that blinks off for a frame; identical icons; identical windows crossing paths. */
export const Flicker: React.FC = () => {
  const frame = useCurrentFrame();
  const x = tween(frame, 20, 50, 0, 1);
  const badge = { ...card(1500, 80, 120, 50), backgroundColor: "#e53e3e" };
  return (
    <Stage>
      {frame === 15 ? <div style={badge} /> : null}
      {frame === 30 || frame >= 32 ? (
        <div data-motion="chip:status" style={{ ...badge, top: 160 }} />
      ) : null}
      {[0, 1, 2, 3, 4].map((i) =>
        frame >= 30 - 4 * i ? (
          <Icon key={i} left={460 + 120 * i} top={120} />
        ) : null,
      )}
      <div style={card(100 + 1320 * x, 450, 400, 300)} />
      <div style={card(1420 - 1320 * x, 450, 400, 300)} />
      <div style={card(100 + 1320 * x, 780, 300, 200)} />
      <div style={card(1520 - 1320 * x, 780, 300, 200)} />
    </Stage>
  );
};

/** 11. Text in a font family that is neither installed nor declared with @font-face. */
export const MissingFont: React.FC = () => (
  <Stage>
    <div
      style={{
        color: "#fff",
        fontFamily: '"Brand Display Missing", sans-serif',
        fontSize: 96,
        left: 0,
        position: "absolute",
        textAlign: "center",
        top: 480,
        width: 1920,
      }}
    >
      Declared but never loaded
    </div>
  </Stage>
);

/** A card that jumps, then moves and stops dead. */
const Glitch: React.FC<{ tag?: string }> = ({ tag }) => {
  const frame = useCurrentFrame();
  const x = frame < 10 ? 300 : 700;
  const y = tween(frame, 20, 32, 300, 700, Easing.linear);
  return <div data-motion={tag} style={card(x, y)} />;
};

/** 12. The same glitch played twice. */
export const Replay: React.FC = () => (
  <Stage>
    {[0, 60].map((from) => (
      <Sequence key={from} from={from} durationInFrames={34} layout="none">
        <Glitch tag="card:glitch" />
        <div style={{ left: 960, position: "absolute", top: 0 }}>
          <Glitch />
        </div>
      </Sequence>
    ))}
  </Stage>
);

/** 13. A container that accepts a jump for everything inside it. */
export const IgnoreSubtree: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Stage>
      <div data-motion-ignore="continuity/jump: a deliberate cut between two shots">
        <div
          data-motion="card:shot"
          style={card(frame < 20 ? 300 : 1200, 400)}
        />
      </div>
    </Stage>
  );
};
