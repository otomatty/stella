import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, GREEN, LINE, RED, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const stackPlatesText = "上からabc";

const PLATES = [
  { color: RED, letter: "a", x: 1250 },
  { color: BLUE, letter: "b", x: 1430 },
  { color: GREEN, letter: "c", x: 1610 },
];

export function StackPlates({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["stack-plates"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show } = stageMotion(t);
      rise("#plate-table, #plate-0 .plate-face", at(0));
      PLATES.forEach((_, i) => {
        const id = `#plate-${i}`;
        const offset = i * 1.08;
        const start = at(1, offset);
        const slide = at(1, offset + 0.24);
        const lower = at(1, offset + 0.63);
        const settle = at(1, offset + 0.98);
        if (i > 0) {
          show(`${id} .plate-face`, start, { duration: slide - start });
        }
        t.to(id, { x: 262, duration: lower - slide, ease: "power2.inOut" }, slide);
        t.to(id, { y: 337 - i * 49, duration: settle - lower, ease: "power2.inOut" }, lower);
      });
      show("#plates-from-top", at(2));
      show("#plate-card-0-face, #plate-card-1-face, #plate-card-2-face", at(3));
      // b と c を順に左端へ入れ、すでにあるカードを右にずらす。
      [1, 2].forEach((i) => {
        const id = `#plate-card-${i}`;
        const offset = 0.5 + (i - 1) * 1.28;
        const lift = at(3, offset);
        const move = at(3, offset + 0.3);
        const lower = at(3, offset + 0.93);
        const end = at(3, offset + 1.23);
        const earlier = i === 1 ? "#plate-card-0" : "#plate-card-0, #plate-card-1";
        t.to(id, { y: -174, duration: move - lift }, lift);
        t.to(id, { x: -180 * i, duration: lower - move, ease: "power2.inOut" }, move);
        t.to(earlier, { x: "+=180", duration: lower - move, ease: "power2.inOut" }, move);
        t.to(id, { y: 0, duration: end - lower }, lower);
      });
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="plate-table">
        <path d="M 380 714 H 876" stroke={LINE} strokeWidth={10} strokeLinecap="round" />
        <path
          d="M 243 450 H 389 M 268 450 L 285 519 H 347 L 364 450"
          fill="none"
          stroke={LINE}
          strokeWidth={8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      {PLATES.map(({ color }, i) => (
        <g key={color} id={`plate-${i}`}>
          <g className="plate-face" opacity={i === 0 ? undefined : 0}>
            <path
              d="M 166 328 Q 187 372 252 373 H 480 Q 545 372 566 328"
              fill="#fff"
              stroke={color}
              strokeWidth={9}
              strokeLinejoin="round"
            />
            <ellipse
              cx={366}
              cy={328}
              rx={200}
              ry={31}
              fill="#fff"
              stroke={color}
              strokeWidth={9}
            />
            <ellipse
              cx={366}
              cy={328}
              rx={143}
              ry={16}
              fill="none"
              stroke={color}
              strokeWidth={4}
              strokeOpacity={0.5}
            />
          </g>
        </g>
      ))}
      <g id="plates-from-top" opacity={0}>
        <Text x={1010} y={367} size={48}>
          上から
        </Text>
        {PLATES.toReversed().map(({ color }, i) => (
          <g key={color} transform={`translate(1010 ${442 + i * 109})`}>
            <circle r={46} fill="#fff" stroke={color} strokeWidth={8} />
            <circle r={32} fill="none" stroke={color} strokeWidth={3} />
          </g>
        ))}
      </g>
      {PLATES.map(({ color, letter, x }, i) => (
        <g key={letter} id={`plate-card-${i}`}>
          <g id={`plate-card-${i}-face`} opacity={0}>
            <rect
              x={x - 70}
              y={489}
              width={140}
              height={147}
              rx={20}
              fill="#fff"
              stroke={color}
              strokeWidth={8}
            />
            <Text x={x} y={593} size={100}>
              {letter}
            </Text>
          </g>
        </g>
      ))}
    </Stage>
  );
}
