import { useCallback, useMemo, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, BLUE, INK, LINE, Stage, stageMotion, Tag, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const digitBlocksText =
  "1230なし残った列 = 切り捨て外した1個 = 余りn % 10; Math.floor(n / 10)";
const DIGITS = [1, 2, 3];
const COLORS = [BLUE, "#8330C7", LINE];
const SIDES = ["#1D4ED8", "#6B21A8", "#C7C7CF"];
const moveStart = (order: number) => 0.2 + order * 1.4;
const moveEnd = (order: number) => moveStart(order) + 1.14;

function WoodBlock({ digit, miniature = false }: { digit: number; miniature?: boolean }) {
  return (
    <g>
      <path d="M0 0 L48-56 H218 V144 L170 200 V0Z" fill={SIDES[digit - 1]} />
      <rect width={170} height={200} rx={12} fill={COLORS[digit - 1]} />
      <g id={miniature ? undefined : "digit-ink-" + digit} opacity={miniature ? 1 : 0}>
        <Text x={85} y={148} size={139} fill={digit === 3 ? INK : "#fff"}>
          {digit}
        </Text>
      </g>
    </g>
  );
}

export function DigitBlocks({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["digit-blocks"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const time = useCurrentFrame() / useVideoConfig().fps;
  const moved = DIGITS.filter((_, order) => time >= at(2, moveEnd(order))).length;
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#block-worktop, #wooden-row, #tray-front", at(0));
      DIGITS.forEach((digit, i) => {
        show(`#digit-ink-${digit}`, at(1, 0.2 + i * 0.55));
      });
      show("#block-history-0", at(2));
      [3, 2, 1].forEach((digit, order) => {
        const id = `#wood-${digit}`;
        const start = moveStart(order);
        const lift = at(2, start + 0.3);
        const overTray = at(2, start + 0.78);
        t.to(id, { y: 260, duration: lift - at(2, start), ease: "power1.inOut" }, at(2, start));
        t.to(id, { x: 1090 + order * 230, duration: overTray - lift, ease: "power1.inOut" }, lift);
        t.to(
          id,
          { y: 530, duration: at(2, moveEnd(order)) - overTray, ease: "power1.inOut" },
          overTray,
        );
        t.to(`#block-shadow-${digit}`, { opacity: 0, duration: lift - at(2, start) }, at(2, start));
        show(`#tray-shadow-${digit}`, overTray, {
          duration: at(2, moveEnd(order)) - overTray,
          opacity: 0.06,
        });
        show(`#block-history-${order + 1}`, at(2, moveEnd(order)));
      });
      // 最後の取り出しを指す。右の 1 が余り、左に桁が残らなければ商は 0。
      show("#floor-heading, #remainder-heading, #empty-row, #last-extraction", at(3, 0.2));
      show("#digits-code", at(3, 1.7));
      emphasize("digits-code", at(3, 2.2));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="block-worktop">
        <rect x={150} y={674} width={780} height={24} rx={12} fill={LINE} />
        {[3, 2, 1].map((digit, order) => (
          <ellipse
            key={digit}
            id={`tray-shadow-${digit}`}
            cx={1190 + order * 230}
            cy={728}
            rx={110}
            ry={18}
            fill={INK}
            opacity={0}
          />
        ))}
        {DIGITS.map((digit) => (
          <ellipse
            key={digit}
            id={`block-shadow-${digit}`}
            cx={280 + (digit - 1) * 240}
            cy={673}
            rx={115}
            ry={18}
            fill={INK}
            opacity={0.06}
          />
        ))}
      </g>
      {/* 外した位置の輪郭と、板の上の小さな列を最後まで残す。 */}
      {DIGITS.map((digit) => (
        <g
          key={`trace-${digit}`}
          transform={`translate(${180 + (digit - 1) * 240} 470)`}
          opacity={digit > 3 - moved ? 1 : 0}
          fill="#F1F1F4"
        >
          <rect width={170} height={200} rx={12} />
          <path d="M0 0 L48-56 H218 V144 L170 200 V0Z" />
        </g>
      ))}
      {[0, 1, 2, 3].map((step) => (
        <g key={step} id={`block-history-${step}`} opacity={0}>
          {step > 0 ? (
            <path
              d={`M ${170 + step * 200} 718 h 24 l -7 -6 m 7 6 l -7 6`}
              fill="none"
              stroke={LINE}
              strokeWidth={3}
              strokeLinecap="round"
            />
          ) : null}
          {DIGITS.map((digit) => (
            <g
              key={digit}
              transform={`translate(${210 + step * 200 + (digit - 1) * 45} 701) scale(.18)`}
            >
              {digit <= 3 - step ? (
                <WoodBlock digit={digit} miniature />
              ) : (
                <g fill="#F1F1F4">
                  <rect width={170} height={200} rx={12} />
                  <path d="M0 0 L48-56 H218 V144 L170 200 V0Z" />
                </g>
              )}
            </g>
          ))}
          {step === 3 ? (
            <Text x={875} y={757} size={21} fill={BLUE}>
              なし
            </Text>
          ) : null}
        </g>
      ))}
      <g id="wooden-row">
        {DIGITS.map((digit) => (
          <g
            key={digit}
            id={`wood-${digit}`}
            transform={`translate(${180 + (digit - 1) * 240} 470)`}
          >
            <WoodBlock digit={digit} />
          </g>
        ))}
      </g>
      <g id="tray-front">
        <rect x={1030} y={735} width={761} height={38} rx={12} fill={BLUE} />
      </g>
      <Tag id="floor-heading" x={502} y={210} text="残った列 = 切り捨て" color={BLUE} />
      <Tag id="remainder-heading" x={1438} y={210} text="外した1個 = 余り" color="#8330C7" />
      <g id="last-extraction" opacity={0}>
        <path
          d="M 505 259 V 371 M 1438 259 V 315 H 1635 V 431"
          fill="none"
          stroke={LINE}
          strokeWidth={5}
          strokeLinecap="round"
        />
        <path
          d="M 1623 415 L 1635 433 L 1647 415"
          fill="none"
          stroke="#8330C7"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <g id="empty-row" opacity={0}>
        <path
          d="M 230 689 H 817 M 230 679 V 689 M 817 679 V 689"
          fill="none"
          stroke={BLUE}
          strokeWidth={4}
        />
      </g>
      <CodeCallout id="digits-code" x={960} y={901} text="n % 10; Math.floor(n / 10)" />
    </Stage>
  );
}
