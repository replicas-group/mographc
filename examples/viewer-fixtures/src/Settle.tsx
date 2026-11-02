import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { tween } from "./shared";

// Boxes that each make one move, for every pairing of curve, duration and distance, so the
// deceleration easing/harsh-settle measures can be read off for each.
export const CURVES = {
  standard: [0.4, 0, 0.2, 1],
  arrive: [0.16, 1, 0.3, 1],
  snappy: [0.12, 1, 0.24, 1],
  outCubic: [0.33, 1, 0.68, 1],
  outQuint: [0.22, 1, 0.36, 1],
} as const;
export const FRAMES = [6, 9, 12, 15, 18, 24, 30];
export const DISTANCES = [100, 200, 400, 800];

export const Settle: React.FC = () => {
  const frame = useCurrentFrame();
  const boxes = Object.entries(CURVES).flatMap(([name, c], i) =>
    FRAMES.flatMap((n, j) =>
      DISTANCES.map((d, k) => {
        const x = tween(
          frame,
          10,
          10 + n,
          0,
          d,
          Easing.bezier(c[0], c[1], c[2], c[3]),
        );
        return (
          <div
            key={`${name}-${n}-${d}`}
            data-motion={`card:${name}-${n}-${d}`}
            style={{
              background: "#1F6FEB",
              height: 90,
              left: 100 + x,
              position: "absolute",
              top: 40 + ((i * FRAMES.length + j) * DISTANCES.length + k) * 7,
              width: 90,
            }}
          />
        );
      }),
    ),
  );
  return <AbsoluteFill style={{ background: "#F6F7F9" }}>{boxes}</AbsoluteFill>;
};
