import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { Callout, GRAY, Head, INK, LINE, Line, Stage, stageMotion, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const CONVERSION = 'String(7) → "7"';
export const numberTagText = `受付数名札文字7"7"${CONVERSION}`;

export function NumberTag({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["number-tag"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, draw, emphasize } = stageMotion(t);
      rise("#number-scene", at(0));
      show("#number-ticket-face", at(1));
      t.fromTo(
        "#number-ticket",
        { y: -88 },
        { y: 0, duration: at(1, 0.85) - at(1), ease: "power2.out" },
        at(1),
      );
      draw("#number-copy .line", at(2), at(2, 0.65) - at(2));
      t.to("#number-copy-head", { opacity: 1, duration: 0.15 }, at(2, 0.55));
      show("#number-writing", at(2, 0.7));
      show("#number-string", at(3));
      emphasize("number-string", at(3, 0.45));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="number-scene">
        <rect
          x={1010}
          y={312}
          width={560}
          height={420}
          rx={36}
          fill="#EEF2FF"
          stroke={VIOLET}
          strokeWidth={8}
        />
        <rect x={1210} y={339} width={160} height={18} rx={9} fill={VIOLET} />
        <Text x={1290} y={436} size={46}>
          名札
        </Text>
        <rect
          x={1070}
          y={471}
          width={440}
          height={200}
          rx={24}
          fill="#fff"
          stroke={LINE}
          strokeWidth={8}
        />
        <Text x={1160} y={582} size={44} fill={GRAY}>
          文字
        </Text>
      </g>
      <g id="number-ticket">
        <g id="number-ticket-face" opacity={0}>
          <rect x={433} y={475} width={230} height={216} rx={22} fill={VIOLET} />
          <Text x={548} y={551} size={44} fill="#fff">
            数
          </Text>
          <Text x={548} y={647} size={85} fill="#fff">
            7
          </Text>
        </g>
      </g>
      <g id="number-machine">
        <rect
          x={335}
          y={242}
          width={426}
          height={194}
          rx={34}
          fill="#F1F5F9"
          stroke={INK}
          strokeWidth={8}
        />
        <Text x={548} y={344} size={58}>
          受付
        </Text>
        <path d="M 412 411 H 684" stroke={GRAY} strokeWidth={16} strokeLinecap="round" />
      </g>
      <Text id="number-writing" x={1362} y={609} size={86} fill={VIOLET} opacity={0}>
        "7"
      </Text>
      <Line id="number-copy" d="M 701 578 H 963" />
      <Head id="number-copy-head" x={969} y={578} angle={0} />
      <Callout id="number-string" x={960} y={853} text={CONVERSION} />
    </Stage>
  );
}
