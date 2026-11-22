import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Callout, LINE, PINK, Stage, stageMotion, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const tileSquaresText = "2088×44a, b → b, 余り";

const BOARD_X = 600;
const BOARD_Y = 224;
const UNIT = 36;
const TILES = [
  { x: BOARD_X, y: BOARD_Y, units: 8, endX: 415, endY: 549 },
  { x: BOARD_X + 8 * UNIT, y: BOARD_Y, units: 8, endX: 747, endY: 549 },
  { x: BOARD_X + 16 * UNIT, y: BOARD_Y, units: 4, endX: 1271, endY: 621 },
  { x: BOARD_X + 16 * UNIT, y: BOARD_Y + 4 * UNIT, units: 4, endX: 1083, endY: 621 },
];

export function TileSquares({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["tile-squares"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#tile-board", at(0));
      t.to("#tile-dimensions, #tile-cover", { opacity: 0, duration: 0.22 }, at(1));
      TILES.forEach(({ units, x, y, endX, endY }, i) => {
        const beat = units === 8 ? 1 : 2;
        // 下の小さい正方形を先に動かし、上の正方形の通り道を空ける。
        const delay = [0.3, 1.35, 1.2, 0.3][i];
        t.to(
          `#tile-piece-${i}`,
          {
            x: endX - x,
            y: endY - y,
            duration: at(beat, delay + 0.75) - at(beat, delay),
            ease: "power2.inOut",
          },
          at(beat, delay),
        );
      });
      show("#tile-left", at(1, 2.15));
      t.to("#tile-left", { opacity: 0, duration: 0.25 }, at(2));
      t.to("#tile-frame", { opacity: 0, duration: 0.3 }, at(2, 2.05));
      t.to("#tile-answer-box", { stroke: PINK, strokeWidth: 10, duration: 0.3 }, at(3));
      show("#tile-side", at(3));
      show("#tile-swap", at(4));
      emphasize("tile-swap", at(4, 0.45));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="tile-board">
        <rect
          id="tile-frame"
          x={BOARD_X}
          y={BOARD_Y}
          width={20 * UNIT}
          height={8 * UNIT}
          fill="none"
          stroke={LINE}
          strokeWidth={7}
          strokeDasharray="16 12"
        />
        {TILES.map(({ x, y, units }, i) => (
          <g key={`${x}-${y}`} id={`tile-piece-${i}`}>
            <rect
              id={i === 2 ? "tile-answer-box" : undefined}
              x={x}
              y={y}
              width={units * UNIT}
              height={units * UNIT}
              fill={units === 8 ? "#BFDBFE" : "#DDD6FE"}
              stroke={units === 8 ? BLUE : VIOLET}
              strokeWidth={6}
            />
          </g>
        ))}
        <rect
          id="tile-cover"
          x={BOARD_X}
          y={BOARD_Y}
          width={20 * UNIT}
          height={8 * UNIT}
          fill="#BFDBFE"
          stroke={BLUE}
          strokeWidth={7}
        />
        <g id="tile-dimensions">
          <path
            d="M 600 200 V 177 H 1320 V 200 M 576 224 H 553 V 512 H 576"
            fill="none"
            stroke={BLUE}
            strokeWidth={5}
          />
          <Text x={960} y={153} size={49}>
            20
          </Text>
          <Text x={510} y={385} size={49}>
            8
          </Text>
        </g>
      </g>
      <Callout id="tile-left" x={1492} y={369} text="8×4" />
      <g id="tile-side" opacity={0}>
        <path d="M 1271 786 V 807 H 1415 V 786" fill="none" stroke={PINK} strokeWidth={6} />
        <Text x={1343} y={858} size={54} fill={PINK}>
          4
        </Text>
      </g>
      <Callout id="tile-swap" x={960} y={908} text="a, b → b, 余り" />
    </Stage>
  );
}
