import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import {
  BLUE,
  Callout,
  GRAY,
  GREEN,
  INK,
  Line,
  PINK,
  Stage,
  stageMotion,
  Tag,
  Text,
} from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const ROWS = [
  { name: "母", number: "090-1111-2222", color: PINK },
  { name: "会社", number: "03-1111-3333", color: BLUE },
  { name: "歯医者", number: "080-1111-4444", color: GREEN },
];
export const contactsText = `電話${ROWS.map((r) => r.name + r.number).join("")}？名前を付ける値に発信中`;

const rowY = (i: number) => 280 + i * 170;

/** スマートフォンの連絡先: 番号だけでは分からないので、名前を付けて使う。 */
export function Contacts({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS.contacts.seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { show, draw, emphasize } = stageMotion(t);

      // 1 文め: 電話の画面が出てくる
      t.fromTo(
        "#phone",
        { opacity: 0, y: 26, scale: 0.94, svgOrigin: "960 510" },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "power3.out" },
        at(0, -0.5),
      );

      // 2 文め: 番号だけでは、だれの番号か分からない
      show(".who", at(1, 0.3), { stagger: 0.25 });

      // 3 文め: 名前を付ける
      t.to(".who", { opacity: 0, duration: 0.25 }, at(2, 0.1));
      t.to(
        ".number",
        {
          y: 34,
          scale: 0.72,
          fill: GRAY,
          duration: 0.5,
          ease: "power2.inOut",
          stagger: 0.2,
          transformOrigin: "0% 50%",
        },
        at(2, 0.3),
      );
      t.to(".avatar", { opacity: 1, duration: 0.4, stagger: 0.2 }, at(2, 0.5));
      show(".name", at(2, 0.6), { stagger: 0.2 });
      show("#call-name", at(2, 1.4));

      // 4 文め: 名前を選んでかける
      t.to("#pick", { opacity: 1, duration: 0.3 }, at(3, 0.3));
      t.fromTo(
        "#ripple",
        { attr: { r: 14 }, opacity: 0.9 },
        { attr: { r: 70 }, opacity: 0, immediateRender: false, duration: 0.7, ease: "power2.out" },
        at(3, 0.5),
      );
      show("#calling", at(3, 1.1));

      // 5 文め: 値と名前の関係を札で示す
      draw("#to-name .line", at(4, 0.1), 0.4);
      show("#tag-name", at(4, 0.3));
      draw("#to-value .line", at(4, 0.7), 0.4);
      show("#tag-value", at(4, 0.9));
      emphasize("call-name", at(4, 1.2));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="phone">
        <ellipse cx={960} cy={962} rx={300} ry={16} fill={INK} opacity={0.06} />
        <rect x={730} y={70} width={460} height={880} rx={56} fill="#1E293B" />
        <rect x={752} y={100} width={416} height={820} rx={36} fill="#F8FAFC" />
        <rect x={900} y={84} width={120} height={10} rx={5} fill="#475569" />
        <Text x={960} y={186} size={44}>
          電話
        </Text>
        <rect x={752} y={212} width={416} height={3} fill="#E2E8F0" />
        <rect
          id="pick"
          x={752}
          y={rowY(0) - 68}
          width={416}
          height={150}
          fill="#E0E7FF"
          opacity={0}
        />
        {ROWS.map((r, i) => (
          <g key={r.name}>
            <circle cx={820} cy={rowY(i) + 8} r={38} fill="#CBD5E1" />
            <circle
              className="avatar"
              cx={820}
              cy={rowY(i) + 8}
              r={38}
              fill={r.color}
              opacity={0}
            />
            <g className="who" opacity={0}>
              <Text x={820} y={rowY(i) + 26} size={48} fill="#fff">
                ？
              </Text>
            </g>
            <g className="name" opacity={0}>
              <Text x={876} y={rowY(i) + 4} size={46} anchor="start">
                {r.name}
              </Text>
            </g>
            <text
              className="number"
              x={876}
              y={rowY(i) + 22}
              fontFamily="'Noto Sans JP', sans-serif"
              fontWeight={700}
              fontSize={38}
              fill={INK}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {r.number}
            </text>
            <rect x={780} y={rowY(i) + 82} width={360} height={2} fill="#E2E8F0" />
          </g>
        ))}
        <circle
          id="ripple"
          cx={1090}
          cy={rowY(0) + 8}
          r={14}
          fill="none"
          stroke={PINK}
          strokeWidth={6}
          opacity={0}
        />
        <g id="calling" opacity={0}>
          <rect x={790} y={792} width={340} height={84} rx={42} fill={GREEN} />
          <Text x={960} y={850} size={40} fill="#fff">
            母に発信中
          </Text>
        </g>
      </g>

      <Callout id="call-name" x={1480} y={rowY(0) - 100} text="名前を付ける" />
      <Line id="to-name" d={`M 720 ${rowY(0) - 12} L 580 ${rowY(0) - 12}`} color={GRAY} />
      <Tag id="tag-name" x={516} y={rowY(0) - 12} text="名前" />
      <Line id="to-value" d={`M 1200 ${rowY(0) + 46} L 1340 ${rowY(0) + 46}`} color={GRAY} />
      <Tag id="tag-value" x={1398} y={rowY(0) + 46} text="値" chars={2} />
    </Stage>
  );
}
