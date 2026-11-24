import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, CodeCallout, GRAY, LINE, Stage, stageMotion, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const NAMES = ["Hana", "HANA"];
const LOWER = "hana";
const CODE = '"HANA".toLowerCase() → "hana"';
export const nameCaseText = `名簿${NAMES.join("")}${LOWER}=${CODE}`;

export function NameCase({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["name-case"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show } = stageMotion(t);
      rise("#case-roster", at(0));
      show(".case-original", at(1));
      const change = at(2, 0.2);
      t.to(".case-original", { opacity: 0, duration: change - at(2) }, at(2));
      show(".case-lower, #case-equals", change);
      show("#case-code", at(3));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="case-roster">
        <rect
          x={576}
          y={162}
          width={768}
          height={556}
          rx={25}
          fill="#fff"
          stroke={GRAY}
          strokeWidth={6}
        />
        <path
          d="M 615 289 H 1305 M 654 423 H 1266 M 654 619 H 1266"
          stroke={LINE}
          strokeWidth={4}
        />
        <Text x={960} y={248} size={48}>
          名簿
        </Text>
        {NAMES.map((name, index) => {
          const y = 401 + index * 196;
          return (
            <g key={name}>
              <g className="case-original" opacity={0}>
                <Text x={960} y={y} size={81}>
                  {name}
                </Text>
              </g>
              <g className="case-lower" opacity={0}>
                <Text x={960} y={y} size={81} fill={BLUE}>
                  {LOWER}
                </Text>
              </g>
            </g>
          );
        })}
        <Text id="case-equals" x={960} y={504} size={72} fill={VIOLET} opacity={0}>
          =
        </Text>
      </g>
      <CodeCallout id="case-code" x={960} y={852} text={CODE} />
    </Stage>
  );
}
