import { useCurrentFrame } from "remotion";
import { Stage, tween, Window } from "./ui";

const Row: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ color: "#3B4048", fontSize: 30 }}>{text}</div>
);

// A large panel whose content sits in its top-left corner, then (in the fixed film) a panel the
// same size whose content fills it.
export const EmptySurface: React.FC<{ fixed: boolean }> = ({ fixed }) => {
  const frame = useCurrentFrame();
  return (
    <Stage>
      <Window
        x={260}
        y={150}
        w={1400}
        h={780}
        style={{ opacity: tween(frame, 0, 12, 0, 1) }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: fixed ? 40 : 28,
            padding: 56,
          }}
        >
          <div style={{ color: "#111111", fontSize: 48, fontWeight: 600 }}>
            Deploys
          </div>
          <Row text="api: ready" />
          <Row text="web: building" />
          {fixed && (
            <>
              <Row text="worker: queued, waiting for the api deploy to finish" />
              <Row text="docs: ready, published two minutes ago" />
              <div
                style={{
                  alignSelf: "flex-end",
                  background: "#1F6FEB",
                  borderRadius: 16,
                  color: "#FFFFFF",
                  fontSize: 32,
                  padding: "20px 40px",
                }}
              >
                Promote to production
              </div>
            </>
          )}
        </div>
      </Window>
    </Stage>
  );
};
