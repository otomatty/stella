import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import {
  BLUE,
  CodeCallout,
  GRAY,
  INK,
  LINE,
  PINK,
  Stage,
  stageMotion,
  Text,
  VIOLET,
} from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const LETTERS = [..."name:ken"];
const MATCH = 4;
const CODE = '"name:ken".indexOf(":") → 4';
export const cardFindAtText = `${LETTERS.join("")}01234567${CODE}`;

const CARD_W = 150;
const CARD_H = 210;
const GAP = 20;
const STEP = CARD_W + GAP;
const LEFT = 290;
const CARD_Y = 400;
const NAVY = "#243E6A";
const PASSED = "#1A3054";
const CREAM = "#FFF3D6";
const CREAM_EDGE = "#E4C98A";
const CREAM_SIDE = "#D7B56A";
const SILVER = "#D5DCE3";
const SILVER_DARK = "#8E99A6";
const GLASS = "#C5E9F6";
const WOOD = "#C4864A";
const WOOD_DARK = "#8A5A2B";

function slotX(index: number) {
  return LEFT + CARD_W / 2 + index * STEP;
}

export function CardFindAt({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["card-find-at"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#find-cards", at(0));
      t.set("#find-lens-move", { x: slotX(0) }, 0);
      show("#find-lens", at(1, 0.2));
      const hold = 0.42;
      const move = 0.36;
      let landed = at(2, 0.15);
      for (let i = 0; i < MATCH; i++) {
        const leave = 0.15 + i * (hold + move);
        const start = at(2, leave + hold);
        t.to("#find-lens-move", { x: slotX(i + 1), duration: move, ease: "power2.inOut" }, start);
        landed = start + move;
        t.to(
          `#find-num-${i}`,
          { attr: { fill: PASSED }, duration: 0.2 },
          i === MATCH - 1 ? landed : at(2, leave + hold + move),
        );
      }
      t.to("#find-card-4", { y: -20, duration: 0.35, ease: "power2.out" }, landed);
      t.to("#find-card-box", { stroke: PINK, attr: { "stroke-width": 8 }, duration: 0.25 }, landed);
      t.to(
        "#find-num-4",
        {
          attr: { fill: BLUE },
          scale: 1.55,
          transformOrigin: "50% 70%",
          duration: 0.3,
        },
        landed,
      );
      show("#find-index", landed);
      emphasize("find-card", at(3, 0.25));
      emphasize("find-index", at(3, 0.25));
      show("#find-code", at(3, 0.7));
      emphasize("find-code", at(3, 1.25));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="find-cards">
        {LETTERS.map((letter, index) => {
          const x = LEFT + index * STEP;
          return (
            <g key={letter + index.toString()} id={index === MATCH ? "find-card-4" : undefined}>
              <ellipse
                cx={x + CARD_W / 2}
                cy={CARD_Y + CARD_H + 18}
                rx={62}
                ry={10}
                fill={INK}
                opacity={0.06}
              />
              <rect
                x={x + 12}
                y={CARD_Y + 14}
                width={CARD_W}
                height={CARD_H}
                rx={18}
                fill={CREAM_SIDE}
              />
              <rect
                x={x + 6}
                y={CARD_Y + 8}
                width={CARD_W}
                height={CARD_H}
                rx={18}
                fill={CREAM_EDGE}
              />
              <rect
                id={index === MATCH ? "find-card-box" : undefined}
                x={x}
                y={CARD_Y}
                width={CARD_W}
                height={CARD_H}
                rx={18}
                fill={CREAM}
                stroke={CREAM_EDGE}
                strokeWidth={4}
              />
              <path
                d={`M ${x + 18} ${CARD_Y + 16} H ${x + CARD_W - 22} Q ${x + CARD_W - 14} ${CARD_Y + 16} ${x + CARD_W - 14} ${CARD_Y + 28} V ${CARD_Y + 52} H ${x + 18} Z`}
                fill="#fff"
                opacity={0.55}
              />
              <Text x={x + CARD_W / 2} y={CARD_Y + 138} size={110} fill={NAVY}>
                {letter}
              </Text>
            </g>
          );
        })}
        {LETTERS.map((_, index) => (
          <g key={`n${index.toString()}`}>
            {index === MATCH ? (
              <g id="find-index" opacity={0}>
                <rect
                  id="find-index-box"
                  x={slotX(index) - 46}
                  y={612}
                  width={92}
                  height={100}
                  rx={16}
                  fill="#fff"
                  stroke={BLUE}
                  strokeWidth={4}
                />
              </g>
            ) : null}
            <Text id={`find-num-${index}`} x={slotX(index)} y={688} size={48} fill={GRAY}>
              {index}
            </Text>
          </g>
        ))}
      </g>
      <g id="find-lens-move">
        <g id="find-lens" opacity={0}>
          <g transform="translate(0 250)">
            <path d="M 78 78 L 122 122" stroke={WOOD_DARK} strokeWidth={26} strokeLinecap="round" />
            <path d="M 78 78 L 122 122" stroke={WOOD} strokeWidth={16} strokeLinecap="round" />
            <circle r={118} fill={SILVER_DARK} />
            <circle r={110} fill={SILVER} />
            <circle r={100} fill={GLASS} />
            <path
              d="M -62 -28 Q -70 -62 -28 -74"
              fill="none"
              stroke="#fff"
              strokeWidth={8}
              strokeLinecap="round"
              opacity={0.85}
            />
            <Text x={0} y={36} size={96} fill={NAVY}>
              :
            </Text>
          </g>
        </g>
      </g>
      <CodeCallout id="find-code" x={960} y={900} text={CODE} />
    </Stage>
  );
}

export function cardX(count: number, index: number) {
  return 960 + (index - (count - 1) / 2) * 120;
}

export function SearchCards({
  id,
  letters,
  lensX,
  match,
  candidates = [],
}: {
  id: string;
  letters: string[];
  lensX: number;
  match?: number;
  candidates?: number[];
}) {
  return (
    <>
      <g id={`${id}-cards`}>
        {letters.map((letter, index) => {
          const x = cardX(letters.length, index);
          const matched = match === index;
          const marked = matched || candidates.includes(index);
          return (
            <g key={x}>
              <rect
                x={x - 48}
                y={430}
                width={96}
                height={145}
                rx={14}
                fill={marked ? VIOLET : "#fff"}
                fillOpacity={marked ? 0.09 : 1}
                stroke={marked ? VIOLET : LINE}
                strokeWidth={matched ? 8 : 4}
                strokeOpacity={marked && !matched ? 0.45 : 1}
              />
              <Text x={x} y={529} size={75} fill={matched ? VIOLET : BLUE}>
                {letter}
              </Text>
              <Text x={x} y={652} size={matched ? 54 : 44} fill={matched ? VIOLET : GRAY}>
                {index}
              </Text>
            </g>
          );
        })}
      </g>
      <g transform={`translate(${lensX} 327)`}>
        <g id={`${id}-lens`} opacity={0}>
          <path d="M 38 -38 L 96 -96" stroke={GRAY} strokeWidth={21} strokeLinecap="round" />
          <circle r={60} fill="#fff" stroke={GRAY} strokeWidth={9} />
          <circle r={47} fill={BLUE} fillOpacity={0.09} />
          <path
            d="M -37 2 Q -37 -26 -16 -34"
            fill="none"
            stroke={BLUE}
            strokeOpacity={0.38}
            strokeWidth={5}
            strokeLinecap="round"
          />
        </g>
      </g>
    </>
  );
}
