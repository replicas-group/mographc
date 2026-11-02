import { Composition } from "remotion";
import * as F from "./Fixtures";

const FILMS: [keyof typeof F, number][] = [
  ["ClipSlide", 130],
  ["ClippedTitle", 60],
  ["ClippedCursor", 120],
  ["NoPop", 70],
  ["HardEaseOut", 100],
  ["WebFont", 30],
  ["Reflow", 60],
  ["PointAtPadding", 40],
  ["DuplicateTags", 60],
  ["Flicker", 75],
  ["MissingFont", 20],
  ["Replay", 110],
  ["IgnoreSubtree", 40],
];

export const RemotionRoot: React.FC = () => (
  <>
    {FILMS.map(([id, duration]) => (
      <Composition
        key={id}
        id={id}
        component={F[id]}
        durationInFrames={duration}
        fps={30}
        width={1920}
        height={1080}
      />
    ))}
  </>
);
