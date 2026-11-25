import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, CodeCallout, GRAY, INK, Line, Mark, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const ROWS = ["Hana", "HANA"] as const;
const LOWER = "hana";
const CODE = '"HANA".toLowerCase() → "hana"';
export const nameCaseText = `名簿${ROWS.join("")}${LOWER}${LOWER}${CODE}`;

const ORANGE = "#E0862A";
const WOOD = "#C48A52";
const WOOD_DARK = "#8C5A30";
const WOOD_LIGHT = "#E4B98A";
const PAPER = "#FFFCF7";
const RULE = "#E4DDD2";
const SILVER = "#C5CCD4";
const SILVER_LIGHT = "#F4F7FA";

const LETTER_X = [700, 840, 980, 1120] as const;
const LETTER_Y = [468, 678] as const;
const LETTER_SIZE = 128;
const CELLS = [
  { id: "r0c0", row: 0, col: 0, char: "H" },
  { id: "r0c1", row: 0, col: 1, char: "a" },
  { id: "r0c2", row: 0, col: 2, char: "n" },
  { id: "r0c3", row: 0, col: 3, char: "a" },
  { id: "r1c0", row: 1, col: 0, char: "H" },
  { id: "r1c1", row: 1, col: 1, char: "A" },
  { id: "r1c2", row: 1, col: 2, char: "N" },
  { id: "r1c3", row: 1, col: 3, char: "A" },
] as const;

/** 大文字だけ、左の行から順に小文字へ替える。 */
const SWAPS = [
  [0, 0],
  [1, 0],
  [1, 1],
  [1, 2],
  [1, 3],
] as const;

export function NameCase({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["name-case"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, draw, emphasize } = stageMotion(t);
      rise("#case-roster", at(0));
      ROWS.forEach((name, row) => {
        [...name].forEach((_, col) => {
          const order = row * 4 + col;
          show(`#case-up-${row}-${col}`, at(1, 0.15 + order * 0.48));
        });
      });
      SWAPS.forEach(([row, col], index) => {
        const from = 0.15 + index * 0.52;
        t.to(
          `#case-up-${row}-${col}`,
          { scale: 0.15, opacity: 0, duration: 0.32, transformOrigin: "50% 50%" },
          at(2, from),
        );
        show(`#case-lo-${row}-${col}`, at(2, from + 0.1));
      });
      draw("#case-brace .line", at(2, 3.05), 0.4);
      show("#case-same", at(2, 3.45));
      show("#case-code", at(3, 0.3));
      emphasize("case-code", at(3, 0.9));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="case-roster">
        <ellipse cx={960} cy={800} rx={400} ry={16} fill={INK} opacity={0.06} />
        <rect x={500} y={100} width={920} height={688} rx={22} fill={WOOD} />
        <rect x={518} y={114} width={884} height={40} rx={12} fill={WOOD_LIGHT} />
        <rect
          x={500}
          y={100}
          width={920}
          height={688}
          rx={22}
          fill="none"
          stroke={WOOD_DARK}
          strokeWidth={5}
        />
        <rect x={536} y={176} width={848} height={580} rx={6} fill={PAPER} />
        <path d="M 1292 756 L 1384 668 L 1384 756 Z" fill="#E6DFD2" />
        <path d="M 1292 756 L 1384 668 L 1340 756 Z" fill="#F6F1E8" />
        <path d="M 1292 756 L 1384 668" fill="none" stroke={RULE} strokeWidth={3} />
        <rect x={790} y={72} width={340} height={86} rx={18} fill={SILVER} />
        <rect x={806} y={86} width={308} height={30} rx={8} fill={SILVER_LIGHT} />
        <circle cx={880} cy={128} r={8} fill="#8E99A4" />
        <circle cx={1040} cy={128} r={8} fill="#8E99A4" />
        <rect x={930} y={118} width={60} height={22} rx={6} fill="#9AA4AE" />
        <Text x={960} y={248} size={52} fill="#3F3A34">
          名簿
        </Text>
        {LETTER_Y.map((y) => (
          <g key={y}>
            <circle cx={640} cy={y - 42} r={11} fill={WOOD} />
            <path d={`M 680 ${y + 52} H 1188`} stroke={RULE} strokeWidth={4} />
          </g>
        ))}
        {CELLS.map((cell) => {
          const x = LETTER_X[cell.col];
          const y = LETTER_Y[cell.row];
          const upper = cell.char !== cell.char.toLowerCase();
          return (
            <g key={cell.id}>
              <g id={`case-up-${cell.row}-${cell.col}`} opacity={0}>
                <Text x={x} y={y} size={LETTER_SIZE} fill={upper ? ORANGE : GRAY}>
                  {cell.char}
                </Text>
              </g>
              <g id={`case-lo-${cell.row}-${cell.col}`} opacity={0}>
                <Text x={x} y={y} size={LETTER_SIZE} fill={BLUE}>
                  {LOWER[cell.col]}
                </Text>
              </g>
            </g>
          );
        })}
        <Line id="case-brace" d="M 1216 360 H 1264 V 690 H 1216" color={BLUE} />
        <Mark id="case-same" x={1336} y={540} ok />
      </g>
      <CodeCallout id="case-code" x={960} y={910} text={CODE} />
    </Stage>
  );
}
