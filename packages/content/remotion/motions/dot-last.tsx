import { useCallback, useMemo, useRef } from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, Stage, stageMotion } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import { cardX, SearchCards } from "./card-find-at";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const LETTERS = [..."plan.v2.txt"];
const DOTS = [4, 7];
const LAST = 7;
const CODE = '"plan.v2.txt".lastIndexOf(".") → 7';
export const dotLastText = `${LETTERS.join("")}012345678910${CODE}`;

export function DotLast({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["dot-last"].seconds), [beats]);
  const time = useCurrentFrame() / useVideoConfig().fps;
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show } = stageMotion(t);
      rise("#dot-cards", at(0));
      show("#dot-lens", at(2));
      show("#dot-code", at(3));
    },
    [at],
  );
  useTimeline(root, build);

  const arrival = at(2, 1.2);
  const lensX = interpolate(
    time,
    [at(2), arrival],
    [cardX(LETTERS.length, LETTERS.length - 1), cardX(LETTERS.length, LAST)],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) },
  );

  return (
    <Stage root={root}>
      <SearchCards
        id="dot"
        letters={LETTERS}
        lensX={lensX}
        candidates={time >= at(1) ? DOTS : undefined}
        match={time >= arrival ? LAST : undefined}
      />
      <CodeCallout id="dot-code" x={960} y={852} text={CODE} />
    </Stage>
  );
}
