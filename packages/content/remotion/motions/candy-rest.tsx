import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { Callout, GRAY, Line, PINK, Stage, stageMotion, Tag, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const candyRestText = "個人余りあま0123456789÷=";

const COLORS = ["#F472B6", "#FBBF24", "#34D399", "#60A5FA", "#FB923C"];
const candy = (i: number) => ({ x: 330 + i * 100, y: 170 });
const PLATE_X = [420, 860, 1300];
const PLATE_Y = 620;

/** あめを 3 人で分ける: 分けきれずに残った数が余り。 */
export function CandyRest({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["candy-rest"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { show, draw, emphasize } = stageMotion(t);

      // 1 文め: あめが出てくる
      show(".candy", at(0, -0.4), { stagger: 0.05 });

      // 2 文め: 10 個と 3 人
      show("#tag-all", at(1, 0.2));
      show(".plate", at(1, 0.9), { stagger: 0.15 });
      show("#tag-people", at(1, 1.6));

      // 3 文め: 3 個ずつ配ると、1 個残る
      for (let i = 0; i < 9; i++) {
        const round = Math.floor(i / 3);
        t.to(
          `#candy-${i}`,
          {
            x: PLATE_X[i % 3] + (round - 1) * 84,
            y: PLATE_Y - 14,
            duration: 0.5,
            ease: "power2.inOut",
          },
          at(2, 0.2 + i * 0.22),
        );
      }
      t.to("#rest-ring", { opacity: 1, duration: 0.3 }, at(2, 2.5));

      // 4 文め: 残った数が余り
      draw("#to-rest .line", at(3, 0.1), 0.3);
      show("#call", at(3, 0.3));
      show("#formula", at(3, 0.9));
      emphasize("call", at(3, 1.6));
      t.to("#f-rest", { fill: PINK, duration: 0.3 }, at(3, 1.6));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      {PLATE_X.map((x) => (
        <g key={x} className="plate" opacity={0}>
          <circle cx={x} cy={PLATE_Y - 250} r={46} fill="#94A3B8" />
          <path
            d={`M ${x - 86} ${PLATE_Y - 110} C ${x - 86} ${PLATE_Y - 180} ${x - 50} ${PLATE_Y - 196} ${x} ${PLATE_Y - 196} C ${x + 50} ${PLATE_Y - 196} ${x + 86} ${PLATE_Y - 180} ${x + 86} ${PLATE_Y - 110} Z`}
            fill="#94A3B8"
          />
          <ellipse
            cx={x}
            cy={PLATE_Y + 6}
            rx={170}
            ry={62}
            fill="#fff"
            stroke="#CBD5E1"
            strokeWidth={5}
          />
          <ellipse
            cx={x}
            cy={PLATE_Y + 6}
            rx={130}
            ry={42}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={3}
          />
        </g>
      ))}
      <circle
        id="rest-ring"
        cx={candy(9).x}
        cy={candy(9).y}
        r={64}
        fill="none"
        stroke={PINK}
        strokeWidth={7}
        opacity={0}
      />
      {Array.from({ length: 10 }, (_, i) => ({ id: `candy-${i}`, i })).map(({ id, i }) => (
        <g
          key={id}
          id={id}
          className="candy"
          transform={`translate(${candy(i).x} ${candy(i).y})`}
          opacity={0}
        >
          <path
            d="M -30 0 L -58 -22 L -58 22 Z M 30 0 L 58 -22 L 58 22 Z"
            fill={COLORS[i % 5]}
            opacity={0.75}
          />
          <ellipse rx={34} ry={26} fill={COLORS[i % 5]} />
          <ellipse cx={-10} cy={-9} rx={10} ry={5} fill="#fff" opacity={0.6} />
        </g>
      ))}
      <Tag id="tag-all" x={1420} y={170} text="10個" chars={3} />
      <Tag id="tag-people" x={1620} y={PLATE_Y - 40} text="3人" chars={2.4} />

      <Line
        id="to-rest"
        d={`M ${candy(9).x - 68} ${candy(9).y} L ${candy(9).x - 140} ${candy(9).y}`}
      />
      <Callout id="call" x={candy(9).x - 214} y={candy(9).y} text="余り" />

      <g id="formula" opacity={0}>
        <Text x={640} y={900} size={96}>
          10 ÷ 3 = 3
        </Text>
        <Text x={1010} y={900} size={64} fill={GRAY} weight={500}>
          あまり
        </Text>
        <Text id="f-rest" x={1160} y={900} size={96}>
          1
        </Text>
      </g>
    </Stage>
  );
}
