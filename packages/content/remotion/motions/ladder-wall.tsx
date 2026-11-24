import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, CodeCallout, GRAY, INK, LINE, PINK, Stage, stageMotion, Tag } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const WALL = "4m";
const FLOOR = "3m";
const LADDER = "5m";
const EXPRESSION = "Math.hypot(3, 4) → 5";
const WALL_TOP = 242;
const FLOOR_TOP = 662;
const LADDER_RUN = 315;
const LADDER_RISE = FLOOR_TOP - WALL_TOP;
const LEFT_RAIL = 814;
const RIGHT_RAIL = 880;
const RAILS = `M ${LEFT_RAIL} ${WALL_TOP} l ${LADDER_RUN} ${LADDER_RISE} M ${RIGHT_RAIL} ${WALL_TOP} l ${LADDER_RUN} ${LADDER_RISE}`;
export const ladderWallText = [WALL, FLOOR, LADDER, EXPRESSION].join("");

export function LadderWall({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["ladder-wall"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#ladder-corner", at(0));
      show("#ladder-wood", at(1), { duration: 0.55 });
      show("#ladder-measures, #ladder-height, #ladder-width, #ladder-length", at(2));
      show("#ladder-expression", at(3));
      emphasize("ladder-expression", at(3, 0.45));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="ladder-corner">
        <path
          d="M 686 166 H 806 V 662 H 1404 V 695 H 686 Z"
          fill="#E8E5E0"
          stroke={GRAY}
          strokeWidth={8}
          strokeLinejoin="round"
        />
        <path d="M 688 299 H 803 M 688 434 H 803 M 688 569 H 803" stroke={LINE} strokeWidth={6} />
      </g>
      <g id="ladder-wood" opacity={0}>
        <path d={RAILS} stroke={INK} strokeWidth={20} />
        <path d={RAILS} stroke="#BC8C59" strokeWidth={13} />
        {Array.from({ length: 8 }, (_, i) => {
          const drop = 35 + i * 50;
          return (
            <path
              key={drop}
              d={`M ${LEFT_RAIL + (drop * LADDER_RUN) / LADDER_RISE} ${WALL_TOP + drop} h ${RIGHT_RAIL - LEFT_RAIL}`}
              stroke="#986536"
              strokeWidth={12}
            />
          );
        })}
      </g>
      <g
        id="ladder-measures"
        opacity={0}
        fill="none"
        stroke={BLUE}
        strokeWidth={5}
        strokeLinecap="round"
      >
        <path
          d={`M 656 ${WALL_TOP} H 635 V ${FLOOR_TOP} H 656 M ${LEFT_RAIL} 719 V 728 h ${LADDER_RUN} v -9`}
        />
      </g>
      <Tag id="ladder-height" x={543} y={452} text={WALL} color={BLUE} />
      <Tag id="ladder-width" x={LEFT_RAIL + LADDER_RUN / 2} y={785} text={FLOOR} color={BLUE} />
      <Tag id="ladder-length" x={1190} y={407} text={LADDER} color={PINK} />
      <CodeCallout id="ladder-expression" x={960} y={896} text={EXPRESSION} />
    </Stage>
  );
}
