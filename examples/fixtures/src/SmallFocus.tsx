import { useCurrentFrame } from "remotion";
import { Stage, tween, Window } from "./ui";

// The key line of a section, a request in a chat bubble, held in a wide shot of a large window.
// The fixed film pushes the camera in on the bubble.
export const SmallFocus: React.FC<{ fixed: boolean }> = ({ fixed }) => {
  const frame = useCurrentFrame();
  const bubbleIn = tween(frame, 10, 24, 0, 1);
  const push = fixed ? tween(frame, 20, 40, 0, 1) : 0;
  const scale = 1 + push * 1.2;
  // Keep the bubble's centre where the camera points.
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
          <div
            style={{
              background: "#1F6FEB",
              borderRadius: 20,
              color: "#FFFFFF",
              fontSize: 30,
              left: 70,
              lineHeight: 1.3,
              opacity: bubbleIn,
              padding: "20px 28px",
              position: "absolute",
              top: 110,
              transform: `translateY(${(1 - bubbleIn) * 30}px)`,
              width: 660,
            }}
          >
            Review the open pull request and fix the failing checkout test
          </div>
        </Window>
      </div>
    </Stage>
  );
};
