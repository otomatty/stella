import { useCallback, useMemo, useRef } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { Callout, INK, LINE, Stage, stageMotion, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const FIRST_X = 624;
const STAMP_X = [FIRST_X, 960, 1296];
const IMPRESSIONS = [0.65, 1.65, 2.65];
const REPEAT = '"★".repeat(3)';
export const stampRepeatText = `★回数123${REPEAT}`;

export function StampRepeat({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["stamp-repeat"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const count = Math.floor(
    interpolate(frame / fps, [at(1), ...IMPRESSIONS.map((hit) => at(1, hit))], [0, 1, 2, 3], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#repeat-scene", at(0));
      STAMP_X.forEach((x, index) => {
        const hit = IMPRESSIONS[index];
        const start = at(1, hit - 0.65);
        const impact = at(1, hit);
        const retreat = at(1, hit + 0.3);
        const descent = index === 0 ? start : at(1, hit - 0.35);
        if (index > 0) {
          t.to(
            "#repeat-stamp",
            { x: x - FIRST_X, duration: descent - start, ease: "power2.inOut" },
            start,
          );
        }
        t.to("#repeat-stamp", { y: 259, duration: impact - descent, ease: "power2.in" }, descent);
        t.to("#repeat-stamp", { y: 0, duration: retreat - impact, ease: "power2.out" }, impact);
        show(`#repeat-star-${index}`, impact, { duration: retreat - impact });
      });
      show("#repeat-counter", at(1, IMPRESSIONS[0]));
      t.to("#repeat-card", { stroke: VIOLET, duration: 0.3 }, at(2));
      show("#repeat-code", at(3));
      emphasize("repeat-code", at(3, 0.4));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="repeat-scene">
        <rect
          id="repeat-card"
          x={425}
          y={484}
          width={1070}
          height={260}
          rx={33}
          fill="#fff"
          stroke={LINE}
          strokeWidth={8}
        />
        {STAMP_X.map((x, index) => (
          <Text
            key={x}
            id={`repeat-star-${index}`}
            x={x}
            y={651}
            size={120}
            fill={VIOLET}
            opacity={0}
          >
            ★
          </Text>
        ))}
        <g id="repeat-stamp">
          <rect x={FIRST_X - 44} y={192} width={88} height={116} rx={30} fill="#B77943" />
          <rect x={FIRST_X - 77} y={292} width={154} height={45} rx={13} fill="#8A5433" />
          <rect x={FIRST_X - 73} y={329} width={146} height={26} rx={9} fill={INK} />
        </g>
      </g>
      <g id="repeat-counter" opacity={0}>
        <rect x={1580} y={530} width={164} height={168} rx={24} fill={VIOLET} />
        <Text x={1662} y={585} size={34} fill="#fff">
          回数
        </Text>
        <Text x={1662} y={666} size={72} fill="#fff">
          {count}
        </Text>
      </g>
      <Callout id="repeat-code" x={960} y={860} text={REPEAT} />
    </Stage>
  );
}
