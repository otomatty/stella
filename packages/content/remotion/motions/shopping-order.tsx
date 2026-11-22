import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { Callout, GRAY, Line, Mark, PINK, Stage, stageMotion, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const shoppingOrderText = "パン牛乳円個本先に計算前から順だと0123456789+×=";

/** 牛乳パック 1 本。 */
function Milk({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 150)`}>
      <path
        d="M -52 60 L 0 0 L 52 60 Z"
        fill="#E2E8F0"
        stroke="#94A3B8"
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <rect
        x={-52}
        y={60}
        width={104}
        height={170}
        rx={6}
        fill="#F8FAFC"
        stroke="#94A3B8"
        strokeWidth={4}
      />
      <rect x={-52} y={110} width={104} height={64} fill="#60A5FA" />
      <circle cx={0} cy={142} r={18} fill="#fff" />
    </g>
  );
}

/** パンと牛乳の買い物: 掛け算を先に計算してから、足す。 */
export function ShoppingOrder({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["shopping-order"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { show, draw, emphasize } = stageMotion(t);

      // 1 文め: 品物が出てくる
      t.fromTo(
        "#goods",
        { opacity: 0, y: 26, scale: 0.94, svgOrigin: "880 260" },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "power3.out" },
        at(0, -0.5),
      );

      // 2 文め: 値段と数、式
      show("#price-bread", at(1, 0.2));
      show("#price-milk", at(1, 1.2));
      show(".f1", at(1, 2.2), { stagger: 0.12 });

      // 3 文め: 牛乳の 2 本分を先に計算する
      draw("#first .line", at(2, 0.2), 0.5);
      show("#call-first", at(2, 0.5));
      show("#v400", at(2, 1.4));

      // 4 文め: 400 にパンの 100 を足して 500
      show("#v100", at(3, 0.2));
      show("#plus2", at(3, 0.5));
      show("#eq2", at(3, 1.4));
      show("#v500", at(3, 1.6));

      // 5 文め: 前から順に計算した 600 は間違い
      show("#wrong", at(4, 0.2));
      show("#ng", at(4, 0.9));
      emphasize("call-first", at(4, 1.3));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="goods">
        <rect x={380} y={392} width={1020} height={22} rx={10} fill="#C08B5C" />
        {/* パン */}
        <g transform="translate(560 300)">
          <path
            d="M -130 60 C -150 -10 -110 -70 0 -70 C 110 -70 150 -10 130 60 C 130 84 -130 84 -130 60 Z"
            fill="#D29A5B"
          />
          <path
            d="M -70 -44 q 14 30 0 60 M 0 -52 q 14 30 0 68 M 70 -44 q 14 30 0 60"
            fill="none"
            stroke="#A9743B"
            strokeWidth={8}
            strokeLinecap="round"
          />
        </g>
        <Milk x={1030} />
        <Milk x={1200} />
      </g>
      <g id="price-bread" opacity={0}>
        <rect
          x={440}
          y={436}
          width={240}
          height={76}
          rx={12}
          fill="#FEF3C7"
          stroke="#D97706"
          strokeWidth={4}
        />
        <Text x={560} y={490} size={42}>
          100円 1個
        </Text>
      </g>
      <g id="price-milk" opacity={0}>
        <rect
          x={995}
          y={436}
          width={240}
          height={76}
          rx={12}
          fill="#FEF3C7"
          stroke="#D97706"
          strokeWidth={4}
        />
        <Text x={1115} y={490} size={42}>
          200円 2本
        </Text>
      </g>

      {/* 式 */}
      <g className="f1" opacity={0}>
        <Text x={560} y={650} size={104}>
          100
        </Text>
      </g>
      <g className="f1" opacity={0}>
        <Text x={760} y={650} size={104} fill={GRAY}>
          +
        </Text>
      </g>
      <g className="f1" opacity={0}>
        <Text x={960} y={650} size={104}>
          200
        </Text>
      </g>
      <g className="f1" opacity={0}>
        <Text x={1130} y={650} size={104} fill={GRAY}>
          ×
        </Text>
      </g>
      <g className="f1" opacity={0}>
        <Text x={1250} y={650} size={104}>
          2
        </Text>
      </g>
      <Line id="first" d="M 850 672 L 850 690 L 1300 690 L 1300 672" />
      <Callout id="call-first" x={1560} y={616} text="先に計算" />

      {/* 2 行め: 100 + 400 = 500 */}
      <g id="v100" opacity={0}>
        <Text x={560} y={800} size={104}>
          100
        </Text>
      </g>
      <g id="plus2" opacity={0}>
        <Text x={760} y={800} size={104} fill={GRAY}>
          +
        </Text>
      </g>
      <g id="v400" opacity={0}>
        <Text x={1075} y={800} size={104} fill={PINK}>
          400
        </Text>
      </g>
      <g id="eq2" opacity={0}>
        <Text x={1330} y={800} size={104} fill={GRAY}>
          =
        </Text>
      </g>
      <g id="v500" opacity={0}>
        <rect x={1440} y={706} width={250} height={124} rx={18} fill={VIOLET} />
        <Text x={1565} y={800} size={104} fill="#fff">
          500
        </Text>
      </g>

      {/* 間違った順番 */}
      <g id="wrong" opacity={0}>
        <Text x={900} y={928} size={56} fill={GRAY} weight={500}>
          前から順だと 600
        </Text>
      </g>
      <Mark id="ng" x={1170} y={908} ok={false} />
    </Stage>
  );
}
