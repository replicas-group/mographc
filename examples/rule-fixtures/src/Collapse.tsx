import { useCurrentFrame } from "remotion";
import { Stage, tween, Window } from "./ui";

const REQUEST = "Add a rule: our logo needs clear space";
const STEPS = [
  "Reading mographc.config.ts",
  "Writing rules/logo-clearspace.ts",
  "Running npx mographc lint",
  "Checking the end card",
  "Adding the rule to the config",
];

// A request is read while the camera is pushed in on it. Then the agent's steps expand under it
// and push it out of view, and collapse again, bringing it back in a wide shot. It was already
// read, so it isn't reported.
export const Collapse: React.FC = () => {
  const frame = useCurrentFrame();
  const push = tween(frame, 5, 45, 0, 1) - tween(frame, 75, 90, 0, 1);
  const open = tween(frame, 90, 105, 0, 1) * (1 - tween(frame, 160, 175, 0, 1));
  const scale = 1 + push * 1.6;
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
        {/* A sidebar beside the chat, which the camera push carries too. */}
        <div
          style={{
            background: "#EEF0F3",
            borderRadius: 24,
            height: 760,
            left: 40,
            position: "absolute",
            top: 160,
            width: 230,
          }}
        />
        <Window x={300} y={160} w={1320} h={760}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              left: 70,
              position: "absolute",
              top: 110 - open * 560,
              width: 900,
            }}
          >
            <div
              style={{
                alignSelf: "flex-start",
                background: "#1F6FEB",
                borderRadius: 20,
                color: "#FFFFFF",
                fontSize: 30,
                padding: "20px 28px",
              }}
            >
              {REQUEST}
            </div>
            <div
              style={{
                height: open * 560,
                opacity: open > 0.6 ? 1 : 0,
                overflow: "hidden",
              }}
            >
              {STEPS.map((s) => (
                <div
                  key={s}
                  style={{ color: "#57606A", fontSize: 30, padding: "4px 0" }}
                >
                  {s}
                </div>
              ))}
            </div>
            {[760, 540, 640].map((w) => (
              <div
                key={w}
                style={{
                  background: "#E3E6EA",
                  borderRadius: 10,
                  height: 22,
                  width: w,
                }}
              />
            ))}
          </div>
        </Window>
      </div>
    </Stage>
  );
};
