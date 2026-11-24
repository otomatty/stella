import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, CodeCallout, Head, INK, Line, Stage, stageMotion, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const VALUE = "120";
const SUFFIX = "円";
const EMPTY = "なし";
const NAN = "NaN";
const EXPRESSION = `Number.parseInt("${VALUE}${SUFFIX}", 10) → ${VALUE}`;
export const formParseText = [VALUE + SUFFIX, VALUE, EMPTY, NAN, EXPRESSION].join("");

export function FormParse({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["form-parse"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, draw, emphasize } = stageMotion(t);
      rise("#parse-fields", at(0));
      show("#parse-price", at(1));
      t.to("#parse-digits", { attr: { fill: BLUE }, duration: 0.25 }, at(2));
      draw("#parse-price-arrow .line", at(2));
      show("#parse-price-head", at(2, 0.5));
      show("#parse-value", at(2, 0.6));
      show("#parse-empty", at(3));
      draw("#parse-empty-arrow .line", at(3, 0.4));
      show("#parse-empty-head", at(3, 0.9));
      show("#parse-nan", at(3, 1));
      show("#parse-expression", at(3, 1));
      emphasize("parse-expression", at(3, 1.45));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="parse-fields">
        <rect
          x={403}
          y={225}
          width={616}
          height={501}
          rx={36}
          fill="#F1F5F9"
          stroke={INK}
          strokeWidth={8}
        />
        {[306, 510].map((y) => (
          <rect
            key={y}
            x={463}
            y={y}
            width={496}
            height={134}
            rx={19}
            fill="#fff"
            stroke={BLUE}
            strokeWidth={6}
          />
        ))}
      </g>
      <Text id="parse-price" x={513} y={395} size={63} anchor="start" opacity={0}>
        <tspan id="parse-digits" fill={INK}>
          {VALUE}
        </tspan>
        {SUFFIX}
      </Text>
      <Text id="parse-empty" x={513} y={599} size={63} anchor="start" opacity={0}>
        {EMPTY}
      </Text>
      <Line id="parse-price-arrow" d="M 1053 373 H 1317" color={BLUE} />
      <Head id="parse-price-head" x={1317} y={373} angle={0} color={BLUE} />
      <Line id="parse-empty-arrow" d="M 1053 577 H 1317" color={VIOLET} />
      <Head id="parse-empty-head" x={1317} y={577} angle={0} color={VIOLET} />
      <CodeCallout id="parse-value" x={1429} y={373} text={VALUE} />
      <CodeCallout id="parse-nan" x={1429} y={577} text={NAN} />
      <CodeCallout id="parse-expression" x={960} y={863} text={EXPRESSION} />
    </Stage>
  );
}
