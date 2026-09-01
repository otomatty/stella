import type { SVGProps } from "react";

/**
 * FALCON INFORMAL のロゴマーク (F のグリフ)。
 *
 * 正本は `apps/web/public/icon.svg` (favicon / PWA アイコン)。 パスと viewBox をそのまま
 * 写しているので、 画面内のマークとブラウザのタブに出るアイコンは同じ形になる。
 * 以前はここだけフォントの "F" を字として描いていて、 ファビコンと別物だった。
 *
 * `apps/vscode/media/icon.svg` (拡張のアクティビティバー) は**同じモチーフの別サイズ用の
 * 描き分け**で、 パスは一致しない。 24px の枠いっぱいに置く前提で余白を詰めてあり
 * (上バーの高さが全体の 0.18 に対しこちらは 0.27、 ステム幅は 0.31 対 0.38)、
 * この形をそのまま持ち込むとアクティビティバーで一回り小さく見える。 意図的に別のまま。
 *
 * 色は currentColor。 地の色 (グラデーションのタイル) は Brand 側が持つ。
 * viewBox 512 のうち周囲の余白もパスに含まれている — 正本ではこの余白が角丸タイルの
 * 内側の余白そのものなので、 Brand 側で追加のインセットを掛けないこと。
 */
export const BrandMark = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 512 512" fill="none" aria-hidden="true" focusable="false" {...props}>
    <path fill="currentColor" d="M172 136 H340 V200 H236 V240 H322 V304 H236 V376 H172 Z" />
  </svg>
);
