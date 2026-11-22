import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Callout, GRAY, PINK, Stage, stageMotion, Tag, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const BEADS = [
  { letter: "あ", color: PINK, x: 598 },
  { letter: "い", color: VIOLET, x: 822 },
  { letter: "う", color: BLUE, x: 1046 },
];

export const beadsText = "あいう+=";

export function Beads({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS.beads.seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show } = stageMotion(t);
      rise("#necklace", at(0));
      BEADS.forEach(({ x }, i) => {
        const id = `#bead-${i}`;
        const start = at(1, 1.4 * i);
        const thread = at(1, 1.4 * i + 0.48);
        const settle = at(1, 1.4 * i + 1.18);
        show(`${id} .bead-face`, start, { duration: thread - start });
        t.to(id, { x: x - 440, duration: thread - start, ease: "power2.out" }, start);
        t.to(id, { y: 272, duration: settle - thread, ease: "power2.inOut" }, thread);
      });
      t.to("#thread", { stroke: VIOLET, duration: 0.45 }, at(2));
      show("#join-symbol, #joined-beads", at(3));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="necklace">
        <path
          id="thread"
          d="M 398 426 Q 332 540 432 540 H 1515"
          fill="none"
          stroke={GRAY}
          strokeWidth={12}
          strokeLinecap="round"
        />
        <path
          d="M 398 426 Q 420 390 450 405"
          fill="none"
          stroke={GRAY}
          strokeWidth={12}
          strokeLinecap="round"
        />
        <circle cx={457} cy={408} r={21} fill="none" stroke={VIOLET} strokeWidth={8} />
      </g>
      {BEADS.map(({ letter, color }, i) => (
        <g key={letter} id={`bead-${i}`}>
          <g className="bead-face" opacity={0}>
            <circle cx={440} cy={268} r={91} fill={color} />
            <path
              d="M 384 236 Q 396 211 420 205"
              fill="none"
              stroke="#fff"
              strokeOpacity={0.72}
              strokeWidth={9}
              strokeLinecap="round"
            />
            <Text x={440} y={303} size={94} fill="#fff">
              {letter}
            </Text>
          </g>
        </g>
      ))}
      <Callout id="join-symbol" x={1020} y={755} text="+=" />
      <Tag id="joined-beads" x={1216} y={755} text="あいう" />
    </Stage>
  );
}
