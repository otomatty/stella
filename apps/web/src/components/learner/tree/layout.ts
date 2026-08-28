/**
 * スキルツリーの座標計算 — 純関数。React も DOM も知らない (単体で試せる)。
 *
 * ## 決めたレイアウト: 「前提の深さ × カテゴリ列」
 *
 * 縦 (y) は **前提グラフのトポロジカル層** (root から数えた最長距離)。前提は必ず
 * 上から下へ向くので、線が上下にねじれない。横 (x) は **カテゴリの列**。同じ分野の
 * 星が 1 本の縦筋に並び、分野をまたぐ前提だけが斜めの線になる。
 *
 * 力学モデル (force-directed) は使わない。毎回同じ絵にならない (再取得のたびに星が
 * 動く) うえ、19 → 100 ステージに増えたときの見え方を保証できないため。ここは
 * 「並べ方が決まっている」ことを優先する — 同じ入力なら常に同じ座標。
 *
 * ## 霧の星の置き場
 *
 * 霧の星には前提の線が来ない (サーバが `prerequisite_ids` を落としている)。線が
 * 無い星は深さ 0 = 最上段に出てしまい、「まだ遠い星」が入口の隣に並ぶ。そこで
 * **どの線にも触れていない霧の星だけ** を最下段の 1 つ先へ送る。見えている星の前提
 * として参照されている霧の星は、その線に従って本来の深さに置く (線がねじれない)。
 */

import type { SkillMapStageNode } from "@/lib/skill-map-api";

/** 星 1 つぶんの間隔 (同じ層・同じ列に複数あるときの横のずらし幅)。 */
export const SUB_WIDTH = 132;
/** 列の最小幅。 */
export const MIN_COLUMN_WIDTH = 168;
/** 層の高さ。 */
export const ROW_HEIGHT = 116;

export interface TreeNode {
  node: SkillMapStageNode;
  /** 中心座標 (px)。 */
  x: number;
  y: number;
  depth: number;
  /** 属する列のキー (カテゴリ名 / 霧はテーマ名)。 */
  column: string;
}

export interface TreeEdge {
  /** 前提の側 (上)。 */
  fromId: string;
  /** その前提を要求する側 (下)。 */
  toId: string;
  /** 前提を満たしているか (= 前提の星がクリア済み)。実線 / 破線の別。 */
  satisfied: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface TreeLayout {
  nodes: TreeNode[];
  edges: TreeEdge[];
  width: number;
  height: number;
  /** 列見出し (カテゴリ名とその中心 x)。 */
  columns: { key: string; x: number }[];
}

/** 列のキー。霧の星はカテゴリを持たないのでテーマ名で括る (テーマ = 粗いカテゴリ)。 */
function columnKeyOf(node: SkillMapStageNode): string {
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
 * 星の座標と前提の線を組み立てる。
 *
 * 入力が同じなら出力も同じ (乱数も現在時刻も使わない)。
 */
export function layoutSkillTree(nodes: SkillMapStageNode[]): TreeLayout {
  if (nodes.length === 0) return { nodes: [], edges: [], width: 0, height: 0, columns: [] };

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
  // 線に触れていない霧の星は「その先」へ送る (最上段に居座らせない)。
  const depthOf = (node: SkillMapStageNode): number =>
    node.visibility === "fog" && !linked.has(node.id)
      ? maxLinkedDepth + 1
      : (depths.get(node.id) ?? 0);

  const columnKeys = [...new Set(nodes.map(columnKeyOf))].sort((a, b) => a.localeCompare(b, "ja"));
  const columnIndex = new Map(columnKeys.map((key, i) => [key, i]));

  /**
   * (列 × 層) ごとの星。同じマスに複数あれば横に散らす。
   *
   * キーは列の **番号** と層で組む — カテゴリ名をそのまま繋ぐと、名前に区切り文字が
   * 入っているカテゴリでキーが壊れる。
   */
  interface Bucket {
    column: string;
    depth: number;
    list: SkillMapStageNode[];
  }
  const buckets = new Map<string, Bucket>();
  for (const node of nodes) {
    const column = columnKeyOf(node);
    const depth = depthOf(node);
    const key = `${columnIndex.get(column) ?? 0}:${depth}`;
    const bucket = buckets.get(key) ?? { column, depth, list: [] };
    bucket.list.push(node);
    buckets.set(key, bucket);
  }
  for (const bucket of buckets.values()) {
    bucket.list.sort(
      (a, b) => sortKeyOf(a).localeCompare(sortKeyOf(b), "ja") || a.id.localeCompare(b.id),
    );
  }

  /**
   * 列の幅は **その列でいちばん混んだマス** に合わせる。
   *
   * 全体のいちばん混んだマスに合わせて全列を同じ幅にすると、根 (前提なし) の星が
   * 多い 1 列のせいで他の列まで間延びし、線が画面外まで伸びる。列ごとに詰める。
   */
  const widthOfColumn = new Map<string, number>();
  for (const key of columnKeys) {
    const busiest = Math.max(
      1,
      ...[...buckets.values()].filter((b) => b.column === key).map((b) => b.list.length),
    );
    widthOfColumn.set(key, Math.max(MIN_COLUMN_WIDTH, busiest * SUB_WIDTH));
  }
  /** 列の左端 x (幅の累積)。 */
  const leftOfColumn = new Map<string, number>();
  let cursor = 0;
  for (const key of columnKeys) {
    leftOfColumn.set(key, cursor);
    cursor += widthOfColumn.get(key) ?? MIN_COLUMN_WIDTH;
  }
  const totalWidth = cursor;
  const maxDepth = Math.max(...nodes.map(depthOf));

  const centerOfColumn = (key: string): number =>
    (leftOfColumn.get(key) ?? 0) + (widthOfColumn.get(key) ?? MIN_COLUMN_WIDTH) / 2;

  const placed: TreeNode[] = [];
  for (const { column, depth, list } of buckets.values()) {
    const centerX = centerOfColumn(column);
    list.forEach((node, i) => {
      placed.push({
        node,
        column,
        depth,
        x: centerX + (i - (list.length - 1) / 2) * SUB_WIDTH,
        y: depth * ROW_HEIGHT + ROW_HEIGHT / 2,
      });
    });
  }

  // 描画順を固定する (DOM の順が毎回変わると、フォーカス移動の順も変わる)。
  placed.sort((a, b) => a.y - b.y || a.x - b.x || a.node.id.localeCompare(b.node.id));

  const positionOf = new Map(placed.map((p) => [p.node.id, p]));
  const edges: TreeEdge[] = [];
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

  return {
    nodes: placed,
    edges,
    width: totalWidth,
    height: (maxDepth + 1) * ROW_HEIGHT,
    columns: columnKeys.map((key) => ({ key, x: centerOfColumn(key) })),
  };
}
