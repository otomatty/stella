import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import {
  Callout,
  GRAY,
  Head,
  INK,
  Line,
  PINK,
  Stage,
  stageMotion,
  Tag,
  Text,
  VIOLET,
} from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const ageFloorText = "歳と9か月何ですか？切り捨てです誕生日0123456789.";

const X20 = 420;
const MONTH = 90;
const NOW = X20 + 9 * MONTH;
const X21 = X20 + 12 * MONTH;
const LINE_Y = 620;
const MONTH_TICKS = Array.from({ length: 11 }, (_, i) => X20 + (i + 1) * MONTH);

/** ろうそくを立てたケーキ (誕生日の印)。 */
function Cake({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${LINE_Y - 40})`}>
      <rect x={-6} y={-112} width={12} height={36} rx={4} fill="#F59E0B" />
      <path d="M 0 -134 C 10 -124 8 -114 0 -112 C -8 -114 -10 -124 0 -134 Z" fill="#EF4444" />
      <rect x={-56} y={-76} width={112} height={30} rx={10} fill="#FBCFE8" />
      <rect x={-64} y={-52} width={128} height={52} rx={10} fill="#FDE68A" />
    </g>
  );
}

/** 年齢: 20 歳と 9 か月でも 20 歳。余った分を捨てて整数にする。 */
export function AgeFloor({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["age-floor"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { show, draw, emphasize } = stageMotion(t);

      // 1 文め: 20 歳から 21 歳までの線が出てくる
      t.fromTo(
        "#timeline",
        { opacity: 0, y: 26, scale: 0.94, svgOrigin: "960 600" },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "power3.out" },
        at(0, -0.5),
      );

      // 2 文め: いまの位置と、年齢の答え
      t.fromTo(
        "#pin",
        { opacity: 0, y: -40 },
        { opacity: 1, y: 0, immediateRender: false, duration: 0.5, ease: "power3.out" },
        at(1, 0.2),
      );
      show("#tag-now", at(1, 0.6));
      show("#ask", at(1, 1.4));
      show("#answer", at(1, 2.4));

      // 3 文め: 月の分は数えない
      draw("#months .line", at(2, 0.2), 0.7);
      show("#tag-months", at(2, 0.7));
      t.to("#months, #tag-months", { opacity: 0.3, duration: 0.4 }, at(2, 1.7));
      draw("#back .line", at(2, 1.9), 0.7);
      t.to("#back-head", { opacity: 1, duration: 0.15 }, at(2, 2.5));
      t.to("#tick-20", { attr: { r: 20 }, fill: PINK, duration: 0.3 }, at(2, 2.6));

      // 4 文め: 余った分を捨てて整数にする
      show("#num", at(3, 0.1));
      t.to("#num-rest", { fill: "#C8C8CE", duration: 0.3 }, at(3, 0.9));
      draw("#strike .line", at(3, 0.9), 0.4);
      show("#call", at(3, 1.3));
      emphasize("call", at(3, 1.8));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="timeline">
        <rect
          x={X20 - 100}
          y={LINE_Y - 5}
          width={X21 - X20 + 200}
          height={10}
          rx={5}
          fill="#94A3B8"
        />
        {MONTH_TICKS.map((x) => (
          <rect key={x} x={x - 2} y={LINE_Y - 16} width={4} height={32} fill="#94A3B8" />
        ))}
        <circle id="tick-20" cx={X20} cy={LINE_Y} r={14} fill={INK} />
        <circle cx={X21} cy={LINE_Y} r={14} fill={INK} />
        <Cake x={X20} />
        <Cake x={X21} />
        <Text x={X20} y={LINE_Y + 86} size={52}>
          20歳
        </Text>
        <Text x={X21} y={LINE_Y + 86} size={52}>
          21歳
        </Text>
        <Text x={X20} y={LINE_Y + 136} size={32} weight={500} fill={GRAY}>
          誕生日
        </Text>
        <Text x={X21} y={LINE_Y + 136} size={32} weight={500} fill={GRAY}>
          誕生日
        </Text>
      </g>

      {/* いまの位置 */}
      <g id="pin" opacity={0}>
        <rect x={NOW - 4} y={LINE_Y - 110} width={8} height={110} rx={4} fill={VIOLET} />
        <circle cx={NOW} cy={LINE_Y} r={16} fill={VIOLET} />
      </g>
      <Tag id="tag-now" x={NOW} y={LINE_Y - 140} text="20歳と9か月" chars={6} />

      {/* 質問と答え */}
      <g id="ask" opacity={0}>
        <path
          d="M 300 150 h 420 a 24 24 0 0 1 24 24 v 92 a 24 24 0 0 1 -24 24 h -300 l -50 46 l 6 -46 h -76 a 24 24 0 0 1 -24 -24 v -92 a 24 24 0 0 1 24 -24 z"
          fill="#fff"
          stroke={INK}
          strokeWidth={4}
        />
        <Text x={510} y={240} size={52}>
          何歳ですか？
        </Text>
      </g>
      <g id="answer" opacity={0}>
        <path
          d="M 900 150 h 380 a 24 24 0 0 1 24 24 v 92 a 24 24 0 0 1 -24 24 h -80 l 6 46 l -50 -46 h -256 a 24 24 0 0 1 -24 -24 v -92 a 24 24 0 0 1 24 -24 z"
          fill={VIOLET}
        />
        <Text x={1090} y={240} size={52} fill="#fff">
          20歳です
        </Text>
      </g>

      {/* 数えない 9 か月 */}
      <Line
        id="months"
        d={`M ${X20} ${LINE_Y + 180} L ${X20} ${LINE_Y + 204} L ${NOW} ${LINE_Y + 204} L ${NOW} ${LINE_Y + 180}`}
        color={GRAY}
      />
      <Tag
        id="tag-months"
        x={(X20 + NOW) / 2}
        y={LINE_Y + 250}
        text="9か月"
        chars={3.4}
        color={GRAY}
      />
      <Line
        id="back"
        d={`M ${NOW - 30} ${LINE_Y - 30} Q ${(X20 + NOW) / 2} ${LINE_Y - 150} ${X20 + 56} ${LINE_Y - 44}`}
      />
      <Head id="back-head" x={X20 + 30} y={LINE_Y - 30} angle={152} />

      {/* 数で表すと */}
      <g id="num" opacity={0}>
        <Text x={1580} y={300} size={120} anchor="end">
          20
        </Text>
        <Text id="num-rest" x={1584} y={300} size={120} anchor="start">
          .75
        </Text>
      </g>
      <Line id="strike" d="M 1592 262 L 1792 262" />
      <Callout id="call" x={1690} y={140} text="切り捨て" />
    </Stage>
  );
}
