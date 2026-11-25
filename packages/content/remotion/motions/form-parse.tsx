import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, CodeCallout, GRAY, INK, RED, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const DIGITS = ["1", "2", "0"] as const;
const SUFFIX = "円";
const PRICE = [...DIGITS, SUFFIX] as const;
const NONE = ["な", "し"] as const;
const VALUE = DIGITS.join("");
const EMPTY = NONE.join("");
const NAN = "NaN";
const HEADING = "入力";
const EXPRESSION = `Number.parseInt("${VALUE}${SUFFIX}", 10) → ${VALUE}`;
export const formParseText = [HEADING, PRICE.join(""), VALUE, EMPTY, NAN, EXPRESSION].join("");

const NAVY = "#2C4460";
const NAVY_DEEP = "#24384C";
const FRAME = "#3E5670";
const BAND = "#D5E5F6";
const BAND_EDGE = "#7FA4C8";
const FIELD_EDGE = "#8EB4D6";
const FIELD_SHADOW = "#D3E2F0";
const SCAN_BLUE = "#E5F0FF";
const SCAN_RED = "#FDE8E6";
const TILE_BLUE = "#DBE7FF";
const TRAY = "#F5F8FB";
const TRAY_EDGE = "#C5D3E0";
const TRAY_DEPTH = "#D5DEE8";
const RECESS = "#E6EDF4";
const NAN_FILL = "#E4E0EE";
const NAN_EDGE = "#5C5670";
const BUTTONS = ["#7EA2C2", "#A4C0D6", "#C5D8E8"] as const;

const WIN_X = 120;
const WIN_Y = 148;
const WIN_W = 1000;
const WIN_H = 572;
const FIELD_X = 172;
const FIELD_W = 896;
const FIELD_H = 130;
const FIELD_Y = [330, 516] as const;
const TEXT_SIZE = 88;
const SLOT = 120;
const CHAR0 = 246;
const FRAME_W = 108;
const FRAME_H = 116;
const TRAY_X = 1260;
const TRAY_W = 520;
const TRAY_H = 154;
const TRAY_CX = TRAY_X + TRAY_W / 2;
const WELL_W = 400;
const WELL_H = 118;
const WELL_X = TRAY_CX - WELL_W / 2;
const DX = TRAY_CX - SLOT - CHAR0;

const charX = (i: number) => CHAR0 + i * SLOT;
const frameX = (i: number) => charX(i) - FRAME_W / 2;
const textY = (fieldY: number) => fieldY + 97;
const frameY = (fieldY: number) => fieldY + (FIELD_H - FRAME_H) / 2;
const trayY = (fieldY: number) => fieldY - 12;
const wellY = (fieldY: number) => fieldY + 6;
const caretX = (i: number) => charX(i) + 58;

/** 入力欄の「120円」から先頭の数字だけを読み、数字の無い文字列は NaN になる。 */
export function FormParse({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["form-parse"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      const span = (beat: number, from: number, seconds: number) =>
        at(beat, from + seconds) - at(beat, from);

      rise("#parse-window", at(0));

      show("#parse-caret", at(1, 0.15));
      PRICE.forEach((_, i) => {
        const start = 0.32 + i * 0.68;
        show(`#parse-ch-${i}`, at(1, start));
        t.to(
          "#parse-caret",
          { attr: { x: caretX(i) }, duration: span(1, start, 0.24), ease: "power2.out" },
          at(1, start + 0.05),
        );
      });

      t.to("#parse-caret", { opacity: 0, duration: span(2, 0.04, 0.16) }, at(2, 0.04));
      show("#parse-scan", at(2, 0.08));
      show("#parse-num-well", at(2, 0.4));
      DIGITS.forEach((_, i) => {
        const start = 0.45 + i * 0.9;
        if (i > 0) {
          t.to(
            "#parse-scan-box",
            {
              attr: { x: frameX(i) },
              duration: span(2, start - 0.28, 0.26),
              ease: "power2.inOut",
            },
            at(2, start - 0.28),
          );
        }
        t.to(
          `#parse-ink-${i}`,
          { attr: { fill: BLUE }, duration: span(2, start, 0.12) },
          at(2, start),
        );
        t.to(`#parse-fly-${i}`, { opacity: 1, duration: span(2, start, 0.06) }, at(2, start));
        t.to(
          `#parse-fly-${i}`,
          { x: DX, duration: span(2, start, 0.5), ease: "power2.inOut" },
          at(2, start),
        );
      });
      const yen = 0.45 + DIGITS.length * 0.9;
      t.to(
        "#parse-scan-box",
        {
          attr: { x: frameX(DIGITS.length) },
          duration: span(2, yen - 0.28, 0.26),
          ease: "power2.inOut",
        },
        at(2, yen - 0.28),
      );
      t.to(
        "#parse-scan-box",
        { attr: { stroke: RED, fill: SCAN_RED }, duration: span(2, yen, 0.2) },
        at(2, yen),
      );

      NONE.forEach((_, i) => {
        show(`#parse-bot-${i}`, at(3, 0.1 + i * 0.22));
      });
      const hop = 0.78;
      const travel = 0.36;
      t.to(
        "#parse-scan-box",
        {
          attr: { x: frameX(0), y: frameY(FIELD_Y[1]), stroke: BLUE, fill: SCAN_BLUE },
          duration: span(3, hop, travel),
          ease: "power2.inOut",
        },
        at(3, hop),
      );
      t.to(
        "#parse-scan-box",
        { attr: { stroke: RED, fill: SCAN_RED }, duration: span(3, hop + travel, 0.16) },
        at(3, hop + travel),
      );
      show("#parse-nan", at(3, 1.4));
      show("#parse-expression", at(3, 2.35));
      emphasize("parse-expression", at(3, 2.9));
    },
    [at],
  );
  useTimeline(root, build);

  const top = FIELD_Y[0];
  const bottom = FIELD_Y[1];

  return (
    <Stage root={root}>
      <g id="parse-window">
        <ellipse
          cx={WIN_X + WIN_W / 2}
          cy={WIN_Y + WIN_H + 18}
          rx={430}
          ry={14}
          fill={INK}
          opacity={0.06}
        />
        <ellipse
          cx={TRAY_CX}
          cy={trayY(bottom) + TRAY_H + 16}
          rx={240}
          ry={12}
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
        <rect
          x={WIN_X + 20}
          y={WIN_Y + 10}
          width={WIN_W - 40}
          height={14}
          rx={7}
          fill="#fff"
          opacity={0.1}
        />
        {BUTTONS.map((color, i) => (
          <circle key={color} cx={WIN_X + 48 + i * 36} cy={WIN_Y + 34} r={10} fill={color} />
        ))}
        <rect x={WIN_X + 36} y={232} width={WIN_W - 72} height={68} rx={14} fill={BAND} />
        <rect x={WIN_X + 36} y={232} width={12} height={68} rx={6} fill={BAND_EDGE} />
        <Text x={WIN_X + WIN_W / 2} y={278} size={42} fill={NAVY}>
          {HEADING}
        </Text>
        {FIELD_Y.map((y) => (
          <g key={y}>
            <rect
              x={FIELD_X}
              y={y + 6}
              width={FIELD_W}
              height={FIELD_H}
              rx={20}
              fill={FIELD_SHADOW}
            />
            <rect
              x={FIELD_X}
              y={y}
              width={FIELD_W}
              height={FIELD_H}
              rx={20}
              fill="#fff"
              stroke={FIELD_EDGE}
              strokeWidth={4}
            />
            <rect
              x={FIELD_X + 18}
              y={y + 12}
              width={FIELD_W - 36}
              height={8}
              rx={4}
              fill="#E7F1FA"
            />
          </g>
        ))}
        {FIELD_Y.map((y) => (
          <g key={`tray-${y}`}>
            <rect
              x={TRAY_X + 8}
              y={trayY(y) + 10}
              width={TRAY_W}
              height={TRAY_H}
              rx={26}
              fill={TRAY_DEPTH}
            />
            <rect
              x={TRAY_X}
              y={trayY(y)}
              width={TRAY_W}
              height={TRAY_H}
              rx={26}
              fill={TRAY}
              stroke={TRAY_EDGE}
              strokeWidth={4}
            />
            <rect x={WELL_X} y={wellY(y)} width={WELL_W} height={WELL_H} rx={20} fill={RECESS} />
          </g>
        ))}
        <g id="parse-num-well" opacity={0}>
          <rect
            x={WELL_X}
            y={wellY(top)}
            width={WELL_W}
            height={WELL_H}
            rx={20}
            fill={TILE_BLUE}
            stroke={BLUE}
            strokeWidth={5}
          />
        </g>
      </g>

      <g id="parse-scan" opacity={0}>
        <rect
          id="parse-scan-box"
          x={frameX(0)}
          y={frameY(top)}
          width={FRAME_W}
          height={FRAME_H}
          rx={18}
          fill={SCAN_BLUE}
          stroke={BLUE}
          strokeWidth={7}
        />
      </g>
      {PRICE.map((ch, i) => (
        <g key={ch} id={`parse-ch-${i}`} opacity={0}>
          <Text
            id={`parse-ink-${i}`}
            x={charX(i)}
            y={textY(top)}
            size={TEXT_SIZE}
            fill={i < DIGITS.length ? INK : GRAY}
          >
            {ch}
          </Text>
        </g>
      ))}
      {NONE.map((ch, i) => (
        <g key={ch} id={`parse-bot-${i}`} opacity={0}>
          <Text x={charX(i)} y={textY(bottom)} size={TEXT_SIZE} fill={GRAY}>
            {ch}
          </Text>
        </g>
      ))}
      <rect
        id="parse-caret"
        x={CHAR0 - 64}
        y={top + (FIELD_H - 80) / 2}
        width={6}
        height={80}
        rx={3}
        fill={BLUE}
        opacity={0}
      />
      {DIGITS.map((ch, i) => (
        <g key={`fly-${ch}`} id={`parse-fly-${i}`} opacity={0}>
          <Text x={charX(i)} y={textY(top)} size={TEXT_SIZE} fill={BLUE}>
            {ch}
          </Text>
        </g>
      ))}
      <g id="parse-nan" opacity={0}>
        <rect
          x={WELL_X}
          y={wellY(bottom)}
          width={WELL_W}
          height={WELL_H}
          rx={20}
          fill={NAN_FILL}
          stroke={NAN_EDGE}
          strokeWidth={5}
        />
        <Text x={TRAY_CX} y={textY(bottom)} size={80} fill={NAN_EDGE}>
          {NAN}
        </Text>
      </g>
      <CodeCallout id="parse-expression" x={960} y={900} text={EXPRESSION} />
    </Stage>
  );
}
