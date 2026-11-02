import { Composition } from "remotion";
import { BriefOverlap } from "./BriefOverlap";
import { CursorOnText } from "./CursorOnText";
import { CutText } from "./CutText";
import { EmptySurface } from "./EmptySurface";
import { SmallFocus } from "./SmallFocus";
import { TightSpacing } from "./TightSpacing";
import { TightSpacingAllowed } from "./TightSpacingAllowed";

const film = { durationInFrames: 90, fps: 30, width: 1920, height: 1080 };

// Each problem has a composition that shows it and one or more that don't ("Fixed" and others).
export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="TightSpacing"
      component={TightSpacing}
      defaultProps={{ fixed: false }}
      {...film}
    />
    <Composition
      id="TightSpacingFixed"
      component={TightSpacing}
      defaultProps={{ fixed: true }}
      {...film}
    />
    <Composition
      id="TightSpacingAllowed"
      component={TightSpacingAllowed}
      {...film}
    />
    <Composition
      id="BriefOverlap"
      component={BriefOverlap}
      defaultProps={{ variant: "glitch" as const }}
      {...film}
    />
    <Composition
      id="BriefOverlapFaded"
      component={BriefOverlap}
      defaultProps={{ variant: "faded" as const }}
      {...film}
    />
    <Composition
      id="BriefOverlapCrossfade"
      component={BriefOverlap}
      defaultProps={{ variant: "crossfade" as const }}
      {...film}
    />
    <Composition
      id="BriefOverlapFixed"
      component={BriefOverlap}
      defaultProps={{ variant: "fixed" as const }}
      {...film}
    />
    <Composition
      id="EmptySurface"
      component={EmptySurface}
      defaultProps={{ fixed: false }}
      {...film}
    />
    <Composition
      id="EmptySurfaceFixed"
      component={EmptySurface}
      defaultProps={{ fixed: true }}
      {...film}
    />
    <Composition
      id="SmallFocus"
      component={SmallFocus}
      defaultProps={{ variant: "wide" as const }}
      {...film}
    />
    <Composition
      id="SmallFocusFixed"
      component={SmallFocus}
      defaultProps={{ variant: "pushed" as const }}
      {...film}
    />
    <Composition
      id="SmallFocusReread"
      component={SmallFocus}
      defaultProps={{ variant: "reread" as const }}
      {...film}
      durationInFrames={240}
    />
    <Composition
      id="SmallFocusLinger"
      component={SmallFocus}
      defaultProps={{ variant: "linger" as const }}
      {...film}
      durationInFrames={120}
    />
    <Composition
      id="SmallFocusRelease"
      component={SmallFocus}
      defaultProps={{ variant: "release" as const }}
      {...film}
      durationInFrames={150}
    />
    <Composition
      id="SmallFocusLinked"
      component={SmallFocus}
      defaultProps={{ variant: "linked" as const }}
      {...film}
    />
    <Composition
      id="CursorOnText"
      component={CursorOnText}
      defaultProps={{ fixed: false }}
      {...film}
    />
    <Composition
      id="CursorOnTextFixed"
      component={CursorOnText}
      defaultProps={{ fixed: true }}
      {...film}
    />
    <Composition
      id="CutText"
      component={CutText}
      defaultProps={{ fixed: false }}
      {...film}
    />
    <Composition
      id="CutTextFixed"
      component={CutText}
      defaultProps={{ fixed: true }}
      {...film}
    />
  </>
);
