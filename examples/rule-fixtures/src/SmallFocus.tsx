import { useCurrentFrame } from "remotion";
import { MONO, Stage, tween, Window } from "./ui";

type Variant = "wide" | "pushed" | "reread" | "linger" | "release" | "linked";

const REQUEST =
  "Review the open pull request and fix the failing checkout test";

// The key line of a section, a request in a chat bubble, held in a wide shot of a large window
// ("wide"), and four films that shouldn't be reported:
// - "pushed": the camera pushes in on the bubble;
// - "reread": the request is read while pushed in, collapses, and comes back in a wide shot;
// - "linger": a short status line is read while pushed in, then the camera pulls back;
// - "release": a longer status line the camera pushes in on, then pulls back from before it's read;
// - "linked": a finding joined by a leader line, drawn in a canvas-sized svg, to a marker.
export const SmallFocus: React.FC<{ variant: Variant }> = ({ variant }) => {
  const frame = useCurrentFrame();
  const bubbleIn = tween(frame, 10, 24, 0, 1);
  const push =
    variant === "pushed"
      ? tween(frame, 20, 40, 0, 1)
      : variant === "reread"
        ? 1 - tween(frame, 100, 115, 0, 1)
        : variant === "linger"
          ? 1 - tween(frame, 45, 60, 0, 1)
          : variant === "release"
            ? 1 - tween(frame, 20, 35, 0, 1)
            : 0;
  // The request collapses for over a second, then comes back.
  const shown =
    variant !== "reread"
      ? bubbleIn
      : frame < 100
        ? 1
        : tween(frame, 140, 150, 0, 1);
  const scale = 1 + push * 1.2;
  const focus = { x: 700, y: 330 };
  return (
    <Stage>
      <div
        style={{
          height: 1080,
          position: "absolute",
          transform: `translate(${(960 - focus.x) * push}px, ${(540 - focus.y) * push}px) scale(${scale})`,
          transformOrigin: `${focus.x}px ${focus.y}px`,
          width: 1920,
        }}
      >
        <Window x={300} y={160} w={1320} h={760}>
          {/* Earlier messages, as placeholder lines. */}
          {[
            { left: 70, top: 300, w: 760 },
            { left: 70, top: 350, w: 540 },
            { left: 610, top: 470, w: 640 },
            { left: 760, top: 520, w: 490 },
            { left: 70, top: 640, w: 700 },
            { left: 70, top: 690, w: 380 },
          ].map((l) => (
            <div
              key={l.top}
              style={{
                background: "#E3E6EA",
                borderRadius: 10,
                height: 22,
                left: l.left,
                position: "absolute",
                top: l.top,
                width: l.w,
              }}
            />
          ))}
          {variant === "linger" || variant === "release" ? (
            <div
              style={{
                color: "#57606A",
                fontSize: 30,
                left: 280,
                position: "absolute",
                top: 150,
              }}
            >
              {variant === "linger"
                ? "Thought for 1s"
                : "Thought for 1s while reading the cart module and its tests"}
            </div>
          ) : variant === "linked" ? (
            <>
              <div
                style={{
                  background: "#FFF1F0",
                  border: "1px solid #F5C2C0",
                  borderRadius: 12,
                  color: "#B42318",
                  fontFamily: MONO,
                  fontSize: 28,
                  left: 70,
                  opacity: bubbleIn,
                  padding: "16px 24px",
                  position: "absolute",
                  top: 110,
                }}
              >
                error layout/text-cut at 2.4 s
              </div>

              <div
                style={{
                  border: "4px solid #B42318",
                  borderRadius: 30,
                  height: 52,
                  left: 1124,
                  opacity: bubbleIn,
                  position: "absolute",
                  top: 394,
                  width: 52,
                }}
              />
            </>
          ) : (
            <div
              style={{
                background: "#1F6FEB",
                borderRadius: 20,
                color: "#FFFFFF",
                fontSize: 30,
                left: 70,
                lineHeight: 1.3,
                opacity: shown,
                padding: "20px 28px",
                position: "absolute",
                top: 110,
                transform: `translateY(${(1 - shown) * 30}px)`,
                width: 660,
              }}
            >
              {REQUEST}
            </div>
          )}
        </Window>
      </div>
      {variant === "linked" && (
        <svg
          width={1920}
          height={1080}
          style={{ left: 0, opacity: bubbleIn, position: "absolute", top: 0 }}
        >
          <path d="M930 300 L1426 570" stroke="#B42318" strokeWidth={3} />
        </svg>
      )}
    </Stage>
  );
};
