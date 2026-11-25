import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, CodeCallout, INK, PINK, Stage, stageMotion, Tag, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const VALUES = ["-3", "-2", "-1", "0", "1", "2", "+3"];
const DISTANCE = "3歩";
const EXPRESSION = "Math.abs(-3) → 3";
export const stepsDistanceText = [...VALUES, DISTANCE, DISTANCE, EXPRESSION].join("");

const EAST = "#3B82C4";
const WEST = "#E07A2F";
const AXIS = 960;
const BAND_Y = 628;
const BAND_H = 52;
const BAND_MID = BAND_Y + BAND_H / 2;
const STONE_X = [360, 560, 760, 1160, 1360, 1560] as const;
const TICK_X = [360, 560, 760, 960, 1160, 1360, 1560] as const;

function Shoe({ fill, edge }: { fill: string; edge: string }) {
  return (
    <g>
      <path
        d="M -36 -10 C -30 -22 8 -24 26 -12 C 42 -2 40 12 22 16 C 4 20 -28 16 -38 6 C -42 0 -40 -4 -36 -10 Z"
        fill={fill}
        stroke={edge}
        strokeWidth={3}
      />
      <path
        d="M -6 -16 C 6 -24 20 -16 20 -6"
        fill="none"
        stroke="#fff"
        strokeWidth={4}
        strokeLinecap="round"
        opacity={0.75}
      />
    </g>
  );
}

function Foot({
  id,
  x,
  y,
  angle,
  fill,
  edge,
}: {
  id: string;
  x: number;
  y: number;
  angle: number;
  fill: string;
  edge: string;
}) {
  return (
    <g id={id} opacity={0}>
      <g transform={`translate(${x} ${y}) rotate(${angle})`}>
        <Shoe fill={fill} edge={edge} />
      </g>
    </g>
  );
}

export function StepsDistance({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["steps-distance"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      const grow = (id: string, originX: number, when: number) =>
        t.fromTo(
          id,
          { opacity: 0, scaleX: 0, svgOrigin: `${originX} ${BAND_MID}` },
          {
            opacity: 0.92,
            scaleX: 1,
            duration: 0.7,
            ease: "power2.out",
            immediateRender: false,
          },
          when,
        );
      rise("#steps-scene", at(0));
      [0, 1, 2].forEach((i) => {
        show(`#steps-foot-e${i}`, at(1, 0.25 + i * 0.45));
        show(`#steps-foot-w${i}`, at(1, 1.85 + i * 0.45));
      });
      grow("#steps-east-band", AXIS, at(2, 0.15));
      grow("#steps-west-band", AXIS, at(2, 0.15));
      show("#steps-east-distance", at(2, 0.9));
      show("#steps-west-distance", at(2, 0.9));
      t.to(
        "#steps-west-band",
        { scaleX: -1, svgOrigin: `${AXIS} ${BAND_MID}`, duration: 0.95, ease: "power2.inOut" },
        at(3, 0.15),
      );
      emphasize("steps-neg", at(3, 1.35));
      t.to("#steps-neg-box", { attr: { "stroke-width": 0 }, duration: 0.2 }, at(3, 2.15));
      emphasize("steps-pos", at(3, 2.2));
      show("#steps-expression", at(3, 3.05));
      emphasize("steps-expression", at(3, 3.55));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="steps-scene">
        <rect x={160} y={548} width={1600} height={56} fill="#9BC85A" />
        <rect x={160} y={716} width={1600} height={52} fill="#7AAA46" />
        {[280, 480, 700, 1220, 1460, 1680].map((x) => (
          <ellipse key={x} cx={x} cy={562} rx={28} ry={14} fill="#B4D56E" />
        ))}
        <rect x={160} y={596} width={1600} height={124} rx={8} fill="#E7CBA4" />
        <rect x={220} y={640} width={1480} height={28} rx={8} fill="#F3DFC2" opacity={0.7} />
        <rect
          x={160}
          y={596}
          width={1600}
          height={124}
          rx={8}
          fill="none"
          stroke="#C9A878"
          strokeWidth={4}
        />
        {STONE_X.map((x) => (
          <g key={x}>
            <ellipse cx={x} cy={678} rx={48} ry={16} fill={INK} opacity={0.06} />
            <ellipse cx={x} cy={662} rx={46} ry={24} fill="#D9CDB8" />
            <ellipse cx={x - 10} cy={654} rx={20} ry={9} fill="#F4EEE4" />
            <ellipse cx={x} cy={662} rx={46} ry={24} fill="none" stroke="#B09A7E" strokeWidth={3} />
          </g>
        ))}
        <ellipse cx={960} cy={608} rx={210} ry={18} fill={INK} opacity={0.06} />
        <rect x={808} y={338} width={304} height={262} fill="#F6E6C6" />
        <path d="M 808 338 H 1112 L 960 392 Z" fill="#E4CDA0" />
        <rect
          x={808}
          y={338}
          width={304}
          height={262}
          fill="none"
          stroke="#C4A574"
          strokeWidth={5}
        />
        <rect x={1056} y={168} width={48} height={96} fill="#D4725C" />
        <rect x={1048} y={156} width={64} height={20} rx={3} fill="#E48A74" />
        <rect
          x={1056}
          y={168}
          width={48}
          height={96}
          fill="none"
          stroke="#8E3E30"
          strokeWidth={4}
        />
        <path d="M 748 356 L 960 176 L 1172 356 Z" fill="#C4533A" />
        <path d="M 960 196 L 1152 348 L 960 312 Z" fill="#A33E2C" opacity={0.85} />
        <path
          d="M 748 356 L 960 176 L 1172 356"
          fill="none"
          stroke="#8C3424"
          strokeWidth={6}
          strokeLinejoin="round"
        />
        {[
          [848, 400],
          [1004, 400],
        ].map(([x, y]) => (
          <g key={x}>
            <rect x={x} y={y} width={68} height={60} rx={4} fill="#B7DFF3" />
            <path
              d={`M ${x + 34} ${y} V ${y + 60} M ${x} ${y + 30} H ${x + 68}`}
              stroke="#5E86A0"
              strokeWidth={4}
            />
            <rect
              x={x}
              y={y}
              width={68}
              height={60}
              rx={4}
              fill="none"
              stroke="#5E86A0"
              strokeWidth={4}
            />
            <rect x={x + 6} y={y + 6} width={22} height={16} fill="#fff" opacity={0.55} />
          </g>
        ))}
        <rect x={922} y={468} width={76} height={132} rx={4} fill="#A56B3C" />
        <path d="M 960 468 V 600" stroke="#8A542C" strokeWidth={3} />
        <rect
          x={922}
          y={468}
          width={76}
          height={132}
          rx={4}
          fill="none"
          stroke="#6E4324"
          strokeWidth={4}
        />
        <circle cx={980} cy={540} r={6} fill="#E8C56B" stroke="#A8843A" strokeWidth={2} />
        {VALUES.map((value, i) => (
          <Text key={value} x={TICK_X[i]} y={812} size={44}>
            {value}
          </Text>
        ))}
        <rect
          id="steps-neg-box"
          x={322}
          y={768}
          width={76}
          height={58}
          rx={12}
          fill="none"
          stroke={PINK}
          strokeWidth={0}
        />
        <rect
          id="steps-pos-box"
          x={1522}
          y={768}
          width={76}
          height={58}
          rx={12}
          fill="none"
          stroke={PINK}
          strokeWidth={0}
        />
      </g>
      <g id="steps-east-band" opacity={0}>
        <rect x={960} y={BAND_Y} width={600} height={BAND_H} rx={26} fill={EAST} />
      </g>
      <g id="steps-west-band" opacity={0}>
        <rect x={360} y={BAND_Y} width={600} height={BAND_H} rx={26} fill={WEST} />
      </g>
      <Foot id="steps-foot-e0" x={1176} y={684} angle={18} fill={EAST} edge="#245E96" />
      <Foot id="steps-foot-e1" x={1344} y={642} angle={-10} fill={BLUE} edge="#245E96" />
      <Foot id="steps-foot-e2" x={1574} y={682} angle={16} fill={EAST} edge="#245E96" />
      <Foot id="steps-foot-w0" x={744} y={684} angle={162} fill={WEST} edge="#A35216" />
      <Foot id="steps-foot-w1" x={576} y={642} angle={190} fill="#F09A4A" edge="#A35216" />
      <Foot id="steps-foot-w2" x={346} y={682} angle={164} fill={WEST} edge="#A35216" />
      <Tag id="steps-east-distance" x={1460} y={572} text={DISTANCE} color={EAST} />
      <Tag id="steps-west-distance" x={460} y={572} text={DISTANCE} color={WEST} />
      <CodeCallout id="steps-expression" x={960} y={900} text={EXPRESSION} />
    </Stage>
  );
}
