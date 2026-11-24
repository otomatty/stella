import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, CodeCallout, GRAY, INK, LINE, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const EMPTY = "undefined";
const TYPE = `number | ${EMPTY}`;
export const emptyLockerText = `12${EMPTY}${TYPE}`;

const LOCKERS = [
  { number: 1, x: 524 },
  { number: 2, x: 980 },
];

export function EmptyLocker({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["empty-locker"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#lockers", at(0));
      LOCKERS.forEach(({ number, x }) => {
        t.to(
          `#locker-door-${number}`,
          { scaleX: 0.12, svgOrigin: `${x + 24} 0`, duration: 0.55, ease: "power2.out" },
          at(number),
        );
      });
      show("#locker-empty", at(2, 0.48));
      show("#locker-type", at(3));
      emphasize("locker-type", at(3, 0.4));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="lockers">
        {LOCKERS.map(({ number, x }) => (
          <g key={number}>
            <rect
              x={x}
              y={173}
              width={416}
              height={484}
              rx={24}
              fill="#F1F5F9"
              stroke={GRAY}
              strokeWidth={8}
            />
            <Text x={x + 208} y={245} size={50}>
              {number}
            </Text>
            <rect
              x={x + 24}
              y={272}
              width={368}
              height={360}
              rx={8}
              fill="#EFF6FF"
              stroke={LINE}
              strokeWidth={7}
            />
            {number === 1 && (
              <g>
                <path
                  d="M 721 424 V 405 Q 721 381 745 381 H 772 Q 796 381 796 405 V 424"
                  fill="none"
                  stroke="#865634"
                  strokeWidth={12}
                />
                <rect
                  x={653}
                  y={420}
                  width={211}
                  height={142}
                  rx={18}
                  fill="#B88754"
                  stroke="#865634"
                  strokeWidth={7}
                />
                <path d="M 657 482 H 860" stroke="#865634" strokeWidth={8} />
                <rect x={741} y={468} width={35} height={27} rx={5} fill={LINE} />
              </g>
            )}
            <g id={`locker-door-${number}`}>
              <rect
                x={x + 24}
                y={272}
                width={368}
                height={360}
                rx={8}
                fill="#fff"
                stroke={BLUE}
                strokeWidth={8}
              />
              <path
                d={`M ${x + 102} 324 H ${x + 314} M ${x + 102} 350 H ${x + 314}`}
                stroke={LINE}
                strokeWidth={9}
                strokeLinecap="round"
              />
              <path
                d={`M ${x + 333} 426 V 477`}
                stroke={INK}
                strokeWidth={12}
                strokeLinecap="round"
              />
            </g>
          </g>
        ))}
      </g>
      <CodeCallout id="locker-empty" x={1188} y={744} text={EMPTY} />
      <CodeCallout id="locker-type" x={960} y={879} text={TYPE} />
    </Stage>
  );
}
