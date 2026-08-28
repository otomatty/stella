/**
 * 本人の星座 (Phase 5)。
 *
 * 公開時に固定した「歩んだ道」(`path_snapshot`) を、通った順に 1 つずつ灯していく。
 *
 * ## 決めたこと
 *
 * - **並びは道の順** (点いた順)。長さは見えるが、数は書かない — 殿堂は順位表ではない
 * - **配置は掲載 id から決まる** (`hashOf`)。乱数だと再訪のたびに星座が変わり、
 *   「その人の星座」にならない。同じ人はいつ見ても同じ形
 * - **点灯は 2 秒以内に終える。** 星が増えたら間隔を詰める (`stepFor`) — 待たせない
 *   長さに収めることで、スキップ導線を持たずに済ませる
 * - **`prefers-reduced-motion` では最初から全部点いている**。アニメーションは
 *   CSS 側 (`.hof-star` / `.hof-link-line`) が止め、この JSX は何も変えない
 * - 図そのものは飾りなので `role="img"` + 教材名の読み上げに畳む (星ひとつずつを
 *   読み上げても意味にならない)
 */

import type { CSSProperties } from "react";

/**
 * viewBox の縦横比は描画する帯 (`h-32` / `h-44` の全幅) に近づけてある。
 * 比が離れたまま `preserveAspectRatio="none"` で引き伸ばすと、星の円が横長の楕円に潰れる。
 */
const VIEW_W = 400;
const VIEW_H = 32;

/** 点灯し切るまでの最大秒数 (これを超えないよう間隔を詰める)。 */
const TOTAL_SECONDS = 1.6;
/** 星が少ないときの 1 つあたりの間隔。 */
const MAX_STEP = 0.16;

function stepFor(count: number): number {
  if (count <= 1) return 0;
  return Math.min(MAX_STEP, TOTAL_SECONDS / (count - 1));
}

/** 文字列から安定した小さな数を作る (配置の揺らぎ用。暗号用途ではない)。 */
function hashOf(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 100_000;
  }
  return hash;
}

interface Point {
  x: number;
  y: number;
}

/** 星の座標。ゆるい波に、ステージ id 由来の揺らぎを乗せる。 */
function layout(ids: string[]): Point[] {
  const n = ids.length;
  return ids.map((id, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const jitter = (hashOf(id) % 7) - 3;
    return {
      x: 60 + t * (VIEW_W - 120),
      y: VIEW_H / 2 + Math.sin(i * 1.15 + (hashOf(id) % 5) * 0.2) * 6 + jitter * 0.6,
    };
  });
}

export function Constellation({
  stages,
  className,
}: {
  stages: { id: string; title: string }[];
  className?: string;
}) {
  if (stages.length === 0) return null;
  const points = layout(stages.map((stage) => stage.id));
  const step = stepFor(stages.length);

  return (
    <svg
      className={className}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      // 等比で収める (星を潰さない)。帯より縦が余ったぶんは中央に置く。
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`修了したスキル: ${stages.map((stage) => stage.title).join("、")}`}
    >
      <title>{stages.map((stage) => stage.title).join(" → ")}</title>
      {points.map((point, i) => {
        const prev = points[i - 1];
        if (!prev) return null;
        return (
          <line
            key={`line-${stages[i]?.id ?? i}`}
            className="hof-link-line"
            style={{ "--d": i * step } as CSSProperties}
            x1={prev.x}
            y1={prev.y}
            x2={point.x}
            y2={point.y}
            stroke="var(--hof-gold)"
            strokeOpacity={0.45}
            strokeWidth={0.28}
            strokeDasharray="100"
          />
        );
      })}
      {points.map((point, i) => (
        // 位置は外側の <g> が持つ。点灯アニメは CSS の transform を使うので、
        // 同じ要素に translate を書くと打ち消し合って星が原点へ飛ぶ。
        <g key={`star-${stages[i]?.id ?? i}`} transform={`translate(${point.x} ${point.y})`}>
          <g className="hof-star" style={{ "--d": i * step } as CSSProperties}>
            <circle r={2.6} fill="var(--hof-gold)" opacity={0.18} />
            <circle r={1.05} fill="var(--hof-gold-2)" />
          </g>
        </g>
      ))}
    </svg>
  );
}
