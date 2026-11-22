import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Callout, INK, LINE, Stage, stageMotion, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const PAD_START = '.padStart(2, "0")';
export const digitalClockText = `1:501:05${PAD_START}`;

export function DigitalClock({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["digital-clock"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#clock-body", at(0));
      show("#clock-reading", at(1));
      const travel = at(2, 0.68) - at(2);
      t.to("#clock-digits", { x: 56, duration: travel, ease: "power2.out" }, at(2));
      t.fromTo(
        "#clock-hour-zero",
        { x: -100 },
        { x: 0, duration: travel, ease: "power2.out" },
        at(2),
      );
      t.fromTo(
        "#clock-minute-zero",
        { x: -25 },
        { x: 0, duration: travel, ease: "power2.out" },
        at(2),
      );
      show("#clock-hour-zero .zero, #clock-minute-zero .zero", at(2), { duration: travel });
      t.to("#clock-zeroes", { fill: VIOLET, duration: 0.3 }, at(2, 0.7));
      show("#clock-pad", at(3));
      emphasize("clock-pad", at(3, 0.45));
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <g id="clock-body">
        <rect
          x={486}
          y={247}
          width={948}
          height={468}
          rx={65}
          fill="#F1F5F9"
          stroke={INK}
          strokeWidth={10}
        />
        <rect
          x={550}
          y={318}
          width={820}
          height={284}
          rx={36}
          fill="#EFF6FF"
          stroke={BLUE}
          strokeWidth={8}
        />
        <path d="M 922 659 H 998" stroke={LINE} strokeWidth={18} strokeLinecap="round" />
        <path
          d="M 578 738 H 695 M 1225 738 H 1342"
          stroke={INK}
          strokeWidth={24}
          strokeLinecap="round"
        />
      </g>
      <g id="clock-reading" opacity={0}>
        <g id="clock-digits">
          <Text x={792} y={530} size={193}>
            1
          </Text>
          <Text x={1140} y={530} size={193}>
            5
          </Text>
        </g>
        <Text x={960} y={517} size={143}>
          :
        </Text>
      </g>
      <g id="clock-zeroes" fill={BLUE}>
        <g id="clock-hour-zero">
          <g className="zero" opacity={0}>
            <Text x={722} y={530} size={193} fill="inherit">
              0
            </Text>
          </g>
        </g>
        <g id="clock-minute-zero">
          <g className="zero" opacity={0}>
            <Text x={1070} y={530} size={193} fill="inherit">
              0
            </Text>
          </g>
        </g>
      </g>
      <Callout id="clock-pad" x={960} y={866} text={PAD_START} />
    </Stage>
  );
}
