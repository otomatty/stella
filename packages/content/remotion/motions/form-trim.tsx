import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Callout, CodeCallout, INK, Line, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const LETTERS = ["m", "o", "r", "i"] as const;
const CODE = '"  mori ".trim() → "mori"';
const HEADING = "名前";
const SPACE_LABEL = "空白";
export const formTrimText = `${HEADING}${LETTERS.join("")}${SPACE_LABEL}${CODE}`;

const NAVY = "#2C4460";
const NAVY_DEEP = "#24384C";
const FRAME = "#3E5670";
const FIELD_EDGE = "#8EB4D6";
const FIELD_SHADOW = "#D3E2F0";
const SPACE_FACE = "#F6D3B0";
const SPACE_STRIPE = "#E09A52";
const BUTTONS = ["#7EA2C2", "#A4C0D6", "#C5D8E8"] as const;

const WIN_X = 310;
const WIN_Y = 140;
const WIN_W = 1300;
const WIN_H = 620;
const FIELD_X = 410;
const FIELD_Y = 390;
const FIELD_W = 1100;
const FIELD_H = 210;
const SLOT = 148;
const START = 560;
const TILE_W = 92;
const TILE_H = 148;
const LETTER_SIZE = 124;

const spaceX = (i: number) => START + (i < 2 ? i : i + LETTERS.length) * SLOT;
const letterX = (i: number) => START + (i + 2) * SLOT;

/** 入力欄の前後の空白を取り除き、名前の文字だけを左端に残す。 */
export function FormTrim({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["form-trim"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, draw, emphasize } = stageMotion(t);
      const span = (beat: number, from: number, seconds: number) =>
        at(beat, from + seconds) - at(beat, from);

      rise("#trim-window", at(0));

      const cells = 2 + LETTERS.length + 1;
      for (let i = 0; i < cells; i++) {
        const id = i < 2 ? `trim-space-${i}` : i < 6 ? `trim-ch-${i - 2}` : "trim-space-2";
        show(`#${id}`, at(1, 0.12 + i * 0.38));
      }
      show("#trim-call", at(1, 2.9));
      draw("#trim-line .line", at(1, 2.9), 0.4);

      t.to("#trim-call", { opacity: 0, duration: span(2, 0, 0.2) }, at(2));
      t.to("#trim-line", { opacity: 0, duration: span(2, 0, 0.2) }, at(2));
      [0, 1, 2].forEach((i, order) => {
        const start = 0.28 + order * 0.42;
        t.to(
          `#trim-space-${i}`,
          { y: -170, opacity: 0, duration: span(2, start, 0.4), ease: "power2.in" },
          at(2, start),
        );
      });
      LETTERS.forEach((_, i) => {
        t.to(
          `#trim-ink-${i}`,
          {
            attr: { x: letterX(i) - 2 * SLOT },
            duration: span(2, 1.7, 0.7),
            ease: "power2.out",
          },
          at(2, 1.7),
        );
        t.to(
          `#trim-ink-${i}`,
          { attr: { fill: BLUE }, duration: span(2, 2.45, 0.25) },
          at(2, 2.45),
        );
      });

      show("#trim-code", at(3, 0.2));
      emphasize("trim-code", at(3, 0.7));
    },
    [at],
  );
  useTimeline(root, build);

  const tileY = FIELD_Y + (FIELD_H - TILE_H) / 2;
  const pointed = spaceX(0);

  return (
    <Stage root={root}>
      <defs>
        <pattern
          id="trim-hatch"
          width={10}
          height={10}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(40)"
        >
          <rect width={10} height={10} fill={SPACE_FACE} />
          <line x1={0} y1={0} x2={0} y2={10} stroke={SPACE_STRIPE} strokeWidth={2} />
        </pattern>
      </defs>
      <g id="trim-window">
        <ellipse
          cx={WIN_X + WIN_W / 2}
          cy={WIN_Y + WIN_H + 16}
          rx={520}
          ry={14}
          fill={INK}
          opacity={0.06}
        />
        <rect x={WIN_X + 8} y={WIN_Y + 10} width={WIN_W} height={WIN_H} rx={30} fill={NAVY_DEEP} />
        <rect
          x={WIN_X}
          y={WIN_Y}
          width={WIN_W}
          height={WIN_H}
          rx={28}
          fill="#F8FBFE"
          stroke={FRAME}
          strokeWidth={5}
        />
        <rect x={WIN_X + 3} y={WIN_Y + 3} width={WIN_W - 6} height={64} rx={25} fill={NAVY} />
        <rect x={WIN_X + 3} y={WIN_Y + 40} width={WIN_W - 6} height={28} fill={NAVY} />
        {BUTTONS.map((color, i) => (
          <circle key={color} cx={WIN_X + 48 + i * 36} cy={WIN_Y + 34} r={10} fill={color} />
        ))}
        <Text x={WIN_X + 96} y={310} size={48} anchor="start" fill={NAVY}>
          {HEADING}
        </Text>
        <rect
          x={FIELD_X}
          y={FIELD_Y + 8}
          width={FIELD_W}
          height={FIELD_H}
          rx={22}
          fill={FIELD_SHADOW}
        />
        <rect
          x={FIELD_X}
          y={FIELD_Y}
          width={FIELD_W}
          height={FIELD_H}
          rx={22}
          fill="#fff"
          stroke={FIELD_EDGE}
          strokeWidth={4}
        />
        {[0, 1, 2].map((i) => (
          <g key={i} id={`trim-space-${i}`} opacity={0}>
            <rect
              x={spaceX(i) - TILE_W / 2}
              y={tileY}
              width={TILE_W}
              height={TILE_H}
              rx={14}
              fill="url(#trim-hatch)"
              stroke={SPACE_STRIPE}
              strokeWidth={3}
            />
          </g>
        ))}
        <g id="trim-letters">
          {LETTERS.map((ch, i) => (
            <g key={ch} id={`trim-ch-${i}`} opacity={0}>
              <Text id={`trim-ink-${i}`} x={letterX(i)} y={FIELD_Y + 148} size={LETTER_SIZE}>
                {ch}
              </Text>
            </g>
          ))}
        </g>
      </g>
      <Callout id="trim-call" x={pointed} y={72} text={SPACE_LABEL} />
      <Line id="trim-line" d={`M ${pointed} 108 L ${pointed} ${tileY}`} />
      <CodeCallout id="trim-code" x={960} y={900} text={CODE} />
    </Stage>
  );
}
