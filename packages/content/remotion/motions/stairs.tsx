import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, GREEN, Head, Line, Stage, stageMotion, Tag, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const stairsText = "12358prevcurr";

const STEPS = [1, 2, 3, 5, 8].map((ways, i) => ({ ways, x: 430 + i * 260, y: 795 - i * 82 }));

export function Stairs({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS.stairs.seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, draw } = stageMotion(t);
      rise("#stairs-scene", at(0));
      show("#stairs-ways-0", at(1));
      show("#stairs-ways-1", at(1, 0.9));
      STEPS.slice(2).forEach((_, i) => {
        const offset = i * 1.29;
        const id = `#stairs-arrows-${i}`;
        draw(`${id} .line`, at(2, offset), at(2, offset + 0.57) - at(2, offset));
        t.to(`${id} .arrow-head path`, { opacity: 1, duration: 0.15 }, at(2, offset + 0.5));
        show(`#stairs-ways-${i + 2}`, at(2, offset + 0.58));
        t.to(id, { opacity: 0, duration: 0.22 }, at(2, offset + 1.14));
      });
      show("#stairs-prev, #stairs-curr", at(3));
      for (let shift = 1; shift <= 3; shift++) {
        const offset = shift * 0.86;
        t.to(
          "#stairs-variables",
          {
            x: shift * 260,
            y: shift * -82,
            duration: at(3, offset + 0.52) - at(3, offset),
            ease: "power2.inOut",
          },
          at(3, offset),
        );
      }
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="stairs-scene">
        <path
          d="M 300 905 V 795 H 560 V 713 H 820 V 631 H 1080 V 549 H 1340 V 467 H 1600 V 905 Z"
          fill="#EFF6FF"
          stroke={BLUE}
          strokeWidth={8}
          strokeLinejoin="round"
        />
        {STEPS.map(({ x, y, ways }, i) => (
          <g key={ways} id={`stairs-ways-${i}`} opacity={0}>
            <rect x={x - 57} y={y - 139} width={114} height={108} rx={25} fill={VIOLET} />
            <Text x={x} y={y - 58} size={69} fill="#fff">
              {ways}
            </Text>
          </g>
        ))}
      </g>
      {STEPS.slice(2).map(({ x, y, ways }, i) => (
        <g key={ways} id={`stairs-arrows-${i}`}>
          <Line
            id={`stairs-long-${i}`}
            d={`M ${x - 520} ${y + 3} C ${x - 515} ${y - 250} ${x - 218} ${y - 250} ${x - 95} ${y - 119}`}
          />
          <Line
            id={`stairs-short-${i}`}
            d={`M ${x - 180} ${y - 3} Q ${x - 111} ${y - 10} ${x - 91} ${y - 59}`}
          />
          <g className="arrow-head">
            <Head id={`stairs-long-head-${i}`} x={x - 86} y={y - 110} angle={46} />
            <Head id={`stairs-short-head-${i}`} x={x - 87} y={y - 68} angle={-68} />
          </g>
        </g>
      ))}
      <g id="stairs-variables">
        <Tag id="stairs-prev" x={430} y={842} text="prev" />
        <Tag id="stairs-curr" x={690} y={760} text="curr" color={GREEN} />
      </g>
    </Stage>
  );
}
