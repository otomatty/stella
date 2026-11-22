import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Callout, GRAY, GREEN, LINE, Stage, stageMotion, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const memberCardText = "会員証はいいいえtruefalseboolean";

const CUSTOMERS = [
  { x: 627, color: BLUE, answer: "はい", value: "true", on: true },
  { x: 1293, color: GRAY, answer: "いいえ", value: "false", on: false },
];

export function MemberCard({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["member-card"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#member-scene", at(0));
      show("#membership-card, #member-answer-true, #member-answer-false", at(1));
      t.to("#member-answer-true, #member-answer-false", { opacity: 0, duration: 0.25 }, at(2));
      show("#member-switch-true, #member-switch-false", at(2, 0.28));
      show("#member-boolean", at(3));
      emphasize("member-boolean", at(3, 0.48));
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <g id="member-scene">
        {CUSTOMERS.map(({ x, color, answer, value, on }) => (
          <g key={value} transform={`translate(${x} 0)`}>
            <circle cy={468} r={72} fill={color} />
            <path d="M -147 704 V 668 Q -147 558 0 558 Q 147 558 147 668 V 704 Z" fill={color} />
            <path d="M -184 737 H 184" stroke={LINE} strokeWidth={8} strokeLinecap="round" />
            <g id={`member-answer-${value}`} opacity={0}>
              <Text x={0} y={310} size={61} fill={color}>
                {answer}
              </Text>
            </g>
            <g id={`member-switch-${value}`} opacity={0}>
              <rect x={-159} y={227} width={318} height={105} rx={52} fill={on ? GREEN : GRAY} />
              <circle cx={on ? 104 : -104} cy={279} r={32} fill="#fff" />
              <Text x={on ? -39 : 39} y={298} size={54} fill="#fff">
                {value}
              </Text>
            </g>
          </g>
        ))}
      </g>
      <g id="membership-card" opacity={0}>
        <rect
          x={811}
          y={522}
          width={211}
          height={135}
          rx={18}
          fill="#EEF2FF"
          stroke={VIOLET}
          strokeWidth={7}
        />
        <path d="M 835 552 H 998" stroke={VIOLET} strokeWidth={8} strokeLinecap="round" />
        <Text x={917} y={620} size={43}>
          会員証
        </Text>
      </g>
      <Callout id="member-boolean" x={960} y={850} text="boolean" />
    </Stage>
  );
}
