import { useCallback, useMemo, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, Tag, BLUE, INK, LINE, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const VIOLET = "#8330C7";

const RECORDS = [
  { x: 840, value: 3200 },
  { x: 1160, value: 5100 },
  { x: 1480, value: 4800 },
];
export const stepLogText = "歩記録日ぶん0123456789number[]";

function RunningShoe() {
  return (
    <g>
      <path
        d="M-176 41 Q-194 7-166-39 L-116-55 L-81-19 L-25-40 Q5 29 97 45 Q167 49 176 95 L-165 95Z"
        fill="#DF755A"
      />
      <path
        d="M-168 71 Q-11 100 176 83 V111 Q18 134-171 104Z"
        fill="#fff"
        stroke={LINE}
        strokeWidth={3}
      />
      <path
        d="M-93-3 L-38 13 M-75 14 L-15 32 M-50 31 L12 47"
        stroke="#fff"
        strokeWidth={9}
        strokeLinecap="round"
      />
    </g>
  );
}

/** 歩数計の値を一日ずつカードへ移し、記録が何日ぶんあるか数える。 */
export function StepLog({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["step-log"].seconds), [beats]);
  const time = useCurrentFrame() / useVideoConfig().fps;
  const displayed =
    time < at(1) ? "0" : time < at(1, 1.25) ? "3200" : time < at(1, 2.5) ? "5100" : "4800";
  const counted = time < at(2, 0.5) ? 0 : time < at(2, 1.2) ? 1 : time < at(2, 1.9) ? 2 : 3;
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#sl-scene", at(0));
      RECORDS.forEach((record, i) => {
        show(`#sl-card-${record.value}`, at(1, i * 1.25));
        t.fromTo(
          `#sl-card-${record.value}`,
          { x: 430 - record.x, y: -125 },
          { x: 0, y: 0, immediateRender: false, duration: 0.85, ease: "power2.inOut" },
          at(1, i * 1.25 + 0.25),
        );
        show(`#sl-day-${record.value}`, at(2, 0.5 + i * 0.7));
      });
      show("#sl-count", at(2, 0.5));
      show("#sl-type", at(3));
      emphasize("sl-type", at(3, 0.7));
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <g id="sl-scene" opacity={0}>
        <g transform="translate(350 723) scale(1.2)">
          <RunningShoe />
        </g>
        <path
          d="M275 270 V210 Q275 168 320 168 H485 Q528 168 528 210 V270 H504 V210 Q504 192 485 192 H320 Q299 192 299 210 V270Z"
          fill={VIOLET}
        />
        <rect x={218} y={250} width={375} height={308} rx={50} fill={VIOLET} />
        <rect x={250} y={294} width={310} height={148} rx={18} fill={INK} />
        <Text x={404} y={389} size={66} fill="#fff">
          {displayed}
        </Text>
        <Text x={502} y={423} size={27} fill="#fff">
          歩
        </Text>
        <ellipse cx={330} cy={497} rx={31} ry={18} fill="#fff" />
        <ellipse cx={475} cy={497} rx={31} ry={18} fill="#fff" />
        {/* トレーは灰色の一枚の面。 */}
        <rect x={620} y={380} width={1100} height={450} rx={26} fill={LINE} />
      </g>
      {RECORDS.map(({ x, value }) => (
        <g key={value} id={`sl-card-${value}`} opacity={0}>
          <g transform={`translate(${x} 560)`}>
            <rect
              x={-130}
              y={-166}
              width={260}
              height={320}
              rx={18}
              fill="#fff"
              stroke={LINE}
              strokeWidth={3}
            />
            <path
              d="M-112-166 H112 Q130-166 130-148 V-88 H-130 V-148 Q-130-166-112-166Z"
              fill={BLUE}
            />
            <Text x={0} y={-109} size={32} fill="#FFFFFF">
              記録
            </Text>
            <Text x={0} y={17} size={59} fill={INK}>
              {value}
            </Text>
            <Text x={68} y={100} size={31} fill={INK}>
              歩
            </Text>
            <path d="M -94 83 H 18 M -94 109 H 18" stroke={LINE} strokeWidth={4} />
          </g>
        </g>
      ))}
      {RECORDS.map(({ x, value }) => (
        <g key={value} id={`sl-day-${value}`} opacity={0}>
          <path d={`M ${x - 111} 736 v 17 h 222 v -17`} fill="none" stroke={BLUE} strokeWidth={5} />
          <Text x={x} y={790} size={34} fill={INK}>
            1日ぶん
          </Text>
        </g>
      ))}
      <Tag id="sl-count" x={1565} y={263} text={`${counted}日ぶん`} color={BLUE} />
      <CodeCallout id="sl-type" x={1158} y={889} text="number[]" />
    </Stage>
  );
}
