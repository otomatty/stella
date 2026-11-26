import { useCallback, useMemo, useRef } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, BLUE, INK, LINE, PINK, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const VIOLET = "#8330C7";

const FIRST = "肥満";
const NEXT = "普通";
const DECLARATION = "let label: string";
export const whiteboardNoteText = `${FIRST}${NEXT}${DECLARATION}`;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

function Eraser() {
  return <rect x={-61} y={-100} width={122} height={194} rx={18} fill={VIOLET} />;
}

/** 原点がペン先。手を描かず、軸とペン先を動かす。 */
function Marker({ color = BLUE }: { color?: string }) {
  return (
    <g transform="rotate(27)">
      <path d="M0 0 L-7 -22 H7Z" fill={color} />
      <path d="M-7 -22 L-14 -43 H14 L7 -22Z" fill={LINE} />
      <rect x={-16} y={-174} width={32} height={133} rx={7} fill={color} />
      <rect x={-17} y={-188} width={34} height={27} rx={6} fill={color} />
    </g>
  );
}
export function WhiteboardNote({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["whiteboard-note"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const time = useCurrentFrame() / useVideoConfig().fps;
  const wipe = interpolate(time, [at(2, 0.75), at(2, 2.25)], [0, 1], clamp);
  const write = interpolate(time, [at(2, 2.65), at(2, 4.5)], [0, 1], clamp);
  const penX = 780 + write * 360;
  const penY = 410 - 66 * Math.cos(write * Math.PI * 12);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, draw, emphasize } = stageMotion(t);
      rise("#note-board", at(0));
      show("#note-tools", at(1));
      show("#note-first", at(2));
      t.to("#note-rest-eraser", { opacity: 0, duration: at(2, 0.7) - at(2, 0.5) }, at(2, 0.5));
      show("#note-wiper", at(2, 0.5), { duration: at(2, 0.75) - at(2, 0.5) });
      show("#note-smudge", at(2, 0.8));
      t.to(
        "#note-smudge, #note-wiper",
        { opacity: 0, duration: at(2, 2.55) - at(2, 2.25) },
        at(2, 2.25),
      );
      show("#note-rest-eraser", at(2, 2.55));
      t.to("#note-rest-marker", { opacity: 0, duration: at(2, 2.65) - at(2, 2.45) }, at(2, 2.45));
      show("#note-writer", at(2, 2.45), { duration: at(2, 2.65) - at(2, 2.45) });
      t.to("#note-writer", { opacity: 0, duration: at(2, 4.8) - at(2, 4.5) }, at(2, 4.5));
      show("#note-rest-marker", at(2, 4.8));
      draw("#note-underline", at(3), at(3, 0.7) - at(3));
      show("#note-declaration", at(3, 0.6));
      emphasize("note-declaration", at(3, 1.3));
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <defs>
        <clipPath id="note-wipe">
          <rect x={740 + wipe * 450} y={295} width={460 * (1 - wipe)} height={220} />
        </clipPath>
        <clipPath id="note-write">
          <rect x={780} y={295} width={write * 360} height={220} />
        </clipPath>
        <clipPath id="note-smudge-clip">
          <rect x={740} y={295} width={wipe * 450} height={220} />
        </clipPath>
      </defs>
      <g id="note-board">
        {/* 脚とキャスターも単色の形。 */}
        {[490, 1410].map((x) => (
          <g key={x}>
            <rect x={x - 8} y={556} width={36} height={335} rx={12} fill={LINE} />
            <rect x={x - 90} y={879} width={192} height={24} rx={12} fill={LINE} />
            {[-61, 71].map((dx) => (
              <circle key={dx} cx={x + dx} cy={910} r={17} fill={INK} />
            ))}
          </g>
        ))}
        <rect x={527} y={791} width={877} height={16} rx={8} fill={LINE} />
        <rect x={255} y={128} width={1394} height={552} rx={24} fill={LINE} />
        <rect
          x={279}
          y={152}
          width={1346}
          height={504}
          rx={12}
          fill="#fff"
          stroke={LINE}
          strokeWidth={3}
        />
        <rect x={406} y={720} width={1102} height={24} rx={10} fill={LINE} />
        <g id="note-tools" opacity={0}>
          <g id="note-rest-eraser">
            <g transform="translate(626 689) rotate(90) scale(0.6)">
              <Eraser />
            </g>
          </g>
          <g id="note-rest-marker">
            <g transform="translate(960 700) rotate(63) scale(0.8)">
              <Marker />
            </g>
          </g>
          <g transform="translate(1150 700) rotate(63) scale(0.8)">
            <Marker color={VIOLET} />
          </g>
          <g transform="translate(1340 700) rotate(63) scale(0.8)">
            <Marker color={INK} />
          </g>
        </g>
        <g clipPath="url(#note-wipe)">
          <Text id="note-first" x={960} y={477} size={174} fill={INK} opacity={0}>
            {FIRST}
          </Text>
        </g>
        <g id="note-smudge" opacity={0} clipPath="url(#note-smudge-clip)">
          {[342, 365, 388, 411, 434, 457, 480].map((y) => (
            <path
              key={y}
              d={`M779 ${y} Q950 ${y - 7} 1130 ${y + 3}`}
              fill="none"
              stroke={LINE}
              strokeWidth={6}
              strokeLinecap="round"
            />
          ))}
        </g>
        <g clipPath="url(#note-write)">
          <Text x={960} y={477} size={174} fill={BLUE}>
            {NEXT}
          </Text>
        </g>
        <g id="note-wiper" opacity={0}>
          <g transform={`translate(${740 + wipe * 450} 407)`}>
            <Eraser />
          </g>
        </g>
        <g id="note-writer" opacity={0}>
          <g transform={`translate(${penX} ${penY})`}>
            <Marker />
          </g>
        </g>
        <path
          id="note-underline"
          d="M782 512 Q954 527 1139 510"
          fill="none"
          stroke={PINK}
          strokeWidth={9}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1}
        />
      </g>
      <CodeCallout id="note-declaration" x={960} y={896} text={DECLARATION} />
    </Stage>
  );
}
