import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, BLUE, INK, LINE, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const VIOLET = "#8330C7";

const EMPTY = "undefined";
export const emptyLockerText = `123456${EMPTY}`;
const LOCKERS = [
  { number: 1, x: 380, y: 180 },
  { number: 2, x: 760, y: 180 },
  { number: 3, x: 1140, y: 180 },
  { number: 4, x: 380, y: 520 },
  { number: 5, x: 760, y: 520 },
  { number: 6, x: 1140, y: 520 },
];

function Bag() {
  return (
    <g>
      <path
        d="M-64 -60 V-95 Q-64 -147 0 -147 Q64 -147 64 -95 V-60 H44 V-95 Q44 -127 0 -127 Q-44 -127 -44 -95 V-60Z"
        fill={VIOLET}
      />
      <rect x={-146} y={-75} width={297} height={191} rx={30} fill={VIOLET} />
      <rect x={-122} y={-13} width={249} height={7} rx={3.5} fill={LINE} />
      <rect x={97} y={-13} width={13} height={28} rx={5} fill={LINE} />
    </g>
  );
}
export function EmptyLocker({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["empty-locker"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#lockers", at(0));
      // 蝶番を軸に扉を開く。荷物は扉の前へ取り出す。
      for (const { number, x, y } of LOCKERS.slice(0, 2)) {
        t.to(
          `#locker-key-${number}`,
          {
            rotation: 90,
            svgOrigin: `${x + 276} ${y + 171}`,
            duration: at(number, 0.4) - at(number),
            ease: "power1.inOut",
          },
          at(number),
        );
        t.to(
          `#locker-door-${number}`,
          {
            scaleX: -0.22,
            skewY: 8,
            svgOrigin: `${x + 12} ${y + 25}`,
            duration: at(number, 1.35) - at(number, 0.4),
            ease: "power2.inOut",
          },
          at(number, 0.4),
        );
      }
      t.set("#locker-bag-inside", { opacity: 0 }, at(1, 1.4));
      t.set("#locker-bag-outside", { opacity: 1 }, at(1, 1.4));
      t.fromTo(
        "#locker-bag-travel",
        { x: 550, y: 385, scale: 0.72 },
        { x: 535, y: 783, scale: 1.08, duration: at(1, 2.7) - at(1, 1.4), ease: "power2.inOut" },
        at(1, 1.4),
      );
      show("#locker-empty", at(3, 0.2));
      emphasize("locker-empty", at(3, 0.9));
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <g transform="translate(-77 -45) scale(1.08)">
        <g id="lockers">
          <rect x={345} y={149} width={1172} height={729} rx={22} fill={LINE} />
          {[390, 1435].map((x) => (
            <rect key={x} x={x} y={878} width={55} height={29} rx={5} fill={LINE} />
          ))}
          {LOCKERS.map(({ number, x, y }) => (
            <g key={number}>
              {/* 開いた中は、扉より一段濃い灰色の面。 */}
              <rect x={x} y={y} width={340} height={312} rx={12} fill="#C7C7CF" />
              <rect x={x + 146} y={y + 37} width={48} height={39} rx={6} fill="#fff" />
              <Text x={x + 170} y={y + 67} size={29} fill={INK}>
                {number}
              </Text>
              {number === 1 && (
                <g id="locker-bag-inside" transform="translate(550 385) scale(0.72)">
                  <Bag />
                </g>
              )}
              <g id={`locker-door-${number}`}>
                <rect x={x + 9} y={y + 9} width={321} height={294} rx={12} fill="#F1F1F4" />
                <rect x={x + 128} y={y + 32} width={83} height={51} rx={8} fill={BLUE} />
                <Text x={x + 170} y={y + 71} size={39} fill="#fff">
                  {number}
                </Text>
                {[115, 132, 149].map((dy) => (
                  <rect key={dy} x={x + 71} y={y + dy} width={136} height={6} rx={3} fill={LINE} />
                ))}
                <circle cx={x + 276} cy={y + 171} r={17} fill={INK} />
                <g id={`locker-key-${number}`}>
                  <path d={`M${x + 272} ${y + 166} h8 v36 h11 v8 h-19Z`} fill={BLUE} />
                  <path
                    d={`M${x + 295} ${y + 218} a19 19 0 1 1 -38 0 a19 19 0 1 1 38 0 m-7 0 a12 12 0 1 0 -24 0 a12 12 0 1 0 24 0`}
                    fill={BLUE}
                    fillRule="evenodd"
                  />
                </g>
                <rect x={x + 225} y={y + 204} width={14} height={55} rx={7} fill={LINE} />
              </g>
            </g>
          ))}
          <g id="locker-bag-outside" opacity={0}>
            <g id="locker-bag-travel">
              <Bag />
            </g>
          </g>
        </g>
        <CodeCallout id="locker-empty" x={930} y={90} text={EMPTY} />
      </g>
    </Stage>
  );
}
