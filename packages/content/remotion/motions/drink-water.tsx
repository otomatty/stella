import { useCallback, useId, useMemo, useRef } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Callout, GREEN, INK, LINE, Stage, stageMotion, Tag, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const drinkWaterText = "残り3002001000mLおわりwhile (残り > 0)";

const GLASS = "M 411 260 H 847 L 793 747 Q 788 788 747 788 H 511 Q 470 788 465 747 Z";

export function DrinkWater({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["drink-water"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const clip = useId();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sips = interpolate(
    frame / fps,
    [at(1), at(1, 0.65), at(2, 0.85), at(2, 1.5), at(2, 2.1), at(2, 2.75)],
    [0, 1, 1, 2, 2, 3],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const surface = 779 - (3 - sips) * 129;
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#water-scene", at(0));
      show("#water-end", at(2, 2.75));
      show("#water-while", at(3));
      emphasize("water-while", at(3, 0.5));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <defs>
        <clipPath id={clip}>
          <path d={GLASS} />
        </clipPath>
      </defs>
      <g id="water-scene">
        <path d={GLASS} fill="#EFF6FF" />
        <g clipPath={`url(#${clip})`}>
          <path
            d={`M 410 ${surface} Q 520 ${surface - 16} 629 ${surface} T 848 ${surface} V 788 H 410 Z`}
            fill="#93C5FD"
            opacity={Math.min(1, (3 - sips) * 6)}
          />
          <path d="M 480 323 L 518 693" stroke="#fff" strokeWidth={18} strokeLinecap="round" />
        </g>
        <path d={GLASS} fill="none" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
        <path
          d="M 761 412 H 813 M 751 541 H 799 M 740 670 H 785"
          stroke={BLUE}
          strokeWidth={6}
          strokeLinecap="round"
        />
        <rect
          x={1005}
          y={326}
          width={504}
          height={278}
          rx={32}
          fill="#fff"
          stroke={LINE}
          strokeWidth={8}
        />
        <Text x={1257} y={416} size={52}>
          残り
        </Text>
        <Text x={1257} y={537} size={92} fill={BLUE}>
          {300 - Math.floor(sips) * 100} mL
        </Text>
      </g>
      <Tag id="water-end" x={1257} y={674} text="おわり" color={GREEN} />
      <Callout id="water-while" x={1257} y={794} text="while (残り > 0)" />
    </Stage>
  );
}
