import type { SceneTimeline } from "../../src/scene-timeline";
import type { NarratedBeat } from "../../src/video-storyboard";
import type { MotionProps } from "../motions";
import type { MotionId } from "../motions/manifest";

export const MOTION_COMPOSITION_ID = "MotionScene";
export const VIDEO_FPS = 30;

export interface CodeToken {
  text: string;
  className?: string;
}

export type BeatOverlay = {
  start: number;
  end: number;
} & (
  | { term: NonNullable<NarratedBeat["term"]>; dialog?: never }
  | { term?: never; dialog: { title: string; fontSize: number; lines: CodeToken[][] } }
);

export type MotionSceneProps = MotionProps & {
  motion: MotionId;
  durationInFrames: number;
  fadeFromBackground: boolean;
  overlays: BeatOverlay[];
  think?: SceneTimeline["think"];
};
