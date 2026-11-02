import { useCurrentFrame } from "remotion";
import { MONO, Stage, tween, Window } from "./ui";

// A 48 px heading 22 px (0.46 of its size) above a code panel, and a padded chat bubble 12 px
// above a command line. Beside them, a large headline cut off by its own window's edge, whose
// hidden part reaches the next window: on screen it is far from it, so it isn't reported.
export const TightSpacing: React.FC<{ fixed: boolean }> = ({ fixed }) => {
  const frame = useCurrentFrame();
  const opacity = tween(frame, 0, 12, 0, 1);
  return (
    <Stage>
      <Window x={20} y={380} w={480} h={320} style={{ opacity }}>
        <div
          data-motion-ignore="layout/text-cut: cut off by its window on purpose"
          style={{
            color: "#111111",
            fontSize: 100,
            fontWeight: 700,
            left: 20,
            position: "absolute",
            top: 90,
            whiteSpace: "nowrap",
          }}
        >
          Launch week
        </div>
      </Window>
      <Window x={680} y={140} w={1200} h={800} style={{ opacity }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: 56,
          }}
        >
          <div style={{ color: "#111111", fontSize: 48, fontWeight: 600 }}>
            Fix the cart total
          </div>
          <div
            style={{
              background: "#F1F3F5",
              borderRadius: 12,
              color: "#24292F",
              fontFamily: MONO,
              fontSize: 26,
              marginTop: fixed ? 36 : 22,
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
              marginTop: 60,
              padding: "20px 28px",
            }}
          >
            Push the fix to a new branch
          </div>
          <div
            style={{
              color: "#24292F",
              fontFamily: MONO,
              fontSize: 28,
              marginTop: fixed ? 36 : 12,
            }}
          >
            $ git push origin fix-total
          </div>
        </div>
      </Window>
    </Stage>
  );
};
