import { useCallback, useMemo, useRef } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Callout, INK, LINE, Stage, stageMotion, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const digitBlocksText = "123残り0% 10Math.floor(÷10)";

const DIGITS = [3, 2, 1];
const moveStart = (i: number) => i * 1.35;
const moveEnd = (i: number) => moveStart(i) + 1.12;
const REMAINING = [123, 12, 1, 0];

export function DigitBlocks({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["digit-blocks"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const moved = Math.floor(
    interpolate(frame / fps, [at(2), ...DIGITS.map((_, i) => at(2, moveEnd(i)))], [0, 1, 2, 3], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show } = stageMotion(t);
      rise("#digit-scene", at(0));
      [1, 2, 3].forEach((digit, i) => {
        show(`#digit-face-${digit}`, at(1, i * 0.35));
      });
      DIGITS.forEach((digit, i) => {
        const id = `#digit-block-${digit}`;
        const start = at(2, moveStart(i));
        const betweenTrays = at(2, moveStart(i) + 0.3);
        const aligned = at(2, moveEnd(i) - 0.3);
        const end = at(2, moveEnd(i));
        t.to(id, { y: 167, duration: betweenTrays - start, ease: "power2.inOut" }, start);
        t.to(
          id,
          { x: (i - (digit - 1)) * 184, duration: aligned - betweenTrays, ease: "power2.inOut" },
          betweenTrays,
        );
        t.to(id, { y: 335, duration: end - aligned, ease: "power2.inOut" }, aligned);
      });
      show("#digit-remainder, #digit-floor", at(3));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="digit-scene">
        <rect
          x={294}
          y={235}
          width={650}
          height={224}
          rx={30}
          fill="#F8FAFC"
          stroke={LINE}
          strokeWidth={8}
        />
        <rect
          x={294}
          y={570}
          width={650}
          height={224}
          rx={65}
          fill="#EFF6FF"
          stroke={BLUE}
          strokeWidth={8}
        />
        <rect
          x={1120}
          y={260}
          width={465}
          height={232}
          rx={26}
          fill="#fff"
          stroke={LINE}
          strokeWidth={8}
        />
        <Text x={1352} y={344} size={46}>
          残り
        </Text>
        <Text x={1352} y={445} size={84} fill={BLUE}>
          {REMAINING[moved]}
        </Text>
      </g>
      {DIGITS.map((digit) => (
        <g key={digit} id={`digit-block-${digit}`}>
          <g id={`digit-face-${digit}`} opacity={0}>
            <rect
              x={369 + (digit - 1) * 184}
              y={279}
              width={132}
              height={132}
              rx={20}
              fill={VIOLET}
              stroke={INK}
              strokeWidth={5}
            />
            <Text x={435 + (digit - 1) * 184} y={376} size={87} fill="#fff">
              {digit}
            </Text>
          </g>
        </g>
      ))}
      <Callout id="digit-remainder" x={1352} y={620} text="% 10" />
      <Callout id="digit-floor" x={1352} y={739} text="Math.floor(÷10)" />
    </Stage>
  );
}
