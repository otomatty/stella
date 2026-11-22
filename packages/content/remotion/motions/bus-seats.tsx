import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import {
  BLUE,
  Callout,
  GRAY,
  Head,
  Line,
  PINK,
  Stage,
  stageMotion,
  Tag,
  Text,
  VIOLET,
} from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const busSeatsText = "人乗り残り台切り上げ定員0123456789.";

const BUS_X = 640;
const BUS_Y = [150, 400, 650];
const person = (i: number) => ({ x: 150 + (i % 9) * 38, y: 380 + Math.floor(i / 9) * 44 });

/** バス 1 台 (横から見た形)。 */
function Bus({ i }: { i: number }) {
  const y = BUS_Y[i];
  return (
    <g id={`bus-${i}`} opacity={i === 2 ? 0 : 1}>
      <rect x={BUS_X} y={y} width={440} height={150} rx={26} fill={BLUE} />
      <rect x={BUS_X} y={y + 96} width={440} height={54} rx={20} fill="#1D4ED8" />
      {[0, 1, 2, 3].map((w) => (
        <rect
          key={w}
          x={BUS_X + 26 + w * 96}
          y={y + 22}
          width={78}
          height={58}
          rx={10}
          fill="#DBEAFE"
        />
      ))}
      <rect x={BUS_X + 404} y={y + 22} width={22} height={90} rx={8} fill="#DBEAFE" />
      <circle cx={BUS_X + 100} cy={y + 152} r={30} fill="#0F172A" />
      <circle cx={BUS_X + 100} cy={y + 152} r={12} fill="#94A3B8" />
      <circle cx={BUS_X + 340} cy={y + 152} r={30} fill="#0F172A" />
      <circle cx={BUS_X + 340} cy={y + 152} r={12} fill="#94A3B8" />
    </g>
  );
}

/** 遠足のバス: 2 台に乗れない 5 人のために、もう 1 台を用意する。 */
export function BusSeats({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["bus-seats"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { show, draw, emphasize } = stageMotion(t);

      // 1 文め: 人とバスが出てくる
      t.fromTo(
        "#people, #bus-0, #bus-1",
        { opacity: 0, y: 26 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.1 },
        at(0, -0.5),
      );

      // 2 文め: 45 人と、20 人乗り
      show("#tag-all", at(1, 0.2));
      show("#cap-0", at(1, 1.0));
      show("#cap-1", at(1, 1.2));

      // 3 文め: 2 台に 40 人が乗り、5 人が残る
      for (let i = 0; i < 40; i++) {
        const bus = Math.floor(i / 20);
        t.to(
          `#p-${i}`,
          {
            x: BUS_X + 70 + (i % 10) * 32,
            y: BUS_Y[bus] + 52,
            opacity: 0,
            duration: 0.5,
            ease: "power2.in",
          },
          at(2, 0.2 + bus * 1.0 + (i % 20) * 0.03),
        );
      }
      show("#in-0", at(2, 1.0));
      show("#in-1", at(2, 2.0));
      t.to("#tag-all", { opacity: 0, duration: 0.3 }, at(2, 2.0));
      t.to(".rest", { fill: PINK, duration: 0.3 }, at(2, 2.4));
      show("#tag-rest", at(2, 2.6));

      // 4 文め: もう 1 台を用意して、残りの 5 人が乗る
      t.fromTo(
        "#bus-2",
        { opacity: 0, x: 160 },
        { opacity: 1, x: 0, immediateRender: false, duration: 0.7, ease: "power3.out" },
        at(3, 0.2),
      );
      for (let i = 40; i < 45; i++)
        t.to(
          `#p-${i}`,
          {
            x: BUS_X + 70 + (i % 10) * 32,
            y: BUS_Y[2] + 52,
            opacity: 0,
            duration: 0.6,
            ease: "power2.in",
          },
          at(3, 1.1 + (i - 40) * 0.06),
        );
      t.to("#tag-rest", { opacity: 0, duration: 0.3 }, at(3, 1.1));
      show("#in-2", at(3, 1.9));

      // 5 文め: 2.25 台ぶんを、3 台と数える
      show("#raw", at(4, 0.1));
      draw("#up .line", at(4, 0.6), 0.5);
      t.to("#up-head", { opacity: 1, duration: 0.15 }, at(4, 1.0));
      show("#ceil", at(4, 1.1));
      show("#call", at(4, 1.5));
      emphasize("call", at(4, 2.0));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="people">
        {Array.from({ length: 45 }, (_, i) => ({ id: `p-${i}`, i })).map(({ id, i }) => (
          <circle
            key={id}
            id={id}
            className={i >= 40 ? "rest" : undefined}
            cx={0}
            cy={0}
            r={15}
            fill={VIOLET}
            transform={`translate(${person(i).x} ${person(i).y})`}
          />
        ))}
      </g>
      <Tag id="tag-all" x={302} y={310} text="45人" chars={3} />
      <Tag id="tag-rest" x={302} y={640} text="残り5人" chars={4} color={PINK} />

      {[0, 1, 2].map((i) => (
        <Bus key={i} i={i} />
      ))}
      {[0, 1].map((i) => (
        <g key={i} id={`cap-${i}`} opacity={0}>
          <Text x={BUS_X + 220} y={BUS_Y[i] + 136} size={34} fill="#fff">
            20人乗り
          </Text>
        </g>
      ))}
      <Tag id="in-0" x={BUS_X + 560} y={BUS_Y[0] + 75} text="20人" chars={3} />
      <Tag id="in-1" x={BUS_X + 560} y={BUS_Y[1] + 75} text="20人" chars={3} />
      <Tag id="in-2" x={BUS_X + 560} y={BUS_Y[2] + 75} text="5人" chars={2.4} color={PINK} />

      {/* 台数で表すと */}
      <g id="raw" opacity={0}>
        <Text x={1620} y={640} size={96} fill={GRAY}>
          2.25台
        </Text>
      </g>
      <Line id="up" d="M 1620 530 L 1620 420" />
      <Head id="up-head" x={1620} y={396} angle={-90} />
      <g id="ceil" opacity={0}>
        <Text x={1620} y={350} size={120}>
          3台
        </Text>
      </g>
      <Callout id="call" x={1620} y={170} text="切り上げ" />
    </Stage>
  );
}
