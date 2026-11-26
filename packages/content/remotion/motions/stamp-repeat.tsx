import { useCallback, useMemo, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, BLUE, INK, LINE, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const VIOLET = "#8330C7";

const STAMP_X = [450, 800, 1150];
const IMPRESSIONS = [0.75, 1.95, 3.15];
const REPEAT = '"★".repeat(3)';
const STAR =
  "M 0 -85 L 25 -27 L 88 -25 L 39 17 L 54 79 L 0 46 L -54 79 L -39 17 L -88 -25 L -25 -27 Z";
export const stampRepeatText = `スタンプカード回数0123${REPEAT}`;

export function StampRepeat({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["stamp-repeat"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const now = useCurrentFrame() / useVideoConfig().fps;
  const count = IMPRESSIONS.filter((hit) => now >= at(1, hit)).length;
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#repeat-scene", at(0));
      // 紙に触れた時刻で印を残し、持ち上げてから次のマスへ移る。
      STAMP_X.forEach((x, i) => {
        const hit = IMPRESSIONS[i];
        if (i > 0) {
          t.to(
            "#repeat-stamp",
            {
              x: x - STAMP_X[0],
              duration: at(1, hit - 0.4) - at(1, hit - 0.8),
              ease: "power2.inOut",
            },
            at(1, hit - 0.8),
          );
        }
        t.to(
          "#repeat-stamp",
          { y: 255, duration: at(1, hit) - at(1, hit - 0.4), ease: "power2.in" },
          at(1, hit - 0.4),
        );
        show(`#repeat-star-${i}`, at(1, hit), { duration: at(1, hit + 0.12) - at(1, hit) });
        t.to(
          "#repeat-stamp",
          { y: 0, duration: at(1, hit + 0.35) - at(1, hit), ease: "power2.out" },
          at(1, hit),
        );
        show(`#repeat-number-${i}`, at(2, 0.2 + i * 0.55));
      });
      show("#repeat-counter", at(1, IMPRESSIONS[0]));
      show("#repeat-code", at(3, 0.2));
      emphasize("repeat-code", at(3, 0.7));
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <g id="repeat-scene" opacity={0}>
        <rect x={190} y={390} width={1220} height={426} rx={35} fill={BLUE} />
        <Text x={800} y={454} size={38} fill="#fff">
          スタンプカード
        </Text>
        {STAMP_X.map((x, i) => (
          <g key={x}>
            <rect x={x - 147} y={505} width={294} height={242} rx={16} fill="#fff" />
            <g id={`repeat-star-${i}`} opacity={0}>
              <path d={STAR} transform={`translate(${x} 615)`} fill={VIOLET} />
            </g>
            <g id={`repeat-number-${i}`} opacity={0}>
              <circle cx={x} cy={719} r={21} fill={BLUE} />
              <Text x={x} y={730} size={30} fill="#fff">
                {i + 1}
              </Text>
            </g>
          </g>
        ))}

        <rect x={1473} y={518} width={302} height={139} rx={21} fill={LINE} />
        <rect x={1473} y={670} width={302} height={133} rx={21} fill={LINE} />
        <rect x={1493} y={690} width={262} height={93} rx={12} fill={VIOLET} />
        <g id="repeat-counter" opacity={0}>
          <rect x={1493} y={315} width={280} height={174} rx={23} fill={VIOLET} />
          <Text x={1558} y={373} size={29} fill="#fff">
            回数
          </Text>
          <rect x={1615} y={342} width={122} height={112} rx={10} fill={INK} />
          <Text x={1676} y={430} size={82} fill="#fff">
            {count}
          </Text>
        </g>
        <g id="repeat-stamp">
          <g transform={`translate(${STAMP_X[0]} 0)`}>
            <path
              d="M-34 292 C-38 250 -72 222 -63 183 C-55 139 55 139 63 183 C72 222 38 250 34 292Z"
              fill={VIOLET}
            />
            <rect x={-110} y={287} width={220} height={55} rx={13} fill={VIOLET} />
            <rect x={-104} y={339} width={208} height={21} rx={6} fill={INK} />
          </g>
        </g>
      </g>
      <CodeCallout id="repeat-code" x={800} y={902} text={REPEAT} />
    </Stage>
  );
}
