import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { Callout, LINE, PINK, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const GROUPS = [
  { text: "1", x: 596, shift: -54 },
  { text: "234", x: 690, shift: 0 },
  { text: "567", x: 972, shift: 54 },
];
const SEPARATORS = [
  { line: 643, comma: 616 },
  { line: 925, comma: 952 },
];
const FORMAT = ".toLocaleString()";
export const priceCommaText = `1234567円1,234,567円${FORMAT}`;

export function PriceComma({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["price-comma"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#price-tag", at(0));
      show("#price-number", at(1));
      show("#price-divider-1", at(2));
      show("#price-divider-0", at(2, 0.32));

      const split = at(2, 0.8);
      const separated = at(2, 1.5);
      GROUPS.forEach(({ shift }, index) => {
        t.to(
          `#price-group-${index}`,
          { x: shift, duration: separated - split, ease: "power2.inOut" },
          split,
        );
      });
      t.to(
        "#price-divider-0, #price-divider-1",
        { opacity: 0, duration: separated - split },
        split,
      );
      const insertion = at(2, 1.9) - separated;
      t.fromTo(
        "#price-insert-0, #price-insert-1",
        { y: 50 },
        { y: 0, duration: insertion, ease: "power2.out" },
        separated,
      );
      show("#price-comma-0, #price-comma-1", separated, { duration: insertion });
      show("#price-format", at(3));
      emphasize("price-format", at(3, 0.4));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="price-tag">
        <path
          d="M 461 301 H 1470 Q 1520 301 1520 351 V 604 Q 1520 654 1470 654 H 461 L 339 478 Z"
          fill="#fff"
          stroke={LINE}
          strokeWidth={9}
          strokeLinejoin="round"
        />
        <circle cx={434} cy={478} r={22} fill="none" stroke={LINE} strokeWidth={8} />
      </g>
      <g id="price-number" opacity={0}>
        {GROUPS.map(({ text, x }, index) => (
          <g key={text} id={`price-group-${index}`}>
            {[...text].map((digit, digitIndex) => (
              <Text key={digit} x={x + digitIndex * 94} y={535} size={133}>
                {digit}
              </Text>
            ))}
            {index === GROUPS.length - 1 && (
              <Text x={1304} y={535} size={67}>
                円
              </Text>
            )}
          </g>
        ))}
        {SEPARATORS.map(({ line, comma }, index) => (
          <g key={line}>
            <path
              id={`price-divider-${index}`}
              d={`M ${line} 382 V 574`}
              stroke={PINK}
              strokeWidth={5}
              strokeDasharray="11 12"
              strokeLinecap="round"
              opacity={0}
            />
            <g id={`price-insert-${index}`}>
              <Text
                id={`price-comma-${index}`}
                x={comma}
                y={535}
                size={133}
                fill={PINK}
                opacity={0}
              >
                ,
              </Text>
            </g>
          </g>
        ))}
      </g>
      <Callout id="price-format" x={960} y={800} text={FORMAT} />
    </Stage>
  );
}
