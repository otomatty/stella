import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Callout, INK, LINE, PINK, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const INCLUDES = '.includes("卵") → true';
const INGREDIENTS = ["小麦", "卵", "砂糖"];

export const allergyLabelText = `焼き菓子原材料${INGREDIENTS.join("")}${INCLUDES}`;

export function AllergyLabel({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["allergy-label"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#allergy-box", at(0));
      t.to("#allergy-panel", { stroke: BLUE, duration: 0.3 }, at(1));
      show("#allergy-glass-face", at(2));
      t.to(
        "#allergy-glass",
        { x: 277, duration: at(2, 1.35) - at(2), ease: "power2.inOut" },
        at(2),
      );
      t.to("#allergy-ring", { stroke: PINK, duration: 0.25 }, at(2, 1.35));
      t.to("#allergy-egg", { fill: PINK, duration: 0.25 }, at(2, 1.35));
      show("#allergy-includes", at(3));
      emphasize("allergy-includes", at(3, 0.45));
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <g id="allergy-box">
        <path
          d="M 409 218 L 525 161 H 1506 L 1577 218 L 1506 258 H 525 Z"
          fill="#FCF3E4"
          stroke="#9A683B"
          strokeWidth={8}
          strokeLinejoin="round"
        />
        <rect
          x={409}
          y={218}
          width={1168}
          height={541}
          rx={17}
          fill="#F2D4AE"
          stroke="#9A683B"
          strokeWidth={8}
        />
        <Text x={993} y={331} size={69} fill="#78472E">
          焼き菓子
        </Text>
        <rect
          id="allergy-panel"
          x={532}
          y={386}
          width={922}
          height={324}
          rx={25}
          fill="#fff"
          stroke={LINE}
          strokeWidth={7}
        />
        <Text x={993} y={468} size={48}>
          原材料
        </Text>
        {INGREDIENTS.map((ingredient, i) => (
          <Text
            key={ingredient}
            id={i === 1 ? "allergy-egg" : undefined}
            x={716 + i * 277}
            y={581}
            size={61}
          >
            {ingredient}
          </Text>
        ))}
      </g>
      <g id="allergy-glass">
        <g id="allergy-glass-face" opacity={0}>
          <path d="M 772 605 L 835 669" stroke={INK} strokeWidth={24} strokeLinecap="round" />
          <circle
            cx={716}
            cy={557}
            r={84}
            fill="none"
            id="allergy-ring"
            stroke={BLUE}
            strokeWidth={12}
          />
        </g>
      </g>
      <Callout id="allergy-includes" x={993} y={866} text={INCLUDES} />
    </Stage>
  );
}
