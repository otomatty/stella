import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { Callout, GRAY, INK, Line, PINK, Stage, stageMotion, Tag, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const pizzaShareText = "切れ人1にコードでは別の記号0123456789÷=";

const PIZZA = { x: 480, y: 400, r: 200 };
const PLATES = [
  { x: 1150, y: 250 },
  { x: 1450, y: 250 },
  { x: 1150, y: 560 },
  { x: 1450, y: 560 },
];
const rad = (deg: number) => (deg * Math.PI) / 180;
const WEDGE = `M 0 0 L ${PIZZA.r} 0 A ${PIZZA.r} ${PIZZA.r} 0 0 1 ${PIZZA.r * Math.cos(rad(45))} ${PIZZA.r * Math.sin(rad(45))} Z`;

/** ピザを 4 人で分ける: 算数の割る記号は、コードでは別の記号になる。 */
export function PizzaShare({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["pizza-share"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { show, draw, emphasize } = stageMotion(t);

      // 1 文め: ピザが出てくる
      t.fromTo(
        "#pizza",
        { opacity: 0, y: 26, scale: 0.94, svgOrigin: `${PIZZA.x} ${PIZZA.y}` },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "power3.out" },
        at(0, -0.5),
      );

      // 2 文め: 8 切れと、4 人ぶんの皿
      show("#tag-slices", at(1, 0.2));
      show(".plate", at(1, 0.8), { stagger: 0.15 });
      show("#tag-people", at(1, 1.6));

      // 3 文め: 2 切れずつ配る
      for (let i = 0; i < 8; i++) {
        const plate = PLATES[i % 4];
        const second = i >= 4;
        t.to(
          `#slice-${i}`,
          {
            x: plate.x + (second ? 10 : -10),
            y: plate.y + 34,
            rotation: second ? 292 : 203,
            scale: 0.5,
            duration: 0.6,
            ease: "power2.inOut",
          },
          at(2, 0.2 + i * 0.3),
        );
      }
      t.to("#crust", { opacity: 0.25, duration: 0.4 }, at(2, 2.4));
      show("#tag-each", at(2, 2.9));

      // 4 文め: 算数の式
      show("#f-a", at(3, 0.2));
      show("#f-x", at(3, 0.6));
      show("#f-b", at(3, 0.9));
      show("#f-eq", at(3, 1.5));
      show("#f-ans", at(3, 1.7));
      t.to("#ring", { opacity: 1, duration: 0.3 }, at(3, 2.3));

      // 5 文め: この記号の書き方が変わる
      t.to("#f-x", { fill: PINK, duration: 0.3 }, at(4, 0.1));
      draw("#to-sign .line", at(4, 0.3), 0.3);
      show("#call", at(4, 0.5));
      emphasize("call", at(4, 1.2));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      {PLATES.map((p) => (
        <g key={`${p.x}-${p.y}`} className="plate" opacity={0}>
          <circle cx={p.x} cy={p.y} r={118} fill="#fff" stroke="#CBD5E1" strokeWidth={5} />
          <circle cx={p.x} cy={p.y} r={86} fill="none" stroke="#E2E8F0" strokeWidth={3} />
        </g>
      ))}
      <g id="pizza">
        <ellipse cx={PIZZA.x} cy={PIZZA.y + 232} rx={230} ry={14} fill={INK} opacity={0.06} />
        <circle
          id="crust"
          cx={PIZZA.x}
          cy={PIZZA.y}
          r={PIZZA.r + 16}
          fill="#F3E8D2"
          stroke="#D6CDB8"
          strokeWidth={4}
        />
        {Array.from({ length: 8 }, (_, i) => ({ id: `slice-${i}`, i })).map(({ id, i }) => (
          <g key={id} id={id} transform={`translate(${PIZZA.x} ${PIZZA.y}) rotate(${i * 45})`}>
            <path d={WEDGE} fill="#E9B872" stroke="#fff" strokeWidth={5} strokeLinejoin="round" />
            <path
              d={`M 14 6 L ${PIZZA.r - 26} 6 A ${PIZZA.r - 26} ${PIZZA.r - 26} 0 0 1 ${(PIZZA.r - 26) * Math.cos(rad(41))} ${(PIZZA.r - 26) * Math.sin(rad(41))} Z`}
              fill="#FBD38D"
            />
            <circle cx={110} cy={44} r={20} fill="#C2410C" />
            <circle cx={62} cy={22} r={12} fill="#4D7C0F" />
          </g>
        ))}
      </g>
      <Tag id="tag-slices" x={PIZZA.x} y={PIZZA.y + 290} text="8切れ" chars={3} />

      <Tag id="tag-people" x={1640} y={250} text="4人" chars={2.4} />
      <Tag id="tag-each" x={1680} y={560} text="1人に2切れ" chars={5} />

      {/* 算数の式 */}
      <Text id="f-a" x={720} y={900} size={110} opacity={0}>
        8
      </Text>
      <Text id="f-x" x={860} y={900} size={110} opacity={0}>
        ÷
      </Text>
      <Text id="f-b" x={1000} y={900} size={110} opacity={0}>
        4
      </Text>
      <Text id="f-eq" x={1130} y={900} size={110} fill={GRAY} opacity={0}>
        =
      </Text>
      <Text id="f-ans" x={1260} y={900} size={110} opacity={0}>
        2
      </Text>
      <circle
        id="ring"
        cx={860}
        cy={862}
        r={62}
        fill="none"
        stroke={PINK}
        strokeWidth={7}
        opacity={0}
      />
      <Line id="to-sign" d="M 860 786 L 860 800" />
      <Callout id="call" x={860} y={750} text="コードでは別の記号" />
    </Stage>
  );
}
