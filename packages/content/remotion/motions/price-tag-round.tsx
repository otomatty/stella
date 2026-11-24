import { useCallback, useMemo, useRef } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { BLUE, CodeCallout, GRAY, INK, LINE, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const MEASUREMENT = 22.4999;
const LONG = `${MEASUREMENT}…`;
const ROUNDED = MEASUREMENT.toFixed(1);
const EXPRESSION = `(${MEASUREMENT}).toFixed(1) → "${ROUNDED}"`;
export const priceTagRoundText = `${LONG}${ROUNDED}${EXPRESSION}`;

export function PriceTagRound({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["price-tag-round"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  const rounded = time >= at(2);
  const roundedOpacity = interpolate(time, [at(2), at(2, 0.24)], [0.55, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#round-scale", at(0));
      t.to("#round-screen", { attr: { stroke: BLUE, "stroke-width": 10 }, duration: 0.35 }, at(1));
      show("#round-expression", at(3));
      emphasize("round-expression", at(3, 0.4));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="round-scale">
        <path
          d="M 595 191 H 1325 Q 1391 191 1401 271 L 1430 625 Q 1435 711 1346 711 H 574 Q 485 711 490 625 L 519 271 Q 529 191 595 191 Z"
          fill="#F1F5F9"
          stroke={INK}
          strokeWidth={10}
          strokeLinejoin="round"
        />
        <path
          d="M 575 724 H 693 M 1227 724 H 1345"
          stroke={GRAY}
          strokeWidth={18}
          strokeLinecap="round"
        />
        <path
          d="M 596 517 H 790 M 596 555 H 790 M 596 593 H 790 M 596 631 H 790 M 1130 517 H 1324 M 1130 555 H 1324 M 1130 593 H 1324 M 1130 631 H 1324"
          stroke={LINE}
          strokeWidth={12}
          strokeLinecap="round"
        />
        <rect
          id="round-screen"
          x={627}
          y={255}
          width={666}
          height={201}
          rx={26}
          fill="#EFF6FF"
          stroke={GRAY}
          strokeWidth={7}
        />
        <Text x={960} y={396} size={114} opacity={rounded ? roundedOpacity : 1}>
          {rounded ? ROUNDED : LONG}
        </Text>
      </g>
      <CodeCallout id="round-expression" x={960} y={860} text={EXPRESSION} />
    </Stage>
  );
}
