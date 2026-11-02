/** [x, y, width, height] in canvas px. */
export type Box = [number, number, number, number];

/** One element in one frame, as the probe logs it. */
export interface RawElement {
  /** Structural path: tag and class among same-kind siblings. */
  k: string;
  /** t: text, g: graphic (svg, img), b: painted box. */
  t: "t" | "g" | "b";
  /** Measured box: the glyphs for text, the border box otherwise. */
  b: Box;
  /** The part of it not clipped away by itself or an ancestor. */
  v: Box;
  /** For text that paints its own background or border, its border box. */
  pb?: Box;
  /** Effective opacity, ancestors included. */
  o: number;
  x?: string;
  /** Font size on screen. */
  fs?: number;
  /** Text colour, background, svg fill and svg path. */
  c?: string;
  bg?: string;
  fill?: string;
  d?: string;
  /** Font family rendered with a fallback because its face didn't load. */
  fb?: string;
  /** Image that failed to load. */
  br?: 1;
  /** Its box, text and drop shadows, as computed. */
  sh?: string;
  /** Squash and stretch of all its transforms: long axis over short axis. */
  st?: number;
  /** Font weight and the first font family, for text. */
  fw?: number;
  ff?: string;
  /** An svg's painted fill and outline stroke, computed (currentColor resolved). */
  pf?: string;
  ps?: string;
  /** data-motion and data-motion-ignore. */
  id?: string;
  ig?: string;
  /** The hotspot of a tagged pointer: the centre of its `data-motion-tip` marker. */
  tp?: [number, number];
}

export interface RawFrame {
  f: number;
  c: [number, number];
  e: RawElement[];
}

export interface RawFilm {
  composition: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  frames: RawFrame[];
}
