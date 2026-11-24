import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, CodeCallout, GRAY, LINE, PINK, Stage, stageMotion, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const LETTERS = [..."SKYLINE"];
const CUT_AT = 3;
const CODE = '"SKYLINE".slice(0, 3) → "SKY"';
export const tapeCutText = `${LETTERS.join("")}0123456${CODE}`;

export function TapeCut({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["tape-cut"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show } = stageMotion(t);
      rise("#cut-tape", at(0));
      show("#cut-scissors", at(1));
      const cutDuration = at(2, 0.28) - at(2);
      t.to("#cut-blade-left", { rotation: 16, svgOrigin: "880 287", duration: cutDuration }, at(2));
      t.to(
        "#cut-blade-right",
        { rotation: -16, svgOrigin: "880 287", duration: cutDuration },
        at(2),
      );
      t.to("#cut-line", { opacity: 0, duration: cutDuration }, at(2));
      t.to("#cut-piece", { x: -104, duration: at(2, 0.82) - at(2), ease: "power2.out" }, at(2));
      t.to("#cut-piece-face", { fill: BLUE, fillOpacity: 0.13, duration: 0.35 }, at(2));
      t.to("#cut-scissors", { opacity: 0, duration: 0.28 }, at(2, 0.45));
      show("#cut-code", at(3));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="cut-tape">
        <g id="cut-piece">
          <path
            id="cut-piece-face"
            d="M 880 408 H 430 Q 400 408 400 438 V 602 Q 400 632 430 632 H 880 Z"
            fill={LINE}
          />
          {LETTERS.slice(0, CUT_AT).map((letter, index) => (
            <TapeCell key={letter} letter={letter} index={index} />
          ))}
        </g>
        <path
          d="M 880 408 H 1490 Q 1520 408 1520 438 V 602 Q 1520 632 1490 632 H 880 Z"
          fill={LINE}
        />
        {LETTERS.slice(CUT_AT).map((letter, index) => (
          <TapeCell key={letter} letter={letter} index={index + CUT_AT} />
        ))}
        <path
          id="cut-line"
          d="M 880 408 V 632"
          stroke={PINK}
          strokeWidth={5}
          strokeDasharray="12 10"
        />
      </g>
      <g id="cut-scissors" opacity={0}>
        <g id="cut-blade-left">
          <path d="M 836 230 L 880 287 L 907 366 Q 872 346 869 294 Z" fill={GRAY} />
          <circle cx={825} cy={211} r={25} fill="none" stroke={VIOLET} strokeWidth={12} />
        </g>
        <g id="cut-blade-right">
          <path d="M 924 230 L 880 287 L 853 366 Q 888 346 891 294 Z" fill={GRAY} />
          <circle cx={935} cy={211} r={25} fill="none" stroke={VIOLET} strokeWidth={12} />
        </g>
        <circle cx={880} cy={287} r={8} fill={LINE} />
      </g>
      <CodeCallout id="cut-code" x={960} y={852} text={CODE} />
    </Stage>
  );
}

function TapeCell({ letter, index }: { letter: string; index: number }) {
  const x = 480 + 160 * index;
  return (
    <g>
      {index !== 0 && index !== CUT_AT && (
        <path d={`M ${x - 80} 432 V 608`} stroke={GRAY} strokeWidth={2} opacity={0.3} />
      )}
      <Text x={x} y={560} size={105}>
        {letter}
      </Text>
      <Text x={x} y={703} size={43} fill={GRAY}>
        {index}
      </Text>
    </g>
  );
}
