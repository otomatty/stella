import { useCallback, useMemo, useRef } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, GREEN, INK, Stage, stageMotion, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const DAYS = ["1日め", "2日め", "3日め"];
const EXPRESSION = "2 ** 3 → 8";
const SPROUTS = [
  { x: 872, y: 523, height: 204 },
  { x: 1006, y: 523, height: 179 },
  { x: 737, y: 523, height: 166 },
  { x: 1140, y: 523, height: 200 },
  { x: 675, y: 562, height: 140 },
  { x: 803, y: 568, height: 148 },
  { x: 939, y: 573, height: 126 },
  { x: 1073, y: 567, height: 146 },
];
export const sproutDoubleText = [...DAYS, EXPRESSION].join("");

export function SproutDouble({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["sprout-double"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  const dayStarts = [at(1), at(2), at(2, 1.3)];
  const day = dayStarts.filter((start) => time >= start).length;
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#sprout-pot", at(0));
      show("#sprout-expression", at(3));
      emphasize("sprout-expression", at(3, 0.45));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="sprout-pot">
        <path
          d="M 564 547 H 1252 L 1176 733 Q 1166 758 1139 758 H 677 Q 650 758 640 733 Z"
          fill="#BB6247"
          stroke={INK}
          strokeWidth={8}
        />
        <ellipse cx={908} cy={542} rx={345} ry={69} fill="#D88868" stroke={INK} strokeWidth={8} />
        <ellipse cx={908} cy={542} rx={302} ry={45} fill="#684833" />
        {SPROUTS.map(({ x, y, height }, i) => {
          const start = dayStarts[Math.floor(Math.log2(i))];
          const progress =
            i === 0
              ? 1
              : interpolate(time, [start, start + 0.4], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
          return (
            <g
              key={x}
              transform={`translate(${x} ${y}) scale(${0.94 + progress * 0.06})`}
              opacity={progress}
            >
              <path
                d={`M 0 0 V ${40 - height}`}
                stroke={GREEN}
                strokeWidth={9}
                strokeLinecap="round"
              />
              <path
                d={`M 0 40 Q -48 48 -47 8 Q -11 8 0 40 Q 10 3 48 0 Q 49 40 0 40 Z`}
                transform={`translate(0 ${-height})`}
                fill={GREEN}
                stroke="#167140"
                strokeWidth={3}
              />
            </g>
          );
        })}
      </g>
      {day > 0 && (
        <g
          transform={`translate(1408 543) scale(${interpolate(time, [dayStarts[day - 1], dayStarts[day - 1] + 0.4], [0.94, 1], { extrapolateRight: "clamp" })})`}
        >
          <rect x={-76} y={-28} width={152} height={56} rx={14} fill={VIOLET} />
          <Text x={0} y={13} size={36} fill="#fff">
            {DAYS[day - 1]}
          </Text>
        </g>
      )}
      <CodeCallout id="sprout-expression" x={960} y={863} text={EXPRESSION} />
    </Stage>
  );
}
