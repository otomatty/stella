import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import {
  BLUE,
  Callout,
  GRAY,
  INK,
  Line,
  Mark,
  PINK,
  Stage,
  stageMotion,
  Tag,
  Text,
} from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const routeSearchText = "乗り換え案内出発到着さくら駅みなと調べる分円値を2つ受け取るめ1250→";

/** 乗り換え案内: 出発と到着の 2 つがそろって、はじめて調べられる。 */
export function RouteSearch({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["route-search"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { show, draw, emphasize } = stageMotion(t);

      // 1 文め: 乗り換え案内の画面が出てくる
      t.fromTo(
        "#app",
        { opacity: 0, y: 26, scale: 0.94, svgOrigin: "710 500" },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "power3.out" },
        at(0, -0.5),
      );

      // 2 文め: 出発の駅を入れる
      t.to("#hl-from", { opacity: 1, duration: 0.3 }, at(1, 0.2));
      show("#from", at(1, 0.8));
      t.to("#hl-from", { opacity: 0, duration: 0.3 }, at(1, 2.2));

      // 3 文め: 到着が空のままでは調べられない
      t.to("#hl-to", { opacity: 1, duration: 0.3 }, at(2, 0.2));
      show("#ng", at(2, 0.9));

      // 4 文め: 2 つがそろうと結果が出る
      show("#to", at(3, 0.2));
      t.to("#hl-to, #ng", { opacity: 0, duration: 0.3 }, at(3, 0.6));
      t.to("#button", { fill: BLUE, duration: 0.3 }, at(3, 0.8));
      draw("#to-result .line", at(3, 1.2), 0.5);
      show("#result", at(3, 1.5));

      // 5 文め: 受け取る値は 2 つ
      draw("#l1 .line", at(4, 0.1), 0.3);
      show("#tag-1", at(4, 0.3));
      draw("#l2 .line", at(4, 0.6), 0.3);
      show("#tag-2", at(4, 0.8));
      show("#call", at(4, 1.2));
      emphasize("call", at(4, 1.7));
    },
    [at],
  );
  useTimeline(root, build);

  const field = { fill: "#F8FAFC", stroke: "#94A3B8", strokeWidth: 3, rx: 14 };
  return (
    <Stage root={root}>
      <g id="app">
        <ellipse cx={710} cy={932} rx={380} ry={16} fill={INK} opacity={0.06} />
        <rect
          x={360}
          y={110}
          width={700}
          height={810}
          rx={28}
          fill="#fff"
          stroke="#CBD5E1"
          strokeWidth={4}
        />
        <rect x={360} y={110} width={700} height={120} rx={28} fill="#DBEAFE" />
        <rect x={360} y={190} width={700} height={40} fill="#DBEAFE" />
        <Text x={710} y={192} size={52}>
          乗り換え案内
        </Text>
        <Text x={420} y={372} size={42} anchor="start">
          出発
        </Text>
        <rect x={560} y={300} width={440} height={116} {...field} />
        <Text x={420} y={552} size={42} anchor="start">
          到着
        </Text>
        <rect x={560} y={480} width={440} height={116} {...field} />
        <rect id="button" x={560} y={690} width={440} height={110} rx={55} fill="#CBD5E1" />
        <Text x={780} y={764} size={48} fill="#fff">
          調べる
        </Text>
        <g id="from" opacity={0}>
          <Text x={780} y={378} size={54}>
            さくら駅
          </Text>
        </g>
        <g id="to" opacity={0}>
          <Text x={780} y={558} size={54}>
            みなと駅
          </Text>
        </g>
      </g>
      <rect
        id="hl-from"
        x={552}
        y={292}
        width={456}
        height={132}
        rx={20}
        fill="none"
        stroke={PINK}
        strokeWidth={6}
        opacity={0}
      />
      <rect
        id="hl-to"
        x={552}
        y={472}
        width={456}
        height={132}
        rx={20}
        fill="none"
        stroke={PINK}
        strokeWidth={6}
        opacity={0}
      />
      <Mark id="ng" x={1040} y={690} ok={false} />

      {/* 調べた結果 */}
      <Line id="to-result" d="M 1010 745 L 1100 745 L 1100 500 L 1190 500" color={GRAY} />
      <g id="result" opacity={0}>
        <rect
          x={1200}
          y={330}
          width={560}
          height={340}
          rx={24}
          fill="#fff"
          stroke={INK}
          strokeWidth={4}
        />
        <Text x={1480} y={420} size={44} fill={GRAY} weight={500}>
          さくら駅 → みなと駅
        </Text>
        <Text x={1480} y={520} size={76}>
          25分
        </Text>
        <Text x={1480} y={618} size={76}>
          320円
        </Text>
      </g>

      <Line id="l1" d="M 350 358 L 280 358" color={GRAY} />
      <Tag id="tag-1" x={196} y={358} text="1つめ" chars={3.4} />
      <Line id="l2" d="M 350 538 L 280 538" color={GRAY} />
      <Tag id="tag-2" x={196} y={538} text="2つめ" chars={3.4} />
      <Callout id="call" x={1480} y={200} text="値を2つ受け取る" />
    </Stage>
  );
}
