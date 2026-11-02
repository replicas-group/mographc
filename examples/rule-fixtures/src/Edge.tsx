import { useCurrentFrame } from "remotion";
import { MONO, Stage, tween, Window } from "./ui";

// A finding in a terminal pane, joined to a marker on the film beside it by a leader line that
// starts at the pane's edge, level with the finding, not at the finding itself. Pushing in on the
// finding would hide the marker, so it isn't reported. Without the line ("linked": false), it is.
export const Edge: React.FC<{ linked: boolean }> = ({ linked }) => {
  const frame = useCurrentFrame();
  const opacity = tween(frame, 10, 24, 0, 1);
  return (
    <Stage>
      <Window x={40} y={140} w={880} h={800}>
        <div
          data-motion="marker:jump"
          style={{
            border: "4px solid #B42318",
            borderRadius: 30,
            height: 60,
            left: 380,
            opacity,
            position: "absolute",
            top: 470,
            width: 60,
          }}
        />
      </Window>
      <Window x={1000} y={100} w={880} h={880}>
        <div
          style={{
            background: "#F6F8FA",
            border: "1px solid #D0D7DE",
            borderRadius: 12,
            left: 40,
            padding: "20px 24px",
            position: "absolute",
            top: 220,
            width: 760,
          }}
        >
          <div
            style={{
              color: "#B42318",
              fontFamily: MONO,
              fontSize: 26,
              opacity,
            }}
          >
            error continuity/jump at 2.8 s
          </div>
        </div>
      </Window>
      {linked && (
        <svg
          width={1920}
          height={1080}
          style={{ left: 0, opacity, position: "absolute", top: 0 }}
        >
          <path d="M1000 355 L480 640" stroke="#B42318" strokeWidth={3} />
          <circle cx={1000} cy={355} r={6} fill="#B42318" />
        </svg>
      )}
    </Stage>
  );
};
