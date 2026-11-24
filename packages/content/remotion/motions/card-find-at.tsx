import { useCallback, useMemo, useRef } from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { BLUE, CodeCallout, GRAY, LINE, Stage, stageMotion, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const LETTERS = [..."name:ken"];
const MATCH = 4;
const CODE = '"name:ken".indexOf(":") → 4';
export const cardFindAtText = `${LETTERS.join("")}01234567${CODE}`;

export function CardFindAt({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["card-find-at"].seconds), [beats]);
  const time = useCurrentFrame() / useVideoConfig().fps;
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show } = stageMotion(t);
      rise("#find-cards", at(0));
      show("#find-lens", at(1));
      show("#find-code", at(3));
    },
    [at],
  );
  useTimeline(root, build);

  const lensX = interpolate(
    time,
    [at(1), at(2)],
    [cardX(LETTERS.length, 0), cardX(LETTERS.length, MATCH)],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) },
  );

  return (
    <Stage root={root}>
      <SearchCards
        id="find"
        letters={LETTERS}
        lensX={lensX}
        match={time >= at(2) ? MATCH : undefined}
      />
      <CodeCallout id="find-code" x={960} y={852} text={CODE} />
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
