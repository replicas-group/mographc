import { Easing, interpolate } from "remotion";

export const FONT = "Helvetica, Arial, sans-serif";
export const MONO = "Menlo, 'DejaVu Sans Mono', monospace";

export const tween = (
  frame: number,
  a: number,
  b: number,
  from: number,
  to: number,
) =>
  interpolate(frame, [a, b], [from, to], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const Stage: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div
    style={{
      background: "#F6F7F9",
      fontFamily: FONT,
      height: 1080,
      overflow: "hidden",
      position: "absolute",
      width: 1920,
    }}
  >
    {children}
  </div>
);

export const Window: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ x, y, w, h, children, style }) => (
  <div
    data-motion="window:app"
    style={{
      background: "#FFFFFF",
      border: "1px solid #D8DCE2",
      borderRadius: 24,
      boxSizing: "border-box",
      height: h,
      left: x,
      overflow: "hidden",
      position: "absolute",
      top: y,
      width: w,
      ...style,
    }}
  >
    {children}
  </div>
);

const ARROW = "M3 2 L3 26 L9.5 20 L14 30 L18 28 L13.5 18.5 L22 18.5 Z";

/** A cursor whose tip is at (x, y), stretched along its direction of travel. */
export const Cursor: React.FC<{
  x: number;
  y: number;
  px: number;
  py: number;
}> = ({ x, y, px, py }) => {
  const speed = Math.hypot(x - px, y - py);
  const stretch = 1 + Math.min(0.22, speed / 150);
  const angle = (Math.atan2(y - py, x - px) * 180) / Math.PI;
  const size = 72;
  const tip = { x: (3 / 32) * size, y: (2 / 32) * size };
  return (
    <div
      data-motion="cursor:person"
      style={{
        height: size,
        left: x - tip.x,
        position: "absolute",
        top: y - tip.y,
        width: size,
      }}
    >
      <div
        style={{
          height: size,
          transform: `rotate(${angle}deg) scale(${stretch}, ${1 / stretch}) rotate(${-angle}deg)`,
          transformOrigin: `${tip.x}px ${tip.y}px`,
          width: size,
        }}
      >
        <svg viewBox="0 0 32 32" width={size} height={size}>
          <path
            d={ARROW}
            fill="#111111"
            stroke="#FFFFFF"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </svg>
        <div
          data-motion-tip
          style={{
            height: 1,
            left: tip.x,
            position: "absolute",
            top: tip.y,
            width: 1,
          }}
        />
      </div>
    </div>
  );
};
