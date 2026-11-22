import { useCallback, useMemo, useRef } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Callout, GRAY, INK, LINE, RED, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const rocketCountdownText = "カウントダウン54321i--";

export function RocketCountdown({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["rocket-countdown"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const count = Math.ceil(
    interpolate(
      frame / fps,
      [at(1), at(1, 1.15), at(1, 2.3), at(1, 3.45), at(2)],
      [5, 4, 3, 2, 1],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    ),
  );
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#launchpad", at(0));
      t.to("#countdown-frame", { stroke: BLUE, duration: 0.35 }, at(2));
      show("#decrement", at(3));
      emphasize("decrement", at(3, 0.45));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="launchpad">
        <path
          d="M 397 768 V 358 H 497 V 768 M 397 374 L 497 502 L 397 630 L 497 758 M 497 374 L 397 502 L 497 630 L 397 758 M 497 483 H 657"
          fill="none"
          stroke={GRAY}
          strokeWidth={13}
          strokeLinejoin="round"
        />
        <rect x={340} y={758} width={560} height={72} rx={14} fill={GRAY} />
        <path
          d="M 648 570 Q 553 625 553 748 L 652 716 M 762 570 Q 857 625 857 748 L 758 716"
          fill={RED}
          stroke={INK}
          strokeWidth={7}
          strokeLinejoin="round"
        />
        <path
          d="M 705 195 Q 593 280 610 522 L 642 724 H 768 L 800 522 Q 817 280 705 195 Z"
          fill="#fff"
          stroke={INK}
          strokeWidth={8}
        />
        <path
          d="M 705 195 Q 652 237 629 305 H 781 Q 758 237 705 195 Z"
          fill={RED}
          stroke={INK}
          strokeWidth={8}
          strokeLinejoin="round"
        />
        <circle cx={705} cy={416} r={61} fill={BLUE} stroke={INK} strokeWidth={8} />
        <path
          d="M 675 413 Q 681 391 701 386"
          fill="none"
          stroke="#fff"
          strokeWidth={9}
          strokeLinecap="round"
        />
        <path d="M 677 724 H 733 L 746 757 H 664 Z" fill={INK} />
        <rect
          id="countdown-frame"
          x={1010}
          y={298}
          width={565}
          height={396}
          rx={38}
          fill={INK}
          stroke={GRAY}
          strokeWidth={10}
        />
        <Text x={1292} y={394} size={53} fill={LINE}>
          カウントダウン
        </Text>
        <Text x={1292} y={619} size={218} fill="#fff">
          {count}
        </Text>
      </g>
      <Callout id="decrement" x={1292} y={791} text="i--" />
    </Stage>
  );
}
