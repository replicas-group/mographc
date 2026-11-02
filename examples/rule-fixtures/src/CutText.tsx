import { Stage, Window } from "./ui";

// A button too narrow for its label, a list whose next row shows as a thin sliver at the
// window's bottom edge, and a paragraph whose last line is cut through by its box.
export const CutText: React.FC<{ fixed: boolean }> = ({ fixed }) => (
  <Stage>
    <Window x={260} y={140} w={620} h={fixed ? 340 : 266}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          padding: 56,
        }}
      >
        {["Checkout total fixed", "Tax added to the sum", "Tests pass"].map(
          (t) => (
            <div key={t} style={{ color: "#111111", fontSize: 36 }}>
              {t}
            </div>
          ),
        )}
        <div style={{ color: "#111111", fontSize: 36 }}>Ready for review</div>
      </div>
    </Window>
    <div
      style={{
        color: "#3B4048",
        fontSize: 30,
        height: fixed ? 72 : 60,
        left: 260,
        lineHeight: "36px",
        overflow: "hidden",
        position: "absolute",
        top: 700,
        width: 560,
      }}
    >
      The agent opened a pull request with the fix and a new test.
    </div>
    <div
      data-motion="button:review"
      style={{
        background: "#1F6FEB",
        borderRadius: 16,
        boxSizing: "border-box",
        color: "#FFFFFF",
        fontSize: 34,
        height: 90,
        left: 1000,
        lineHeight: "90px",
        overflow: "hidden",
        padding: "0 0 0 32px",
        position: "absolute",
        top: 860,
        whiteSpace: "nowrap",
        width: fixed ? 400 : 300,
      }}
    >
      Review pull request
    </div>
  </Stage>
);
