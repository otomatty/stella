import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { Callout, GRAY, Line, PINK, Stage, stageMotion, Tag, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const onigiriTimesText = "おにぎり円個コードでは別の記号0123456789×=";

const XS = [600, 900, 1200];
const SHAPE =
  "M 0 -112 C 34 -112 100 14 106 58 C 110 90 84 104 0 104 C -84 104 -110 90 -106 58 C -100 14 -34 -112 0 -112 Z";

/** おにぎり 1 個 (白いごはんと、のり)。 */
function Onigiri({ i }: { i: number }) {
  return (
    <g className="onigiri" transform={`translate(${XS[i]} 330)`} opacity={i === 0 ? 1 : 0}>
      <clipPath id={`rice-${i}`}>
        <path d={SHAPE} />
      </clipPath>
      <path d={SHAPE} fill="#FBFBF8" stroke="#D6D3D1" strokeWidth={5} />
      <rect x={-52} y={26} width={104} height={90} fill="#1F2937" clipPath={`url(#rice-${i})`} />
      <path d={SHAPE} fill="none" stroke="#D6D3D1" strokeWidth={5} />
    </g>
  );
}

/** コンビニのおにぎり 3 個: 算数のかける記号は、コードでは別の記号になる。 */
export function OnigiriTimes({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["onigiri-times"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { show, draw, emphasize } = stageMotion(t);

      // 1 文め: 棚とおにぎりが出てくる
      t.fromTo(
        "#shelf",
        { opacity: 0, y: 26, scale: 0.94, svgOrigin: "900 400" },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "power3.out" },
        at(0, -0.5),
      );

      // 2 文め: 値札が付き、おにぎりが 3 個になる
      show("#price-0", at(1, 0.2));
      for (const i of [1, 2]) {
        t.fromTo(
          `.onigiri:nth-of-type(${i + 1})`,
          { opacity: 0, x: XS[i] + 120 },
          { opacity: 1, x: XS[i], immediateRender: false, duration: 0.5, ease: "power3.out" },
          at(1, 1.2 + (i - 1) * 0.4),
        );
        show(`#price-${i}`, at(1, 1.5 + (i - 1) * 0.4));
      }
      show("#count", at(1, 2.4));

      // 3 文め: 算数の式を書く
      show("#f-a", at(2, 0.2));
      show("#f-x", at(2, 0.7));
      show("#f-b", at(2, 1.0));
      show("#f-eq", at(2, 1.6));
      show("#f-ans", at(2, 1.8));
      t.to("#ring", { opacity: 1, duration: 0.3 }, at(2, 2.4));

      // 4 文め: この記号の書き方が変わる
      t.to("#f-x", { fill: PINK, duration: 0.3 }, at(3, 0.1));
      draw("#to-sign .line", at(3, 0.3), 0.4);
      show("#call", at(3, 0.5));
      emphasize("call", at(3, 1.2));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="shelf">
        <rect x={380} y={440} width={1040} height={28} rx={10} fill="#C08B5C" />
        <rect x={400} y={468} width={1000} height={14} fill="#A9743B" />
        <g>
          {XS.map((x, i) => (
            <Onigiri key={x} i={i} />
          ))}
        </g>
      </g>
      {XS.map((x, i) => (
        <g key={x} id={`price-${i}`} transform={`translate(${x} 550)`} opacity={0}>
          <rect
            x={-90}
            y={-40}
            width={180}
            height={80}
            rx={12}
            fill="#FEF3C7"
            stroke="#D97706"
            strokeWidth={4}
          />
          <Text x={0} y={16} size={46}>
            150円
          </Text>
        </g>
      ))}
      <Tag id="count" x={1520} y={330} text="3個" chars={3} />

      {/* 算数の式 */}
      <Text id="f-a" x={640} y={790} size={110} opacity={0}>
        150
      </Text>
      <Text id="f-x" x={830} y={790} size={110} opacity={0}>
        ×
      </Text>
      <Text id="f-b" x={960} y={790} size={110} opacity={0}>
        3
      </Text>
      <Text id="f-eq" x={1090} y={790} size={110} fill={GRAY} opacity={0}>
        =
      </Text>
      <Text id="f-ans" x={1280} y={790} size={110} opacity={0}>
        450
      </Text>
      <circle
        id="ring"
        cx={830}
        cy={752}
        r={68}
        fill="none"
        stroke={PINK}
        strokeWidth={7}
        opacity={0}
      />
      <Line id="to-sign" d="M 830 824 L 830 872" />
      <Callout id="call" x={830} y={908} text="コードでは別の記号" />
    </Stage>
  );
}
