import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import {
  BLUE,
  Callout,
  GRAY,
  GREEN,
  INK,
  LINE,
  PINK,
  Stage,
  stageMotion,
  Tag,
  VIOLET,
} from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const LIMIT = "120cm";
const CONDITION = "身長 >= 120";
const PEOPLE = [
  { x: 388, height: 380, shift: 322, color: BLUE, result: "true", tagColor: GREEN },
  { x: 1250, height: 250, shift: -198, color: VIOLET, result: "false", tagColor: GRAY },
];
export const heightGateText = `${LIMIT}${PEOPLE.map(({ result }) => result).join("")}${CONDITION}`;

export function HeightGate({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["height-gate"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#gate-scene", at(0));
      show("#gate-limit, #gate-threshold", at(1));
      PEOPLE.forEach(({ shift }, index) => {
        const start = at(2, index * 1.55);
        const stop = at(2, index * 1.55 + 0.8);
        t.to(
          `#gate-person-${index}`,
          { x: shift, duration: stop - start, ease: "power2.inOut" },
          start,
        );
        show(`#gate-result-${index}`, stop);
      });
      show("#gate-condition", at(3));
      emphasize("gate-condition", at(3, 0.4));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="gate-scene">
        <path d="M 286 737 H 1665" stroke={LINE} strokeWidth={8} strokeLinecap="round" />
        <rect
          x={856}
          y={280}
          width={48}
          height={453}
          rx={12}
          fill="#fff"
          stroke={LINE}
          strokeWidth={8}
        />
        {Array.from({ length: 13 }, (_, index) => 304 + index * 34).map((y, index) => (
          <path
            key={y}
            d={`M ${index % 2 === 0 ? 870 : 880} ${y} H 901`}
            stroke={GRAY}
            strokeWidth={4}
          />
        ))}
        <g id="gate-threshold" opacity={0}>
          <path d="M 618 428 H 1144" stroke={PINK} strokeWidth={5} strokeDasharray="15 12" />
          <path d="M 856 428 H 904" stroke={PINK} strokeWidth={9} strokeLinecap="round" />
        </g>
        <path
          d="M 1390 737 V 547 A 122 122 0 0 1 1634 547 V 737"
          fill="none"
          stroke={BLUE}
          strokeWidth={25}
        />
        <rect x={1380} y={605} width={264} height={46} rx={12} fill={INK} />
        <path
          d="M 1422 607 L 1399 649 M 1486 607 L 1463 649 M 1550 607 L 1527 649 M 1614 607 L 1591 649"
          stroke="#fff"
          strokeWidth={12}
        />
        {PEOPLE.map(({ x, height, color, result }, index) => {
          const top = 730 - height;
          return (
            <g key={result} id={`gate-person-${index}`}>
              <circle cx={x} cy={top + 43} r={43} fill={color} />
              <path
                d={`M ${x - 65} 730 V ${top + 145} Q ${x - 65} ${top + 90} ${x} ${top + 100} Q ${x + 65} ${top + 90} ${x + 65} ${top + 145} V 730 Z`}
                fill={color}
              />
            </g>
          );
        })}
      </g>
      <Tag id="gate-limit" x={1290} y={428} text={LIMIT} color={PINK} />
      {PEOPLE.map(({ x, shift, result, tagColor }, index) => (
        <Tag
          key={result}
          id={`gate-result-${index}`}
          x={x + shift}
          y={803}
          text={result}
          color={tagColor}
        />
      ))}
      <Callout id="gate-condition" x={880} y={899} text={CONDITION} />
    </Stage>
  );
}
