import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Callout, LINE, Stage, stageMotion, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const letterCardsText = "ねこcfor-of";

const CARDS = [
  { letter: "ね", x: 484, color: BLUE },
  { letter: "こ", x: 770, color: VIOLET },
];

export function LetterCards({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["letter-cards"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show } = stageMotion(t);
      rise("#card-tray", at(0));
      show("#letter-0-face, #letter-1-face", at(1), { stagger: at(1, 0.4) - at(1) });
      CARDS.forEach(({ x }, i) => {
        const id = `#letter-${i}`;
        const offset = i * 1.75;
        t.to(id, { y: -248, duration: at(2, offset + 0.35) - at(2, offset) }, at(2, offset));
        t.to(
          id,
          { x: 1348 - x, duration: at(2, offset + 0.83) - at(2, offset + 0.35) },
          at(2, offset + 0.35),
        );
        t.to(
          id,
          { y: 0, duration: at(2, offset + 1.18) - at(2, offset + 0.83) },
          at(2, offset + 0.83),
        );
      });
      t.to("#letter-0", { opacity: 0, duration: at(2, 1.75) - at(2, 1.45) }, at(2, 1.45));
      show("#read-letters", at(3));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="card-tray">
        <rect
          x={326}
          y={410}
          width={602}
          height={300}
          rx={38}
          fill="#F8FAFC"
          stroke={LINE}
          strokeWidth={8}
        />
        <rect
          x={1190}
          y={410}
          width={316}
          height={300}
          rx={38}
          fill="#EEF2FF"
          stroke={VIOLET}
          strokeWidth={8}
        />
        <rect x={1285} y={738} width={126} height={74} rx={20} fill={VIOLET} />
        <Text x={1348} y={790} size={52} fill="#fff">
          c
        </Text>
      </g>
      {CARDS.map(({ letter, x, color }, i) => (
        <g key={letter} id={`letter-${i}`}>
          <g id={`letter-${i}-face`} opacity={0}>
            <rect
              x={x - 105}
              y={446}
              width={210}
              height={228}
              rx={24}
              fill="#fff"
              stroke={color}
              strokeWidth={8}
            />
            <Text x={x} y={604} size={121} fill={color}>
              {letter}
            </Text>
          </g>
        </g>
      ))}
      <Callout id="read-letters" x={1348} y={886} text="for-of" />
    </Stage>
  );
}
