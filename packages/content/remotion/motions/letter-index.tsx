import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Callout, LINE, Stage, stageMotion, Tag, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const LETTERS = [..."Taro"];
const LOOKUP = 'name[0] → "T"';
export const letterIndexText = `${LETTERS.join("")}0123${LOOKUP}`;

export function LetterIndex({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["letter-index"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show } = stageMotion(t);
      rise("#index-cards", at(0));
      LETTERS.forEach((_, index) => {
        show(`#index-letter-${index}`, at(1, index * 0.23));
        show(`#index-number-${index}`, at(2, index * 0.31));
      });
      t.to("#index-card-0", { y: -165, duration: at(3, 0.72) - at(3), ease: "power2.out" }, at(3));
      t.to("#index-card-0-box", { stroke: VIOLET, duration: 0.3 }, at(3));
      show("#index-lookup", at(3, 0.58));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="index-cards">
        {LETTERS.map((letter, index) => {
          const x = 495 + index * 310;
          return (
            <g key={letter} id={`index-card-${index}`}>
              <rect
                id={`index-card-${index}-box`}
                x={x - 109}
                y={431}
                width={218}
                height={254}
                rx={26}
                fill="#fff"
                stroke={LINE}
                strokeWidth={8}
              />
              <Text id={`index-letter-${index}`} x={x} y={604} size={132} fill={BLUE} opacity={0}>
                {letter}
              </Text>
              <Tag id={`index-number-${index}`} x={x} y={756} text={String(index)} />
            </g>
          );
        })}
      </g>
      <Callout id="index-lookup" x={1200} y={285} text={LOOKUP} />
    </Stage>
  );
}
