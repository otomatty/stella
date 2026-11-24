import { useCallback, useMemo, useRef } from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { BLUE, CodeCallout, GRAY, Stage, stageMotion, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const BEADS = [..."A1B2C3"];
const PATTERN = "[0-9]";
const CODE = '"A1B2C3".replace(/[0-9]/g, "") → "ABC"';
export const digitSieveText = `${BEADS.join("")}${PATTERN}${CODE}`;

const BEAD_X = [479, 617, 755, 893, 1031, 1169];
const BEAD_Y = 300;
const DROP = 450;
const MESH_X = [410, 548, 686, 824, 962, 1100, 1238];
const BOWL = "M 380 372 H 1240 L 1180 424 Q 810 442 440 424 Z";

export function DigitSieve({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["digit-sieve"].seconds), [beats]);
  const time = useCurrentFrame() / useVideoConfig().fps;
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show } = stageMotion(t);
      rise("#sieve", at(0));
      show(".sieve-bead", at(1));
      show("#sieve-pattern", at(2));
      show("#sieve-code", at(3));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="sieve">
        <path d={BOWL} fill="#fff" stroke={GRAY} strokeWidth={6} strokeLinejoin="round" />
        <clipPath id="sieve-clip">
          <path d={BOWL} />
        </clipPath>
        <g clipPath="url(#sieve-clip)">
          <path d="M 400 392 H 1220 M 430 416 H 1190" stroke={GRAY} strokeWidth={4} />
          {MESH_X.map((x) => (
            <path key={x} d={`M ${x} 368 L ${x} 450`} stroke={GRAY} strokeWidth={4} />
          ))}
        </g>
        <path d="M 350 372 H 1270" stroke={GRAY} strokeWidth={16} strokeLinecap="round" />
      </g>
      <g id="sieve-pattern" transform="translate(1560 408)" opacity={0}>
        <rect x={-150} y={-52} width={300} height={104} rx={18} fill={VIOLET} />
        <text
          y={23}
          textAnchor="middle"
          fontFamily="monospace"
          fontWeight={700}
          fontSize={64}
          fill="#fff"
        >
          {PATTERN}
        </text>
      </g>
      {BEADS.map((letter, index) => {
        const digit = /[0-9]/.test(letter);
        const delay = Math.floor(index / 2) * 0.25;
        const drop = digit
          ? interpolate(time, [at(2, delay), at(2, delay + 1)], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.inOut(Easing.quad),
            })
          : 0;
        const opacity = interpolate(drop, [0.93, 1], [1, 0], {
          extrapolateLeft: "clamp",
        });
        return (
          <g
            key={letter}
            transform={`translate(${BEAD_X[index]} ${BEAD_Y + drop * DROP})`}
            opacity={opacity}
          >
            <g className="sieve-bead" opacity={0}>
              <circle r={50} fill={digit ? VIOLET : BLUE} />
              <path
                d="M -32 -20 Q -26 -32 -14 -36"
                fill="none"
                stroke="#fff"
                strokeOpacity={0.65}
                strokeWidth={5}
                strokeLinecap="round"
              />
              <Text x={0} y={20} size={54} fill="#fff">
                {letter}
              </Text>
            </g>
          </g>
        );
      })}
      <CodeCallout id="sieve-code" x={960} y={852} text={CODE} />
    </Stage>
  );
}
