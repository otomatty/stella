import { useCallback, useMemo, useRef } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { Callout, INK, PINK, Stage, stageMotion, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const piggyBankText = "貯金0123円+= 100";

export function PiggyBank({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["piggy-bank"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const deposits = [at(1, 0.95), at(1, 2.35), at(2, 0.95)];
  const total =
    100 *
    Math.floor(
      interpolate(frame / fps, [at(1), ...deposits], [0, 1, 2, 3], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    );
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#savings", at(0));
      const coins = [
        [at(1), at(1, 0.95)],
        [at(1, 1.4), at(1, 2.35)],
        [at(2), at(2, 0.95)],
      ];
      coins.forEach(([start, end], i) => {
        const id = `#coin-${i}`;
        const span = end - start;
        show(`${id} .coin-face`, start, { duration: span * 0.3 });
        t.to(id, { y: 171, duration: span, ease: "power1.in" }, start);
        t.to(`${id} .coin-face`, { opacity: 0, duration: span * 0.2 }, end - span * 0.2);
      });
      show("#add-amount", at(3));
      emphasize("add-amount", at(3, 0.45));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="savings">
        <rect x={680} y={80} width={560} height={132} rx={26} fill={VIOLET} />
        <Text x={960} y={175} size={74} fill="#fff">
          貯金 {total} 円
        </Text>
        <path
          d="M 630 644 c -118 10 -140 -88 -76 -105 c 51 -14 64 52 15 58"
          fill="none"
          stroke={PINK}
          strokeWidth={15}
          strokeLinecap="round"
        />
        <rect
          x={739}
          y={691}
          width={114}
          height={163}
          rx={28}
          fill="#F9A8D4"
          stroke={PINK}
          strokeWidth={8}
        />
        <rect
          x={1090}
          y={691}
          width={114}
          height={163}
          rx={28}
          fill="#F9A8D4"
          stroke={PINK}
          strokeWidth={8}
        />
        <ellipse cx={944} cy={644} rx={323} ry={155} fill="#FBCFE8" stroke={PINK} strokeWidth={8} />
        <path
          d="M 1094 513 L 1092 434 Q 1175 441 1213 515 Q 1264 539 1279 601 H 1310 Q 1348 601 1348 637 V 671 Q 1348 707 1310 707 H 1238 Q 1190 776 1090 770"
          fill="#FBCFE8"
          stroke={PINK}
          strokeWidth={8}
          strokeLinejoin="round"
        />
        <circle cx={1219} cy={592} r={12} fill={INK} />
        <circle cx={1309} cy={651} r={8} fill={PINK} />
        <path d="M 872 501 H 1048" stroke={INK} strokeWidth={14} strokeLinecap="round" />
      </g>
      {[0, 1, 2].map((i) => (
        <g key={i} id={`coin-${i}`}>
          <g className="coin-face" opacity={0}>
            <circle cx={960} cy={294} r={52} fill="#E2E8F0" stroke="#64748B" strokeWidth={6} />
            <Text x={960} y={309} size={41}>
              100
            </Text>
          </g>
        </g>
      ))}
      <Callout id="add-amount" x={1490} y={388} text="+= 100" />
    </Stage>
  );
}
