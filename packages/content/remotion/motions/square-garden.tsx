import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { Callout, CodeCallout, GREEN, INK, PINK, Stage, stageMotion, Tag } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const AREA = "25";
const SIDE = "5";
const EXPRESSION = "Math.sqrt(25) → 5";
const CELLS = [0, 1, 2, 3, 4];
export const squareGardenText = [AREA, SIDE, SIDE, EXPRESSION].join("");

export function SquareGarden({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["square-garden"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#garden-bed", at(0));
      t.to("#garden-center-flower", { opacity: 0, duration: 0.18 }, at(1));
      show("#garden-area", at(1, 0.18));
      show("#garden-sides, #garden-width, #garden-height", at(2));
      show("#garden-expression", at(3));
      emphasize("garden-expression", at(3, 0.45));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="garden-bed">
        <rect
          x={710}
          y={232}
          width={500}
          height={500}
          rx={12}
          fill="#EBD1AD"
          stroke="#805637"
          strokeWidth={10}
        />
        {CELLS.slice(1).map((i) => (
          <path
            key={i}
            d={`M ${710 + i * 100} 239 V 725 M 717 ${232 + i * 100} H 1203`}
            stroke="#B18C64"
            strokeWidth={4}
          />
        ))}
        {CELLS.flatMap((row) =>
          CELLS.map((column) => (
            <g
              id={row === 2 && column === 2 ? "garden-center-flower" : undefined}
              key={`${row}-${column}`}
              transform={`translate(${760 + column * 100} ${282 + row * 100})`}
            >
              <path
                d="M 0 19 C -23 19 -24 3 -12 5 Q -4 5 0 13 Q 4 5 12 5 C 24 3 23 19 0 19 Z"
                fill={GREEN}
              />
              <circle cy={-4} r={14} fill={(row + column) % 2 === 0 ? "#DA679B" : "#ECAB43"} />
              <circle cy={-4} r={5} fill="#FFF1BD" />
            </g>
          )),
        )}
      </g>
      <Tag id="garden-area" x={960} y={482} text={AREA} chars={1.5} color={INK} />
      <path
        id="garden-sides"
        d="M 710 201 H 1210 M 680 232 V 732"
        fill="none"
        stroke={PINK}
        strokeWidth={7}
        strokeLinecap="round"
        opacity={0}
      />
      <Callout id="garden-width" x={960} y={133} text={SIDE} />
      <Callout id="garden-height" x={600} y={482} text={SIDE} />
      <CodeCallout id="garden-expression" x={960} y={863} text={EXPRESSION} />
    </Stage>
  );
}
