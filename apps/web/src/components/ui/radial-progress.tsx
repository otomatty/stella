/**
 * RadialProgress — 円環の進捗リング (SVG)。
 *
 * `progress.tsx` の横棒と同じ役どころだが、中心に数字を置きたい場所 (ホームの
 * レベルリング) 用。Radix に相当プリミティブが無いので素の SVG (`stroke-dasharray`)
 * で組み、トーンの語彙は `progress.tsx` に合わせる (`brand` / `success` …)。
 *
 * ブランドトーンは DS のシグネチャグラデーション (`--sf-gradient` と同じ色) を
 * `linearGradient` で再現する — 単色マゼンタは使わない、という `progress.tsx` の
 * 決めごとを円環でも守るため。グラデーション id は `useId` で毎回変え、同じ画面に
 * 複数のリングが並んでも定義が衝突しないようにする。
 */

import * as React from "react";

import { cn } from "@/lib/utils";

type RadialTone = "brand" | "success" | "warning" | "danger" | "info" | "ink";

interface RadialProgressProps extends React.SVGAttributes<SVGSVGElement> {
  /** 0〜100。範囲外は丸める。 */
  value?: number;
  /** 直径 (px)。 */
  size?: number;
  /** 環の太さ (px)。 */
  thickness?: number;
  tone?: RadialTone;
  /** 環の中に置く要素 (レベルの数字など)。 */
  children?: React.ReactNode;
  /** 読み上げ用のラベル (例:「レベル 4 · 次のレベルまで 60%」)。 */
  label?: string;
  className?: string;
}

/** ブランド以外は単色。CSS 変数をそのまま stroke に渡す。 */
const TONE_STROKE: Record<Exclude<RadialTone, "brand">, string> = {
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  info: "var(--info)",
  ink: "var(--ink)",
};

export const RadialProgress = ({
  value = 0,
  size = 72,
  thickness = 6,
  tone = "brand",
  className,
  children,
  label,
  ...props
}: RadialProgressProps) => {
  const gradientId = React.useId();
  const pct = Math.min(Math.max(value, 0), 100);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const stroke = tone === "brand" ? `url(#${gradientId})` : TONE_STROKE[tone];

  return (
    <div
      className={cn("relative inline-grid place-items-center shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={label ?? `進捗 ${Math.round(pct)}%`}
        {...props}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--sf-blue)" />
            <stop offset="34%" stopColor="var(--sf-violet)" />
            <stop offset="58%" stopColor="var(--sf-magenta)" />
            <stop offset="78%" stopColor="var(--sf-rose)" />
            <stop offset="100%" stopColor="var(--sf-red)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-muted)"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
          // 12 時から時計回りに伸ばす。
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 grid place-items-center text-center leading-none">
          {children}
        </div>
      ) : null}
    </div>
  );
};
RadialProgress.displayName = "RadialProgress";
