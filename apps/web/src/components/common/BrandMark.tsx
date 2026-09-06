import type { SVGProps } from "react";

/**
 * STELLA のロゴマーク (星のシルエット)。
 *
 * 正本は `apps/web/public/icon.svg` (favicon / PWA アイコン)。 パスと viewBox をそのまま
 * 写しているので、 画面内のマークとブラウザのタブに出るアイコンは同じ形になる。
 *
 * `apps/vscode/media/icon.svg` (拡張のアクティビティバー) は**同じモチーフの別サイズ用の
 * 描き分け**で、 パスは一致しない。 24px の枠いっぱいに置く前提で余白を詰めてある。
 *
 * 色は currentColor。 地の色 (夜空グラデーションのタイル) は Brand 側が持つ。
 */
export const BrandMark = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 512 512" fill="none" aria-hidden="true" focusable="false" {...props}>
    <path
      fill="currentColor"
      d="M256 92 L298 232 L448 232 L326 316 L368 456 L256 372 L144 456 L186 316 L64 232 L214 232 Z"
    />
  </svg>
);
