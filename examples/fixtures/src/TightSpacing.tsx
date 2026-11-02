import { useCurrentFrame } from "remotion";
import { MONO, Stage, tween, Window } from "./ui";

// A heading close above a code panel, and a chat bubble close above a command line.
export const TightSpacing: React.FC<{ fixed: boolean }> = ({ fixed }) => {
  const frame = useCurrentFrame();
  const gap = fixed ? 36 : 6;
  return (
    <Stage>
      <Window
        x={360}
        y={140}
        w={1200}
        h={800}
        style={{ opacity: tween(frame, 0, 12, 0, 1) }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap,
            padding: 56,
          }}
        >
          <div style={{ color: "#111111", fontSize: 44, fontWeight: 600 }}>
            Fix the cart total
          </div>
          <div
            style={{
              background: "#F1F3F5",
              borderRadius: 12,
              color: "#24292F",
              fontFamily: MONO,
              fontSize: 26,
              padding: 24,
            }}
          >
            <div>- total = items.sum()</div>
            <div>+ total = items.sum() + tax</div>
          </div>
          <div
            style={{
              alignSelf: "flex-start",
              background: "#EEF0F3",
              borderRadius: 20,
              color: "#111111",
              fontSize: 32,
              marginTop: 40,
              padding: "20px 28px",
            }}
          >
            Push the fix to a new branch
          </div>
          <div style={{ color: "#24292F", fontFamily: MONO, fontSize: 28 }}>
            $ git push origin fix-total
          </div>
        </div>
      </Window>
    </Stage>
  );
};
