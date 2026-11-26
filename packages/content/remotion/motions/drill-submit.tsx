import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, GREEN, Head, Line, Stage, stageMotion } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import {
  Desk,
  DrillDefs,
  drillPartsText,
  Paper,
  Scanner,
  SubmitBox,
  Tick,
  Tray,
} from "./drill-parts";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const drillSubmitText = drillPartsText;

export function DrillSubmit({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["drill-submit"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, draw } = stageMotion(t);
      const move = (id: string, beat: number, start: number, end: number, vars: gsap.TweenVars) =>
        t.to(
          id,
          { ...vars, duration: at(beat, end) - at(beat, start), ease: "power2.inOut" },
          at(beat, start),
        );
      rise("#desk", at(0, -0.5));
      show("#tray, #machine, #sheet", at(0, -0.4));
      t.set("#writing", { strokeDashoffset: 0 }, 0);
      t.to("#lamp", { fill: GREEN, duration: 0.2 }, at(0, 0.1));
      show("#passed", at(0, 0.3));
      show("#box, #box-front", at(0, 0.6));
      move("#sheet", 0, 1, 2.1, { x: 460, y: -40, rotation: 0 });
      move("#sheet", 0, 2.1, 3.2, { y: 340 });
      move("#sheet", 0, 3.2, 3.3, { opacity: 0 });
      show("#received", at(0, 3.4));
      draw("#next-path .line", at(1, 0.1), 0.7);
      show("#next-head", at(1, 0.7));
      show("#next", at(1, 0.9));
      t.fromTo(
        "#next",
        { y: -65, rotation: -7 },
        { y: 0, rotation: 0, duration: 0.7, immediateRender: false, ease: "power2.out" },
        at(1, 0.9),
      );
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <DrillDefs />
      <defs>
        <clipPath id="insertion-clip">
          <rect width={1920} height={684} />
        </clipPath>
      </defs>
      <Desk />
      <g id="tray" opacity={0}>
        <g transform="translate(510 535) scale(1.2)">
          <Tray />
          <Tray front />
        </g>
      </g>
      <g id="machine" opacity={0}>
        <g transform="translate(940 270) scale(1.2)">
          <Scanner />
        </g>
      </g>
      <g id="box" opacity={0}>
        <g transform="translate(1480 310) scale(1.1)">
          <SubmitBox />
        </g>
      </g>
      <g clipPath="url(#insertion-clip)">
        <g id="sheet" opacity={0}>
          <g transform="translate(1060 300) scale(.9)">
            <Paper ink="writing" stamp="passed" />
          </g>
        </g>
      </g>
      <g id="box-front" opacity={0}>
        <g transform="translate(1480 310) scale(1.1)">
          <SubmitBox front />
        </g>
      </g>
      <g id="received" opacity={0}>
        <Tick x={1710} y={665} />
      </g>
      <g id="next" opacity={0}>
        <g transform="translate(100 300) scale(1.25)">
          <Paper number={2} />
        </g>
      </g>
      <Line id="next-path" d="M1600 790 C1600 865 275 865 275 800" color={BLUE} />
      <Head id="next-head" x={275} y={800} angle={-90} color={BLUE} />
    </Stage>
  );
}
