import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import {
  BLUE,
  CodeCallout,
  Head,
  INK,
  Line,
  Stage,
  stageMotion,
  Tag,
  Text,
  VIOLET,
} from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const VALUES = ["-3", "-2", "-1", "0", "1", "2", "+3"];
const DISTANCE = "3歩";
const EXPRESSION = "Math.abs(-3) → 3";
export const stepsDistanceText = [...VALUES, DISTANCE, DISTANCE, EXPRESSION].join("");

export function StepsDistance({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["steps-distance"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, draw, emphasize } = stageMotion(t);
      rise("#steps-scene", at(0));
      draw("#steps-west .line, #steps-east .line", at(1));
      show("#steps-west-head, #steps-east-head", at(1, 0.5));
      show("#steps-west-distance, #steps-east-distance", at(2));
      show("#steps-expression", at(3));
      emphasize("steps-expression", at(3, 0.45));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="steps-scene">
        <rect
          x={849}
          y={281}
          width={222}
          height={162}
          rx={9}
          fill="#F8E3BC"
          stroke={INK}
          strokeWidth={8}
        />
        <path
          d="M 820 289 L 960 167 L 1100 289 Z"
          fill="#A24735"
          stroke={INK}
          strokeWidth={8}
          strokeLinejoin="round"
        />
        <rect
          x={931}
          y={352}
          width={58}
          height={91}
          rx={5}
          fill="#976240"
          stroke={INK}
          strokeWidth={6}
        />
        <path
          d="M 872 329 H 911 V 370 H 872 Z M 1009 329 H 1048 V 370 H 1009 Z"
          fill="#DCEEFE"
          stroke={INK}
          strokeWidth={5}
        />
        <path d="M 302 610 H 1618" stroke={INK} strokeWidth={7} strokeLinecap="round" />
        {VALUES.map((value, i) => {
          const x = 360 + i * 200;
          return (
            <g key={value}>
              <path d={`M ${x} 593 V 627`} stroke={INK} strokeWidth={7} strokeLinecap="round" />
              <Text x={x} y={689} size={48}>
                {value}
              </Text>
            </g>
          );
        })}
      </g>
      <Line id="steps-west" d="M 948 532 H 360" color={VIOLET} />
      <Line id="steps-east" d="M 972 532 H 1560" color={BLUE} />
      <Head id="steps-west-head" x={360} y={532} angle={180} color={VIOLET} />
      <Head id="steps-east-head" x={1560} y={532} angle={0} color={BLUE} />
      <Tag id="steps-west-distance" x={650} y={448} text={DISTANCE} />
      <Tag id="steps-east-distance" x={1270} y={448} text={DISTANCE} color={BLUE} />
      <CodeCallout id="steps-expression" x={960} y={863} text={EXPRESSION} />
    </Stage>
  );
}
