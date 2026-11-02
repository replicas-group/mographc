import { useCurrentFrame } from "remotion";
import { Stage, tween, Window } from "./ui";

// Close neighbours that aren't crowding: a large title 35 px over its subtitle, a speaker's name
// 10 px above their own bubble, and a marker ring drawn 16 px under a heading to point out a card.
export const TightSpacingAllowed: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = tween(frame, 0, 12, 0, 1);
  return (
    <Stage>
      <div style={{ left: 120, opacity, position: "absolute", top: 120 }}>
        <div style={{ color: "#111111", fontSize: 150, fontWeight: 700 }}>
          mographc
        </div>
        <div style={{ color: "#57606A", fontSize: 48, marginTop: 35 }}>
          Check motion before anyone watches
        </div>
      </div>
      <Window x={120} y={560} w={760} h={400} style={{ opacity }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: 56,
          }}
        >
          <div style={{ color: "#57606A", fontSize: 20 }}>you</div>
          <div
            style={{
              alignSelf: "flex-start",
              background: "#1F6FEB",
              borderRadius: 20,
              color: "#FFFFFF",
              fontSize: 38,
              marginTop: 10,
              padding: "20px 28px",
            }}
          >
            Order a pizza for six
          </div>
        </div>
      </Window>
      <div style={{ left: 1040, opacity, position: "absolute", top: 560 }}>
        <div style={{ color: "#111111", fontSize: 48, fontWeight: 600 }}>
          Track every parcel
        </div>
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #D8DCE2",
            borderRadius: 16,
            color: "#111111",
            fontSize: 30,
            height: 200,
            marginTop: 60,
            padding: 32,
            width: 640,
          }}
        >
          Parcel 1 of 3 is out for delivery
        </div>
        <div
          data-motion="marker:card"
          style={{
            border: "6px solid #D1242F",
            borderRadius: 24,
            height: 230,
            left: -20,
            position: "absolute",
            top: 70,
            width: 690,
          }}
        />
      </div>
    </Stage>
  );
};
