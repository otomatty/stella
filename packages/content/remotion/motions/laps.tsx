import { useCallback, useMemo, useRef } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Callout, Head, INK, Line, RED, Stage, stageMotion, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const lapsText = "周回12345始め続ける条件進め方";

const TRACK_X = 684;
const TRACK_Y = 462;
const TRACK_RX = 378;
const TRACK_RY = 207;

export function Laps({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS.laps.seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const laps = interpolate(
    frame / fps,
    [at(1), at(2), at(2, 1.65), at(3), at(3, 1.75), at(3, 3.4)],
    [0, 1, 2, 3, 4, 5],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const angle = Math.PI / 2 + laps * Math.PI * 2;
  const x = TRACK_X + Math.cos(angle) * TRACK_RX;
  const y = TRACK_Y + Math.sin(angle) * TRACK_RY;
  const direction = Math.sin(angle) > 0 ? -1 : 1;
  const stride = laps === 0 || laps === 5 ? 0 : Math.sin(laps * Math.PI * 20) * 15;
  const lapNumber = Math.min(5, Math.floor(laps) + 1);
  const pose = `M 11 -91 L -6 -51 L 20 -30 L ${38 + stride} -8 M -6 -51 L -30 -22 L ${-51 - stride} -15 M 3 -80 L 29 -59 L 48 -70 M 3 -80 L -23 -63 L -37 -75`;
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, draw, show } = stageMotion(t);
      rise("#race", at(0));
      draw("#track-direction .line", at(1), at(1, 0.6) - at(1));
      show("#track-head", at(1, 0.6));
      show("#start-label, #condition-label, #advance-label", at(4));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="race">
        <ellipse
          cx={TRACK_X}
          cy={TRACK_Y}
          rx={TRACK_RX}
          ry={TRACK_RY}
          fill="none"
          stroke="#C8674D"
          strokeWidth={112}
        />
        <ellipse
          cx={TRACK_X}
          cy={TRACK_Y}
          rx={TRACK_RX}
          ry={TRACK_RY}
          fill="none"
          stroke="#fff"
          strokeWidth={4}
        />
        <path d="M 684 618 V 720" stroke="#fff" strokeWidth={12} />
        <path d="M 806 753 V 660" stroke={INK} strokeWidth={8} strokeLinecap="round" />
        <path d="M 810 660 H 893 L 875 683 L 893 706 H 810 Z" fill={RED} />
        <g transform={`translate(${x} ${y}) scale(${direction} 1)`}>
          <circle cx={14} cy={-122} r={23} fill={VIOLET} />
          <path
            d={pose}
            fill="none"
            stroke="#fff"
            strokeWidth={24}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={pose}
            fill="none"
            stroke={VIOLET}
            strokeWidth={16}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <rect
          x={1220}
          y={292}
          width={399}
          height={373}
          rx={32}
          fill="#EEF2FF"
          stroke={BLUE}
          strokeWidth={7}
        />
        <Text x={1419} y={403} size={62}>
          周回
        </Text>
        <Text x={1419} y={588} size={176}>
          {lapNumber}
        </Text>
      </g>
      <Line id="track-direction" d="M 817 548 Q 662 607 519 542" />
      <Head id="track-head" x={519} y={542} angle={204} />
      <Callout id="start-label" x={608} y={805} text="始め" />
      <Callout id="condition-label" x={885} y={805} text="続ける条件" />
      <Callout id="advance-label" x={1419} y={754} text="進め方" />
    </Stage>
  );
}
