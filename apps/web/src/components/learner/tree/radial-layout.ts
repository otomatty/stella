/**
 * スキルツリーの同心円レイアウト — 純関数。React も DOM も知らない (単体で試せる)。
 *
 * ## 決めたレイアウト: 「前提の深さ × カテゴリ扇形」の同心円
 *
 * 中心に入口の星 (前提なし)、外へ向かって **前提グラフのトポロジカル層** (root から
 * 数えた最長距離) がリングになる。角度は **カテゴリの扇形** で、同じ分野の星が
 * 1 つの扇にまとまり、リングをまたぐ前提の線がおおむね放射状に走る。
 * 「基礎をクリアすると外側の星が開いていく」という進行の向きが、絵の向きと一致する。
 *
 * 力学モデル (force-directed) は使わない。毎回同じ絵にならない (再取得のたびに星が
 * 動く) ため。ここは旧レイアウト (layout.ts の列形式) と同じく決定性を最優先する —
 * 同じ入力なら常に同じ座標。
 *
 * ## リング半径は密度で広げる
 *
 * リングの円周は有限なので、星が多いリングは間隔が詰まる。角度を先に確定させてから、
 * そのリングで **最も近い 2 星の直線距離 (弦長)** が `MIN_SEPARATION` 以上になる
 * 半径まで押し広げる。半径は内側から単調に増える (リングの逆転は起きない)。
 *
 * ## 霧の星の置き場
 *
 * 旧レイアウトと同じ規則: どの線にも触れていない霧の星だけを最外リングの 1 つ先へ
 * 送る (前提の線が来ない霧の星は深さ 0 になり、中心に居座ってしまうため)。見えて
 * いる星の前提として参照されている霧の星は、線に従って本来のリングに置く。
 */

import type { SkillMapStageNode } from "@/lib/skill-map-api";

/** リングの基本間隔 (px)。星 1 つぶんのラベル高さより広く。 */
export const RING_GAP = 180;
/**
 * 同じリング上の星どうしの最小距離 (px)。**弧長ではなく直線距離 (弦長)**。
 *
 * 星のボタンは `w-[120px]`。ラベルが隣とくっついて見えないよう、その幅に余白を足す。
 */
export const MIN_SEPARATION = 150;
/** いちばん外のリングから盤面の縁までの余白 (扇ラベルぶん)。 */
export const EDGE_PAD = 140;
/** 扇の最小角 (rad)。星 1 つの分野が線のように細くならないように。 */
const MIN_SECTOR_SPAN = 0.5;
/** 扇の始まり (真上) から時計回りに並べる。 */
const START_ANGLE = -Math.PI / 2;

export interface RadialNode {
  node: SkillMapStageNode;
  /** 中心座標 (px)。盤面の左上が原点。 */
  x: number;
  y: number;
  /** 属するリング (0 = 中心)。 */
  ring: number;
  /** 属する扇のキー (カテゴリ名 / 霧はテーマ名)。 */
  sector: string;
}

export interface RadialEdge {
  /** 前提の側 (内)。 */
  fromId: string;
  /** その前提を要求する側 (外)。 */
  toId: string;
  /** 前提を満たしているか (= 前提の星がクリア済み)。実線 / 破線の別。 */
  satisfied: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** 星が実際に広がっている範囲 (盤面座標)。盤面の矩形ではなく星の外接。 */
export interface RadialBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface RadialLayout {
  nodes: RadialNode[];
  edges: RadialEdge[];
  /** 同心円のガイド (中心の 1 点リングは含まない)。 */
  rings: { ring: number; radius: number }[];
  /** 扇の見出し (カテゴリ名と、その置き場所)。 */
  sectors: { key: string; labelX: number; labelY: number }[];
  /**
   * 星の外接範囲。盤面 (`width` × `height`) は円に外接する正方形なので四隅が空く。
   * パンの可動域をここで決めると、「盤面の隅だけ見えていて星は全部画面外」を防ぎつつ、
   * どの星も画面の中央へ持ってこられる。
   */
  bounds: RadialBounds;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

/** 扇のキー。霧の星はカテゴリを持たないのでテーマ名で括る (テーマ = 粗いカテゴリ)。 */
function sectorKeyOf(node: SkillMapStageNode): string {
  const key = node.category ?? node.theme ?? "";
  return key.trim() === "" ? "？？？" : key;
}

/** 並びを固定するための表示名 (タイトル → テーマ → id)。 */
function sortKeyOf(node: SkillMapStageNode): string {
  return node.title ?? node.theme ?? node.id;
}

/**
 * 各星の深さ (root からの最長距離)。
 *
 * 循環があっても止まらないように、訪問中の星を覚えて 0 で打ち切る (評価器は循環を
 * 検出して報告するが、画面は落とさず何かを描く方を採る)。
 */
function computeDepths(
  nodes: SkillMapStageNode[],
  prereqsOf: (id: string) => string[],
): Map<string, number> {
  const depths = new Map<string, number>();
  const visiting = new Set<string>();

  const depthOf = (id: string): number => {
    const cached = depths.get(id);
    if (cached !== undefined) return cached;
    if (visiting.has(id)) return 0; // 循環。ここで打ち切る。
    visiting.add(id);
    const prereqs = prereqsOf(id);
    const depth = prereqs.length === 0 ? 0 : 1 + Math.max(...prereqs.map(depthOf));
    visiting.delete(id);
    depths.set(id, depth);
    return depth;
  };

  for (const node of nodes) depthOf(node.id);
  return depths;
}

/**
 * 円周上に並んだ角度の、**最も近い 2 つの角度差** (rad)。一周の折り返しも見る。
 *
 * 角度が 1 つ以下なら「隣がいない」= 一周 (2π) を返す。半径を決める側は、この値が
 * 一周なら押し広げをしない。
 */
function minAngularGap(angles: number[]): number {
  const full = Math.PI * 2;
  if (angles.length < 2) return full;
  const sorted = [...angles].sort((a, b) => a - b);
  const first = sorted[0] ?? 0;
  const last = sorted[sorted.length - 1] ?? 0;
  // 端から端へ一周して戻るぶん (扇の並びの先頭と末尾は円周上で隣り合う)。
  let min = full - (last - first);
  for (let i = 1; i < sorted.length; i++) {
    min = Math.min(min, (sorted[i] ?? 0) - (sorted[i - 1] ?? 0));
  }
  return min;
}

/**
 * 星の座標と前提の線を組み立てる。
 *
 * 入力が同じなら出力も同じ (乱数も現在時刻も使わない)。
 */
export function layoutRadialSkillTree(nodes: SkillMapStageNode[]): RadialLayout {
  if (nodes.length === 0) {
    return {
      nodes: [],
      edges: [],
      rings: [],
      sectors: [],
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      width: 0,
      height: 0,
      centerX: 0,
      centerY: 0,
    };
  }

  const known = new Set(nodes.map((n) => n.id));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  // 応答に無い id (別テナント / 削除済み) は線を引かない。
  const prereqsOf = (id: string): string[] =>
    (byId.get(id)?.prerequisite_ids ?? []).filter((p) => known.has(p) && p !== id);

  const depths = computeDepths(nodes, prereqsOf);
  const linked = new Set<string>();
  for (const node of nodes) {
    for (const prereq of prereqsOf(node.id)) {
      linked.add(node.id);
      linked.add(prereq);
    }
  }
  const maxLinkedDepth = Math.max(
    0,
    ...nodes.filter((n) => linked.has(n.id)).map((n) => depths.get(n.id) ?? 0),
  );
  // 線に触れていない霧の星は「その先」へ送る (中心に居座らせない)。
  const ringOf = (node: SkillMapStageNode): number =>
    node.visibility === "fog" && !linked.has(node.id)
      ? maxLinkedDepth + 1
      : (depths.get(node.id) ?? 0);

  // 中心 (リング 0) が 1 つだけなら真ん中の 1 点に置く。それ以外のリングは扇で分ける。
  const ring0 = nodes.filter((n) => ringOf(n) === 0);
  const singleCenter = ring0.length === 1 ? ring0[0] : undefined;

  /** 扇に載る星 (中心の 1 点は除く)。 */
  const fanned = nodes.filter((n) => n !== singleCenter);

  // 扇の割り付け。星数に比例した角度 (最小角あり) を、名前順に時計回りで並べる。
  const sectorKeys = [...new Set(fanned.map(sectorKeyOf))].sort((a, b) => a.localeCompare(b, "ja"));
  const countOfSector = new Map<string, number>();
  for (const node of fanned) {
    const key = sectorKeyOf(node);
    countOfSector.set(key, (countOfSector.get(key) ?? 0) + 1);
  }
  const total = fanned.length;
  const rawSpans = sectorKeys.map((key) =>
    Math.max(MIN_SECTOR_SPAN, ((countOfSector.get(key) ?? 0) / Math.max(1, total)) * Math.PI * 2),
  );
  const spanScale = (Math.PI * 2) / rawSpans.reduce((a, b) => a + b, 0);
  const sectorStart = new Map<string, number>();
  const sectorSpan = new Map<string, number>();
  {
    let cursor = START_ANGLE;
    sectorKeys.forEach((key, i) => {
      const span = (rawSpans[i] ?? MIN_SECTOR_SPAN) * spanScale;
      sectorStart.set(key, cursor);
      sectorSpan.set(key, span);
      cursor += span;
    });
  }

  /** (扇 × リング) ごとの星。キーは扇の番号で組む (名前の区切り文字に依存しない)。 */
  interface Cell {
    sector: string;
    ring: number;
    list: SkillMapStageNode[];
  }
  const sectorIndex = new Map(sectorKeys.map((key, i) => [key, i]));
  const cells = new Map<string, Cell>();
  for (const node of fanned) {
    const sector = sectorKeyOf(node);
    const ring = ringOf(node);
    const key = `${sectorIndex.get(sector) ?? 0}:${ring}`;
    const cell = cells.get(key) ?? { sector, ring, list: [] };
    cell.list.push(node);
    cells.set(key, cell);
  }
  for (const cell of cells.values()) {
    cell.list.sort(
      (a, b) => sortKeyOf(a).localeCompare(sortKeyOf(b), "ja") || a.id.localeCompare(b.id),
    );
  }

  /**
   * 角度を先に確定させる。半径に依存しないので、これを見てから半径を決められる。
   *
   * **半径の計算と配置は同じ角度を使う。** 別々に角度を組み立てると、片方だけ
   * 分割の数え方を直したときに「間隔を確保したはずの星が重なる」が黙って起きる。
   */
  const angled = [...cells.values()].flatMap(({ sector, ring, list }) => {
    const start = sectorStart.get(sector) ?? START_ANGLE;
    const span = sectorSpan.get(sector) ?? MIN_SECTOR_SPAN;
    // 扇の端に星を置かない (隣の扇と接触する) よう、n+1 等分の内側に置く。
    return list.map((node, i) => ({
      node,
      sector,
      ring,
      angle: start + (span * (i + 1)) / (list.length + 1),
    }));
  });

  /**
   * リング半径。基本は内側 + RING_GAP。**そのリングで最も近い 2 星** が
   * `MIN_SEPARATION` 以上離れる半径まで押し広げる。
   *
   * 測るのは弧長ではなく **弦長** (2R·sin(Δθ/2))。星は円弧ではなく直線距離で
   * 重なるので、弧長で見ると混んだリングで足りない。扇をまたぐ隣どうしも同じ
   * 判定に入れる (扇の境界を挟む 2 星は、扇の中の間隔より近づきうる)。
   */
  const ringIds = [...new Set(fanned.map(ringOf))].sort((a, b) => a - b);
  const radiusOfRing = new Map<number, number>();
  {
    let prev = 0;
    for (const ring of ringIds) {
      const gap = minAngularGap(angled.filter((a) => a.ring === ring).map((a) => a.angle));
      let required = prev + RING_GAP;
      // 星が 1 つだけのリング (gap = 一周) は押し広げない。
      if (gap < Math.PI * 2) {
        const half = Math.min(gap / 2, Math.PI / 2);
        required = Math.max(required, MIN_SEPARATION / (2 * Math.sin(half)));
      }
      radiusOfRing.set(ring, required);
      prev = required;
    }
  }

  const maxRadius = Math.max(RING_GAP, ...radiusOfRing.values());
  const centerX = maxRadius + EDGE_PAD;
  const centerY = maxRadius + EDGE_PAD;

  const placed: RadialNode[] = [];
  if (singleCenter) {
    placed.push({
      node: singleCenter,
      x: centerX,
      y: centerY,
      ring: 0,
      sector: sectorKeyOf(singleCenter),
    });
  }
  for (const { node, sector, ring, angle } of angled) {
    const radius = radiusOfRing.get(ring) ?? RING_GAP;
    placed.push({
      node,
      ring,
      sector,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  }

  // 描画順を固定する (DOM の順が毎回変わると、フォーカス移動の順も変わる)。
  placed.sort(
    (a, b) => a.ring - b.ring || a.y - b.y || a.x - b.x || a.node.id.localeCompare(b.node.id),
  );

  const positionOf = new Map(placed.map((p) => [p.node.id, p]));
  const edges: RadialEdge[] = [];
  for (const node of nodes) {
    for (const prereqId of prereqsOf(node.id)) {
      const from = positionOf.get(prereqId);
      const to = positionOf.get(node.id);
      if (!from || !to) continue;
      edges.push({
        fromId: prereqId,
        toId: node.id,
        // 「満たしている」= 前提の星をクリア済み。評価器と同じ定義 (飛び級で開いた
        // 星はクリアではないので、線は破線のまま = 前提を飛ばしたことが見える)。
        satisfied: from.node.state === "cleared",
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
      });
    }
  }
  edges.sort((a, b) => a.fromId.localeCompare(b.fromId) || a.toId.localeCompare(b.toId));

  // 扇の見出しは、その扇に実在する星のいちばん外のリングの少し先に置く。
  const sectors = sectorKeys.map((key) => {
    const outermost = Math.max(
      RING_GAP,
      ...[...cells.values()]
        .filter((cell) => cell.sector === key)
        .map((cell) => radiusOfRing.get(cell.ring) ?? RING_GAP),
    );
    const mid = (sectorStart.get(key) ?? 0) + (sectorSpan.get(key) ?? 0) / 2;
    return {
      key,
      labelX: centerX + (outermost + EDGE_PAD / 2) * Math.cos(mid),
      labelY: centerY + (outermost + EDGE_PAD / 2) * Math.sin(mid),
    };
  });

  return {
    nodes: placed,
    edges,
    rings: ringIds.map((ring) => ({ ring, radius: radiusOfRing.get(ring) ?? RING_GAP })),
    sectors,
    bounds: {
      minX: Math.min(...placed.map((p) => p.x)),
      minY: Math.min(...placed.map((p) => p.y)),
      maxX: Math.max(...placed.map((p) => p.x)),
      maxY: Math.max(...placed.map((p) => p.y)),
    },
    width: (maxRadius + EDGE_PAD) * 2,
    height: (maxRadius + EDGE_PAD) * 2,
    centerX,
    centerY,
  };
}
