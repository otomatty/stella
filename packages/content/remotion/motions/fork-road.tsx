import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import {
  BLUE,
  CodeCallout,
  GRAY,
  Head,
  INK,
  LINE,
  Line,
  PINK,
  Stage,
  stageMotion,
  VIOLET,
} from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const EXPRESSION = '雨 ? "傘" : "帽子"';
export const forkRoadText = EXPRESSION;

const ROUTES = [
  {
    name: "rain",
    d: "M 548 536 H 797 Q 877 536 948 475 L 1024 410 Q 1058 381 1110 381 H 1280",
    y: 381,
  },
  {
    name: "sun",
    d: "M 548 536 H 797 Q 877 536 948 597 L 1024 662 Q 1058 691 1110 691 H 1280",
    y: 691,
  },
];

export function ForkRoad({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["fork-road"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, draw, emphasize } = stageMotion(t);
      rise("#fork-scene", at(0));
      ROUTES.forEach(({ name }, index) => {
        const beat = index + 1;
        show(`#fork-${name}`, at(beat));
        draw(`#fork-${name}-route .line`, at(beat), at(beat, 0.52) - at(beat));
        show(`#fork-${name}-head`, at(beat, 0.45));
        t.to(`#fork-${name}-item`, { opacity: 1, duration: 0.3 }, at(beat));
        t.to(`#fork-${name}-box`, { stroke: PINK, duration: 0.3 }, at(beat));
      });
      t.to("#fork-rain, #fork-rain-route, #fork-rain-head", { opacity: 0, duration: 0.24 }, at(2));
      t.to("#fork-rain-item", { opacity: 0.4, duration: 0.3 }, at(2));
      t.to("#fork-rain-box", { stroke: LINE, duration: 0.3 }, at(2));
      show("#fork-expression", at(3));
      emphasize("fork-expression", at(3, 0.4));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="fork-scene">
        <g id="fork-rain" opacity={0}>
          <path
            d="M 910 213 C 864 213 865 149 910 148 C 925 106 992 107 1007 151 C 1053 147 1064 212 1015 213 Z"
            fill="#64748B"
          />
          <path
            d="M 923 237 L 909 266 M 963 237 L 949 266 M 1003 237 L 989 266"
            stroke={BLUE}
            strokeWidth={8}
            strokeLinecap="round"
          />
        </g>
        <g id="fork-sun" opacity={0}>
          <circle cx={966} cy={188} r={50} fill="#FBBF24" />
          <path
            d="M 966 111 V 122 M 966 254 V 265 M 889 188 H 900 M 1032 188 H 1043 M 912 134 L 920 142 M 1012 234 L 1020 242 M 912 242 L 920 234 M 1012 142 L 1020 134"
            stroke="#D97706"
            strokeWidth={8}
            strokeLinecap="round"
          />
        </g>
        <path
          d="M 278 690 V 414 L 401 317 L 524 414 V 690 Z"
          fill="#F1F5F9"
          stroke={GRAY}
          strokeWidth={8}
          strokeLinejoin="round"
        />
        <path
          d="M 255 432 L 401 317 L 547 432"
          fill="none"
          stroke={INK}
          strokeWidth={16}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect
          x={341}
          y={461}
          width={120}
          height={229}
          rx={12}
          fill="#B88754"
          stroke="#865634"
          strokeWidth={7}
        />
        <circle cx={430} cy={574} r={9} fill={INK} />
        <path d="M 274 692 H 528" stroke={GRAY} strokeWidth={12} strokeLinecap="round" />
        {ROUTES.map(({ name, d }) => (
          <path key={name} d={d} fill="none" stroke={LINE} strokeWidth={42} strokeLinecap="round" />
        ))}
        <rect
          id="fork-rain-box"
          x={1328}
          y={293}
          width={264}
          height={176}
          rx={24}
          fill="#fff"
          stroke={LINE}
          strokeWidth={7}
        />
        <g id="fork-rain-item" opacity={0.4}>
          <path
            d="M 1386 381 Q 1397 325 1460 325 Q 1523 325 1534 381 Q 1510 367 1485 381 Q 1460 367 1435 381 Q 1410 367 1386 381 Z"
            fill={VIOLET}
          />
          <path
            d="M 1460 375 V 415 Q 1460 438 1438 431"
            fill="none"
            stroke={INK}
            strokeWidth={8}
            strokeLinecap="round"
          />
        </g>
        <rect
          id="fork-sun-box"
          x={1328}
          y={603}
          width={264}
          height={176}
          rx={24}
          fill="#fff"
          stroke={LINE}
          strokeWidth={7}
        />
        <g id="fork-sun-item" opacity={0.4}>
          <path
            d="M 1404 699 L 1416 650 Q 1460 626 1504 650 L 1516 699 Z"
            fill="#B88754"
            stroke="#865634"
            strokeWidth={7}
            strokeLinejoin="round"
          />
          <path d="M 1404 688 H 1516 V 700 H 1404 Z" fill="#865634" />
          <ellipse
            cx={1460}
            cy={716}
            rx={85}
            ry={23}
            fill="#B88754"
            stroke="#865634"
            strokeWidth={7}
          />
        </g>
      </g>
      {ROUTES.map(({ name, d, y }) => (
        <g key={name}>
          <Line id={`fork-${name}-route`} d={d} />
          <Head id={`fork-${name}-head`} x={1280} y={y} angle={0} />
        </g>
      ))}
      <CodeCallout id="fork-expression" x={960} y={866} text={EXPRESSION} />
    </Stage>
  );
}
