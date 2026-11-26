import { useCallback, useMemo, useRef } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, BLUE, INK, LINE, Mark, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const VIOLET = "#8330C7";

export const doorSignText = '営業中準備中たぶん" | ';
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** ひもの先の輪をフックに通して掛ける単色の札。 */
function Sign({ label, bad = false }: { label: string; bad?: boolean }) {
  return (
    <g>
      <path
        d="M-112 112 L-22 25 M22 25 L112 112"
        fill="none"
        stroke={LINE}
        strokeWidth={7}
        strokeLinejoin="round"
      />
      <rect x={-165} y={98} width={330} height={180} rx={20} fill={VIOLET} />
      <Text x={0} y={210} size={57} fill="#fff">
        {label}
      </Text>
      <path
        d={
          "M-36 0 a36 36 0 1 0 72 0 a36 36 0 1 0-72 0 Z " +
          (bad ? "M0-19 L19 17 H-19Z" : "M-23 0 a23 23 0 1 0 46 0 a23 23 0 1 0-46 0Z")
        }
        fill={LINE}
        fillRule="evenodd"
      />
    </g>
  );
}

export function DoorSign({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["door-sign"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const now = useCurrentFrame() / useVideoConfig().fps;
  const move = (beat: number, start: number, end: number) => {
    const p = interpolate(now, [at(beat, start), at(beat, end)], [0, 1], clamp);
    return p * p * (3 - 2 * p);
  };
  const openIn = move(1, 0.45, 1.3);
  const openOut = move(1, 1.65, 2.35);
  const closedIn = move(1, 2.45, 3.35);
  const closedOut = move(2, 0, 0.6);
  const badIn = move(2, 0.8, 1.65);
  const rejected = move(2, 2.1, 3.2);
  const signs = [
    {
      id: "open",
      label: "営業中",
      x: 1190 - 570 * openIn + 570 * openOut,
      y: 355 + 55 * openIn - 55 * openOut,
      angle: 0,
    },
    {
      id: "closed",
      label: "準備中",
      x: 1590 - 970 * closedIn + 970 * closedOut,
      y: 355 + 55 * closedIn - 55 * closedOut,
      angle: 0,
    },
    {
      id: "bad",
      label: "たぶん",
      x: 1200 - 530 * badIn - 360 * rejected,
      y: 355 + 55 * badIn + 180 * rejected,
      angle: -17 * rejected,
    },
  ];
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#shop", at(0));
      show("#open, #closed", at(1));
      show("#bad", at(2, 0.65));
      show("#rejected", at(2, 2));
      show("#accepted-open, #accepted-closed", at(3));
      show("#sign-type", at(3, 0.5));
      emphasize("sign-type", at(3, 1.2));
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <g id="shop" opacity={0}>
        <rect x={330} y={220} width={515} height={680} rx={24} fill={BLUE} />
        <rect x={375} y={278} width={425} height={433} rx={16} fill="#F1F1F4" />
        <rect x={750} y={562} width={18} height={104} rx={9} fill={INK} />
        <path
          d="M174 232 L228 112 H894 L956 232 V269 Q916 297 877 269 Q838 297 799 269 Q760 297 721 269 Q682 297 643 269 Q604 297 565 269 Q526 297 487 269 Q448 297 409 269 Q370 297 331 269 Q292 297 253 269 Q214 297 174 269Z"
          fill={BLUE}
        />
        {[260, 400, 540, 680, 820].map((x) => (
          <path key={x} d={"M" + x + " 112 h65 l22 120 h-85Z"} fill="#fff" />
        ))}
        <g transform="translate(620 410)">
          <circle r={21} fill={INK} />
        </g>
        <path d="M201 811 H301 L285 897 H217Z" fill={VIOLET} />
        <path d="M250 814 V716" stroke="#56854C" strokeWidth={8} />
        <path
          d="M250 782 Q207 768 212 734 Q244 729 250 782 M250 760 Q291 748 294 709 Q253 713 250 760 M250 738 Q226 707 249 681 Q274 712 250 738"
          fill="#56854C"
        />
      </g>
      {signs.map((s) => (
        <g key={s.id} id={s.id} opacity={0}>
          <g transform={`translate(${s.x} ${s.y}) rotate(${s.angle})`}>
            <Sign label={s.label} bad={s.id === "bad"} />
          </g>
        </g>
      ))}
      <Mark id="rejected" x={330} y={525} ok={false} />
      <Mark id="accepted-open" x={1190} y={701} ok />
      <Mark id="accepted-closed" x={1590} y={701} ok />
      <CodeCallout id="sign-type" x={1390} y={817} text={'"営業中" | "準備中"'} />
    </Stage>
  );
}
