/**
 * 視界の外にある目印 (島 / 本土) を、画面の縁に矢印として出すための計算 — 純関数。
 *
 * ゲームのスキル画面 (画面端の「あっちに何かある」矢印) と同じ発想。盤面は中心
 * 1× で開くので島は最初は視界の外にあり、パンしなければ存在に気づけない。矢印は
 * 視界の中心から目印へ向かう向きで、縁から `inset` だけ内側の矩形に投影する。
 * 視界の中にある目印には出さない (星そのものが見えている)。
 */

/** キャンバスの見え方: 盤面の平行移動 + 倍率と、箱の大きさ (px)。 */
export interface ViewState {
  x: number;
  y: number;
  scale: number;
  width: number;
  height: number;
}

export interface OffscreenMarker {
  key: string;
  /** 画面座標 (箱の左上が原点)。 */
  left: number;
  top: number;
  /** 矢印の向き (deg)。0 = 上、時計回り。上向きの矢印アイコンを `rotate()` する。 */
  angle: number;
}

export function offscreenMarkers(
  targets: readonly { key: string; x: number; y: number }[],
  view: ViewState,
  inset = 32,
): OffscreenMarker[] {
  const { width, height } = view;
  if (width <= 0 || height <= 0) return [];
  const cx = width / 2;
  const cy = height / 2;
  const halfW = Math.max(1, cx - inset);
  const halfH = Math.max(1, cy - inset);
  const out: OffscreenMarker[] = [];
  for (const target of targets) {
    const sx = target.x * view.scale + view.x;
    const sy = target.y * view.scale + view.y;
    if (sx >= 0 && sx <= width && sy >= 0 && sy <= height) continue;
    const dx = sx - cx;
    const dy = sy - cy;
    // 中心から目印へ伸ばした線が、内側の矩形の縁と交わる所。
    const t = Math.min(
      dx === 0 ? Number.POSITIVE_INFINITY : halfW / Math.abs(dx),
      dy === 0 ? Number.POSITIVE_INFINITY : halfH / Math.abs(dy),
    );
    out.push({
      key: target.key,
      left: cx + dx * t,
      top: cy + dy * t,
      angle: (Math.atan2(dx, -dy) * 180) / Math.PI,
    });
  }
  return out;
}
