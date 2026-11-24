import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, CodeCallout, Head, LINE, Line, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const NAME = "Taro";
const EMPTY = "undefined";
const TYPE = `text[0]: string | ${EMPTY}`;
export const emptyCardText = `${NAME}${NAME[0]}${EMPTY}${TYPE}`;

export function EmptyCard({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["empty-card"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, draw, emphasize } = stageMotion(t);
      rise("#name-cards", at(0));
      t.to("#name-first", { fill: BLUE, duration: 0.22 }, at(1));
      draw("#name-route .line", at(1), at(1, 0.42) - at(1));
      show("#name-head, #name-result", at(1, 0.35));
      show("#name-missing", at(2));
      show("#name-type", at(3));
      emphasize("name-type", at(3, 0.4));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="name-cards">
        {[218, 514].map((y) => (
          <g key={y}>
            <rect
              x={452}
              y={y}
              width={508}
              height={228}
              rx={32}
              fill="#EFF6FF"
              stroke={BLUE}
              strokeWidth={8}
            />
            <rect
              x={492}
              y={y + 69}
              width={428}
              height={122}
              rx={16}
              fill="#fff"
              stroke={LINE}
              strokeWidth={4}
            />
            <rect x={665} y={y + 25} width={82} height={16} rx={8} fill={LINE} />
          </g>
        ))}
        <Text x={706} y={379} size={74}>
          <tspan id="name-first">{NAME[0]}</tspan>
          {NAME.slice(1)}
        </Text>
      </g>
      <Text id="name-result" x={1310} y={396} size={142} fill={BLUE} opacity={0}>
        {NAME[0]}
      </Text>
      <CodeCallout id="name-missing" x={1310} y={644} text={EMPTY} />
      <Line id="name-route" d="M 1000 348 H 1220" />
      <Head id="name-head" x={1220} y={348} angle={0} />
      <CodeCallout id="name-type" x={960} y={865} text={TYPE} />
    </Stage>
  );
}
