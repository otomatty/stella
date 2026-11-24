import { useCallback, useMemo, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, GRAY, LINE, Stage, stageMotion, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const DATE = "2026-03-15";
const CODE = '"2026-03-15".replaceAll("-", "/")';
export const dateReplaceText = `${DATE}${DATE.replaceAll("-", "/")}${CODE}`;

export function DateReplace({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["date-replace"].seconds), [beats]);
  const time = useCurrentFrame() / useVideoConfig().fps;
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show } = stageMotion(t);
      rise("#date-calendar", at(0));
      show("#date-value", at(1));
      show("#date-code", at(3));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="date-calendar">
        <rect
          x={425}
          y={226}
          width={1070}
          height={454}
          rx={27}
          fill="#fff"
          stroke={GRAY}
          strokeWidth={6}
        />
        <path
          d="M 428 330 V 253 Q 428 229 452 229 H 1468 Q 1492 229 1492 253 V 330 Z"
          fill={VIOLET}
        />
        {[610, 1310].map((x) => (
          <rect
            key={x}
            x={x - 17}
            y={182}
            width={34}
            height={100}
            rx={17}
            fill={LINE}
            stroke={GRAY}
            strokeWidth={5}
          />
        ))}
        <g id="date-value" opacity={0}>
          {DATE.split("-").map((part, index) => (
            <Text key={part} x={[725, 1045, 1273][index]} y={546} size={116}>
              {part}
            </Text>
          ))}
          {[928, 1159].map((x, index) => {
            const replaced = time >= at(2, index * 0.72);
            return (
              <Text key={x} x={x} y={546} size={116} fill={replaced ? VIOLET : GRAY}>
                {replaced ? "/" : "-"}
              </Text>
            );
          })}
        </g>
      </g>
      <CodeCallout id="date-code" x={960} y={852} text={CODE} />
    </Stage>
  );
}
