import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, GRAY, GREEN, INK, LINE, RED, Stage, stageMotion } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const TYPE = '"青" | "黄" | "赤"';
export const trafficLightText = TYPE;

const LIGHTS = [
  { color: RED, y: 304, name: "red" },
  { color: "#FBBF24", y: 457, name: "yellow" },
  { color: GREEN, y: 610, name: "green" },
];

export function TrafficLight({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["traffic-light"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#traffic-signal", at(0));
      t.set("#traffic-green", { opacity: 1 }, at(1));
      t.set("#traffic-green", { opacity: 0 }, at(2));
      t.set("#traffic-yellow", { opacity: 1 }, at(2));
      t.set("#traffic-yellow", { opacity: 0 }, at(2, 1.5));
      t.set("#traffic-red", { opacity: 1 }, at(2, 1.5));
      show("#traffic-type", at(3));
      emphasize("traffic-type", at(3, 0.4));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="traffic-signal">
        <path
          d="M 693 713 V 812 M 594 821 H 792"
          fill="none"
          stroke={GRAY}
          strokeWidth={28}
          strokeLinecap="round"
        />
        <rect
          x={558}
          y={196}
          width={270}
          height={524}
          rx={55}
          fill={INK}
          stroke={GRAY}
          strokeWidth={9}
        />
        {LIGHTS.map(({ color, y, name }) => (
          <g key={name}>
            <circle cx={693} cy={y} r={60} fill={GRAY} stroke={LINE} strokeWidth={4} />
            <g id={`traffic-${name}`} opacity={0}>
              <circle cx={693} cy={y} r={60} fill={color} />
              <path
                d={`M 655 ${y - 17} Q 671 ${y - 45} 706 ${y - 40}`}
                fill="none"
                stroke="#fff"
                strokeWidth={8}
                strokeLinecap="round"
                opacity={0.65}
              />
            </g>
          </g>
        ))}
      </g>
      <CodeCallout id="traffic-type" x={1240} y={457} text={TYPE} />
    </Stage>
  );
}
