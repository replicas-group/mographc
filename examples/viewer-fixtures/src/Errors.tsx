import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

// Throws from frame 10: the input range stops increasing.
export const BadRange: React.FC = () => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, frame >= 10 ? 0 : 20], [0, 100], {
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ background: "#F6F7F9" }}>
      <div
        style={{
          background: "#1F6FEB",
          height: 100,
          left: x,
          position: "absolute",
          width: 100,
        }}
      />
    </AbsoluteFill>
  );
};

const missing: Record<string, React.FC> = {};

// Renders an undefined component from frame 5, the usual cause of React error #130.
export const BadElement: React.FC = () => {
  const frame = useCurrentFrame();
  const Icon = missing.Icon;
  return (
    <AbsoluteFill style={{ background: "#F6F7F9" }}>
      {frame >= 5 ? <Icon /> : null}
    </AbsoluteFill>
  );
};
