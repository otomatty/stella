import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, CodeCallout, INK, PINK, Stage, stageMotion, Tag } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const WALL = "4m";
const FLOOR = "3m";
const LADDER = "5m";
const EXPRESSION = "Math.hypot(3, 4) → 5";
export const ladderWallText = [WALL, FLOOR, LADDER, EXPRESSION].join("");

const M = 160;
const WALL_X = 760;
const GROUND_Y = 800;
const TOP = { x: WALL_X, y: GROUND_Y - 4 * M };
const FOOT = { x: WALL_X + 3 * M, y: GROUND_Y };
const LEAN = (Math.atan2(3, 4) * 180) / Math.PI;
const ALONG = (Math.atan2(4, 3) * 180) / Math.PI;
const OUT = { x: 0.8, y: -0.6 };

const BRICK = "#C45C42";
const BRICK_DARK = "#A34B36";
const MORTAR = "#E7D4C6";
const WOOD = "#C4925A";
const WOOD_DARK = "#8D5A32";
const WOOD_LIGHT = "#E2BC88";
const GRASS = "#6FA83A";
const SOIL = "#C6A36E";

const brickRows = Array.from({ length: 16 }, (_, row) => {
  const y = 132 + row * 41.5;
  const offset = row % 2 === 0 ? 0 : 26;
  return Array.from({ length: 5 }, (_, col) => {
    const x = 600 - 26 + offset + col * 52;
    const x0 = Math.max(x, 600);
    const x1 = Math.min(x + 46, WALL_X);
    return x1 - x0 >= 10 ? { x: x0, y, w: x1 - x0, dark: (row + col) % 3 === 0 } : null;
  });
});

function rail(ox: number, oy: number, extra: number) {
  const x0 = TOP.x + ox;
  const y0 = TOP.y + oy;
  const len = 800 + extra;
  return `M ${x0} ${y0} l ${0.6 * len} ${0.8 * len}`;
}

export function LadderWall({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["ladder-wall"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      const grow = (band: string, rect: string, when: number, attr: gsap.TweenVars["attr"]) => {
        t.set(band, { opacity: 1 }, when);
        t.to(rect, { attr, duration: 0.75, ease: "power2.out" }, when);
      };
      rise("#ladder-scene", at(0));
      t.fromTo(
        "#ladder-wood",
        { opacity: 0, rotation: -LEAN, svgOrigin: `${FOOT.x} ${FOOT.y}` },
        {
          opacity: 1,
          rotation: 0,
          duration: 1.25,
          ease: "power2.inOut",
          immediateRender: false,
        },
        at(1, 0.2),
      );
      grow("#ladder-height-band", "#ladder-h-clip-rect", at(2, 0.1), { y: 150, height: 660 });
      show("#ladder-height", at(2, 0.95));
      grow("#ladder-width-band", "#ladder-w-clip-rect", at(2, 1.25), { width: 500 });
      show("#ladder-width", at(2, 2.1));
      grow("#ladder-length-band", "#ladder-d-clip-rect", at(2, 2.4), { width: 860 });
      show("#ladder-length", at(2, 3.25));
      show("#ladder-triangle", at(3, 0.2));
      show("#ladder-angle", at(3, 0.85));
      show("#ladder-expression", at(3, 1.4));
      emphasize("ladder-expression", at(3, 1.95));
    },
    [at],
  );
  useTimeline(root, build);

  const spin = `translate(${TOP.x} ${TOP.y}) rotate(${ALONG})`;

  return (
    <Stage root={root}>
      <defs>
        <clipPath id="ladder-h-clip">
          <rect id="ladder-h-clip-rect" x={500} y={GROUND_Y} width={120} height={0} />
        </clipPath>
        <clipPath id="ladder-w-clip">
          <rect id="ladder-w-clip-rect" x={WALL_X} y={808} width={0} height={40} />
        </clipPath>
        <clipPath id="ladder-d-clip">
          <rect id="ladder-d-clip-rect" x={0} y={-90} width={0} height={180} transform={spin} />
        </clipPath>
      </defs>
      <g id="ladder-scene">
        <ellipse cx={1000} cy={812} rx={520} ry={14} fill={INK} opacity={0.06} />
        <rect x={520} y={GROUND_Y} width={960} height={18} fill={SOIL} />
        <rect x={520} y={GROUND_Y} width={960} height={6} fill="#D8B98A" />
        <rect x={520} y={782} width={960} height={22} fill={GRASS} />
        <rect x={520} y={782} width={960} height={7} fill="#8FCB4E" />
        {[640, 820, 1040, 1260].map((x) => (
          <ellipse key={x} cx={x} cy={790} rx={16} ry={7} fill="#5E942E" />
        ))}
        <rect x={600} y={132} width={160} height={668} fill={MORTAR} />
        {brickRows.flatMap((row) =>
          row.flatMap((brick) =>
            brick ? (
              <rect
                key={`${brick.x}-${brick.y}`}
                x={brick.x}
                y={brick.y}
                width={brick.w}
                height={36}
                fill={brick.dark ? BRICK_DARK : BRICK}
              />
            ) : (
              []
            ),
          ),
        )}
        <rect x={742} y={132} width={18} height={668} fill="#6E3428" opacity={0.38} />
        <rect x={576} y={100} width={208} height={36} rx={4} fill="#C9B08A" />
        <rect x={576} y={100} width={208} height={10} rx={3} fill="#E6D4B4" />
        <rect x={600} y={132} width={160} height={8} fill={INK} opacity={0.08} />
      </g>
      <g id="ladder-triangle" opacity={0}>
        <polygon
          points={`${TOP.x},${TOP.y} ${WALL_X},${GROUND_Y} ${FOOT.x},${FOOT.y}`}
          fill={BLUE}
          opacity={0.16}
        />
      </g>
      <g id="ladder-wood" opacity={0}>
        <ellipse cx={1160} cy={812} rx={150} ry={10} fill={INK} opacity={0.06} />
        <path
          d={rail(32 * OUT.x, 32 * OUT.y, 28)}
          stroke={WOOD_DARK}
          strokeWidth={22}
          strokeLinecap="round"
        />
        <path
          d={rail(32 * OUT.x, 32 * OUT.y, 28)}
          stroke={WOOD}
          strokeWidth={16}
          strokeLinecap="round"
        />
        <path d={rail(0, 0, 0)} stroke={WOOD_DARK} strokeWidth={22} strokeLinecap="round" />
        <path d={rail(0, 0, 0)} stroke={WOOD} strokeWidth={16} strokeLinecap="round" />
        <path d={rail(6, -4, 0)} stroke={WOOD_LIGHT} strokeWidth={5} strokeLinecap="round" />
        {Array.from({ length: 10 }, (_, i) => {
          const f = (i + 0.5) / 10;
          const x = TOP.x + 480 * f;
          const y = TOP.y + 640 * f;
          return (
            <line
              key={y}
              x1={x}
              y1={y}
              x2={x + 32 * OUT.x}
              y2={y + 32 * OUT.y}
              stroke={WOOD_DARK}
              strokeWidth={12}
              strokeLinecap="round"
            />
          );
        })}
      </g>
      <g id="ladder-height-band" clipPath="url(#ladder-h-clip)" opacity={0}>
        <rect x={536} y={TOP.y} width={26} height={640} rx={8} fill={BLUE} />
        <rect x={536} y={TOP.y} width={26} height={8} fill="#fff" opacity={0.35} />
        {[1, 2, 3, 4].map((m) => (
          <line
            key={m}
            x1={538}
            x2={560}
            y1={GROUND_Y - m * M}
            y2={GROUND_Y - m * M}
            stroke="#143A8C"
            strokeWidth={4}
          />
        ))}
      </g>
      <g id="ladder-width-band" clipPath="url(#ladder-w-clip)" opacity={0}>
        <rect x={WALL_X} y={820} width={480} height={22} rx={8} fill={BLUE} />
        <rect x={WALL_X} y={820} width={480} height={6} fill="#fff" opacity={0.35} />
        {[1, 2, 3].map((m) => (
          <line
            key={m}
            x1={WALL_X + m * M}
            x2={WALL_X + m * M}
            y1={822}
            y2={840}
            stroke="#143A8C"
            strokeWidth={4}
          />
        ))}
      </g>
      <g id="ladder-length-band" clipPath="url(#ladder-d-clip)" opacity={0}>
        <g transform={spin}>
          <rect x={0} y={-84} width={800} height={22} rx={8} fill={PINK} />
          <rect x={0} y={-84} width={800} height={6} fill="#fff" opacity={0.4} />
          {[1, 2, 3, 4, 5].map((m) => (
            <line
              key={m}
              x1={m * M}
              x2={m * M}
              y1={-82}
              y2={-64}
              stroke="#8E1458"
              strokeWidth={4}
            />
          ))}
        </g>
      </g>
      <g id="ladder-angle" opacity={0}>
        <path
          d={`M ${WALL_X + 40} ${GROUND_Y} V ${GROUND_Y - 40} H ${WALL_X}`}
          fill="none"
          stroke={INK}
          strokeWidth={6}
        />
      </g>
      <Tag id="ladder-height" x={448} y={470} text={WALL} color={BLUE} />
      <Tag id="ladder-width" x={1360} y={831} text={FLOOR} color={BLUE} />
      <Tag id="ladder-length" x={1160} y={348} text={LADDER} color={PINK} />
      <CodeCallout id="ladder-expression" x={960} y={900} text={EXPRESSION} />
    </Stage>
  );
}
