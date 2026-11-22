import { useCallback, useMemo, useRef } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Callout, Stage, stageMotion, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const foldPaperText = "重なり1248枚*= 2";

const PAPER_X = 362;
const PAPER_Y = 678;
const PAPER_WIDTH = 760;
const LAYER_HEIGHT = 24;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export function FoldPaper({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["fold-paper"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const now = frame / fps;
  const foldTiming = [
    [at(1), at(1, 1.2)],
    [at(2), at(2, 1.1)],
    [at(2, 1.55), at(2, 2.65)],
  ];
  const folds = foldTiming.map((range) => interpolate(now, range, [0, 1], clamp));
  const layers = 2 ** folds.filter((progress) => progress === 1).length;
  const width = PAPER_WIDTH / layers;
  const activeFold = folds.find((progress) => progress > 0 && progress < 1) ?? 0;
  const angle = activeFold * Math.PI;
  const foldedWidth = width / 2;
  const flapX = PAPER_X + foldedWidth + (width - foldedWidth) * Math.cos(angle);
  const flapLift = Math.sin(angle) * (width - foldedWidth);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#paper-scene", at(0));
      show("#paper-double", at(3));
      emphasize("paper-double", at(3, 0.45));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="paper-scene">
        <path d="M 280 704 H 1165" stroke={BLUE} strokeWidth={6} strokeLinecap="round" />
        {Array.from({ length: layers }, (_, i) => {
          const y = PAPER_Y - i * LAYER_HEIGHT;
          return (
            <path
              key={y}
              d={`M ${PAPER_X} ${y} H ${PAPER_X + foldedWidth} L ${flapX} ${y - flapLift}`}
              fill="none"
              stroke={i % 2 === 0 ? BLUE : VIOLET}
              strokeWidth={18}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
        <rect
          x={1210}
          y={307}
          width={397}
          height={369}
          rx={32}
          fill="#EEF2FF"
          stroke={VIOLET}
          strokeWidth={7}
        />
        <Text x={1408} y={416} size={54}>
          重なり
        </Text>
        <Text x={1408} y={578} size={116}>
          {layers}枚
        </Text>
      </g>
      <Callout id="paper-double" x={1408} y={775} text="*= 2" />
    </Stage>
  );
}
