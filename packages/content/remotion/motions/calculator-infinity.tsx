import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Callout, CodeCallout, INK, Mark, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const KEYS = [
  "7",
  "8",
  "9",
  "÷",
  "4",
  "5",
  "6",
  "×",
  "1",
  "2",
  "3",
  "−",
  "0",
  ".",
  "=",
  "+",
] as const;
const DISPLAYS = ["0", "1", "1 ÷", "1 ÷ 0", "Infinity"] as const;
const TICKS = ["10", "100", "1000"] as const;
const MORE = "…";
const NOTE = "ふつうの数ではない";
const EXPRESSION = "Number.isFinite(1 / 0) → false";
export const calculatorInfinityText = [...KEYS, ...DISPLAYS, ...TICKS, MORE, NOTE, EXPRESSION].join(
  "",
);

const BODY = { x: 200, y: 108, w: 560, h: 672 };
const KEY_W = 112;
const KEY_H = 78;
const KEY_X = 228;
const KEY_Y = 352;
const KEY_GAP = 14;
const OPS = new Set(["÷", "×", "−", "+"]);
const WHITE = "#F7F8FA";
const WHITE_EDGE = "#C5CCD4";
const WHITE_DOWN = "#D5DCE3";
const ORANGE = "#F29A3A";
const ORANGE_EDGE = "#D97818";
const ORANGE_DOWN = "#E07A14";
const BLUE_EDGE = "#1D4ED8";
const BLUE_DOWN = "#1E40AF";
const BAR_X = 880;
const BAR_Y = 448;
const BAR_W = 960;
const TICK_X = [1140, 1400, 1660] as const;

function keyId(label: string) {
  if (label === "÷") return "infinity-k-div";
  if (label === "=") return "infinity-k-eq";
  if (label === "1" || label === "0") return `infinity-k-${label}`;
  return undefined;
}

export function CalculatorInfinity({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["calculator-infinity"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      const press = (id: string, when: number, down: string, up: string) => {
        t.to(`#${id}`, { y: 7, duration: 0.1, ease: "power1.out" }, when);
        t.to(`#${id}-face`, { attr: { fill: down }, duration: 0.1 }, when);
        t.to(`#${id}`, { y: 0, duration: 0.16, ease: "power1.in" }, when + 0.16);
        t.to(`#${id}-face`, { attr: { fill: up }, duration: 0.16 }, when + 0.16);
      };
      const read = (from: string, to: string, when: number) => {
        t.to(`#${from}`, { opacity: 0, duration: 0.12 }, when);
        t.to(`#${to}`, { opacity: 1, duration: 0.12 }, when);
      };

      rise("#infinity-calculator", at(0));
      press("infinity-k-1", at(1, 0.3), WHITE_DOWN, WHITE);
      read("infinity-d-0", "infinity-d-1", at(1, 0.42));
      press("infinity-k-div", at(1, 1.25), ORANGE_DOWN, ORANGE);
      read("infinity-d-1", "infinity-d-div", at(1, 1.37));
      press("infinity-k-0", at(1, 2.25), WHITE_DOWN, WHITE);
      read("infinity-d-div", "infinity-d-expr", at(1, 2.37));

      press("infinity-k-eq", at(2, 0.15), BLUE_DOWN, BLUE);
      read("infinity-d-expr", "infinity-d-inf", at(2, 0.4));
      t.to(
        "#infinity-screen",
        { attr: { stroke: BLUE, "stroke-width": 8 }, duration: 0.25 },
        at(2, 0.4),
      );
      t.fromTo(
        "#infinity-bar",
        { attr: { width: 0 } },
        { attr: { width: BAR_W }, duration: 3.3, ease: "none", immediateRender: false },
        at(2, 0.55),
      );
      t.fromTo(
        "#infinity-head",
        { x: BAR_X, opacity: 0 },
        { x: BAR_X + BAR_W, opacity: 1, duration: 3.3, ease: "none", immediateRender: false },
        at(2, 0.55),
      );
      TICKS.forEach((_, i) => {
        show(`#infinity-tick-${i}`, at(2, 0.55 + 3.3 * ((TICK_X[i] - BAR_X) / BAR_W)));
      });
      show("#infinity-more", at(2, 3.5));

      show("#infinity-note", at(3, 0.35));
      show("#infinity-mark", at(3, 0.7));
      show("#infinity-code", at(3, 2.2));
      emphasize("infinity-code", at(3, 2.9));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <defs>
        <linearGradient id="infinity-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <g id="infinity-calculator">
        <ellipse cx={480} cy={804} rx={250} ry={16} fill={INK} opacity={0.06} />
        <rect
          x={BODY.x + 12}
          y={BODY.y + 14}
          width={BODY.w}
          height={BODY.h}
          rx={40}
          fill="#8EA0B2"
        />
        <rect
          x={BODY.x}
          y={BODY.y}
          width={BODY.w}
          height={BODY.h}
          rx={40}
          fill="#D5E0EA"
          stroke="#8EA0B2"
          strokeWidth={5}
        />
        <rect x={228} y={128} width={200} height={28} rx={6} fill="#2C3A48" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={240 + i * 46} y={134} width={28} height={16} rx={2} fill="#4C6274" />
        ))}
        <rect
          id="infinity-screen"
          x={228}
          y={172}
          width={504}
          height={148}
          rx={16}
          fill="#E5F6DF"
          stroke="#7DAB78"
          strokeWidth={5}
        />
        <rect x={244} y={184} width={472} height={18} rx={8} fill="#F4FFF1" opacity={0.7} />
        {DISPLAYS.map((label, i) => (
          <g
            key={label}
            id={
              [
                "infinity-d-0",
                "infinity-d-1",
                "infinity-d-div",
                "infinity-d-expr",
                "infinity-d-inf",
              ][i]
            }
            opacity={i === 0 ? 1 : 0}
          >
            <Text x={480} y={268} size={72} fill={label === "Infinity" ? BLUE : INK}>
              {label}
            </Text>
          </g>
        ))}
        {KEYS.map((label, i) => {
          const col = i % 4;
          const row = Math.floor(i / 4);
          const x = KEY_X + col * (KEY_W + KEY_GAP);
          const y = KEY_Y + row * (KEY_H + KEY_GAP);
          const op = OPS.has(label);
          const eq = label === "=";
          const id = keyId(label);
          const face = eq ? BLUE : op ? ORANGE : WHITE;
          const edge = eq ? BLUE_EDGE : op ? ORANGE_EDGE : WHITE_EDGE;
          return (
            <g key={label} id={id}>
              <rect x={x} y={y + 8} width={KEY_W} height={KEY_H} rx={14} fill={edge} />
              <rect
                id={id ? `${id}-face` : undefined}
                x={x}
                y={y}
                width={KEY_W}
                height={KEY_H}
                rx={14}
                fill={face}
              />
              <Text x={x + KEY_W / 2} y={y + 50} size={36} fill={op || eq ? "#fff" : INK}>
                {label}
              </Text>
            </g>
          );
        })}
      </g>
      <rect
        id="infinity-bar"
        x={BAR_X}
        y={BAR_Y}
        width={0}
        height={44}
        rx={10}
        fill="url(#infinity-grad)"
      />
      <g id="infinity-head" opacity={0}>
        <path d="M 0 2 L 52 22 L 0 42 Z" fill="#7C3AED" transform={`translate(0 ${BAR_Y})`} />
      </g>
      {TICKS.map((label, i) => (
        <g key={label} id={`infinity-tick-${i}`} opacity={0}>
          <rect x={TICK_X[i] - 2} y={BAR_Y + 52} width={4} height={22} rx={2} fill="#5B4B8A" />
          <Text x={TICK_X[i]} y={BAR_Y + 112} size={36} fill="#5B4B8A">
            {label}
          </Text>
        </g>
      ))}
      <g id="infinity-more" opacity={0}>
        <Text x={1748} y={BAR_Y + 34} size={48} fill="#5B21B6">
          {MORE}
        </Text>
      </g>
      <Callout id="infinity-note" x={1180} y={300} text={NOTE} />
      <Mark id="infinity-mark" x={1520} y={300} ok={false} />
      <CodeCallout id="infinity-code" x={960} y={900} text={EXPRESSION} />
    </Stage>
  );
}
