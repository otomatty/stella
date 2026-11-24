import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, INK, Mark, Stage, stageMotion } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const EXPRESSION = "!Number.isInteger(2.5) → true";
const COLUMNS = [680, 960, 1240];
const ROWS = [480, 668];
export const eggCartonText = EXPRESSION;

export function EggCarton({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["egg-carton"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#egg-carton", at(0));
      COLUMNS.slice(0, 2).forEach((_, i) => {
        const offset = i * 0.85;
        const id = `#egg-whole-${i}`;
        t.fromTo(
          id,
          { y: -217 },
          {
            y: 0,
            duration: at(1, offset + 0.65) - at(1, offset),
            ease: "power2.out",
            immediateRender: false,
          },
          at(1, offset),
        );
        show(id, at(1, offset));
      });
      t.fromTo("#egg-half", { y: -73 }, { y: 0, duration: 0.45, ease: "power2.out" }, at(2));
      show("#egg-half", at(2));
      show("#egg-rejected", at(2, 0.45));
      show("#egg-expression", at(3));
      emphasize("egg-expression", at(3, 0.45));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="egg-carton">
        <rect
          x={537}
          y={366}
          width={846}
          height={413}
          rx={71}
          fill="#B1946E"
          stroke={INK}
          strokeWidth={8}
        />
        <rect
          x={552}
          y={371}
          width={816}
          height={386}
          rx={54}
          fill="#D8C4A1"
          stroke="#8E7556"
          strokeWidth={6}
        />
        {ROWS.flatMap((y) =>
          COLUMNS.map((x) => (
            <g key={`${x}-${y}`}>
              <ellipse
                cx={x}
                cy={y}
                rx={101}
                ry={76}
                fill="#B49B78"
                stroke="#8E7556"
                strokeWidth={6}
              />
              <ellipse cx={x} cy={y + 7} rx={77} ry={52} fill="#A78B66" />
            </g>
          )),
        )}
      </g>
      {COLUMNS.slice(0, 2).map((x, i) => (
        <g key={x} id={`egg-whole-${i}`} opacity={0}>
          <path
            d={`M ${x} 435 C ${x + 30} 435 ${x + 52} 468 ${x + 52} 491 C ${x + 52} 513 ${x + 29} 525 ${x} 525 C ${x - 29} 525 ${x - 52} 513 ${x - 52} 491 C ${x - 52} 468 ${x - 30} 435 ${x} 435 Z`}
            fill="#FFF1D8"
            stroke="#855B3B"
            strokeWidth={6}
          />
          <path
            d={`M ${x - 22} 463 Q ${x - 35} 477 ${x - 35} 493`}
            fill="none"
            stroke="#fff"
            strokeWidth={7}
            strokeLinecap="round"
          />
        </g>
      ))}
      <g id="egg-half" opacity={0}>
        <path
          d="M 1185 255 L 1203 244 L 1221 261 L 1240 243 L 1257 258 L 1277 242 L 1295 255 C 1287 297 1269 312 1240 312 C 1211 312 1193 297 1185 255 Z"
          fill="#FFF1D8"
          stroke="#855B3B"
          strokeWidth={6}
          strokeLinejoin="round"
        />
        <path
          d="M 1206 276 Q 1219 296 1240 296"
          fill="none"
          stroke="#fff"
          strokeWidth={7}
          strokeLinecap="round"
        />
      </g>
      <Mark id="egg-rejected" x={1373} y={276} ok={false} />
      <CodeCallout id="egg-expression" x={960} y={889} text={EXPRESSION} />
    </Stage>
  );
}
