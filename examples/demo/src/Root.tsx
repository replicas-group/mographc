import { Composition } from "remotion";
import { Demo } from "./Demo";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Demo"
      component={Demo}
      defaultProps={{ broken: false }}
      durationInFrames={154}
      fps={30}
      width={1920}
      height={1080}
    />
    {/* The same film with three bugs in it, to show what mographc reports. */}
    <Composition
      id="DemoBroken"
      component={Demo}
      defaultProps={{ broken: true }}
      durationInFrames={154}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);
