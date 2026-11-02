import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CURVE, FONT, MONO, Panel, tween } from "./shared";

// A chat interface under a build log: a prompt typed in small type, then a reply streamed word by word into a list
// that scrolls as it grows, and a live "Working for Ns" counter.
const PROMPT = "Find out why the nightly build is failing";
const ANSWER =
  "The nightly build fails because the cache key ignores the lockfile, so a stale copy of the parser is restored. I changed the key to hash the lockfile and reran the build, which now passes in four minutes.";
const WORDS = ANSWER.split(" ");

export const Chat: React.FC = () => {
  const frame = useCurrentFrame();
  const typed = PROMPT.slice(
    0,
    Math.floor(tween(frame, 10, 70, 0, PROMPT.length, (t) => t)),
  );
  const sent = tween(frame, 78, 92, 0, 1, CURVE.arrive);
  const streamed = Math.max(
    0,
    Math.min(WORDS.length, Math.floor((frame - 96) / 3)),
  );
  const seconds = Math.max(0, Math.floor((frame - 96) / 30));
  return (
    <AbsoluteFill style={{ background: "#F6F7F9", fontFamily: FONT }}>
      <Panel
        tag="window:chat"
        style={{ left: 360, top: 90, width: 1200, height: 900 }}
      >
        <div
          style={{
            bottom: 140,
            display: "flex",
            flexDirection: "column",
            gap: 24,
            height: 560,
            justifyContent: "flex-end",
            left: 48,
            overflow: "hidden",
            position: "absolute",
            right: 48,
          }}
        >
          <div
            style={{
              background: "#0D1117",
              borderRadius: 16,
              color: "#E6EDF3",
              flexShrink: 0,
              fontFamily: MONO,
              fontSize: 24,
              height: 300,
              padding: 24,
            }}
          >
            <div>nightly #1182 failed: parser.test.ts</div>
          </div>
          {frame >= 78 ? (
            <div
              style={{
                alignSelf: "flex-end",
                background: "#1F6FEB",
                borderRadius: 20,
                color: "#FFFFFF",
                fontSize: 30,
                opacity: sent,
                padding: "16px 24px",
                transform: `translateY(${(1 - sent) * 30}px)`,
              }}
            >
              {PROMPT}
            </div>
          ) : null}
          {streamed > 0 ? (
            <div
              data-motion="text:answer"
              style={{
                background: "#EEF0F3",
                borderRadius: 20,
                color: "#111111",
                fontSize: 30,
                lineHeight: 1.35,
                padding: "16px 24px",
              }}
            >
              {WORDS.slice(0, streamed).map((w, i) => (
                <span
                  key={i}
                  style={{
                    opacity: tween(frame, 96 + i * 3, 102 + i * 3, 0, 1),
                  }}
                >
                  {w}{" "}
                </span>
              ))}
            </div>
          ) : null}
          {frame >= 96 ? (
            <div style={{ color: "#57606A", fontSize: 24 }}>
              Working for {seconds}s
            </div>
          ) : null}
        </div>
        <div
          style={{
            border: "1px solid #D8DCE2",
            borderRadius: 16,
            bottom: 40,
            color: "#111111",
            fontSize: 22,
            height: 64,
            left: 40,
            lineHeight: "64px",
            opacity: frame < 78 ? 1 : 0.4,
            paddingLeft: 20,
            position: "absolute",
            right: 40,
          }}
        >
          {frame < 78 ? typed : ""}
        </div>
      </Panel>
    </AbsoluteFill>
  );
};
