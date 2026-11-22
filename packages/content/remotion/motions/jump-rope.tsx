import { useCallback, useMemo, useRef } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Callout, INK, LINE, Mark, PINK, Stage, stageMotion, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const jumpRopeText = "カウンター012跳んだ回数123i < 3";

export function JumpRope({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["jump-rope"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const now = frame / fps;
  const jumps = useMemo(
    () => [
      [at(1), at(1, 0.9)],
      [at(2), at(2, 0.9)],
      [at(2, 1.35), at(2, 2.25)],
    ],
    [at],
  );
  const activeJump = jumps.find(([start, end]) => now >= start && now < end);
  const phase = activeJump ? interpolate(now, activeJump, [0, 1]) : 0;
  const lift = Math.sin(phase * Math.PI) * 144;
  const ropeY = interpolate(Math.cos(phase * 2 * Math.PI), [-1, 1], [920, 75]);
  const count = Math.floor(
    interpolate(now, [jumps[0][0], jumps[1][0], jumps[2][0]], [0, 1, 2], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show } = stageMotion(t);
      rise("#jump-scene", at(0));
      jumps.forEach(([start, end], i) => {
        const duration = (end - start) / 2;
        t.to("#jump-frame", { stroke: PINK, duration, repeat: 1, yoyo: true }, start);
        show(`#jump-number-${i}, #jump-mark-${i}`, end);
      });
      show("#jump-limit", at(3));
    },
    [at, jumps],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="jump-scene">
        <path d="M 260 813 H 900" stroke={LINE} strokeWidth={8} strokeLinecap="round" />
        <g transform={`translate(0 ${-lift})`}>
          <path
            d={`M 398 523 C 242 ${ropeY} 932 ${ropeY} 776 523`}
            fill="none"
            stroke={PINK}
            strokeWidth={12}
            strokeLinecap="round"
          />
          <circle cx={588} cy={393} r={61} fill={VIOLET} />
          <path d="M 527 504 Q 588 473 649 504 L 625 657 H 551 Z" fill={VIOLET} />
          <path
            d="M 536 509 L 474 568 L 400 523 M 640 509 L 702 568 L 776 523 M 567 647 L 539 732 L 503 789 H 539 M 611 647 L 638 732 L 620 789 H 658"
            fill="none"
            stroke={VIOLET}
            strokeWidth={24}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 382 509 L 413 535 M 792 509 L 761 535"
            stroke={INK}
            strokeWidth={17}
            strokeLinecap="round"
          />
        </g>
        <rect
          id="jump-frame"
          x={1000}
          y={305}
          width={330}
          height={349}
          rx={31}
          fill="#EEF2FF"
          stroke={BLUE}
          strokeWidth={8}
        />
        <Text x={1165} y={397} size={49}>
          カウンター
        </Text>
        <Text x={1165} y={585} size={170}>
          {count}
        </Text>
        <Text x={1537} y={397} size={48}>
          跳んだ回数
        </Text>
        {[1, 2, 3].map((number, i) => {
          const y = 484 + i * 82;
          return (
            <g key={number}>
              <rect
                x={1427}
                y={y - 34}
                width={220}
                height={68}
                rx={18}
                fill="#fff"
                stroke={LINE}
                strokeWidth={4}
              />
              <Text id={`jump-number-${i}`} x={1498} y={y + 16} size={46} opacity={0}>
                {number}
              </Text>
              <Mark id={`jump-mark-${i}`} x={1595} y={y} ok />
            </g>
          );
        })}
      </g>
      <Callout id="jump-limit" x={1165} y={743} text="i < 3" />
    </Stage>
  );
}
