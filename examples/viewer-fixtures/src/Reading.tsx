import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CURVE, FONT, MONO, Panel, tween } from "./shared";

const Caption: React.FC<{ text: string; opacity?: number; top?: number }> = ({
  text,
  opacity = 1,
  top = 140,
}) => (
  <div
    data-motion="caption:intro"
    style={{
      color: "#111111",
      fontSize: 52,
      left: 160,
      opacity,
      position: "absolute",
      top,
      width: 1600,
    }}
  >
    {text}
  </div>
);

// A caption that a card interrupts just before the viewer finishes reading it.
export const NearlyRead: React.FC = () => {
  const frame = useCurrentFrame();
  const card = tween(frame, 106, 124, 0, 1, CURVE.arrive);
  return (
    <AbsoluteFill style={{ background: "#F6F7F9", fontFamily: FONT }}>
      <Caption
        text="Every pull request gets a preview, a review and a summary"
        opacity={tween(frame, 6, 16, 0, 1)}
      />
      {frame >= 106 ? (
        <Panel
          tag="card:deploy"
          style={{
            left: 560,
            top: 420,
            width: 800,
            height: 360,
            opacity: card,
            transform: `translateY(${(1 - card) * 120}px)`,
          }}
        >
          <div style={{ fontSize: 40, padding: 48 }}>Deploy finished</div>
        </Panel>
      ) : null}
    </AbsoluteFill>
  );
};

// An SVG drawn at full opacity whose shapes are all invisible until 3 s.
export const HiddenSvg: React.FC = () => {
  const frame = useCurrentFrame();
  const slide = tween(frame, 45, 65, 0, 1, CURVE.arrive);
  return (
    <AbsoluteFill style={{ background: "#F6F7F9", fontFamily: FONT }}>
      <Caption
        text="Every pull request gets a preview, a review and a summary"
        opacity={tween(frame, 6, 16, 0, 1)}
      />
      <svg
        data-motion="graphic:chart"
        viewBox="0 0 100 100"
        width={560}
        height={560}
        style={{
          left: 680,
          position: "absolute",
          top: 400,
          transform: `translateX(${(1 - slide) * 400}px)`,
        }}
      >
        <rect
          x={10}
          y={10}
          width={80}
          height={80}
          fill="#1F6FEB"
          opacity={tween(frame, 90, 105, 0, 1)}
        />
      </svg>
    </AbsoluteFill>
  );
};

// Three chips in a row whose labels sit on one baseline, two cards side by side, and a terminal with stacked lines.
// The camera pushes in on the left card while its text is read.
export const Cards: React.FC = () => {
  const frame = useCurrentFrame();
  const push = tween(frame, 70, 94, 0, 1);
  const scale = 1 + 0.25 * push;
  return (
    <AbsoluteFill style={{ background: "#F6F7F9", fontFamily: FONT }}>
      <AbsoluteFill
        style={{
          transform: `translate(${-460 * (scale - 1)}px, ${-400 * (scale - 1)}px) scale(${scale})`,
          transformOrigin: "0 0",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            left: 160,
            position: "absolute",
            top: 80,
          }}
        >
          {["Lint passed", "Tests passed", "Preview ready"].map((t) => (
            <div
              key={t}
              style={{
                background: "#E7F3EC",
                borderRadius: 12,
                color: "#1A7F37",
                fontSize: 30,
                padding: "10px 8px",
              }}
            >
              {t.split(" ").map((w) => (
                <span key={w}>{`${w} `}</span>
              ))}
            </div>
          ))}
        </div>
        <Panel
          tag="card:build"
          style={{ left: 160, top: 200, width: 760, height: 400 }}
        >
          <div style={{ fontSize: 36, padding: 40 }}>
            Build passed in four minutes
          </div>
        </Panel>
        <Panel
          tag="card:deploy"
          style={{ left: 960, top: 200, width: 760, height: 400 }}
        >
          <div style={{ fontSize: 36, padding: 40 }}>
            Deploy waiting for review
          </div>
        </Panel>
        <Panel
          tag="panel:terminal"
          style={{
            left: 160,
            top: 660,
            width: 1560,
            height: 300,
            background: "#0D1117",
          }}
        >
          <div
            style={{
              color: "#E6EDF3",
              fontFamily: MONO,
              fontSize: 26,
              padding: 32,
            }}
          >
            {[
              "$ npm run build",
              "compiled 214 modules in 3.1 s",
              "$ npm test",
              "48 passed, 0 failed",
            ].map((l) => (
              <div key={l} style={{ lineHeight: 1.4 }}>
                {l}
              </div>
            ))}
          </div>
        </Panel>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// A logo inside a card, and from 1 s a wordmark set right beside it. The clear-space rule in
// docs/writing-rules.md should report the wordmark once, and not the card the logo sits on.
export const Logo: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#F6F7F9", fontFamily: FONT }}>
      <Panel
        tag="card:brand"
        style={{ left: 560, top: 240, width: 800, height: 600 }}
      >
        <svg
          data-motion="logo:mark"
          viewBox="0 0 100 100"
          width={160}
          height={160}
          style={{ left: 200, position: "absolute", top: 220 }}
        >
          <circle cx={50} cy={50} r={45} fill="#1F6FEB" />
        </svg>
        {frame >= 30 ? (
          <div
            style={{
              fontSize: 64,
              left: 400,
              opacity: tween(frame, 30, 40, 0, 1),
              position: "absolute",
              top: 260,
            }}
          >
            Acme
          </div>
        ) : null}
      </Panel>
    </AbsoluteFill>
  );
};
