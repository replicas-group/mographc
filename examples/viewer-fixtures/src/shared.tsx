import { Easing, interpolate } from "remotion";

export const CURVE = {
  move: Easing.bezier(0.4, 0, 0.2, 1),
  arrive: Easing.bezier(0.16, 1, 0.3, 1),
  leave: Easing.bezier(0.7, 0, 0.84, 0),
};

export const tween = (
  frame: number,
  a: number,
  b: number,
  from: number,
  to: number,
  easing = CURVE.move,
) =>
  interpolate(frame, [a, b], [from, to], {
    easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const FONT = "Helvetica, Arial, sans-serif";
export const MONO = "Menlo, Consolas, monospace";

export const Panel: React.FC<{
  tag?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ tag, style, children }) => (
  <div
    data-motion={tag}
    style={{
      background: "#FFFFFF",
      border: "1px solid #D8DCE2",
      borderRadius: 24,
      overflow: "hidden",
      position: "absolute",
      ...style,
    }}
  >
    {children}
  </div>
);
