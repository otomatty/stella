import { useCallback, useMemo, useRef } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { BLUE, CodeCallout, GRAY, INK, LINE, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const DIVISION = "1 ÷ 0";
const INFINITY = "Infinity";
const EXPRESSION = "Number.isFinite(1 / 0) → false";
export const calculatorInfinityText = [DIVISION, INFINITY, EXPRESSION].join("");

export function CalculatorInfinity({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["calculator-infinity"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  const infinite = time >= at(2);
  const displayBeat = infinite ? 2 : 1;
  const progress = interpolate(time, [at(displayBeat), at(displayBeat, 0.4)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#infinity-calculator", at(0));
      t.to("#infinity-key", { attr: { fill: BLUE }, duration: 0.2 }, at(1));
      t.to("#infinity-key", { attr: { fill: "#BCCFF7" }, duration: 0.2 }, at(1, 0.35));
      t.to(
        "#infinity-screen",
        { attr: { stroke: BLUE, "stroke-width": 9 }, duration: 0.25 },
        at(2),
      );
      show("#infinity-expression", at(3));
      emphasize("infinity-expression", at(3, 0.45));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="infinity-calculator">
        <rect
          x={655}
          y={147}
          width={610}
          height={612}
          rx={47}
          fill="#D7DEE4"
          stroke={INK}
          strokeWidth={9}
        />
        <rect
          id="infinity-screen"
          x={708}
          y={202}
          width={504}
          height={154}
          rx={21}
          fill="#F1F9ED"
          stroke={GRAY}
          strokeWidth={7}
        />
        {time >= at(1) && (
          <g transform={`translate(960 279) scale(${0.94 + progress * 0.06})`} opacity={progress}>
            <Text x={0} y={28} size={81}>
              {infinite ? INFINITY : DIVISION}
            </Text>
          </g>
        )}
        {Array.from({ length: 12 }, (_, i) => {
          const x = 711 + (i % 4) * 129;
          const y = 400 + Math.floor(i / 4) * 108;
          return (
            <rect
              id={i === 11 ? "infinity-key" : undefined}
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={111}
              height={81}
              rx={16}
              fill={i === 11 ? "#BCCFF7" : "#fff"}
              stroke={GRAY}
              strokeWidth={4}
            />
          );
        })}
        <path d="M 913 729 H 1007" stroke={LINE} strokeWidth={8} strokeLinecap="round" />
      </g>
      <CodeCallout id="infinity-expression" x={960} y={863} text={EXPRESSION} />
    </Stage>
  );
}
