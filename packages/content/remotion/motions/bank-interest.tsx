import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Callout, Head, INK, LINE, Line, Stage, stageMotion, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const BALANCES = [
  { label: "預け入れ", value: "10000" },
  { label: "1年目", value: "10500" },
  { label: "2年目", value: "11025" },
  { label: "3年目", value: "11576.25" },
];
export const bankInterestText = `通帳残高${BALANCES.map(({ label, value }) => label + value).join("")}11576Math.round`;

export function BankInterest({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["bank-interest"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, draw, emphasize } = stageMotion(t);
      rise("#bank-book", at(0));
      show("#bank-row-1", at(1));
      show("#bank-row-2", at(1, 1.55));
      show("#bank-row-3", at(2));
      t.to("#bank-decimal", { fill: VIOLET, duration: 0.3 }, at(2, 0.55));
      show("#bank-round", at(3));
      draw("#bank-flow .line", at(3), at(3, 0.6) - at(3));
      t.to("#bank-arrow", { opacity: 1, duration: 0.15 }, at(3, 0.5));
      show("#bank-result", at(3, 0.65));
      emphasize("bank-result", at(3, 1.1));
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <g id="bank-book">
        <rect x={291} y={178} width={770} height={671} rx={32} fill={BLUE} />
        <rect
          x={324}
          y={196}
          width={724}
          height={625}
          rx={22}
          fill="#fff"
          stroke={INK}
          strokeWidth={7}
        />
        <path
          d="M 354 294 H 1018 M 354 407 H 1018 M 354 497 H 1018 M 354 587 H 1018 M 354 677 H 1018 M 354 767 H 1018 M 620 407 V 767"
          fill="none"
          stroke={LINE}
          strokeWidth={5}
        />
        <Text x={686} y={266} size={51} fill={BLUE}>
          通帳
        </Text>
        <Text x={964} y={369} size={46} anchor="end">
          残高
        </Text>
        {BALANCES.map(({ label, value }, i) => (
          <g key={label} id={`bank-row-${i}`} opacity={i === 0 ? 1 : 0}>
            <Text x={486} y={468 + i * 90} size={44}>
              {label}
            </Text>
            <Text
              id={i === 3 ? "bank-decimal" : undefined}
              x={964}
              y={468 + i * 90}
              size={54}
              anchor="end"
            >
              {value}
            </Text>
          </g>
        ))}
      </g>
      <Line id="bank-flow" d="M 1088 716 H 1253" />
      <Head id="bank-arrow" x={1261} y={716} angle={0} />
      <Callout id="bank-round" x={1455} y={593} text="Math.round" />
      <Callout id="bank-result" x={1455} y={716} text="11576" />
    </Stage>
  );
}
