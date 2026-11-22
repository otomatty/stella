import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import {
  BLUE,
  Callout,
  GREEN,
  Head,
  INK,
  LINE,
  Line,
  PINK,
  Stage,
  stageMotion,
  Text,
  VIOLET,
} from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const freeShippingText = "3000円以上会員証会員送料無料||";

const CONDITIONS = [
  {
    label: "3000円以上",
    y: 350,
    endY: 463,
  },
  {
    label: "会員",
    y: 661,
    endY: 545,
  },
];

export function FreeShipping({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["free-shipping"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, draw, emphasize } = stageMotion(t);
      rise("#shipping-scene", at(0));
      CONDITIONS.forEach((_, i) => {
        const beat = i + 1;
        t.to(`#shipping-box-${i}`, { stroke: PINK, duration: 0.25 }, at(beat));
        draw(`#shipping-flow-${i} .line`, at(beat), at(beat, 0.55) - at(beat));
        t.to(`#shipping-head-${i}`, { opacity: 1, duration: 0.15 }, at(beat, 0.45));
        show(`#shipping-result-${i}`, at(beat, 0.65));
      });
      t.to("#shipping-box-0", { stroke: LINE, duration: 0.25 }, at(2));
      t.to("#shipping-flow-0, #shipping-head-0", { opacity: 0.25, duration: 0.25 }, at(2));
      t.to("#shipping-result-0", { opacity: 0, duration: 0.25 }, at(2));
      show("#shipping-or", at(3));
      emphasize("shipping-or", at(3, 0.45));
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <g id="shipping-scene">
        <path
          d="M 405 310 Q 424 219 490 219 Q 556 219 575 310"
          fill="none"
          stroke={INK}
          strokeWidth={15}
        />
        <path
          d="M 342 309 H 638 L 603 402 Q 599 418 580 418 H 400 Q 381 418 377 402 Z"
          fill="#93C5FD"
          stroke={BLUE}
          strokeWidth={8}
        />
        <path
          d="M 400 356 H 580 M 431 332 L 444 394 M 490 332 V 394 M 549 332 L 536 394"
          stroke={BLUE}
          strokeWidth={8}
          strokeLinecap="round"
        />
        <rect
          x={359}
          y={597}
          width={262}
          height={135}
          rx={21}
          fill="#EEF2FF"
          stroke={VIOLET}
          strokeWidth={8}
        />
        <path d="M 386 628 H 594" stroke={VIOLET} strokeWidth={10} strokeLinecap="round" />
        <Text x={490} y={693} size={48}>
          会員証
        </Text>
        {CONDITIONS.map(({ label, y }, i) => (
          <g key={label}>
            <rect
              id={`shipping-box-${i}`}
              x={676}
              y={y - 55}
              width={340}
              height={110}
              rx={24}
              fill="#fff"
              stroke={LINE}
              strokeWidth={8}
            />
            <Text x={846} y={y + 17} size={45}>
              {label}
            </Text>
          </g>
        ))}
        <path
          d="M 1280 361 L 1423 302 L 1566 361 V 612 L 1423 674 L 1280 612 Z"
          fill="#D5A16B"
          stroke="#9A683B"
          strokeWidth={8}
          strokeLinejoin="round"
        />
        <path
          d="M 1280 361 L 1423 430 L 1566 361 M 1423 430 V 674"
          fill="none"
          stroke="#9A683B"
          strokeWidth={8}
        />
        <path
          d="M 1360 328 L 1503 391 V 454"
          fill="none"
          stroke="#FCF3E4"
          strokeWidth={24}
          strokeLinejoin="round"
        />
      </g>
      {CONDITIONS.map(({ label, y, endY }, i) => (
        <g key={label}>
          <Line
            id={`shipping-flow-${i}`}
            d={`M 1047 ${y} Q 1102 ${y} 1111 ${(y + endY) / 2} T 1237 ${endY}`}
          />
          <Head id={`shipping-head-${i}`} x={1245} y={endY} angle={0} />
          <g id={`shipping-result-${i}`} opacity={0}>
            <rect x={1264} y={703} width={318} height={81} rx={18} fill={GREEN} />
            <Text x={1423} y={760} size={49} fill="#fff">
              送料無料
            </Text>
          </g>
        </g>
      ))}
      <Callout id="shipping-or" x={1035} y={860} text="||" />
    </Stage>
  );
}
