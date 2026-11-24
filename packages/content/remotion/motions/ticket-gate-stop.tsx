import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, GRAY, INK, LINE, RED, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const REJECTED = "使えません";
const EXPRESSION = `throw new Error("${REJECTED}")`;
export const ticketGateStopText = REJECTED + EXPRESSION;

export function TicketGateStop({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["ticket-gate-stop"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#ticket-gate", at(0));
      show("#gate-ticket-paper", at(1));
      t.to(
        "#gate-ticket-paper",
        { y: 161, duration: at(1, 1) - at(1, 0.4), ease: "power2.in" },
        at(1, 0.4),
      );
      t.to(
        "#gate-door",
        { attr: { transform: "rotate(90 845 489)" }, duration: 0.55, ease: "power2.inOut" },
        at(2),
      );
      t.to("#gate-screen", { attr: { fill: RED }, duration: 0.3 }, at(2));
      show("#gate-message", at(2, 0.18));
      show("#gate-expression", at(3));
      emphasize("gate-expression", at(3, 0.45));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <defs>
        <clipPath id="gate-ticket-slot">
          <rect x={558} y={95} width={224} height={245} />
        </clipPath>
      </defs>
      <g id="ticket-gate">
        <path d="M 420 725 H 1500" stroke={LINE} strokeWidth={12} strokeLinecap="round" />
        <path
          d="M 1168 203 H 1274 Q 1360 203 1360 291 V 397"
          fill="none"
          stroke={GRAY}
          strokeWidth={15}
        />
        <rect
          x={1270}
          y={394}
          width={180}
          height={329}
          rx={22}
          fill="#C5CED5"
          stroke={INK}
          strokeWidth={8}
        />
        <rect x={1289} y={425} width={142} height={34} rx={12} fill="#818E99" />
        <rect
          x={470}
          y={335}
          width={380}
          height={388}
          rx={26}
          fill="#CDD6DC"
          stroke={INK}
          strokeWidth={8}
        />
        <rect
          x={495}
          y={390}
          width={330}
          height={302}
          rx={14}
          fill="#E8EDF1"
          stroke={GRAY}
          strokeWidth={5}
        />
        <path d="M 525 657 H 773" stroke={LINE} strokeWidth={6} strokeLinecap="round" />
        <rect x={578} y={328} width={184} height={18} rx={8} fill={INK} />
        <g id="gate-door" transform="rotate(0 845 489)">
          <path d="M 845 489 V 166" stroke={INK} strokeWidth={55} strokeLinecap="round" />
          <path d="M 845 489 V 166" stroke="#DD6049" strokeWidth={42} strokeLinecap="round" />
          <path d="M 845 244 V 210" stroke="#FFF0E5" strokeWidth={30} />
        </g>
        <circle cx={845} cy={489} r={28} fill={GRAY} stroke={INK} strokeWidth={7} />
        <rect
          id="gate-screen"
          x={936}
          y={153}
          width={303}
          height={100}
          rx={19}
          fill="#36424A"
          stroke={INK}
          strokeWidth={8}
        />
      </g>
      <g clipPath="url(#gate-ticket-slot)">
        <g id="gate-ticket-paper" opacity={0}>
          <path
            d="M 601 175 H 739 V 200 Q 721 208 739 216 V 252 H 601 V 216 Q 619 208 601 200 Z"
            fill="#FFF2C2"
            stroke={INK}
            strokeWidth={5}
            strokeLinejoin="round"
          />
          <path
            d="M 629 228 H 711 M 629 237 H 668"
            stroke="#896B42"
            strokeWidth={5}
            strokeLinecap="round"
          />
        </g>
      </g>
      <Text id="gate-message" x={1087.5} y={218} size={43} fill="#fff" opacity={0}>
        {REJECTED}
      </Text>
      <CodeCallout id="gate-expression" x={960} y={863} text={EXPRESSION} />
    </Stage>
  );
}
