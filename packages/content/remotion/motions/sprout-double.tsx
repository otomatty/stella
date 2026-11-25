import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, GREEN, INK, Stage, stageMotion, Tag, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const DAYS = ["1日め", "2日め", "3日め"];
const COUNT = "8本";
const EXPRESSION = "2 ** 3 → 8";

/** 8 本が並ぶ最終位置。増える途中も、この並びの中点へ寄せる。 */
const SLOT = [470, 610, 750, 890, 1030, 1170, 1310, 1450];
const MID = {
  one: 960,
  left: 680,
  right: 1240,
  pair: [540, 820, 1100, 1380],
};

const HEIGHT = [208, 184, 200, 172, 196, 214, 180, 204];

export const sproutDoubleText = [...DAYS, COUNT, EXPRESSION].join("");

function SproutGraphic({ height, flip }: { height: number; flip: boolean }) {
  const y = -height;
  return (
    <g transform={flip ? "scale(-1 1)" : undefined}>
      <path d={`M 0 6 V ${y + 26}`} stroke="#2C7A42" strokeWidth={8} strokeLinecap="round" />
      <path
        d={`M 0 ${y + 26} C -16 ${y + 12} -40 ${y - 6} -52 ${y - 36} C -28 ${y - 22} -8 ${y - 2} 0 ${y + 26}`}
        fill="#1B7A3A"
      />
      <path
        d={`M 0 ${y + 24} C 14 ${y + 8} 38 ${y - 12} 54 ${y - 40} C 30 ${y - 22} 10 ${y} 0 ${y + 24}`}
        fill="#49B86C"
      />
      <path
        d={`M 6 ${y + 16} C 18 ${y + 4} 32 ${y - 12} 46 ${y - 30}`}
        fill="none"
        stroke="#1B7A3A"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </g>
  );
}

export function SproutDouble({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["sprout-double"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      const origin = { transformOrigin: "50% 100%" };
      const slide = { duration: 0.8, ease: "power2.inOut" };
      rise("#sprout-pot", at(0));
      t.set("#sprout-0", { x: MID.one, ...origin }, 0);

      show("#sprout-day", at(1));
      t.to("#sprout-day-1", { opacity: 1, duration: 0.3 }, at(1));
      t.to("#sprout-0", { x: MID.left, ...slide }, at(1, 0.45));
      t.fromTo(
        "#sprout-4",
        { x: MID.one, scaleY: 0.12, opacity: 0, ...origin },
        {
          x: MID.right,
          scaleY: 1,
          opacity: 1,
          duration: 0.8,
          ease: "power2.out",
          immediateRender: false,
        },
        at(1, 0.45),
      );

      const toFour = at(2, 0.35);
      t.set("#sprout-day-1", { opacity: 0 }, at(2));
      t.set("#sprout-day-2", { opacity: 1 }, at(2));
      t.to("#sprout-0", { x: MID.pair[0], ...slide }, toFour);
      t.to("#sprout-4", { x: MID.pair[2], ...slide }, toFour);
      t.fromTo(
        "#sprout-2",
        { x: MID.left, scaleY: 0.12, opacity: 0, ...origin },
        {
          x: MID.pair[1],
          scaleY: 1,
          opacity: 1,
          duration: 0.8,
          ease: "power2.out",
          immediateRender: false,
        },
        toFour,
      );
      t.fromTo(
        "#sprout-6",
        { x: MID.right, scaleY: 0.12, opacity: 0, ...origin },
        {
          x: MID.pair[3],
          scaleY: 1,
          opacity: 1,
          duration: 0.8,
          ease: "power2.out",
          immediateRender: false,
        },
        toFour,
      );

      const toEight = at(2, 2.3);
      t.set("#sprout-day-2", { opacity: 0 }, at(2, 2.05));
      t.set("#sprout-day-3", { opacity: 1 }, at(2, 2.05));
      const parents = [0, 2, 4, 6];
      for (let i = 0; i < parents.length; i++) {
        const parent = parents[i] ?? 0;
        const from = MID.pair[i] ?? SLOT[0];
        t.to(`#sprout-${parent}`, { x: SLOT[parent], ...slide }, toEight);
        t.fromTo(
          `#sprout-${parent + 1}`,
          { x: from, scaleY: 0.12, opacity: 0, ...origin },
          {
            x: SLOT[parent + 1],
            scaleY: 1,
            opacity: 1,
            duration: 0.8,
            ease: "power2.out",
            immediateRender: false,
          },
          toEight,
        );
      }

      show("#sprout-count", at(2, 4.05));
      show("#sprout-expression", at(3));
      emphasize("sprout-expression", at(3, 0.45));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="sprout-pot">
        <ellipse cx={960} cy={848} rx={520} ry={16} fill={INK} opacity={0.06} />
        <path
          d="M 360 618 L 458 808 Q 478 836 516 836 H 1404 Q 1442 836 1462 808 L 1560 618 Z"
          fill="#C4785A"
        />
        <path d="M 410 650 L 492 792 Q 530 778 548 720 L 486 648 Z" fill="#E2A88E" opacity={0.7} />
        <path
          d="M 470 800 H 1450 Q 1430 828 1400 828 H 520 Q 490 828 470 800 Z"
          fill="#A15A42"
          opacity={0.35}
        />
        <ellipse cx={960} cy={600} rx={650} ry={52} fill="#D08A72" />
        <ellipse cx={960} cy={600} rx={650} ry={52} fill="none" stroke="#8E4E3C" strokeWidth={8} />
        <ellipse cx={960} cy={606} rx={548} ry={34} fill="#5C3A28" />
        <ellipse cx={520} cy={612} rx={16} ry={7} fill="#3E261C" />
        <ellipse cx={690} cy={622} rx={12} ry={6} fill="#6E4A34" />
        <ellipse cx={860} cy={600} rx={14} ry={6} fill="#3E261C" />
        <ellipse cx={1080} cy={624} rx={18} ry={7} fill="#6E4A34" />
        <ellipse cx={1280} cy={608} rx={12} ry={5} fill="#3E261C" />
        <ellipse cx={1420} cy={618} rx={15} ry={6} fill="#6E4A34" />
        <g transform="translate(0 598)">
          {HEIGHT.map((height, index) => (
            <g key={SLOT[index]} id={`sprout-${index}`} opacity={index === 0 ? 1 : 0}>
              <SproutGraphic height={height} flip={index % 2 === 1} />
            </g>
          ))}
        </g>
      </g>
      <g id="sprout-day" opacity={0}>
        <rect
          x={300}
          y={128}
          width={200}
          height={156}
          rx={12}
          fill="#F6E7D4"
          stroke="#C4A574"
          strokeWidth={3}
        />
        <rect x={300} y={128} width={200} height={40} rx={12} fill="#C45C4A" />
        <rect x={300} y={152} width={200} height={16} fill="#C45C4A" />
        <circle cx={344} cy={148} r={7} fill="#F6E7D4" />
        <circle cx={456} cy={148} r={7} fill="#F6E7D4" />
        <Text id="sprout-day-1" x={400} y={232} size={40} fill={GREEN} opacity={0}>
          1日め
        </Text>
        <Text id="sprout-day-2" x={400} y={232} size={40} fill={GREEN} opacity={0}>
          2日め
        </Text>
        <Text id="sprout-day-3" x={400} y={232} size={40} fill={GREEN} opacity={0}>
          3日め
        </Text>
      </g>
      <Tag id="sprout-count" x={1700} y={460} text={COUNT} />
      <CodeCallout id="sprout-expression" x={960} y={900} text={EXPRESSION} />
    </Stage>
  );
}
