import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, GRAY, INK, Line, Stage, stageMotion, Tag, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const LETTERS = [..."SKYLINE"];
const CODE = '"SKYLINE".slice(0, 3) → "SKY"';
const CELL = 200;
const TAPE_X = 260;
const TAPE_Y = 380;
const PIVOT = { x: 860, y: 230 };
const PAPER = "#F6E6C4";
const EDGE = "#C9842A";
const SKY = "#C5DFF5";

export const tapeCutText = `${LETTERS.join("")}0123456${CODE}3文字`;

export function TapeCut({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["tape-cut"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, draw, emphasize } = stageMotion(t);
      rise("#cut-tape", at(0));
      t.fromTo(
        "#cut-scissors",
        { y: -340, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.75, ease: "power2.out" },
        at(1, 0.15),
      );
      t.to("#cut-dash", { opacity: 1, duration: 0.3 }, at(1, 0.7));
      t.to(
        "#cut-half-left",
        { rotation: 18, svgOrigin: `${PIVOT.x} ${PIVOT.y}`, duration: 0.32, ease: "power2.inOut" },
        at(2),
      );
      t.to(
        "#cut-half-right",
        { rotation: -18, svgOrigin: `${PIVOT.x} ${PIVOT.y}`, duration: 0.32, ease: "power2.inOut" },
        at(2),
      );
      t.to("#cut-dash", { opacity: 0, duration: 0.25 }, at(2, 0.15));
      t.to("#cut-left", { x: -60, y: -30, duration: 0.7, ease: "power2.out" }, at(2, 0.2));
      t.to("#cut-left-paper", { fill: SKY, duration: 0.45 }, at(2, 0.2));
      t.to("#cut-right", { x: 60, opacity: 0.4, duration: 0.7, ease: "power2.out" }, at(2, 0.2));
      t.to("#cut-right-paper", { fill: "#D5D5DB", duration: 0.45 }, at(2, 0.2));
      t.to(
        "#cut-scissors",
        { y: -280, opacity: 0, duration: 0.45, ease: "power2.in" },
        at(2, 0.35),
      );
      draw("#cut-brace .line", at(2, 0.85), 0.4);
      show("#cut-count", at(2, 1.05));
      show("#cut-code", at(3, 0.15));
      emphasize("cut-code", at(3, 0.6));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="cut-tape">
        <ellipse cx={960} cy={598} rx={640} ry={14} fill={INK} opacity={0.06} />
        <g id="cut-right">
          <TapeBody id="cut-right-paper" x={PIVOT.x} width={800} />
          <Roll />
          {LETTERS.slice(3).map((letter, index) => (
            <Cell key={letter} letter={letter} index={index + 3} />
          ))}
        </g>
        <g id="cut-left">
          <TapeBody id="cut-left-paper" x={TAPE_X} width={600} round />
          {LETTERS.slice(0, 3).map((letter, index) => (
            <Cell key={letter} letter={letter} index={index} />
          ))}
        </g>
      </g>
      <path
        id="cut-dash"
        d={`M ${PIVOT.x} ${TAPE_Y - 8} V ${TAPE_Y + CELL + 8}`}
        stroke="#E25B8A"
        strokeWidth={5}
        strokeDasharray="14 12"
        opacity={0}
      />
      <Scissors />
      <Line id="cut-brace" d={`M 250 690 L 250 728 L 750 728 L 750 690`} color="#2F6F9A" />
      <Tag id="cut-count" x={500} y={792} text="3文字" chars={3} />
      <CodeCallout id="cut-code" x={960} y={900} text={CODE} />
    </Stage>
  );
}

function TapeBody({
  id,
  x,
  width,
  round,
}: {
  id: string;
  x: number;
  width: number;
  round?: boolean;
}) {
  return (
    <g>
      <rect id={id} x={x} y={TAPE_Y} width={width} height={CELL} rx={0} fill={PAPER} />
      <rect
        x={x + (round ? 16 : 0)}
        y={TAPE_Y}
        width={width - (round ? 16 : 0)}
        height={12}
        fill={EDGE}
      />
      <rect
        x={x + (round ? 16 : 0)}
        y={TAPE_Y + CELL - 12}
        width={width - (round ? 16 : 0)}
        height={12}
        fill={EDGE}
      />
      <rect
        x={x + 18}
        y={TAPE_Y + 28}
        width={Math.max(0, width - 36)}
        height={28}
        fill="#FFF8E8"
        opacity={0.7}
      />
    </g>
  );
}

function Roll() {
  return (
    <g>
      <circle cx={1724} cy={480} r={64} fill="#E7D3A4" />
      <circle cx={1724} cy={480} r={64} fill="none" stroke="#C4A46A" strokeWidth={8} />
      <circle cx={1724} cy={480} r={46} fill="none" stroke="#D4BC86" strokeWidth={5} />
      <circle cx={1724} cy={480} r={22} fill="#F7F1E2" stroke="#C4A46A" strokeWidth={5} />
    </g>
  );
}

function Cell({ letter, index }: { letter: string; index: number }) {
  const x = TAPE_X + CELL * index + CELL / 2;
  const seam = index !== 0 && index !== 3;
  return (
    <g>
      {seam && (
        <path
          d={`M ${x - CELL / 2} ${TAPE_Y + 18} V ${TAPE_Y + CELL - 18}`}
          stroke="#CDB892"
          strokeWidth={3}
          strokeDasharray="8 10"
        />
      )}
      <Text x={x} y={528} size={128}>
        {letter}
      </Text>
      <Text x={x} y={668} size={48} fill={GRAY}>
        {index}
      </Text>
    </g>
  );
}

function Scissors() {
  return (
    <g id="cut-scissors" opacity={0}>
      <g id="cut-half-left">
        <path d="M844 248 L778 362 L818 376 L874 252 Z" fill="#B7BEC8" />
        <path d="M836 262 L798 352 L816 358 L858 266 Z" fill="#F4F7FA" />
        <path d="M830 214 L768 148" stroke="#A33B32" strokeWidth={18} strokeLinecap="round" />
        <circle cx={748} cy={118} r={46} fill="#C4473A" />
        <circle cx={748} cy={118} r={26} fill="#F6E4E1" />
      </g>
      <g id="cut-half-right">
        <path d="M876 248 L942 362 L902 376 L846 252 Z" fill="#C5CCD4" />
        <path d="M884 262 L922 352 L904 358 L862 266 Z" fill="#FFFFFF" opacity={0.9} />
        <path d="M890 214 L952 148" stroke="#A33B32" strokeWidth={18} strokeLinecap="round" />
        <circle cx={972} cy={118} r={46} fill="#C4473A" />
        <circle cx={972} cy={118} r={26} fill="#F6E4E1" />
      </g>
      <circle cx={PIVOT.x} cy={PIVOT.y} r={16} fill="#6E747C" />
      <circle cx={PIVOT.x} cy={PIVOT.y} r={6} fill="#E4E7EC" />
    </g>
  );
}
