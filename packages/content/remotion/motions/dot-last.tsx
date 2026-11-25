import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Callout, CodeCallout, GRAY, INK, PINK, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const LETTERS = [..."plan.v2.txt"];
const DOTS = [4, 7];
const LAST = 7;
const CODE = '"plan.v2.txt".lastIndexOf(".") → 7';
export const dotLastText = `${LETTERS.join("")}012345678910後ろから${CODE}`;

const CARD_W = 124;
const CARD_H = 180;
const GAP = 14;
const STEP = CARD_W + GAP;
const LEFT = 208;
const CARD_Y = 420;
const NAVY = "#243E6A";
const CREAM = "#FFF3D6";
const CREAM_EDGE = "#E4C98A";
const CREAM_SIDE = "#D7B56A";
const ORANGE = "#F6C98A";
const SILVER = "#D5DCE3";
const SILVER_DARK = "#8E99A6";
const GLASS = "#C5E9F6";
const WOOD = "#C4864A";
const WOOD_DARK = "#8A5A2B";

function slotX(index: number) {
  return LEFT + CARD_W / 2 + index * STEP;
}

export function DotLast({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["dot-last"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, draw, emphasize } = stageMotion(t);
      rise("#dot-cards", at(0));
      for (const [order, index] of DOTS.entries()) {
        const start = 0.35 + order * 1.15;
        const face = index === LAST ? "#dot-hit-box" : `#dot-face-${index}`;
        t.to(face, { attr: { fill: ORANGE }, duration: 0.25 }, at(1, start));
        t.to(`#dot-card-${index}`, { y: -16, duration: 0.28, ease: "power2.out" }, at(1, start));
        t.to(
          `#dot-card-${index}`,
          { y: 0, duration: 0.28, ease: "power2.inOut" },
          at(1, start + 0.4),
        );
      }
      t.set("#dot-lens-move", { x: slotX(LETTERS.length - 1) }, 0);
      show("#dot-lens", at(2, 0.15));
      draw("#dot-arrow .line", at(2, 0.15), 0.35);
      show("#dot-back", at(2, 0.2));
      const hold = 0.42;
      const move = 0.36;
      for (let step = 0; step < 3; step++) {
        const leave = 0.2 + step * (hold + move);
        t.to(
          "#dot-lens-move",
          { x: slotX(LETTERS.length - 2 - step), duration: move, ease: "power2.inOut" },
          at(2, leave + hold),
        );
      }
      const land = 0.2 + 3 * (hold + move);
      t.to("#dot-card-7", { y: -20, duration: 0.35, ease: "power2.out" }, at(2, land));
      t.to(
        "#dot-hit-box",
        { stroke: PINK, attr: { "stroke-width": 8 }, duration: 0.25 },
        at(2, land),
      );
      t.to("#dot-num-7", { opacity: 0, duration: 0.15 }, at(2, land));
      show("#dot-index", at(2, land));
      t.to("#dot-back", { opacity: 0, duration: 0.2 }, at(3));
      emphasize("dot-hit", at(3, 0.25));
      emphasize("dot-index", at(3, 0.25));
      show("#dot-code", at(3, 0.55));
      emphasize("dot-code", at(3, 1.1));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="dot-cards">
        {LETTERS.map((letter, index) => {
          const x = LEFT + index * STEP;
          const dot = DOTS.includes(index);
          return (
            <g key={letter + index.toString()} id={dot ? `dot-card-${index}` : undefined}>
              <ellipse
                cx={x + CARD_W / 2}
                cy={CARD_Y + CARD_H + 16}
                rx={50}
                ry={8}
                fill={INK}
                opacity={0.06}
              />
              <rect
                x={x + 10}
                y={CARD_Y + 12}
                width={CARD_W}
                height={CARD_H}
                rx={16}
                fill={CREAM_SIDE}
              />
              <rect
                x={x + 5}
                y={CARD_Y + 6}
                width={CARD_W}
                height={CARD_H}
                rx={16}
                fill={CREAM_EDGE}
              />
              <rect
                id={index === LAST ? "dot-hit-box" : `dot-face-${index}`}
                x={x}
                y={CARD_Y}
                width={CARD_W}
                height={CARD_H}
                rx={16}
                fill={CREAM}
                stroke={CREAM_EDGE}
                strokeWidth={3}
              />
              <path
                d={`M ${x + 14} ${CARD_Y + 12} H ${x + CARD_W - 18} Q ${x + CARD_W - 12} ${CARD_Y + 12} ${x + CARD_W - 12} ${CARD_Y + 22} V ${CARD_Y + 40} H ${x + 14} Z`}
                fill="#fff"
                opacity={0.55}
              />
              <Text x={x + CARD_W / 2} y={CARD_Y + 118} size={96} fill={NAVY}>
                {letter}
              </Text>
            </g>
          );
        })}
        {LETTERS.map((_, index) => (
          <g key={`n${index.toString()}`}>
            {index === LAST ? (
              <g id="dot-index" opacity={0}>
                <rect
                  id="dot-index-box"
                  x={slotX(index) - 40}
                  y={612}
                  width={80}
                  height={88}
                  rx={14}
                  fill="#fff"
                  stroke={BLUE}
                  strokeWidth={4}
                />
                <Text x={slotX(index)} y={678} size={64} fill={BLUE}>
                  {index}
                </Text>
              </g>
            ) : null}
            <Text id={`dot-num-${index}`} x={slotX(index)} y={684} size={44} fill={GRAY}>
              {index}
            </Text>
          </g>
        ))}
      </g>
      <Callout id="dot-back" x={960} y={118} text="後ろから" />
      <g id="dot-lens-move">
        <g id="dot-lens" opacity={0}>
          <g transform="translate(0 250)">
            <LineArrow />
            <path d="M 72 72 L 118 118" stroke={WOOD_DARK} strokeWidth={22} strokeLinecap="round" />
            <path d="M 72 72 L 118 118" stroke={WOOD} strokeWidth={14} strokeLinecap="round" />
            <circle r={108} fill={SILVER_DARK} />
            <circle r={100} fill={SILVER} />
            <circle r={92} fill={GLASS} />
            <path
              d="M -54 -24 Q -62 -56 -22 -66"
              fill="none"
              stroke="#fff"
              strokeWidth={7}
              strokeLinecap="round"
              opacity={0.85}
            />
          </g>
        </g>
      </g>
      <CodeCallout id="dot-code" x={960} y={900} text={CODE} />
    </Stage>
  );
}

function LineArrow() {
  const d = "M 78 -132 H -78 M -78 -132 L -50 -154 M -78 -132 L -50 -110";
  const common = {
    d,
    fill: "none" as const,
    strokeLinecap: "round" as const,
    pathLength: 1,
    strokeDasharray: 1,
    strokeDashoffset: 1,
  };
  return (
    <g id="dot-arrow">
      <path className="line" {...common} stroke="#fff" strokeWidth={12} />
      <path className="line" {...common} stroke={BLUE} strokeWidth={6} />
    </g>
  );
}
