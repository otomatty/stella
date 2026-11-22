import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Callout, GREEN, LINE, PINK, Stage, stageMotion, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const heightCompareText = "152cm168cm160cm今いちばん高い人max";

const PEOPLE = [
  { x: 440, height: 152, body: 125, color: BLUE },
  { x: 718, height: 168, body: 181, color: VIOLET },
  { x: 996, height: 160, body: 153, color: GREEN },
];
const PODIUM_X = 1448;
const PODIUM_OFFSET_Y = -45;
const HEAD_CENTER_Y = 583;
const HEAD_RADIUS = 44;

export function HeightCompare({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["height-compare"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#height-scene", at(0));

      // 台の上へ移すときは、ほかの人の上を通る高さまで先に上げる。
      const move = (i: number, beat: number, offset: number, toPodium: boolean) => {
        const id = `#height-person-${i}`;
        const shift = PODIUM_X - PEOPLE[i].x;
        const stops = [
          at(beat, offset),
          at(beat, offset + 0.45),
          at(beat, offset + 1.05),
          at(beat, offset + 1.5),
        ];
        t.to(id, { y: -276, duration: stops[1] - stops[0], ease: "power2.inOut" }, stops[0]);
        t.to(
          id,
          { x: toPodium ? shift : 0, duration: stops[2] - stops[1], ease: "power2.inOut" },
          stops[1],
        );
        t.to(
          id,
          {
            y: toPodium ? PODIUM_OFFSET_Y : 0,
            duration: stops[3] - stops[2],
            ease: "power2.inOut",
          },
          stops[2],
        );
      };

      t.to("#height-card-0", { stroke: PINK, duration: 0.25 }, at(1));
      move(0, 1, 0, true);
      show("#height-reading-0", at(1, 1.5));
      t.to("#height-card-0", { stroke: LINE, duration: 0.25 }, at(2));
      t.to("#height-card-1", { stroke: PINK, duration: 0.25 }, at(2));
      t.to("#height-reading-0", { opacity: 0, duration: 0.25 }, at(2));
      move(0, 2, 0, false);
      move(1, 2, 1.5, true);
      show("#height-reading-1", at(2, 3));
      t.to("#height-card-1", { stroke: VIOLET, duration: 0.25 }, at(2, 3));
      t.to("#height-card-2", { stroke: PINK, duration: 0.25 }, at(2, 3.2));
      t.to(
        "#height-person-2",
        { y: -44, duration: at(2, 3.65) - at(2, 3.2), ease: "power2.out" },
        at(2, 3.2),
      );
      t.to(
        "#height-person-2",
        { y: 0, duration: at(2, 4.2) - at(2, 3.75), ease: "power2.inOut" },
        at(2, 3.75),
      );
      t.to("#height-card-2", { stroke: LINE, duration: 0.25 }, at(2, 3.75));
      show("#height-max", at(3));
      emphasize("height-max", at(3, 0.45));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="height-scene">
        <rect
          x={1198}
          y={658}
          width={500}
          height={111}
          rx={22}
          fill="#EEF2FF"
          stroke={VIOLET}
          strokeWidth={8}
        />
        <Text x={PODIUM_X} y={728} size={42}>
          今いちばん高い人
        </Text>
        {PEOPLE.map(({ x, height, body, color }, i) => (
          <g key={height}>
            <g id={`height-person-${i}`}>
              <circle cx={x} cy={HEAD_CENTER_Y - body} r={HEAD_RADIUS} fill={color} />
              <path
                d={`M ${x - 71} 699 V ${683 - body} Q ${x - 71} ${633 - body} ${x} ${643 - body} Q ${x + 71} ${633 - body} ${x + 71} ${683 - body} V 699 Z`}
                fill={color}
              />
            </g>
            <rect
              id={`height-card-${i}`}
              x={x - 98}
              y={735}
              width={196}
              height={70}
              rx={16}
              fill="#fff"
              stroke={LINE}
              strokeWidth={6}
            />
            <Text x={x} y={783} size={42}>
              {height} cm
            </Text>
          </g>
        ))}
      </g>
      {PEOPLE.slice(0, 2).map(({ height, body, color }, i) => (
        <Text
          key={height}
          id={`height-reading-${i}`}
          x={PODIUM_X}
          y={HEAD_CENTER_Y - body + PODIUM_OFFSET_Y - HEAD_RADIUS - 28}
          size={67}
          fill={color}
          opacity={0}
        >
          {height} cm
        </Text>
      ))}
      <Callout id="height-max" x={PODIUM_X} y={860} text="max" />
    </Stage>
  );
}
