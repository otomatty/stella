import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Callout, INK, Line, PINK, Stage, stageMotion, Tag, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const platformSignText =
  "のりば案内まもなく番線に電車がまいります決まった文変わるところ値を埋め込む123";

const LED = "#FDBA74";

/** 駅の案内: 決まった文の穴に、何番線かの値を入れる。 */
export function PlatformSign({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["platform-sign"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { show, draw, emphasize } = stageMotion(t);

      // 1 文め: 駅の案内板が出てくる
      t.fromTo(
        "#board",
        { opacity: 0, y: -26, scale: 0.94, svgOrigin: "960 330" },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "power3.out" },
        at(0, -0.5),
      );

      // 2 文め: 毎回同じ文
      draw("#fixed .line", at(1, 0.2), 0.6);
      show("#tag-fixed", at(1, 0.7));

      // 3 文め: 変わるのは何番線かだけ
      t.to("#slot", { stroke: PINK, duration: 0.3 }, at(2, 0.1));
      show(".chip", at(2, 0.3), { stagger: 0.12 });
      draw("#to-slot .line", at(2, 0.4), 0.3);
      show("#call-slot", at(2, 0.6));
      [1, 2, 3].forEach((n, i) => {
        const start = at(2, 1.0 + i * 0.7);
        t.to(`#chip-${n}`, { y: 400, opacity: 0, duration: 0.4, ease: "power2.in" }, start);
        t.to(`#digit-${n}`, { opacity: 1, duration: 0.2 }, start + 0.35);
        if (n < 3)
          t.to(`#digit-${n}`, { opacity: 0, duration: 0.2 }, at(2, 1.0 + (i + 1) * 0.7) + 0.3);
      });

      // 4 文め: 穴に値を入れると、案内が完成する
      t.to("#slot", { stroke: LED, strokeDasharray: "none", duration: 0.3 }, at(3, 0.2));
      t.to("#tag-fixed, #fixed, #call-slot", { opacity: 0, duration: 0.3 }, at(3, 0.2));
      show("#call-embed", at(3, 0.6));
      emphasize("call-embed", at(3, 1.2));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="board">
        <rect x={520} y={60} width={24} height={150} fill="#64748B" />
        <rect x={1376} y={60} width={24} height={150} fill="#64748B" />
        <rect
          x={300}
          y={190}
          width={1320}
          height={290}
          rx={24}
          fill="#111827"
          stroke="#334155"
          strokeWidth={8}
        />
        <Text x={360} y={262} size={36} anchor="start" fill="#94A3B8" weight={500}>
          のりば案内
        </Text>
        <Text x={370} y={392} size={70} anchor="start" fill={LED}>
          まもなく
        </Text>
        <rect
          id="slot"
          x={672}
          y={312}
          width={104}
          height={110}
          rx={14}
          fill="#1F2937"
          stroke="#94A3B8"
          strokeWidth={5}
          strokeDasharray="14 10"
        />
        {[1, 2, 3].map((n) => (
          <Text key={n} id={`digit-${n}`} x={724} y={394} size={76} fill="#fff" opacity={0}>
            {n}
          </Text>
        ))}
        <Text x={800} y={392} size={70} anchor="start" fill={LED}>
          番線に電車がまいります
        </Text>
      </g>

      <Line id="fixed" d="M 372 438 L 648 438 M 802 438 L 1568 438" color={BLUE} />
      <Tag id="tag-fixed" x={1190} y={540} text="決まった文" color={BLUE} />

      {[1, 2, 3].map((n, i) => (
        <g
          key={n}
          id={`chip-${n}`}
          className="chip"
          transform={`translate(${624 + i * 100} 780)`}
          opacity={0}
        >
          <rect
            x={-40}
            y={-50}
            width={80}
            height={100}
            rx={14}
            fill="#fff"
            stroke={INK}
            strokeWidth={4}
          />
          <Text x={0} y={24} size={64}>
            {n}
          </Text>
        </g>
      ))}
      <Line id="to-slot" d="M 724 432 L 724 562" />
      <Callout id="call-slot" x={724} y={600} text="変わるところ" />
      <Callout id="call-embed" x={724} y={600} text="値を埋め込む" />
    </Stage>
  );
}
