import { useCallback, useMemo, useRef } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Callout, GREEN, LINE, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const cookieSplitText = "余り121086420枚% 3 === 0&&";

const PLATES = [516, 960, 1404];
const COOKIES = PLATES.flatMap((plate, i) =>
  [1, -1].flatMap((row) =>
    [-1, 1].map((column) => ({
      x: plate + column * 48,
      y: row < 0 ? 306 : 406,
      endY: 650 + row * 48,
      delay: i * 0.98 + (row < 0 ? 0.56 : 0),
    })),
  ),
);
const SLIDE = 0.49;

export function CookieSplit({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["cookie-split"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const remaining =
    Math.ceil(
      interpolate(
        frame / fps,
        [at(1), ...COOKIES.filter((_, i) => i % 2 === 0).map(({ delay }) => at(1, delay + SLIDE))],
        [12, 10, 8, 6, 4, 2, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      ) / 2,
    ) * 2;
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#cookie-scene", at(0));
      show("#cookie-rest", at(1));
      COOKIES.forEach(({ y, endY, delay }, i) => {
        t.to(
          `#cookie-${i}`,
          { y: endY - y, duration: at(1, delay + SLIDE) - at(1, delay), ease: "power2.inOut" },
          at(1, delay),
        );
      });
      emphasize("cookie-rest", at(2));
      t.to("#cookie-count", { fill: GREEN, duration: 0.3 }, at(2));
      show("#cookie-mod, #cookie-and", at(3));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="cookie-scene">
        <rect
          x={360}
          y={230}
          width={1200}
          height={251}
          rx={29}
          fill="#FCF3E4"
          stroke="#B88754"
          strokeWidth={8}
        />
        {PLATES.map((x) => (
          <g key={x}>
            <circle cx={x} cy={650} r={153} fill="#EFF6FF" stroke={BLUE} strokeWidth={8} />
            <circle cx={x} cy={650} r={135} fill="#fff" stroke={LINE} strokeWidth={4} />
          </g>
        ))}
        {COOKIES.map(({ x, y }, i) => (
          <g key={`${x}-${y}`} id={`cookie-${i}`}>
            <g transform={`translate(${x} ${y})`}>
              <circle r={34} fill="#D5A16B" stroke="#9A683B" strokeWidth={5} />
              <path
                d="M -13 -10 l 4 -4 7 4 -2 8 -8 2 Z M 10 -16 l 7 -2 5 7 -5 5 -8 -3 Z M 10 9 l 8 2 -1 8 -8 3 -4 -8 Z M -18 12 l 7 -3 4 7 -6 6 -6 -3 Z"
                fill="#78472E"
              />
            </g>
          </g>
        ))}
      </g>
      <g id="cookie-rest" opacity={0}>
        <rect
          id="cookie-rest-box"
          x={788}
          y={100}
          width={344}
          height={80}
          rx={16}
          fill="#fff"
          stroke={LINE}
          strokeWidth={4}
        />
        <Text x={870} y={153} size={42}>
          余り
        </Text>
        <Text id="cookie-count" x={1010} y={153} size={48} fill={BLUE}>
          {remaining}枚
        </Text>
      </g>
      <Callout id="cookie-mod" x={819} y={880} text="% 3 === 0" />
      <Callout id="cookie-and" x={1175} y={880} text="&&" />
    </Stage>
  );
}
