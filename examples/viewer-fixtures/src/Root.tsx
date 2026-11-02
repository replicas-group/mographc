import { Composition } from "remotion";
import { Chat } from "./Chat";
import { BadElement, BadRange } from "./Errors";
import { Cards, HiddenSvg, Logo, NearlyRead } from "./Reading";
import { Settle } from "./Settle";

const films: [string, React.FC, number][] = [
  ["Chat", Chat, 240],
  ["NearlyRead", NearlyRead, 210],
  ["HiddenSvg", HiddenSvg, 150],
  ["Cards", Cards, 150],
  ["Logo", Logo, 60],
  ["Settle", Settle, 60],
  ["BadRange", BadRange, 30],
  ["BadElement", BadElement, 30],
];

export const RemotionRoot: React.FC = () => (
  <>
    {films.map(([id, component, durationInFrames]) => (
      <Composition
        key={id}
        id={id}
        component={component}
        durationInFrames={durationInFrames}
        fps={30}
        width={1920}
        height={1080}
      />
    ))}
  </>
);
