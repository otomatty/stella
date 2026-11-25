import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, INK, Stage, stageMotion, Tag, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const AREA = "25";
const SIDE = "5";
const EXPRESSION = "Math.sqrt(25) → 5";
const MARKS = ["1", "2", "3", "4", "5"] as const;
const PETALS = [0, 72, 144, 216, 288] as const;
export const squareGardenText = [AREA, ...MARKS, SIDE, ...MARKS, SIDE, EXPRESSION].join("");

const X = 630;
const Y = 120;
const SIZE = 660;
const FRAME = 30;
const SOIL = SIZE - FRAME * 2;
const CELL = SOIL / MARKS.length;
const BAND = 28;

const WOOD = "#C4894F";
const WOOD_DARK = "#8C5A2E";
const WOOD_EDGE = "#A56B38";
const SOIL_A = "#7A4E2D";
const SOIL_B = "#684228";
const DIVIDER = "#CDB48A";
const BAND_FILL = "#F7C2D6";
const BAND_EDGE = "#E56B9A";

function Flower({ pink }: { pink: boolean }) {
  const petal = pink ? "#E56B9A" : "#F2C14E";
  const edge = pink ? "#C94B7C" : "#D9A01E";
  return (
    <g>
      <ellipse cx={-26} cy={22} rx={18} ry={8} fill="#3E8F4A" transform="rotate(-32)" />
      <ellipse cx={26} cy={20} rx={18} ry={8} fill="#2F7A3A" transform="rotate(28)" />
      {PETALS.map((angle) => (
        <ellipse
          key={angle}
          cy={-24}
          rx={12}
          ry={20}
          fill={petal}
          stroke={edge}
          strokeWidth={1.5}
          transform={`rotate(${angle})`}
        />
      ))}
      <circle r={10} fill={pink ? "#FFE08A" : "#FFF6D0"} stroke="#E0B040" strokeWidth={1.5} />
    </g>
  );
}

export function SquareGarden({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["square-garden"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#garden-bed", at(0));
      for (let i = 0; i < MARKS.length * MARKS.length; i++) {
        const start = 0.06 + i * 0.11;
        const col = i % MARKS.length;
        const row = Math.floor(i / MARKS.length);
        const cx = X + FRAME + col * CELL + CELL / 2;
        const cy = Y + FRAME + row * CELL + CELL / 2;
        t.to(`#garden-bud-${i}`, { opacity: 0, duration: 0.08 }, at(1, start));
        t.fromTo(
          `#garden-flower-${i}`,
          { opacity: 0, scale: 0.15, svgOrigin: `${cx} ${cy}` },
          { opacity: 1, scale: 1, duration: 0.16, ease: "power2.out", immediateRender: false },
          at(1, start),
        );
      }
      show("#garden-area", at(1, 3.15));
      for (let i = 0; i < MARKS.length; i++) {
        show(`#garden-top-${i}`, at(2, 0.12 + i * 0.32), { duration: 0.22 });
      }
      show("#garden-top-five", at(2, 1.8));
      for (let i = 0; i < MARKS.length; i++) {
        show(`#garden-left-${i}`, at(2, 2.15 + i * 0.32), { duration: 0.22 });
      }
      show("#garden-left-five", at(2, 3.85));
      show("#garden-top-outline, #garden-left-outline", at(3, 0.15));
      emphasize("garden-top-band", at(3, 0.4));
      emphasize("garden-left-band", at(3, 0.4));
      show("#garden-expression", at(3, 0.7));
      emphasize("garden-expression", at(3, 1.15));
    },
    [at],
  );
  useTimeline(root, build);

  const soilX = X + FRAME;
  const soilY = Y + FRAME;

  return (
    <Stage root={root}>
      <g id="garden-bed">
        <ellipse cx={960} cy={804} rx={360} ry={16} fill={INK} opacity={0.06} />
        <rect x={X} y={Y} width={SIZE} height={SIZE} rx={16} fill={WOOD} />
        <rect
          x={X + 10}
          y={Y + 8}
          width={SIZE - 20}
          height={16}
          rx={6}
          fill="#E2B57A"
          opacity={0.55}
        />
        {MARKS.slice(1).map((mark) => {
          const atEdge = (Number(mark) - 1) * CELL;
          return (
            <g key={mark}>
              <path
                d={`M ${soilX + atEdge} ${Y + 6} V ${soilY - 4}`}
                stroke={WOOD_EDGE}
                strokeWidth={3}
              />
              <path
                d={`M ${soilX + atEdge} ${soilY + SOIL + 4} V ${Y + SIZE - 6}`}
                stroke={WOOD_EDGE}
                strokeWidth={3}
              />
              <path
                d={`M ${X + 6} ${soilY + atEdge} H ${soilX - 4}`}
                stroke={WOOD_EDGE}
                strokeWidth={3}
              />
              <path
                d={`M ${soilX + SOIL + 4} ${soilY + atEdge} H ${X + SIZE - 6}`}
                stroke={WOOD_EDGE}
                strokeWidth={3}
              />
            </g>
          );
        })}
        {MARKS.map((row, rowIndex) =>
          MARKS.map((column, columnIndex) => (
            <rect
              key={`${row}-${column}`}
              x={soilX + columnIndex * CELL}
              y={soilY + rowIndex * CELL}
              width={CELL}
              height={CELL}
              fill={(rowIndex + columnIndex) % 2 === 0 ? SOIL_A : SOIL_B}
            />
          )),
        )}
        {MARKS.slice(1).map((mark) => (
          <path
            key={`div-${mark}`}
            d={`M ${soilX + (Number(mark) - 1) * CELL} ${soilY} V ${soilY + SOIL} M ${soilX} ${soilY + (Number(mark) - 1) * CELL} H ${soilX + SOIL}`}
            stroke={DIVIDER}
            strokeWidth={2}
          />
        ))}
        <rect
          x={soilX}
          y={soilY}
          width={SOIL}
          height={SOIL}
          fill="none"
          stroke={WOOD_DARK}
          strokeWidth={8}
        />
        {MARKS.map((row, rowIndex) =>
          MARKS.map((column, columnIndex) => {
            const i = rowIndex * MARKS.length + columnIndex;
            const cx = soilX + columnIndex * CELL + CELL / 2;
            const cy = soilY + rowIndex * CELL + CELL / 2;
            return (
              <g key={`${row}-${column}-plant`}>
                <g id={`garden-bud-${i}`} transform={`translate(${cx} ${cy})`}>
                  <ellipse cy={10} rx={7} ry={12} fill="#6BBF6A" />
                  <ellipse cy={-4} rx={5} ry={9} fill="#3E8F4A" />
                </g>
                <g id={`garden-flower-${i}`} opacity={0}>
                  <g transform={`translate(${cx} ${cy})`}>
                    <Flower pink={(rowIndex + columnIndex) % 2 === 0} />
                  </g>
                </g>
              </g>
            );
          }),
        )}
      </g>
      <Tag id="garden-area" x={1436} y={450} text={AREA} chars={2} />
      {MARKS.map((mark, index) => (
        <g id={`garden-top-${index}`} key={`top-${mark}`} opacity={0}>
          <rect
            x={soilX + index * CELL}
            y={82}
            width={CELL}
            height={BAND}
            rx={6}
            fill={BAND_FILL}
            stroke={BAND_EDGE}
            strokeWidth={3}
          />
          <Text x={soilX + index * CELL + CELL / 2} y={102} size={22} fill="#9C3D66">
            {mark}
          </Text>
        </g>
      ))}
      <g id="garden-top-outline" opacity={0}>
        <rect
          id="garden-top-band-box"
          x={soilX}
          y={82}
          width={SOIL}
          height={BAND}
          rx={6}
          fill="none"
          stroke={BAND_EDGE}
          strokeWidth={3}
        />
      </g>
      <Tag id="garden-top-five" x={1368} y={96} text={SIDE} chars={1.5} />
      {MARKS.map((mark, index) => (
        <g id={`garden-left-${index}`} key={`left-${mark}`} opacity={0}>
          <rect
            x={572}
            y={soilY + index * CELL}
            width={BAND}
            height={CELL}
            rx={6}
            fill={BAND_FILL}
            stroke={BAND_EDGE}
            strokeWidth={3}
          />
          <Text x={586} y={soilY + index * CELL + CELL / 2 + 8} size={22} fill="#9C3D66">
            {mark}
          </Text>
        </g>
      ))}
      <g id="garden-left-outline" opacity={0}>
        <rect
          id="garden-left-band-box"
          x={572}
          y={soilY}
          width={BAND}
          height={SOIL}
          rx={6}
          fill="none"
          stroke={BAND_EDGE}
          strokeWidth={3}
        />
      </g>
      <Tag id="garden-left-five" x={468} y={812} text={SIDE} chars={1.5} />
      <CodeCallout id="garden-expression" x={960} y={900} text={EXPRESSION} />
    </Stage>
  );
}
