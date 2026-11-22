import { useCallback, useMemo, useRef } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Callout, GREEN, INK, LINE, Stage, stageMotion, Tag, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const elevatorText = "現在の階5階4階3階2階1階到着while (階 !== 1)";

const FLOORS = [5, 4, 3, 2, 1];
const FLOOR_HEIGHT = 121;
const TOP_FLOOR = 280;

export function Elevator({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS.elevator.seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const travel = interpolate(
    frame / fps,
    [at(1), at(1, 0.75), at(1, 1.3), at(1, 2.05), at(2), at(2, 0.75), at(2, 1.3), at(2, 2.05)],
    [0, 1, 1, 2, 2, 3, 3, 4],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const floor = 5 - Math.floor(travel);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#elevator-building", at(0));
      show("#elevator-arrived", at(2, 2.05));
      show("#elevator-while", at(3));
      emphasize("elevator-while", at(3, 0.45));
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <g id="elevator-building">
        <rect
          x={356}
          y={182}
          width={641}
          height={680}
          rx={20}
          fill="#F1F5F9"
          stroke={INK}
          strokeWidth={8}
        />
        <rect x={422} y={212} width={293} height={621} rx={16} fill="#CBD5E1" />
        <path d="M 431 218 V 827 M 706 218 V 827" stroke="#94A3B8" strokeWidth={7} />
        {FLOORS.map((label, i) => (
          <g key={label}>
            <rect
              x={753}
              y={TOP_FLOOR + FLOOR_HEIGHT * i - 44}
              width={200}
              height={88}
              rx={14}
              fill={label === floor ? BLUE : "#fff"}
            />
            <Text
              x={853}
              y={TOP_FLOOR + FLOOR_HEIGHT * i + 16}
              size={49}
              fill={label === floor ? "#fff" : INK}
            >
              {label}階
            </Text>
          </g>
        ))}
        <g transform={`translate(0 ${TOP_FLOOR + travel * FLOOR_HEIGHT})`}>
          <rect
            x={463}
            y={-40}
            width={211}
            height={80}
            rx={13}
            fill="#EFF6FF"
            stroke={BLUE}
            strokeWidth={7}
          />
          <path d="M 568 -36 V 36" stroke={BLUE} strokeWidth={5} />
          <path d="M 551 5 V 18 M 585 5 V 18" stroke={BLUE} strokeWidth={5} strokeLinecap="round" />
        </g>
        <rect
          x={1135}
          y={268}
          width={420}
          height={309}
          rx={28}
          fill="#fff"
          stroke={LINE}
          strokeWidth={8}
        />
        <Text x={1345} y={369} size={51}>
          現在の階
        </Text>
        <Text x={1345} y={514} size={109} fill={BLUE}>
          {floor}階
        </Text>
      </g>
      <Tag id="elevator-arrived" x={1345} y={650} text="到着" color={GREEN} />
      <Callout id="elevator-while" x={1345} y={790} text="while (階 !== 1)" />
    </Stage>
  );
}
