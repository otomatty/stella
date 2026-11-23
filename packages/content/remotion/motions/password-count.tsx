import { useCallback, useMemo, useRef } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Callout, GRAY, INK, LINE, Mark, Stage, stageMotion, Tag, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const MIN_LENGTH = 8;
const KEY_INTERVAL = 0.37;
const LABEL = "パスワード";
const REQUIREMENT = `${MIN_LENGTH}文字以上`;
const LENGTH = ".length";
const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const passwordCountText = `${LABEL}文字数012345678${REQUIREMENT}${LENGTH}`;

export function PasswordCount({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["password-count"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  const complete = at(2, MIN_LENGTH * KEY_INTERVAL);
  const count = Math.floor(interpolate(time, [at(2), complete], [0, MIN_LENGTH], CLAMP));

  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#password-field", at(0));
      show("#password-minimum, #password-reading", at(1));
      show("#password-ok", complete);
      show("#password-length", at(3));
      emphasize("password-length", at(3, 0.4));
    },
    [at, complete],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="password-field">
        <Text x={447} y={323} size={47} anchor="start">
          {LABEL}
        </Text>
        <rect
          x={440}
          y={370}
          width={1040}
          height={198}
          rx={33}
          fill="#fff"
          stroke={BLUE}
          strokeWidth={8}
        />
        <path
          d="M 518 454 V 436 A 23 23 0 0 1 564 436 V 454"
          fill="none"
          stroke={GRAY}
          strokeWidth={8}
        />
        <rect x={502} y={450} width={78} height={62} rx={13} fill={GRAY} />
        <circle cx={541} cy={478} r={7} fill="#fff" />
        <path d="M 624 408 V 530" stroke={LINE} strokeWidth={5} />
      </g>
      {Array.from({ length: MIN_LENGTH }, (_, index) => {
        const offset = (index + 1) * KEY_INTERVAL;
        const progress = interpolate(time, [at(2, offset), at(2, offset + 0.14)], [0, 1], CLAMP);
        return (
          <circle
            key={offset}
            r={26}
            transform={`translate(${696 + index * 100} 469) scale(${0.94 + 0.06 * progress})`}
            fill={INK}
            opacity={progress}
          />
        );
      })}
      <g id="password-reading" opacity={0}>
        <Text x={458} y={687} size={45} anchor="start">
          文字数
        </Text>
        <Text x={655} y={690} size={73} fill={BLUE}>
          {count}
        </Text>
      </g>
      <Tag id="password-minimum" x={1248} y={666} text={REQUIREMENT} />
      <Mark id="password-ok" x={1420} y={666} ok />
      <Callout id="password-length" x={960} y={839} text={LENGTH} />
    </Stage>
  );
}
