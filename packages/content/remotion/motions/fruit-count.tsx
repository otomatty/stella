import { useCallback, useMemo, useRef } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { Callout, GREEN, LINE, RED, Stage, stageMotion, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const fruitCountText = "りんご0123個if";

const FRUIT = [
  { kind: "apple", x: 1230 },
  { kind: "orange", x: 949 },
  { kind: "apple", x: 1365 },
  { kind: "banana", x: 949 },
  { kind: "apple", x: 1500 },
] as const;
type FruitKind = (typeof FRUIT)[number]["kind"];

function Fruit({ kind }: { kind: FruitKind }) {
  if (kind === "apple") {
    return (
      <>
        <path
          d="M 0 -27 C -38 -56 -63 -18 -54 15 Q -43 57 0 45 Q 43 57 54 15 C 63 -18 38 -56 0 -27 Z"
          fill={RED}
        />
        <path
          d="M 0 -26 Q -3 -43 6 -54"
          fill="none"
          stroke="#78472E"
          strokeWidth={7}
          strokeLinecap="round"
        />
        <path d="M 4 -42 Q 13 -64 38 -58 Q 28 -37 4 -42" fill={GREEN} />
        <path
          d="M -36 -13 Q -34 -24 -25 -28"
          fill="none"
          stroke="#FCA5A5"
          strokeWidth={6}
          strokeLinecap="round"
        />
      </>
    );
  }
  if (kind === "orange") {
    return (
      <>
        <circle r={49} fill="#F97316" />
        <path d="M 1 -41 Q 5 -62 33 -57 Q 27 -38 1 -41" fill={GREEN} />
        <path
          d="M -26 -18 Q -22 -28 -11 -32"
          fill="none"
          stroke="#FED7AA"
          strokeWidth={6}
          strokeLinecap="round"
        />
      </>
    );
  }
  return (
    <path
      d="M -58 -8 Q 13 36 48 -37 L 59 -30 Q 45 50 -18 43 Q -51 38 -62 17 Z"
      fill="#FACC15"
      stroke="#A16207"
      strokeWidth={5}
      strokeLinejoin="round"
    />
  );
}

export function FruitCount({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["fruit-count"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const countTimes = [at(2, 0.4), at(2, 2.02), at(2, 3.64)];
  const count = Math.floor(
    interpolate(frame / fps, [at(2), ...countTimes], [0, 1, 2, 3], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show } = stageMotion(t);
      rise("#fruit-scene", at(0));
      FRUIT.forEach(({ kind, x }, i) => {
        const id = `#fruit-${i}`;
        const apple = kind === "apple";
        const offset = 0.81 * i;
        const lift = i === 0 ? at(1) : at(2, offset);
        const lifted = i === 0 ? at(1, 0.55) : at(2, offset + 0.32);
        const move = at(2, offset + 0.4);
        const settle = at(2, offset + 0.76);
        show(`${id} .fruit-face`, lift, { duration: lifted - lift });
        t.to(id, { x: 210, y: -225, duration: lifted - lift, ease: "power2.out" }, lift);
        t.to(
          id,
          {
            x: x - 480,
            y: apple ? 114 : 30 + i * 53,
            duration: settle - move,
            ease: "power2.inOut",
          },
          move,
        );
        if (!apple) {
          t.to(id, { opacity: 0.38, duration: settle - move }, move);
        }
      });
      show("#fruit-if", at(3));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="fruit-scene">
        <path
          d="M 316 544 Q 330 345 480 345 Q 630 345 644 544"
          fill="none"
          stroke="#9A683B"
          strokeWidth={25}
        />
        <path
          d="M 270 540 H 690 L 638 733 Q 632 759 602 759 H 358 Q 328 759 322 733 Z"
          fill="#D5A16B"
          stroke="#9A683B"
          strokeWidth={8}
        />
        <path
          d="M 308 611 H 652 M 323 658 H 637 M 338 705 H 622 M 397 563 L 416 753 M 480 563 V 753 M 563 563 L 544 753"
          fill="none"
          stroke="#B37A49"
          strokeWidth={8}
        />
        <rect x={259} y={522} width={442} height={46} rx={18} fill="#A66F42" />
        <rect
          x={1137}
          y={242}
          width={456}
          height={306}
          rx={31}
          fill="#EEF2FF"
          stroke={VIOLET}
          strokeWidth={7}
        />
        <Text x={1365} y={334} size={58}>
          りんご
        </Text>
        <Text x={1365} y={484} size={120}>
          {count}個
        </Text>
        <path d="M 1137 712 H 1593" stroke={LINE} strokeWidth={6} strokeLinecap="round" />
      </g>
      {FRUIT.map(({ kind, x }, i) => (
        <g id={`fruit-${i}`} key={`${kind}-${x}`}>
          <g className="fruit-face" opacity={0}>
            <g transform="translate(480 526)">
              <Fruit kind={kind} />
            </g>
          </g>
        </g>
      ))}
      <Callout id="fruit-if" x={1365} y={810} text="if" />
    </Stage>
  );
}
