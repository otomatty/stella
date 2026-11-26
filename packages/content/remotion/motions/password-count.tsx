import { useCallback, useMemo, useRef } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, BLUE, INK, LINE, Mark, PINK, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const VIOLET = "#8330C7";

const MIN_LENGTH = 8;
const KEY_INTERVAL = 0.43;
const KEYS = Array.from({ length: 36 }, (_, index) => ({
  id: `password-key-${index}`,
  row: Math.floor(index / 12),
  col: index % 12,
}));
const PRESSED_KEYS = [13, 4, 18, 9, 26, 16, 7, 21];
const LABEL = "パスワード";
const REQUIREMENT = "8文字以上";
const LENGTH = ".length";
const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const passwordCountText = `ログイン${LABEL}文字数012345678${REQUIREMENT}${LENGTH}`;

export function PasswordCount({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["password-count"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const time = useCurrentFrame() / useVideoConfig().fps;
  const hits = PRESSED_KEYS.map((_, i) => at(2, 0.45 + i * KEY_INTERVAL));
  const count = hits.filter((hit) => time >= hit).length;
  const lastOffset = 0.45 + (count - 1) * KEY_INTERVAL;
  const roll =
    count === 0
      ? 1
      : interpolate(time, [at(2, lastOffset), at(2, lastOffset + 0.18)], [0, 1], CLAMP);
  const complete = at(2, 0.45 + (MIN_LENGTH - 1) * KEY_INTERVAL + 0.18);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#password-laptop", at(0));
      show("#password-minimum", at(1, 0.2));
      show("#password-reading", at(2), { duration: at(2, 0.3) - at(2) });
      PRESSED_KEYS.forEach((key, i) => {
        const hit = 0.45 + i * KEY_INTERVAL;
        t.to(
          `#password-key-${key}`,
          { y: 7, duration: at(2, hit) - at(2, hit - 0.1), ease: "power1.in" },
          at(2, hit - 0.1),
        );
        t.to(
          `#password-key-${key}`,
          { y: 0, duration: at(2, hit + 0.17) - at(2, hit), ease: "power1.out" },
          at(2, hit),
        );
      });
      show("#password-ok", complete);
      show("#password-counter-focus", at(3));
      show("#password-length", at(3, 0.35));
      emphasize("password-length", at(3, 1.05));
    },
    [at, complete],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <defs>
        <clipPath id="password-digits">
          <rect x={1001} y={492} width={110} height={100} rx={9} />
        </clipPath>
      </defs>
      <g id="password-laptop" opacity={0}>
        <rect x={310} y={104} width={1300} height={552} rx={32} fill={LINE} />
        <rect x={337} y={142} width={1246} height={487} rx={18} fill={BLUE} />
        <circle cx={960} cy={123} r={5} fill={INK} />
        <Text x={960} y={217} size={39} fill="#fff">
          ログイン
        </Text>
        <Text x={559} y={273} size={30} fill="#fff" anchor="start">
          {LABEL}
        </Text>
        <rect x={550} y={289} width={860} height={96} rx={17} fill="#fff" />
        {/* 錠前は単色の輪と角丸の本体。 */}
        <path
          d="M421 326 V299 A41 41 0 0 1 503 299 V326 H489 V299 A27 27 0 0 0 435 299 V326Z"
          fill={LINE}
        />
        <rect x={414} y={318} width={96} height={80} rx={17} fill={LINE} />
        <circle cx={462} cy={350} r={10} fill={INK} />
        <rect x={457} y={350} width={10} height={29} rx={5} fill={INK} />
        {hits.map((hit, i) => {
          const progress = interpolate(time, [hit, at(2, 0.57 + i * KEY_INTERVAL)], [0, 1], CLAMP);
          return (
            <circle
              key={PRESSED_KEYS[i]}
              r={19}
              transform={`translate(${612 + i * 99} 337) scale(${0.94 + 0.06 * progress})`}
              fill={INK}
              opacity={progress}
            />
          );
        })}
        <g id="password-minimum" opacity={0}>
          <path
            d="M580 409 L590 419 L580 429"
            fill="none"
            stroke="#fff"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Text x={612} y={434} size={34} fill="#fff" anchor="start">
            {REQUIREMENT}
          </Text>
        </g>
        <Mark id="password-ok" x={873} y={421} ok />
        {/* 数字が縦に送られるカウンター。 */}
        <g id="password-reading" opacity={0}>
          <rect x={684} y={470} width={464} height={138} rx={19} fill={LINE} />
          <Text x={832} y={556} size={42} fill={INK}>
            文字数
          </Text>
          <rect x={983} y={482} width={140} height={116} rx={13} fill={VIOLET} />
          <rect x={1001} y={492} width={110} height={100} rx={9} fill="#fff" />
          <g clipPath="url(#password-digits)">
            <g transform={`translate(0 ${-100 * roll})`}>
              <Text x={1056} y={574} size={86} fill={INK}>
                {Math.max(0, count - 1)}
              </Text>
              <Text x={1056} y={674} size={86} fill={INK}>
                {count}
              </Text>
            </g>
          </g>
        </g>
        <rect
          id="password-counter-focus"
          x={684}
          y={615}
          width={464}
          height={8}
          rx={4}
          fill={PINK}
          opacity={0}
        />
        {/* 本体とキーはつやや側面を持たない単色の形。 */}
        <path d="M310 655 H1610 L1730 838 Q1738 854 1693 854 H227 Q182 854 190 838Z" fill={LINE} />
        <rect x={756} y={796} width={408} height={44} rx={12} fill="#C7C7CF" />
        {KEYS.map(({ id, row, col }) => {
          const x = 396 + col * 94 + row * 7;
          const y = 672 + row * 37;
          return <rect key={id} id={id} x={x} y={y} width={80} height={29} rx={7} fill={VIOLET} />;
        })}
      </g>
      <CodeCallout id="password-length" x={960} y={910} text={LENGTH} />
    </Stage>
  );
}
