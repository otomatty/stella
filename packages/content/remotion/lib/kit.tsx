import type { ReactNode, RefObject } from "react";
import { VIDEO_COLORS, VIDEO_FONT } from "../../src/scene-overlays";

export const { ink: INK, blue: BLUE, pink: PINK, violet: VIOLET, line: LINE } = VIDEO_COLORS;
export const FONT = VIDEO_FONT;
export const GREEN = "#16A34A";
export const RED = "#E5342B";
export const GRAY = "#5C5C66";
/** 出てくる動きは「小さめから等倍へ」。行き過ぎて戻る動き (バウンド) は使わない。 */
export const IN = { duration: 0.4, ease: "power3.out" } as const;

/** 動くイラストの土台。1920×1080 の SVG。地は白のままにし、飾りの図形は置かない。 */
export function Stage({
  root,
  children,
}: {
  root: RefObject<SVGSVGElement | null>;
  children: ReactNode;
}) {
  return (
    <svg ref={root} viewBox="0 0 1920 1080" width={1920} height={1080} aria-hidden="true">
      {children}
    </svg>
  );
}

/** 要素を出す・線を引く・札を目立たせる動きを、タイムラインに足す関数を返す。 */
export function stageMotion(t: gsap.core.Timeline) {
  /** 小さめから等倍へ出す。 */
  const show = (sel: string, at: number, extra: gsap.TweenVars = {}) =>
    t.fromTo(
      sel,
      { opacity: 0, scale: 0.94, transformOrigin: "50% 50%" },
      { opacity: 1, scale: 1, immediateRender: false, ...IN, ...extra },
      at,
    );
  /** 線を端から引く (pathLength=1 の線)。 */
  const draw = (sel: string, at: number, seconds = 0.6) =>
    t.fromTo(
      sel,
      { strokeDashoffset: 1 },
      { strokeDashoffset: 0, immediateRender: false, duration: seconds, ease: "power2.inOut" },
      at,
    );
  /** 札の枠を太くして目立たせる。 */
  const emphasize = (id: string, at: number) =>
    t.to(`#${id}-box`, { attr: { "stroke-width": 9 }, duration: 0.2 }, at);
  return { show, draw, emphasize };
}

/** 注目させる札 (白地にピンクの枠)。 */
export function Callout({ id, x, y, text }: { id: string; x: number; y: number; text: string }) {
  const w = text.length * 44 + 56;
  return (
    <g id={id} transform={`translate(${x} ${y})`} opacity={0}>
      <rect
        id={`${id}-box`}
        x={-w / 2}
        y={-36}
        width={w}
        height={72}
        rx={16}
        fill="#fff"
        stroke={PINK}
        strokeWidth={4}
      />
      <text y={15} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={42} fill={INK}>
        {text}
      </text>
    </g>
  );
}

/** 値や種類の札 (紫の地に白い文字)。 */
export function Tag({
  id,
  x,
  y,
  text,
  chars,
  color = VIOLET,
}: {
  id: string;
  x: number;
  y: number;
  text: string;
  chars?: number;
  color?: string;
}) {
  const w = (chars ?? text.length) * 36 + 44;
  return (
    <g id={id} transform={`translate(${x} ${y})`} opacity={0}>
      <rect x={-w / 2} y={-28} width={w} height={56} rx={14} fill={color} />
      <text
        y={13}
        textAnchor="middle"
        fontFamily={FONT}
        fontWeight={700}
        fontSize={36}
        fill="#fff"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {text}
      </text>
    </g>
  );
}

/** 絵より上に描く線 (白いふち付き)。pathLength=1 にして、端から引けるようにする。 */
export function Line({ id, d, color = PINK }: { id: string; d: string; color?: string }) {
  const common = {
    d,
    fill: "none",
    strokeLinecap: "round" as const,
    pathLength: 1,
    strokeDasharray: 1,
    strokeDashoffset: 1,
  };
  return (
    <g id={id}>
      <path className="line" {...common} stroke="#fff" strokeWidth={14} />
      <path className="line" {...common} stroke={color} strokeWidth={6} />
    </g>
  );
}

/** 丸の中の印 (合っている・合っていない)。 */
export function Mark({ id, x, y, ok }: { id: string; x: number; y: number; ok: boolean }) {
  return (
    <g id={id} transform={`translate(${x} ${y})`} opacity={0}>
      <circle r={30} fill={ok ? GREEN : RED} />
      <path
        d={ok ? "M-13 1 L-4 10 L14 -9" : "M-11 -11 L11 11 M11 -11 L-11 11"}
        fill="none"
        stroke="#fff"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

/** 文字。SVG の text に共通の書体を付ける。 */
export function Text({
  id,
  x,
  y,
  size,
  children,
  weight = 700,
  fill = INK,
  anchor = "middle",
  opacity,
}: {
  id?: string;
  x: number;
  y: number;
  size: number;
  children: ReactNode;
  weight?: 500 | 700;
  fill?: string;
  anchor?: "start" | "middle" | "end";
  opacity?: number;
}) {
  return (
    <text
      id={id}
      x={x}
      y={y}
      textAnchor={anchor}
      fontFamily={FONT}
      fontWeight={weight}
      fontSize={size}
      fill={fill}
      opacity={opacity}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {children}
    </text>
  );
}

/** 線の先の矢じり。先端が (x, y)、向きは angle 度 (0 が右、90 が下)。 */
export function Head({
  id,
  x,
  y,
  angle,
  color = PINK,
}: {
  id: string;
  x: number;
  y: number;
  angle: number;
  color?: string;
}) {
  return (
    <path
      id={id}
      d="M 0 0 L -32 -17 L -32 17 Z"
      transform={`translate(${x} ${y}) rotate(${angle})`}
      fill={color}
      stroke="#fff"
      strokeWidth={3}
      strokeLinejoin="round"
      opacity={0}
    />
  );
}
