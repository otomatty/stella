import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { Callout, CodeCallout, INK, Line, Mark, RED, Stage, stageMotion, Tag } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const EXPRESSION = "!Number.isInteger(2.5) → true";
const COUNTS = ["1個", "2個", "2.5個"] as const;
const NOT_INTEGER = "整数でない";
export const eggCartonText = `${COUNTS.join("")}${NOT_INTEGER}${EXPRESSION}`;

const SHIFT = 48;
const COLS = [570, 960, 1350] as const;
const ROWS = [360 + SHIFT, 590 + SHIFT] as const;
const CARTON_TOP = 168 + SHIFT;
const WELL_RY = 70;
const EGG_BOTTOM = 104;
const HALF_SCALE = 0.7;
/** 半分の卵の底は、パックの上のふち（線の外側）より 40px 以上上。 */
const HALF_ORIGIN_Y = CARTON_TOP - 52 - EGG_BOTTOM * HALF_SCALE;
const HOVER = HALF_ORIGIN_Y - ROWS[0];
const ROW_GAP_TOP = ROWS[0] + WELL_RY + 16;
const ROW_GAP_BOT = ROWS[1] - WELL_RY - 16;
const GAPS = [
  { x: 696, w: 138, mid: 765 },
  { x: 1086, w: 138, mid: 1155 },
] as const;
const EGG =
  "M 0 -110 C 40 -106 88 -50 88 6 C 88 74 50 104 0 104 C -50 104 -88 74 -88 6 C -88 -50 -40 -106 0 -110 Z";
const HALF = "M 0 -110 C 40 -106 88 -50 88 6 C 88 74 50 104 0 104 Z";

function Well({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={104} ry={WELL_RY} fill="#EBD9B8" />
      <ellipse cx={x} cy={y + 6} rx={82} ry={52} fill="#C9A56A" />
      <ellipse cx={x} cy={y + 10} rx={56} ry={32} fill="#A07C3E" />
    </g>
  );
}

function WholeEgg() {
  return (
    <>
      <path d={EGG} fill="#F4E0C2" />
      <path d={EGG} fill="#FFF7EA" transform="translate(-6 -8) scale(0.9)" />
      <path d={EGG} fill="none" stroke="#C4A574" strokeWidth={4} />
      <path
        d="M -40 -48 Q -64 -8 -42 36"
        fill="none"
        stroke="#fff"
        strokeWidth={9}
        strokeLinecap="round"
      />
    </>
  );
}

function HalfEgg() {
  return (
    <g transform="translate(-44 0)">
      <path d={HALF} fill="#F6E6C8" stroke="#C4A574" strokeWidth={4} strokeLinejoin="round" />
      <path d={HALF} fill="#FFFDF7" transform="translate(44 0) scale(0.82) translate(-44 0)" />
      <path d="M 8 -44 A 44 44 0 0 1 8 44 Z" fill="#F6B93B" stroke="#E09A1A" strokeWidth={3} />
      <path
        d="M 22 -24 Q 36 -4 24 14"
        fill="none"
        stroke="#FFE7A3"
        strokeWidth={5}
        strokeLinecap="round"
      />
    </g>
  );
}

export function EggCarton({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["egg-carton"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, draw, emphasize } = stageMotion(t);
      const span = (beat: number, from: number, seconds: number) =>
        at(beat, from + seconds) - at(beat, from);
      rise("#egg-carton", at(0));
      COLS.slice(0, 2).forEach((_, i) => {
        const from = 0.2 + i * 1.15;
        t.fromTo(
          `#egg-whole-${i}`,
          { y: -540, opacity: 0, scale: 0.94, transformOrigin: "50% 50%" },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: span(1, from, 0.7),
            ease: "power2.out",
            immediateRender: false,
          },
          at(1, from),
        );
      });
      show("#tag-1", at(1, 0.95));
      t.to("#tag-1", { opacity: 0, duration: 0.2 }, at(1, 2.05));
      show("#tag-2", at(1, 2.05));
      show("#egg-ok", at(1, 2.2));
      t.fromTo(
        "#egg-half",
        { y: -700, opacity: 0, scale: 0.94, transformOrigin: "50% 50%" },
        {
          y: HOVER,
          opacity: 1,
          scale: 1,
          duration: span(2, 0.15, 0.75),
          ease: "power2.out",
          immediateRender: false,
        },
        at(2, 0.15),
      );
      show("#egg-no", at(2, 0.95));
      t.to("#tag-2, #egg-ok", { opacity: 0, duration: 0.2 }, at(2, 1.05));
      show("#tag-25", at(2, 1.05));
      draw("#egg-line .line", at(3, 0.35), 0.45);
      show("#egg-note", at(3, 0.75));
      show("#egg-code", at(3, 2.5));
      emphasize("egg-code", at(3, 3.1));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="egg-carton">
        <ellipse cx={960} cy={760} rx={520} ry={16} fill={INK} opacity={0.06} />
        <rect x={350} y={186 + SHIFT} width={1220} height={524} rx={58} fill="#C3D5C6" />
        <rect
          x={360}
          y={CARTON_TOP}
          width={1200}
          height={520}
          rx={54}
          fill="#E5F1E6"
          stroke="#7E9E86"
          strokeWidth={5}
        />
        <rect x={400} y={210 + SHIFT} width={1120} height={440} rx={36} fill="#F8F4EA" />
        {ROWS.flatMap((y) => COLS.map((x) => <Well key={`${x}-${y}`} x={x} y={y} />))}
        {GAPS.map((gap) => (
          <g key={gap.mid}>
            <rect
              x={gap.x}
              y={(ROW_GAP_TOP + ROW_GAP_BOT) / 2 - 16}
              width={gap.w}
              height={32}
              rx={16}
              fill="#C5D5C4"
            />
            <rect
              x={gap.mid - 16}
              y={ROW_GAP_TOP}
              width={32}
              height={ROW_GAP_BOT - ROW_GAP_TOP}
              rx={16}
              fill="#F4F8F2"
              stroke="#C5D5C4"
              strokeWidth={8}
            />
          </g>
        ))}
      </g>
      {COLS.slice(0, 2).map((x, i) => (
        <g key={x} id={`egg-whole-${i}`} opacity={0}>
          <g transform={`translate(${x} ${ROWS[0] - 34})`}>
            <WholeEgg />
          </g>
        </g>
      ))}
      <g id="egg-half" opacity={0}>
        <g transform={`translate(${COLS[2]} ${ROWS[0]})`}>
          <g transform={`scale(${HALF_SCALE})`}>
            <HalfEgg />
          </g>
        </g>
      </g>
      <Mark id="egg-no" x={1472} y={72} ok={false} />
      <Tag id="tag-1" x={960} y={790} text={COUNTS[0]} />
      <Tag id="tag-2" x={960} y={790} text={COUNTS[1]} />
      <Mark id="egg-ok" x={1064} y={790} ok />
      <Tag id="tag-25" x={960} y={790} text={COUNTS[2]} color={RED} />
      <Line id="egg-line" d="M 1510 78 L 1572 112" />
      <Callout id="egg-note" x={1710} y={112} text={NOT_INTEGER} />
      <CodeCallout id="egg-code" x={960} y={900} text={EXPRESSION} />
    </Stage>
  );
}
