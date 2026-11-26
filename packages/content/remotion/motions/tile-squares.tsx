import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { Callout, BLUE, INK, LINE, Stage, stageMotion, Tag, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const VIOLET = "#8330C7";

export const tileSquaresText =
  "縦横2084大きいほう・小さいほう(20, 8)(8, 4)(4, 0)→一時変数に余りを退避";
const X = 340;
const Y = 260;
const UNIT = 56;
const PIECES = [
  { x: X, y: Y, size: 8, dx: -80, dy: 0 },
  { x: X + 8 * UNIT, y: Y, size: 8, dx: -40, dy: 0 },
  { x: X + 16 * UNIT, y: Y, size: 4, dx: 40, dy: -14 },
  { x: X + 16 * UNIT, y: Y + 4 * UNIT, size: 4, dx: 40, dy: 14 },
];

/** 切断前は一枚につながり、切断後は隙間で区別する単色の板。 */
function Wood({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  return <rect x={x} y={y} width={width} height={height} rx={3} fill="#E7B575" />;
}

export function TileSquares({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["tile-squares"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, draw, emphasize } = stageMotion(t);
      rise("#tile-workbench", at(0));
      show("#tile-dimensions", at(1, 0.1));
      // 一本目、二本目とも、切り線を引き終わってから離す。
      draw("#tile-cut-0", at(1, 0.7), at(1, 1.4) - at(1, 0.7));
      t.set("#tile-cover", { opacity: 0 }, at(1, 1.4));
      t.to("#tile-dimensions", { opacity: 0, duration: 0.2 }, at(1, 1.4));
      t.to(
        "#tile-piece-0",
        { x: -80, duration: at(1, 2) - at(1, 1.4), ease: "power2.inOut" },
        at(1, 1.4),
      );
      t.to("#tile-cut-0", { opacity: 0, duration: 0.1 }, at(1, 1.4));
      draw("#tile-cut-1", at(1, 2.3), at(1, 3) - at(1, 2.3));
      t.to(
        "#tile-piece-1",
        { x: -40, duration: at(1, 3.7) - at(1, 3), ease: "power2.inOut" },
        at(1, 3),
      );
      t.to("#tile-cut-1", { opacity: 0, duration: 0.1 }, at(1, 3));
      t.to(
        "#tile-remainder",
        { x: 40, duration: at(1, 3.7) - at(1, 3), ease: "power2.inOut" },
        at(1, 3),
      );
      show("#tile-remainder-dimensions", at(2, 0.1));
      draw("#tile-cut-2", at(2, 0.7), at(2, 1.6) - at(2, 0.7));
      t.to("#tile-cut-2", { opacity: 0, duration: 0.1 }, at(2, 1.6));
      t.set("#tile-remainder-cover", { opacity: 0 }, at(2, 1.6));
      t.to(
        "#tile-piece-2",
        { y: -14, duration: at(2, 2.5) - at(2, 1.6), ease: "power2.inOut" },
        at(2, 1.6),
      );
      t.to(
        "#tile-piece-3",
        { y: 14, duration: at(2, 2.5) - at(2, 1.6), ease: "power2.inOut" },
        at(2, 1.6),
      );
      t.to("#tile-remainder-dimensions", { opacity: 0, duration: 0.2 }, at(3));
      show("#tile-answer", at(3, 0.3));
      // 小さいほうの値が次の組の大きいほうへ移る。前の組も記録として残す。
      show("#tile-pairs-heading, #tile-pair-0, #tile-pair-tag-0", at(4, 0.1));
      show("#tile-pair-tag-1", at(4, 1.1));
      show("#tile-pair-1", at(4, 1.1), { x: -80, duration: at(4, 1.8) - at(4, 1.1) });
      t.to(
        "#tile-pair-1",
        { x: 0, duration: at(4, 2.1) - at(4, 1.8), ease: "power2.out" },
        at(4, 1.8),
      );
      show("#tile-pair-tag-2", at(4, 2.3));
      show("#tile-pair-2", at(4, 2.3), { x: -80, duration: at(4, 3) - at(4, 2.3) });
      t.to("#tile-pair-2", { x: 0, duration: at(4, 3.3) - at(4, 3), ease: "power2.out" }, at(4, 3));
      show("#tile-swap", at(4, 3.7));
      emphasize("tile-swap", at(4, 4.2));
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <g id="tile-workbench" opacity={0}>
        {/* 定規と鉛筆は白地に直接置く。 */}
        <rect x={1620} y={270} width={66} height={448} rx={7} fill={LINE} />
        {Array.from({ length: 18 }, (_, i) => ({ y: 318 + i * 20, major: i % 5 === 0 })).map(
          ({ y, major }) => (
            <path key={y} d={`M1622 ${y} h${major ? 30 : 17}`} stroke={INK} strokeWidth={2} />
          ),
        )}
        <g transform="translate(1730 410) rotate(8)">
          <path d="M-14-100 H14 V100 L0 142 L-14 100Z" fill={BLUE} />
          <path d="M-14 100 H14 L0 142Z" fill="#E6C18A" />
          <path d="M-5 128 H5 L0 142Z" fill={INK} />
        </g>
        {PIECES.slice(0, 2).map(({ x, y, size }, i) => (
          <g key={x} id={`tile-piece-${i}`}>
            <Wood x={x} y={y} width={size * UNIT} height={size * UNIT} />
          </g>
        ))}
        <g id="tile-remainder">
          {PIECES.slice(2).map(({ x, y, size }, i) => (
            <g key={y} id={`tile-piece-${i + 2}`}>
              <Wood x={x} y={y} width={size * UNIT} height={size * UNIT} />
            </g>
          ))}
          <g id="tile-remainder-cover">
            <Wood x={1236} y={260} width={224} height={448} />
          </g>
          <path
            id="tile-cut-2"
            d="M1236 484 H1460"
            fill="none"
            stroke={INK}
            strokeWidth={7}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1}
          />
        </g>
        <g id="tile-cover">
          <Wood x={X} y={Y} width={20 * UNIT} height={8 * UNIT} />
        </g>
        {[788, 1236].map((x, i) => (
          <path
            key={x}
            id={`tile-cut-${i}`}
            d={`M${x} 260 V708`}
            fill="none"
            stroke={INK}
            strokeWidth={7}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1}
          />
        ))}
        <g id="tile-dimensions" opacity={0}>
          <path
            d="M340 207 V185 H1460 V207 M304 260 H283 V708 H304"
            fill="none"
            stroke={INK}
            strokeWidth={4}
          />
          <Text x={900} y={163} size={43} fill={INK}>
            横 20
          </Text>
          <Text x={244} y={502} size={36} fill={INK}>
            8
          </Text>
          <Text x={244} y={454} size={26} fill={INK}>
            縦
          </Text>
        </g>
        <g id="tile-remainder-dimensions" opacity={0}>
          <path
            d="M1276 232 V213 H1500 V232 M1510 260 H1533 V708 H1510"
            fill="none"
            stroke={BLUE}
            strokeWidth={4}
          />
          <Text x={1388} y={200} size={36} fill={BLUE}>
            4
          </Text>
          <Text x={1559} y={480} size={34} fill={BLUE}>
            8
          </Text>
        </g>
        <g id="tile-answer" opacity={0}>
          <rect x={1276} y={498} width={224} height={224} rx={3} fill={VIOLET} />
          <path d="M1509 498 H1540 V722 H1509" fill="none" stroke={VIOLET} strokeWidth={5} />
          <Text x={1564} y={627} size={40} fill={VIOLET}>
            4
          </Text>
        </g>
      </g>
      <g id="tile-pairs-heading" opacity={0}>
        <Text x={960} y={785} size={28} fill={INK}>
          大きいほう・小さいほう
        </Text>
      </g>
      <g id="tile-pair-0" opacity={0}>
        <Tag id="tile-pair-tag-0" x={460} y={838} text="(20, 8)" />
      </g>
      <g id="tile-pair-1" opacity={0}>
        <Text x={705} y={857} size={40} fill={BLUE}>
          →
        </Text>
        <Tag id="tile-pair-tag-1" x={960} y={838} text="(8, 4)" color={BLUE} />
      </g>
      <g id="tile-pair-2" opacity={0}>
        <Text x={1215} y={857} size={40} fill={BLUE}>
          →
        </Text>
        <Tag id="tile-pair-tag-2" x={1460} y={838} text="(4, 0)" />
      </g>
      <Callout id="tile-swap" x={960} y={916} text="一時変数に余りを退避" />
    </Stage>
  );
}
