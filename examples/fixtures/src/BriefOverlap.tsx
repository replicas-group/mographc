import { useCurrentFrame } from "remotion";
import { Stage } from "./ui";

const Line: React.FC<{ text: string; opacity: number }> = ({
  text,
  opacity,
}) => (
  <div
    style={{
      color: "#111111",
      fontSize: 72,
      fontWeight: 600,
      left: 0,
      opacity,
      position: "absolute",
      textAlign: "center",
      top: 490,
      width: 1920,
    }}
  >
    {text}
  </div>
);

// One caption replaces another in the same place. "glitch": both are fully drawn for one frame.
// "crossfade": they cross over two frames at half opacity. "fixed": the second starts as the first ends.
export const BriefOverlap: React.FC<{
  variant: "glitch" | "crossfade" | "fixed";
}> = ({ variant }) => {
  const frame = useCurrentFrame();
  const swap = 45;
  const first =
    variant === "glitch"
      ? frame <= swap
      : variant === "crossfade"
        ? frame <= swap + 1
        : frame < swap;
  const fade = variant === "crossfade" && frame >= swap && frame <= swap + 1;
  return (
    <Stage>
      {first && <Line text="Tests are failing" opacity={fade ? 0.45 : 1} />}
      {frame >= swap && (
        <Line text="Every check passes" opacity={fade ? 0.45 : 1} />
      )}
    </Stage>
  );
};
