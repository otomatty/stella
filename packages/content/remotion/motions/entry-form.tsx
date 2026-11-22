import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { Callout, GRAY, INK, Line, Mark, PINK, Stage, stageMotion, Tag, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const entryFormText = "申込用紙名前年齢歳田中二十文字数種類が決まっている20";

/** 申込用紙の記入欄: 欄ごとに、書いてよいものの種類が決まっている。 */
export function EntryForm({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["entry-form"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { show, draw, emphasize } = stageMotion(t);

      // 1 文め: 申込用紙が出てくる
      t.fromTo(
        "#paper",
        { opacity: 0, y: 26, scale: 0.94, svgOrigin: "780 520" },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "power3.out" },
        at(0, -0.5),
      );

      // 2 文め: 名前の欄と年齢の欄を順に囲む
      t.to("#hl-name", { opacity: 1, duration: 0.3 }, at(1, 0.2));
      t.to("#hl-age", { opacity: 1, duration: 0.3 }, at(1, 1.2));
      t.to("#hl-name", { opacity: 0, duration: 0.3 }, at(1, 2.4));

      // 3 文め: 文字の札は年齢の欄に入らず、数の札は入る
      show("#card-text", at(2, 0.1));
      t.to("#card-text", { x: 1040, duration: 0.6, ease: "power2.inOut" }, at(2, 0.5));
      show("#ng", at(2, 1.2));
      t.to("#card-text, #ng", { opacity: 0, duration: 0.3 }, at(2, 1.9));
      show("#card-num", at(2, 2.1));
      t.to("#card-num", { x: 720, duration: 0.7, ease: "power2.inOut" }, at(2, 2.5));
      t.to("#card-num-box", { opacity: 0, duration: 0.25 }, at(2, 3.1));
      show("#ok", at(2, 3.3));
      t.to("#hl-age", { opacity: 0, duration: 0.3 }, at(2, 3.7));

      // 4 文め: 欄ごとの種類の札を出す
      show("#name-value", at(3, 0.1));
      draw("#to-kind-name .line", at(3, 0.3), 0.4);
      show("#kind-name", at(3, 0.5));
      draw("#to-kind-age .line", at(3, 1.1), 0.4);
      show("#kind-age", at(3, 1.3));

      // 5 文め: 種類が決まっていることを札で示す
      show("#call", at(4, 0.1));
      emphasize("call", at(4, 0.6));
      draw("#bracket .line", at(4, 0.5), 0.6);
    },
    [at],
  );
  useTimeline(root, build);

  const field = { fill: "#F8FAFC", stroke: "#94A3B8", strokeWidth: 3, rx: 12 };
  return (
    <Stage root={root}>
      <g id="paper">
        <ellipse cx={780} cy={952} rx={420} ry={18} fill={INK} opacity={0.06} />
        <rect
          x={380}
          y={90}
          width={800}
          height={850}
          rx={20}
          fill="#fff"
          stroke="#CBD5E1"
          strokeWidth={4}
        />
        <rect x={380} y={90} width={800} height={130} rx={20} fill="#E0E7FF" />
        <rect x={380} y={180} width={800} height={40} fill="#E0E7FF" />
        <Text x={780} y={178} size={56}>
          申込用紙
        </Text>
        <Text x={450} y={398} size={44} anchor="start">
          名前
        </Text>
        <rect x={600} y={330} width={500} height={110} {...field} />
        <Text x={450} y={608} size={44} anchor="start">
          年齢
        </Text>
        <rect x={600} y={540} width={240} height={110} {...field} />
        <Text x={866} y={612} size={44} anchor="start">
          歳
        </Text>
        {[750, 810, 870].map((y) => (
          <rect
            key={y}
            x={450}
            y={y}
            width={y === 870 ? 420 : 650}
            height={18}
            rx={9}
            fill="#E2E8F0"
          />
        ))}
        <Text id="name-value" x={850} y={404} size={56} opacity={0}>
          田中
        </Text>
      </g>

      <rect
        id="hl-name"
        x={592}
        y={322}
        width={516}
        height={126}
        rx={18}
        fill="none"
        stroke={PINK}
        strokeWidth={6}
        opacity={0}
      />
      <rect
        id="hl-age"
        x={592}
        y={532}
        width={256}
        height={126}
        rx={18}
        fill="none"
        stroke={PINK}
        strokeWidth={6}
        opacity={0}
      />

      {/* 数の札: 年齢の欄へ入る */}
      <g id="card-num" transform="translate(1500 595)" opacity={0}>
        <rect
          id="card-num-box"
          x={-90}
          y={-50}
          width={180}
          height={100}
          rx={16}
          fill="#fff"
          stroke={INK}
          strokeWidth={4}
        />
        <Text x={0} y={22} size={60}>
          20
        </Text>
      </g>
      <Mark id="ok" x={980} y={595} ok />
      {/* 文字の札: 年齢の欄には入らない */}
      <g id="card-text" transform="translate(1500 595)" opacity={0}>
        <rect
          x={-120}
          y={-50}
          width={240}
          height={100}
          rx={16}
          fill="#fff"
          stroke={INK}
          strokeWidth={4}
        />
        <Text x={0} y={20} size={56}>
          二十
        </Text>
      </g>
      <Mark id="ng" x={1040} y={500} ok={false} />

      <Line id="to-kind-name" d="M 1112 385 L 1380 385" color={GRAY} />
      <Tag id="kind-name" x={1450} y={385} text="文字" />
      <Line id="to-kind-age" d="M 1080 595 L 1380 595" color={GRAY} />
      <Tag id="kind-age" x={1450} y={595} text="数" chars={2} />
      <Line id="bracket" d="M 1620 290 L 1620 595 L 1560 595 M 1620 385 L 1560 385" />
      <Callout id="call" x={1640} y={250} text="種類が決まっている" />
    </Stage>
  );
}
