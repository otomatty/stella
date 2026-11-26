import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, BLUE, INK, LINE, Mark, Stage, stageMotion, Tag, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const VIOLET = "#8330C7";
const ROAD = "#C7C7CF";
const VEHICLE_SCALE = 1.6;

export const parkingSlotsText = "車バイク種類の印price: number";

/** 路面の印は、薄い灰色のシルエット。 */
function CarPaint() {
  return (
    <g fill={ROAD}>
      <path d="M-49 12 V-12 L-34-39 H34 L49-12 V12Z" />
      <rect x={-42} y={7} width={14} height={20} rx={5} />
      <rect x={28} y={7} width={14} height={20} rx={5} />
      <path d="M-29-29 H29 L39-12 H-39Z" fill="#fff" />
    </g>
  );
}
function BikePaint() {
  return (
    <g fill={ROAD}>
      <circle cx={-35} cy={12} r={20} />
      <circle cx={35} cy={12} r={20} />
      <path
        d="M-35 12 L-14-9 H10 L28-25 L35 12 M-46-18 H-15 M19-32 H29 L35-20"
        fill="none"
        stroke={ROAD}
        strokeWidth={6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M-29-14 H-12 Q-5-32 12-20 L21-9 L8 10 H-14Z" />
    </g>
  );
}
function Car() {
  return (
    <g transform={`scale(${VEHICLE_SCALE})`}>
      {[-75, 63].flatMap((x) =>
        [-65, 58].map((y) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={14} height={40} rx={5} fill={INK} />
        )),
      )}
      <rect x={-70} y={-110} width={140} height={220} rx={37} fill={BLUE} />
      <path d="M-53-42 Q0-62 53-42 L44-7 H-44Z" fill={LINE} />
      <path d="M-42 69 H42 L51 90 Q0 107-51 90Z" fill={LINE} />
      <rect x={-85} y={-27} width={18} height={16} rx={5} fill={BLUE} />
      <rect x={67} y={-27} width={18} height={16} rx={5} fill={BLUE} />
      <rect x={-49} y={-96} width={24} height={10} rx={5} fill="#fff" />
      <rect x={25} y={-96} width={24} height={10} rx={5} fill="#fff" />
    </g>
  );
}
function Motorcycle() {
  return (
    <g transform={`translate(1618 330) scale(${VEHICLE_SCALE})`}>
      <rect x={-14} y={-112} width={28} height={50} rx={12} fill={INK} />
      <rect x={-17} y={65} width={34} height={51} rx={12} fill={INK} />
      <path d="M-23-68 L-28 60 Q0 90 28 60 L23-68Z" fill={VIOLET} />
      <rect x={-19} y={-8} width={38} height={76} rx={16} fill={INK} />
      <path
        d="M-33-75 H33 M-36-73 L-53-64 M36-73 L53-64"
        fill="none"
        stroke={INK}
        strokeWidth={7}
        strokeLinecap="round"
      />
      <ellipse cx={-48} cy={-85} rx={14} ry={8} fill={LINE} />
      <ellipse cx={48} cy={-85} rx={14} ry={8} fill={LINE} />
      <rect x={-10} y={-92} width={20} height={9} rx={4} fill="#fff" />
    </g>
  );
}

export function ParkingSlots({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["parking-slots"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#parking-lot", at(0));
      show("#parking-car-paint, #parking-car-label", at(1, 0.1));
      show("#parking-bike-paint, #parking-bike-label", at(1, 1.2));
      show("#parking-bike", at(1, 2.2));
      show("#parking-car", at(2));
      const move = (selector: string, vars: gsap.TweenVars, start: number, end: number) =>
        t.to(
          selector,
          { ...vars, duration: at(2, end) - at(2, start), ease: "power2.inOut" },
          at(2, start),
        );
      // 通路からバイク区画の入口まで。車の先端は白線の手前で止める。
      move("#parking-car-travel", { x: -442 }, 0.05, 0.5);
      move("#parking-car-heading", { attr: { transform: "rotate(0)" } }, 0.5, 0.8);
      move("#parking-car-travel", { y: -8 }, 0.8, 0.95);
      show("#parking-rejected", at(2, 0.95), { duration: at(2, 1.1) - at(2, 0.95) });
      t.to("#parking-rejected", { opacity: 0, duration: at(2, 1.5) - at(2, 1.3) }, at(2, 1.3));
      move("#parking-car-travel", { y: 0 }, 1.3, 1.5);
      move("#parking-car-heading", { attr: { transform: "rotate(-90)" } }, 1.5, 1.75);
      move("#parking-car-travel", { x: -1078 }, 1.75, 2.3);
      move("#parking-car-heading", { attr: { transform: "rotate(0)" } }, 2.3, 2.55);
      move("#parking-car-travel", { y: -454 }, 2.55, 3.3);
      show("#parking-accepted", at(2, 3.3), { duration: at(2, 3.48) - at(2, 3.3) });
      show("#parking-meaning", at(3, 0.2));
      show("#parking-type", at(3, 0.8));
      emphasize("parking-type", at(3, 1.3));
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <g id="parking-lot" opacity={0}>
        {/* 回転中の車の四隅も y=960 以内に収める。 */}
        <g transform="translate(77 25) scale(.92)">
          {/* 車一台分と、バイク二台分の区画。 */}
          {[
            { x: 140, w: 704 },
            { x: 920, w: 416 },
            { x: 1410, w: 416 },
          ].map(({ x, w }) => (
            <g key={x}>
              <path
                d={`M${x} 600 V120 H${x + w} V600`}
                fill="none"
                stroke={ROAD}
                strokeWidth={6}
                strokeLinejoin="round"
              />
              <rect x={x + w / 2 - 123} y={140} width={246} height={38} rx={9} fill={ROAD} />
            </g>
          ))}
          <path
            d="M180 784 H297 L260 749 M297 784 L260 819"
            stroke={ROAD}
            strokeWidth={11}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M140 958 H1780" stroke={ROAD} strokeWidth={5} strokeDasharray="60 42" />
          <g id="parking-car-paint" opacity={0}>
            <g transform="translate(492 565) scale(1.6)">
              <CarPaint />
            </g>
          </g>
          <g id="parking-bike-paint" opacity={0}>
            <g transform="translate(1128 565) scale(1.6)">
              <BikePaint />
            </g>
            <g transform="translate(1618 565) scale(1.6)">
              <BikePaint />
            </g>
          </g>
          <Tag id="parking-car-label" x={492} y={80} text="車" color={BLUE} />
          <Tag id="parking-bike-label" x={1373} y={80} text="バイク" />
          <g id="parking-bike" opacity={0}>
            <Motorcycle />
          </g>
          <g id="parking-car" opacity={0}>
            <g transform="translate(1570 784)">
              <g id="parking-car-travel">
                <g id="parking-car-heading" transform="rotate(-90)">
                  <Car />
                </g>
              </g>
            </g>
          </g>
          <Mark id="parking-rejected" x={1128} y={450} ok={false} />
          <Mark id="parking-accepted" x={744} y={350} ok />
          {/* 印は車の下に隠さず入口に残し、最後の札との対応を線で示す。 */}
          <g id="parking-meaning" opacity={0}>
            <path
              d="M374 640 H610 M1010 640 H1246 M610 640 Q800 710 960 690 H1430"
              fill="none"
              stroke={VIOLET}
              strokeWidth={5}
              strokeLinecap="round"
            />
            <Text x={1570} y={704} size={36} fill={VIOLET}>
              種類の印
            </Text>
            <path d="M1570 719 V754" stroke={VIOLET} strokeWidth={5} />
          </g>
          <CodeCallout id="parking-type" x={1570} y={817} text="price: number" />
        </g>
      </g>
    </Stage>
  );
}
