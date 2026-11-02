import { Easing, interpolate, useCurrentFrame } from "remotion";
import { Cursor, Stage, Window } from "./ui";

const path = (frame: number, fixed: boolean) => {
  const keys = fixed
    ? [
        { at: 0, x: 2000, y: 1100 },
        { at: 30, x: 1010, y: 640 },
        { at: 36, x: 1010, y: 640 },
        { at: 48, x: 1180, y: 780 },
      ]
    : [
        { at: 0, x: 2000, y: 1100 },
        { at: 30, x: 1010, y: 640 },
      ];
  let { x, y } = keys[0];
  for (let i = 1; i < keys.length; i += 1) {
    const opts = {
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    } as const;
    x = interpolate(frame, [keys[i - 1].at, keys[i].at], [x, keys[i].x], opts);
    y = interpolate(frame, [keys[i - 1].at, keys[i].at], [y, keys[i].y], opts);
  }
  return { x, y };
};

// The cursor clicks a button and then rests on its label. The fixed film moves it aside.
export const CursorOnText: React.FC<{ fixed: boolean }> = ({ fixed }) => {
  const frame = useCurrentFrame();
  const p = path(frame, fixed);
  const q = path(frame - 1, fixed);
  return (
    <Stage>
      <Window x={510} y={290} w={900} h={500}>
        <div
          style={{
            color: "#111111",
            fontSize: 44,
            fontWeight: 600,
            left: 60,
            position: "absolute",
            top: 70,
          }}
        >
          Ready to merge
        </div>
        <div
          data-motion="button:merge"
          style={{
            background: "#1A7F37",
            borderRadius: 16,
            color: "#FFFFFF",
            fontSize: 34,
            height: 90,
            left: 280,
            lineHeight: "90px",
            position: "absolute",
            textAlign: "center",
            top: 310,
            width: 340,
          }}
        >
          Merge pull request
        </div>
      </Window>
      <Cursor x={p.x} y={p.y} px={q.x} py={q.y} />
    </Stage>
  );
};
