import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Callout, INK, LINE, Mark, Stage, stageMotion, Tag } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const BAYS = [
  { x: 520, label: "車" },
  { x: 950, label: "バイク" },
];
const TYPE = "price: number";
export const parkingSlotsText = `${BAYS.map(({ label }) => label).join("")}${TYPE}`;

export function ParkingSlots({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["parking-slots"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show } = stageMotion(t);
      rise("#parking-lot", at(0));
      t.set("#parking-heading", { svgOrigin: "1300 774", rotation: -90 }, at(0));
      show("#parking-label-0, #parking-label-1", at(1));
      show("#parking-car", at(1, 0.5), { x: -350, duration: at(1, 1.5) - at(1, 0.5) });

      const drive = (position: { x: number } | { y: number }, start: number, end: number) =>
        t.to(
          "#parking-car",
          { ...position, duration: at(2, end) - at(2, start), ease: "power2.inOut" },
          at(2, start),
        );
      const turn = (rotation: number, start: number, end: number) =>
        t.to(
          "#parking-heading",
          { rotation, duration: at(2, end) - at(2, start), ease: "power2.inOut" },
          at(2, start),
        );
      turn(0, 0, 0.3);
      drive({ y: -165 }, 0.22, 0.74);
      show("#parking-rejected", at(2, 0.74), { duration: at(2, 1.04) - at(2, 0.74) });
      t.to("#parking-rejected", { opacity: 0, duration: at(2, 1.38) - at(2, 1.18) }, at(2, 1.18));
      drive({ y: 0 }, 1.18, 1.75);
      turn(-90, 1.65, 1.96);
      drive({ x: -780 }, 1.78, 2.44);
      turn(0, 2.27, 2.6);
      drive({ y: -275 }, 2.52, 3.29);
      show("#parking-type", at(3));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="parking-lot">
        <rect x={294} y={209} width={1328} height={695} rx={52} fill="#F1F5F9" />
        {BAYS.map(({ x, label }, index) => (
          <g key={label}>
            <path
              d={`M ${x - 165} 636 V 266 H ${x + 165} V 636`}
              fill="#fff"
              stroke={LINE}
              strokeWidth={10}
              strokeLinejoin="round"
            />
            <Tag id={`parking-label-${index}`} x={x} y={332} text={label} />
          </g>
        ))}
        <path d="M 341 880 H 1575" stroke={LINE} strokeWidth={8} strokeDasharray="40 27" />
      </g>
      <g id="parking-car" opacity={0}>
        <g id="parking-heading">
          <rect x={1246} y={696} width={108} height={156} rx={28} fill={BLUE} />
          <path
            d="M1262 734 Q1300 717 1338 734 L1332 753 H1268 Z M1268 801 H1332 L1338 820 Q1300 831 1262 820 Z"
            fill={INK}
          />
          <path
            d="M1265 710 H1276 M1324 710 H1335"
            stroke="#fff"
            strokeWidth={6}
            strokeLinecap="round"
          />
        </g>
      </g>
      <Mark id="parking-rejected" x={950} y={452} ok={false} />
      <Callout id="parking-type" x={1480} y={332} text={TYPE} />
    </Stage>
  );
}
