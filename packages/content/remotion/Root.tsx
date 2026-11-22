import { type AnyZodObject, Composition } from "remotion";
import { MOTION_COMPOSITION_ID, type MotionSceneProps, VIDEO_FPS } from "./lib/props";
import { MotionScene } from "./MotionScene";
import { MOTIONS, type MotionId } from "./motions/manifest";

function previewProps(motion: MotionId): MotionSceneProps {
  const secondsPerBeat = 4.5;
  const lead = 0.8;
  const count = MOTIONS[motion].beats;
  const duration = lead + count * secondsPerBeat;
  return {
    motion,
    beats: Array.from({ length: count }, (_, i) => ({
      start: lead + i * secondsPerBeat,
      end: lead + (i + 1) * secondsPerBeat,
    })),
    duration,
    durationInFrames: Math.ceil(duration * VIDEO_FPS),
    fadeFromBackground: true,
    overlays: [],
  };
}

const canvas = { width: 1920, height: 1080, fps: VIDEO_FPS };

export function Root() {
  const defaultProps = previewProps("vending-change");
  return (
    <>
      <Composition<AnyZodObject, MotionSceneProps>
        id={MOTION_COMPOSITION_ID}
        component={MotionScene}
        {...canvas}
        durationInFrames={defaultProps.durationInFrames}
        defaultProps={defaultProps}
        calculateMetadata={({ props }) => ({ durationInFrames: props.durationInFrames })}
      />
      {(Object.keys(MOTIONS) as MotionId[]).map((motion) => {
        const props = previewProps(motion);
        return (
          <Composition<AnyZodObject, MotionSceneProps>
            key={motion}
            id={motion}
            component={MotionScene}
            {...canvas}
            durationInFrames={props.durationInFrames}
            defaultProps={props}
          />
        );
      })}
    </>
  );
}
