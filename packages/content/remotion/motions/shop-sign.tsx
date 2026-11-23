import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Callout, GRAY, INK, LINE, Stage, stageMotion, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const SIGN = "open";
const UPPERCASE = ".toUpperCase()";
export const shopSignText = `${SIGN}${SIGN.toUpperCase()}${UPPERCASE}`;

export function ShopSign({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["shop-sign"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#shop-front", at(0));
      show("#shop-lowercase", at(1));
      [...SIGN].forEach((_, index) => {
        const offset = index * 0.4;
        const start = at(2, offset);
        const change = at(2, offset + 0.13);
        t.to(`#shop-lower-${index}`, { opacity: 0, duration: change - start }, start);
        show(`#shop-upper-${index}`, change, { duration: at(2, offset + 0.43) - change });
      });
      show("#shop-uppercase", at(3));
      emphasize("shop-uppercase", at(3, 0.4));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="shop-front">
        <path d="M 430 516 H 1490 V 800 H 430 Z" fill="#F1F5F9" stroke={LINE} strokeWidth={8} />
        <rect
          x={553}
          y={164}
          width={814}
          height={255}
          rx={35}
          fill="#fff"
          stroke={VIOLET}
          strokeWidth={10}
        />
        <path
          d="M 497 419 H 1423 L 1510 503 Q 1518 526 1494 526 H 426 Q 402 526 410 503 Z"
          fill={BLUE}
        />
        <path
          d="M 710 422 L 680 519 M 960 422 V 519 M 1210 422 L 1240 519"
          stroke="#fff"
          strokeWidth={8}
          opacity={0.65}
        />
        <rect
          x={540}
          y={577}
          width={215}
          height={150}
          rx={13}
          fill="#EFF6FF"
          stroke={BLUE}
          strokeWidth={8}
        />
        <rect
          x={1165}
          y={577}
          width={215}
          height={150}
          rx={13}
          fill="#EFF6FF"
          stroke={BLUE}
          strokeWidth={8}
        />
        <path d="M 647 580 V 724 M 1273 580 V 724" stroke={BLUE} strokeWidth={6} />
        <path
          d="M 842 800 V 592 Q 842 568 866 568 H 1054 Q 1078 568 1078 592 V 800 Z"
          fill="#fff"
          stroke={VIOLET}
          strokeWidth={8}
        />
        <path d="M 960 572 V 800" stroke={LINE} strokeWidth={6} />
        <path
          d="M 935 677 V 710 M 985 677 V 710"
          stroke={GRAY}
          strokeWidth={8}
          strokeLinecap="round"
        />
        <path d="M 384 800 H 1536" stroke={LINE} strokeWidth={10} strokeLinecap="round" />
      </g>
      <g id="shop-lowercase" opacity={0}>
        {[...SIGN].map((letter, index) => (
          <Text key={letter} id={`shop-lower-${index}`} x={720 + index * 160} y={340} size={134}>
            {letter}
          </Text>
        ))}
      </g>
      {[...SIGN.toUpperCase()].map((letter, index) => (
        <Text
          key={letter}
          id={`shop-upper-${index}`}
          x={720 + index * 160}
          y={340}
          size={150}
          fill={INK}
          opacity={0}
        >
          {letter}
        </Text>
      ))}
      <Callout id="shop-uppercase" x={960} y={894} text={UPPERCASE} />
    </Stage>
  );
}
