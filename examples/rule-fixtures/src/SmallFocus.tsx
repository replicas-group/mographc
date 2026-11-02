import { useCurrentFrame } from "remotion";
import { MONO, Stage, tween, Window } from "./ui";

type Variant = "wide" | "pushed" | "reread" | "linger" | "linked";

const REQUEST =
  "Review the open pull request and fix the failing checkout test";

// The key line of a section, a request in a chat bubble, held in a wide shot of a large window
// ("wide"), and four films that shouldn't be reported:
// - "pushed": the camera pushes in on the bubble;
// - "reread": the request is read while pushed in, collapses, and comes back in a wide shot;
// - "linger": a short status line is read while pushed in, then the camera pulls back;
// - "linked": a finding joined by a leader line to a marker elsewhere in the window.
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
          {variant === "linger" ? (
            <div
              style={{
                color: "#57606A",
                fontSize: 30,
                left: 280,
                position: "absolute",
                top: 150,
              }}
            >
              Thought for 1s
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
              <svg
                width={520}
                height={300}
                style={{
                  left: 620,
                  opacity: bubbleIn,
                  position: "absolute",
                  top: 140,
                }}
              >
                <path d="M0 0 L500 280" stroke="#B42318" strokeWidth={3} />
              </svg>
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
    </Stage>
  );
};
