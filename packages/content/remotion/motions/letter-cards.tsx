import { useCallback, useMemo, useRef } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, BLUE, INK, LINE, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const VIOLET = "#8330C7";

export const letterCardsText = "ねこ12いま見ている枚見終わったfor-of";

const CARDS = [
  { letter: "ね", x: 475, color: BLUE, angle: -4 },
  { letter: "こ", x: 825, color: VIOLET, angle: 4 },
];
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 白い絵札に、自然な色の単純な形でねこを描く。 */
function CatPicture() {
  return (
    <g transform="translate(1580 320) rotate(7)">
      <rect
        x={-126}
        y={-162}
        width={252}
        height={305}
        rx={18}
        fill="#fff"
        stroke={LINE}
        strokeWidth={3}
      />
      <path d="M39 78 C99 91 110 51 95 22 Q88 14 82 24 C96 63 73 73 39 60Z" fill="#DDA25F" />
      <path d="M-47 90 Q-52 7 0 2 Q52 7 47 90Z" fill="#DDA25F" />
      <ellipse cy={60} rx={26} ry={38} fill="#FFF3D5" />
      <path
        d="M-70-40 L-78-117 L-30-87 Q0-99 30-87 L78-117 L70-40 Q65 15 0 18 Q-65 15-70-40Z"
        fill="#DDA25F"
      />
      <path d="M-64-71 L-65-96 L-43-79 M64-71 L65-96 L43-79" fill="#DF9A8A" />
      <ellipse cx={-27} cy={-35} rx={7} ry={10} fill={INK} />
      <ellipse cx={27} cy={-35} rx={7} ry={10} fill={INK} />
      <path d="M-8-21 Q0-26 8-21 L0-13Z" fill="#AC655B" />
      <path
        d="M0-13 v9 m0-2 q-10 9-16 0 m16 0 q10 9 16 0 M-44-17 l-39-7 M-43-5 l-41 5 M44-17 l39-7 M43-5 l41 5"
        fill="none"
        stroke={INK}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <rect x={-30} y={13} width={60} height={10} rx={5} fill={BLUE} />
    </g>
  );
}

function LetterCard({ index }: { index: number }) {
  const card = CARDS[index];
  return (
    <g>
      <rect
        x={-146}
        y={-196}
        width={292}
        height={362}
        rx={22}
        fill="#fff"
        stroke={LINE}
        strokeWidth={3}
      />
      <rect x={-120} y={129} width={240} height={12} rx={6} fill={card.color} />
      <Text x={0} y={78} size={181} fill={card.color}>
        {card.letter}
      </Text>
      <g id={`letter-number-${index}`} opacity={0}>
        <path d="M-112-196 v77 l25-13 l25 13 v-77" fill={card.color} />
        <Text x={-87} y={-143} size={37} fill="#fff">
          {index + 1}
        </Text>
      </g>
    </g>
  );
}

export function LetterCards({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["letter-cards"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const now = useCurrentFrame() / useVideoConfig().fps;
  const travel = (start: number, end: number) => {
    const p = interpolate(now, [at(2, start), at(2, end)], [0, 1], clamp);
    return p * p * (3 - 2 * p);
  };
  const first = travel(0.15, 0.95);
  const finished = travel(1.55, 2.15);
  const second = travel(2.25, 3.15);
  const positions = [
    {
      x: 475 + 765 * first - 700 * finished,
      y:
        430 +
        155 * first -
        105 * Math.sin(Math.PI * first) +
        75 * finished -
        75 * Math.sin(Math.PI * finished),
      angle: -4 + 4 * first - 9 * finished,
    },
    {
      x: 825 + 415 * second,
      y: 430 + 155 * second - 130 * Math.sin(Math.PI * second),
      angle: 4 - 4 * second,
    },
  ];
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#letter-desk", at(0));
      show("#letter-picture", at(1, 0.1));
      show("#letter-face-0", at(1, 0.35));
      show("#letter-face-1", at(1, 0.8));
      show("#letter-station, #letter-station-front", at(2));
      show("#letter-number-0", at(2, 0.15));
      show("#letter-done", at(2, 1.5));
      show("#letter-number-1", at(2, 2.25));
      show("#read-letters", at(3, 0.25));
      emphasize("read-letters", at(3, 0.95));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="letter-desk" opacity={0}>
        <path d="M180 910 H1740" stroke={LINE} strokeWidth={3} strokeLinecap="round" />
      </g>
      <g id="letter-picture" opacity={0}>
        <CatPicture />
      </g>

      <g id="letter-station" opacity={0}>
        <Text x={1240} y={867} size={31} fill={INK}>
          いま見ている1枚
        </Text>
      </g>
      <g id="letter-done" opacity={0}>
        <path d="M 350 881 H 730" stroke={LINE} strokeWidth={3} strokeDasharray="8 8" />
        <Text x={300} y={798} size={28} fill={INK}>
          見終わった
        </Text>
      </g>

      {CARDS.map((card, i) => {
        const position = positions[i];
        return (
          <g key={card.letter} id={`letter-face-${i}`} opacity={0}>
            <g transform={`translate(${position.x} ${position.y}) rotate(${position.angle})`}>
              <LetterCard index={i} />
            </g>
          </g>
        );
      })}
      {/* カードの前に単色の細い受け板を重ねる。 */}
      <g id="letter-station-front" opacity={0}>
        <rect x={1045} y={747} width={390} height={30} rx={10} fill={VIOLET} />
      </g>
      <CodeCallout id="read-letters" x={1575} y={706} text="for-of" />
    </Stage>
  );
}
