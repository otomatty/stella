import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, BLUE, LINE, Stage, stageMotion, Tag, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const VIOLET = "#8330C7";

const TILES = [
  { letter: "T", x: 465, color: VIOLET },
  { letter: "a", x: 795, color: BLUE },
  { letter: "r", x: 1125, color: BLUE },
  { letter: "o", x: 1455, color: VIOLET },
];
const LOOKUP = "charAt(0)";
export const letterIndexText = `Taro0123${LOOKUP}`;

function Tile({ letter, color }: { letter: string; color: string }) {
  return (
    <g>
      <rect
        x={-148}
        y={-190}
        width={296}
        height={348}
        rx={24}
        fill="#fff"
        stroke={LINE}
        strokeWidth={3}
      />
      <Text x={0} y={76} size={208} fill={color}>
        {letter}
      </Text>
    </g>
  );
}

export function LetterIndex({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["letter-index"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#index-scene", at(0));
      TILES.forEach((_, i) => {
        const start = 0.2 + i * 0.75;
        show(`#index-tile-${i}`, at(1, start), { duration: at(1, start + 0.5) - at(1, start) });
        t.fromTo(
          `#index-place-${i}`,
          { y: -190 },
          {
            y: 0,
            immediateRender: false,
            duration: at(1, start + 0.6) - at(1, start),
            ease: "power2.inOut",
          },
          at(1, start),
        );
        show(`#index-number-${i}`, at(2, 0.2 + i * 0.65), {
          duration: at(2, 0.65 + i * 0.65) - at(2, 0.2 + i * 0.65),
        });
      });
      // 0 の札は台に残す。T そのものが溝を離れ、前へ出る。
      t.to(
        "#index-extract",
        { y: -205, duration: at(3, 0.65) - at(3), ease: "power2.inOut" },
        at(3),
      );
      t.to(
        "#index-extract",
        {
          x: -65,
          duration: at(3, 1.2) - at(3, 0.65),
          ease: "power2.inOut",
        },
        at(3, 0.65),
      );
      show("#index-lookup", at(3, 1.25));
      emphasize("index-lookup", at(3, 1.75));
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <g id="index-scene" opacity={0}>
        {TILES.map((tile, i) => (
          <g key={tile.letter} id={`index-tile-${i}`} opacity={0}>
            <g id={`index-place-${i}`}>
              <g id={i === 0 ? "index-extract" : undefined}>
                <g transform={`translate(${tile.x} 500)`}>
                  <Tile letter={tile.letter} color={tile.color} />
                </g>
              </g>
            </g>
          </g>
        ))}

        <rect x={269} y={645} width={1384} height={42} rx={12} fill={LINE} />
        {TILES.map((tile, i) => (
          <Tag
            key={tile.letter}
            id={`index-number-${i}`}
            x={tile.x}
            y={760}
            text={String(i)}
            color={i === 0 ? VIOLET : BLUE}
          />
        ))}
      </g>
      <CodeCallout id="index-lookup" x={1110} y={194} text={LOOKUP} />
    </Stage>
  );
}
