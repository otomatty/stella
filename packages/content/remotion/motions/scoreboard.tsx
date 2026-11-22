import { useCallback, useMemo, useRef } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Callout, INK, LINE, PINK, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const scoreboardText = "チーム名あお組得点012constlet";

export function Scoreboard({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS.scoreboard.seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rewrite = [at(1, 0.45), at(1, 1.95)];
  const score = Math.round(
    interpolate(frame / fps, [at(1), ...rewrite], [0, 0.5, 1.5], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const digitOpacity = Math.min(
    ...rewrite.map((_, i) =>
      interpolate(frame / fps, [at(1, 1.5 * i), rewrite[i], at(1, 1.5 * i + 0.9)], [1, 0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    ),
  );
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show } = stageMotion(t);
      rise("#scoreboard", at(0));
      t.to("#team-frame", { stroke: PINK, fill: "#FCE7F3", duration: 0.35 }, at(2));
      show("#team-type, #score-type", at(3));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="scoreboard">
        <rect
          id="team-frame"
          x={240}
          y={290}
          width={650}
          height={430}
          rx={38}
          fill="#EFF6FF"
          stroke={BLUE}
          strokeWidth={8}
        />
        <rect x={1030} y={290} width={650} height={430} rx={38} fill={INK} />
        <rect x={1070} y={420} width={570} height={260} rx={24} fill="#fff" />
        <Text x={565} y={392} size={54}>
          チーム名
        </Text>
        <Text x={565} y={560} size={112}>
          あお組
        </Text>
        <path
          d="M 548 628 v -15 a 17 17 0 0 1 34 0 v 15"
          fill="none"
          stroke={BLUE}
          strokeWidth={8}
        />
        <rect x={538} y={626} width={54} height={44} rx={8} fill={BLUE} />
        <circle cx={565} cy={646} r={6} fill="#fff" />
        <Text x={1355} y={386} size={54} fill={LINE}>
          得点
        </Text>
        <Text x={1355} y={624} size={196} opacity={digitOpacity}>
          {score}
        </Text>
      </g>
      <Callout id="team-type" x={565} y={808} text="const" />
      <Callout id="score-type" x={1355} y={808} text="let" />
    </Stage>
  );
}
