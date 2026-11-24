import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, CodeCallout, GRAY, LINE, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const NAME = "mori";
const CODE = '"  mori ".trim() → "mori"';
export const formTrimText = `名前${NAME}${CODE}`;

export function FormTrim({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["form-trim"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show } = stageMotion(t);
      rise("#trim-form", at(0));
      show("#trim-value", at(1));
      const clear = at(2, 0.24);
      t.to(".trim-space", { opacity: 0, duration: clear - at(2) }, at(2));
      t.to("#trim-name", { x: -168, duration: at(2, 0.85) - clear, ease: "power2.out" }, clear);
      show("#trim-code", at(3));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="trim-form">
        <rect
          x={370}
          y={228}
          width={1180}
          height={466}
          rx={30}
          fill={LINE}
          fillOpacity={0.25}
          stroke={GRAY}
          strokeWidth={6}
        />
        <Text x={465} y={355} size={52} anchor="start">
          名前
        </Text>
        <rect
          x={462}
          y={403}
          width={996}
          height={184}
          rx={18}
          fill="#fff"
          stroke={BLUE}
          strokeWidth={6}
        />
        <g id="trim-value" opacity={0}>
          {[518, 602, 932].map((x) => (
            <rect
              key={x}
              className="trim-space"
              x={x}
              y={463}
              width={64}
              height={64}
              rx={8}
              fill={LINE}
            />
          ))}
          <Text id="trim-name" x={686} y={529} size={94} anchor="start">
            {NAME}
          </Text>
        </g>
      </g>
      <g style={{ whiteSpace: "pre" }}>
        <CodeCallout id="trim-code" x={960} y={852} text={CODE} />
      </g>
    </Stage>
  );
}
