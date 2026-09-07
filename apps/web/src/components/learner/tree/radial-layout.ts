/**
 * スキルツリーの星座レイアウト — 純関数。React も DOM も知らない (単体で試せる)。
 *
 * ## 決めたレイアウト: 「前提の深さ × カテゴリ扇形」の放射 + 離れた島
 *
 * 中心に入口の星 (前提なし)、外へ向かって **前提グラフのトポロジカル層** (root から
 * 数えた最長距離) が半径になる。角度は **カテゴリの扇形** で、同じ分野の星が
 * 1 つの扇にまとまり、前提の線がおおむね放射状に走る。
 * 「基礎をクリアすると外側の星が開いていく」という進行の向きが、絵の向きと一致する。
 *
 * 力学モデル (force-directed) は使わない。毎回同じ絵にならない (再取得のたびに星が
 * 動く) ため。ここは決定性を最優先する — 同じ入力なら常に同じ座標。
 *
 * ## 扇の中は「必要な角度だけ」詰める (極座標の tidy tree)
 *
 * 同心円は半径が深さに比例して伸びるので、角度を扇の幅で等分すると **外周ほど
 * 星がまばらになる**。そこで各星が要る角度幅を `名前札の幅 / その星の半径` で求め
 * (深いほど狭い)、部分木の幅 = max(自分の幅, 子の幅の和)、親は子の中央、と
 * 内側へ畳んでいく。隣との直線距離が深さに関係なく `MIN_SEPARATION` 前後で揃い、
 * 扇は必要なぶんだけの角度を取る。余った角度は扇と扇の間の「空」に均等に配る —
 * 枝の間が空くのはゲームのスキルツリーの星座と同じで、線が無い所は何も無い。
 *
 * 必要な角度の合計が一周を超えるときだけ、半径を一様に伸ばして収める
 * (角度は半径に反比例するので、伸ばした倍率ぶん縮む)。
 *
 * ## 星座のゆらぎ
 *
 * 星を扇の中央線と深さの円周にぴったり載せると、直列の講座が定規で引いた線に
 * なる。星 (`instanceId`) のハッシュで角度と半径を少しずらし、鎖が折れて星座に
 * 見えるようにする。乱数ではなくハッシュなので決定的。角度のずれは自分の幅の
 * 余白の中に収め、半径のずれは 1 歩 (`DEPTH_STEP`) の一部にとどめるので、上の
 * 間隔の保証は崩れない。同心円のガイドはずらした星と合わなくなるので描かない。
 *
 * ## 島 — 本土から離れた独立星団
 *
 * `SKILL_MAP_ISLANDS` のカテゴリ (資格 / AI / DevOps) は本土の扇に混ぜず、**本土の外周を
 * 回る軌道の上に独立した小さな星団**として置く。島の中は本土と同じ tidy tree
 * (根が中心、深さは同心円)。根を直接の前提に持つ星は第 1 リングに並び、余りは
 * その兄弟の間に入る (本土の入口直下の FE / BE と同じ)。一人っ子の鎖は放射の 1 本。
 * **本土と島を結ぶ線は引かない** (表示条件は複数になりうるので、線 1 本では嘘に
 * なる)。島がそもそも応答に入るかはサーバが表示条件で決める — ここは届いた星を
 * 並べるだけ。
 *
 * ## 霧の星と幽霊ノードの置き場
 *
 * どの線にも触れていない「霧より先」の星だけを最外の深さの 1 つ先へ送る (前提の線が
 * 来ない星は深さ 0 になり、中心に居座ってしまうため)。見えている星の前提として
 * 参照されている星は、線に従って本来の深さに置く。
 *
 * 3 歩先の星 (`visibility === "edge"`) は **幽霊ノード** — ここでは普通に座標を計算し、
 * 星を描かないのは `SkillTree.tsx` の仕事。線の終点にその座標が要るので、レイアウトから
 * 落とすわけにはいかない (落とすと線の長さと向きを決め打ちにする羽目になる)。
 */

import { isStarVisible } from "@stella/shared/skill-map/evaluate";
import { SKILL_MAP_ISLAND_CATEGORIES } from "@stella/shared/skill-map/islands";

import type { SkillMapStageNode } from "@/lib/skill-map-api";

/**
 * 深さ 1 段ぶんの半径 (px) = 前提の線 1 本の基本の長さ。中心の星 (描画半径 22 +
 * グロー) から最初の星が近すぎると、IT → HTML/CSS のような最初の枝が星に飲み込まれて
 * 線が無いように見える。同じ深さの間隔は `MIN_SEPARATION` が担い、こちらは深さ方向。
 */
export const DEPTH_STEP = 110;
/**
 * 隣り合う星どうしの最小距離 (px)。**弧長ではなく直線距離 (弦長)**。
 *
 * 星の核は 32px、名前札 (8px 2 行) の実効幅は 56px 前後。核だけなら 40 で足りるが、
 * 横に並んだ隣の名前札どうしが触れるので、札の幅を下限にする。
 */
export const MIN_SEPARATION = 56;
/** いちばん外の星から盤面の縁までの余白 (扇ラベルぶん)。 */
export const EDGE_PAD = 72;
/**
 * 角度幅を求めるときの安全率。ゆらぎで半径が上下しても弦長が `MIN_SEPARATION` を
 * 割らないように、名前札の幅を少し太く見積もる。
 */
const SEPARATION_MARGIN = 1.15;
/** 扇と扇の間に空ける「空」の最小角 (rad)。扇が多いときは一周を均等に割る。 */
const SECTOR_GAP = 0.35;
/** 扇の始まり (真上)。名前順の最初の扇をここに向け、あとは時計回り。 */
const START_ANGLE = -Math.PI / 2;
/** 星座のゆらぎ: 角度方向 (弧長 px)。自分の幅の余白を超えない。 */
const JITTER_ARC = 50;
/** 星座のゆらぎ: 半径方向 (px)。1 歩 (`DEPTH_STEP`) の 2 割弱 — 前後の星との間隔が残る。 */
const JITTER_RADIAL = 20;
/** 本土の外周と島の外接の間に空ける「海」(px)。橋線が無いぶん、離して別物に見せる。 */
const ISLAND_GAP = 110;
/** 島のいちばん外の星から、軌道間隔に使う外接までの余白 (px)。円は描かない。 */
const ISLAND_PAD = 56;
/**
 * 島タイトルを星団のいちばん上の星の縁からどれだけ浮かせるか (px)。
 * 星の核は ring 0 が 22px、ほかは 16px (`SkillTree.tsx` の h-11 / h-8)。
 */
const ISLAND_LABEL_PAD = 10;
const STAR_R_ROOT = 22;
const STAR_R = 16;

export interface RadialNode {
  node: SkillMapStageNode;
  /**
   * 盤面上のこの星の識別子。同じステージを複数の扇に置くとき `id` が重複するので、
   * 描画の key / 線の端点はこちらを使う。複製が無ければ `node.id` と同じ。
   */
  instanceId: string;
  /** 中心座標 (px)。盤面の左上が原点。 */
  x: number;
  y: number;
  /** 前提の深さ (0 = 中心)。 */
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

/** 本土から離れて浮かぶ島 (タイトルとジャンプ / 端の矢印の目印)。 */
export interface RadialIsland {
  /** 島のキー = カテゴリ名。そのまま島タイトルになる。 */
  key: string;
  /** 島の中心 (盤面座標)。 */
  cx: number;
  cy: number;
  /** 軌道間隔用の半径 (星の外接 + 余白)。円は描かない。 */
  radius: number;
  /** タイトルの置き場所 (星団のいちばん上の星のすぐ上)。 */
  labelX: number;
  labelY: number;
}

export interface RadialLayout {
  nodes: RadialNode[];
  edges: RadialEdge[];
  /** 扇の見出し (カテゴリ名と、その置き場所)。本土のぶんだけ (島はタイトルで示す)。 */
  sectors: { key: string; labelX: number; labelY: number }[];
  /** 本土から離れて浮かぶ島。 */
  islands: RadialIsland[];
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

/**
 * 同じステージを複数の扇に置く。実体 (`node.id`) は変えず、扇だけ差し替える。
 * 扇ごとの親があれば、その複製の線と鍵はその親だけを見る。親が未解決の扇には
 * 線を引かない — 別扇の親に付け替えると、違う扇の星から生えて鍵も別物になる。
 * 空 / 未設定ならそのまま (category の扇に 1 つ)。
 */
function expandAppearances(nodes: SkillMapStageNode[]): SkillMapStageNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out: SkillMapStageNode[] = [];
  for (const node of nodes) {
    const unique = [
      ...new Set((node.appearances ?? []).map((s) => s.trim()).filter((s) => s !== "")),
    ];
    if (unique.length === 0) {
      out.push(node);
      continue;
    }
    // 複製が扇の親を失う前に、扇の親を全部控えておく (飛び級の判定に要る)。
    const sectorParentIds = Object.values(node.appearance_parent_ids ?? {});
    for (const sector of unique) {
      const parentId = node.appearance_parent_ids?.[sector];
      out.push(
        lockCopyToSector(
          {
            ...node,
            category: sector,
            appearances: undefined,
            appearance_parent_ids: undefined,
            parent_id: parentId,
          },
          byId,
          sectorParentIds,
        ),
      );
    }
  }
  return out;
}

/**
 * 実体は片方の扇で開いていても、満たしていない扇の複製は鍵のままにする。
 * クリア済み / 進行中 / 霧はサーバの状態をそのまま使う。
 *
 * サーバが locked と言った複製は開かない — 扇ごとの親が欠けている扇でも、
 * 開く条件を知っているのはサーバなので、ここで開錠に倒さない。
 *
 * 飛び級 (腕試し) で開いた実体は扇の親が 1 つも cleared でないので、扇ごとの
 * 鍵に落とさず全複製を開いたままにする。落とすと「開いているのにどの扇でも鍵」
 * になり、受講者から始める導線が消える。
 */
function lockCopyToSector(
  copy: SkillMapStageNode,
  byId: ReadonlyMap<string, SkillMapStageNode>,
  sectorParentIds: readonly string[],
): SkillMapStageNode {
  // 霧より先はサーバの段をそのまま使う (名前も解放条件も無いので扇ごとの鍵は要らない)。
  if (!isStarVisible(copy.visibility)) return copy;
  if (copy.state === "cleared" || copy.state === "active" || copy.state === "locked") return copy;
  const isCleared = (id: string | undefined): boolean =>
    id !== undefined && byId.get(id)?.state === "cleared";
  if (!sectorParentIds.some(isCleared)) return copy;
  const parentId = copy.parent_id;
  if (parentId === undefined || isCleared(parentId)) {
    return { ...copy, state: "unlocked", lock_reasons: undefined };
  }
  return {
    ...copy,
    state: "locked",
    can_do: undefined,
    lock_reasons: [byId.get(parentId)?.title ?? "非公開の教材"],
  };
}

/** 盤面上の識別子。id が重複する複製だけ `id::扇` にする (線のテストを壊さないため)。 */
function instanceIdOf(node: SkillMapStageNode, duplicatedIds: ReadonlySet<string>): string {
  return duplicatedIds.has(node.id) ? `${node.id}::${sectorKeyOf(node)}` : node.id;
}

function duplicatedIdsOf(nodes: SkillMapStageNode[]): Set<string> {
  const counts = new Map<string, number>();
  for (const node of nodes) counts.set(node.id, (counts.get(node.id) ?? 0) + 1);
  return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id));
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
  keyOf: (node: SkillMapStageNode) => string,
  prereqsOf: (node: SkillMapStageNode) => SkillMapStageNode[],
  /** 島は最短経路 (根の直下を第 1 リングに並べる)。本土は最長 (鎖の段数)。 */
  shortest = false,
): Map<string, number> {
  const depths = new Map<string, number>();
  const visiting = new Set<string>();

  const depthOf = (node: SkillMapStageNode): number => {
    const key = keyOf(node);
    const cached = depths.get(key);
    if (cached !== undefined) return cached;
    if (visiting.has(key)) return 0; // 循環。ここで打ち切る。
    visiting.add(key);
    const prereqs = prereqsOf(node);
    const depth =
      prereqs.length === 0
        ? 0
        : 1 + (shortest ? Math.min(...prereqs.map(depthOf)) : Math.max(...prereqs.map(depthOf)));
    visiting.delete(key);
    depths.set(key, depth);
    return depth;
  };

  for (const node of nodes) depthOf(node);
  return depths;
}

/**
 * 文字列から [-1, 1) の決定的な値を 2 つ作る (星座のゆらぎ用)。FNV-1a を 2 回
 * (2 つ目は種を変える)。乱数ではないので、同じ星は常に同じ向きにずれる。
 */
function jitterOf(key: string): [number, number] {
  const fnv = (seed: number): number => {
    let h = seed >>> 0;
    for (let i = 0; i < key.length; i++) {
      h ^= key.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return (h / 0x100000000) * 2 - 1;
  };
  return [fnv(0x811c9dc5), fnv(0x050c5d1f)];
}

/**
 * 余った角度を兄弟の間に均等に挟む。1 人ならその子が区間全体を使う (鎖は 1 本)。
 */
function spread(
  members: SkillMapStageNode[],
  from: number,
  span: number,
  place: (n: SkillMapStageNode, from: number, width: number) => void,
  widthOf: (n: SkillMapStageNode) => number,
): void {
  if (members.length === 0) return;
  const only = members[0];
  if (members.length === 1 && only) {
    place(only, from, span);
    return;
  }
  const needed = members.reduce((sum, n) => sum + widthOf(n), 0);
  const leftover = Math.max(0, span - needed);
  const memberGap = leftover / members.length;
  let cursor = from + memberGap / 2;
  for (const member of members) {
    const w = widthOf(member);
    place(member, cursor, w);
    cursor += w + memberGap;
  }
}

const EMPTY_LAYOUT: RadialLayout = {
  nodes: [],
  edges: [],
  sectors: [],
  islands: [],
  bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
  width: 0,
  height: 0,
  centerX: 0,
  centerY: 0,
};

/**
 * 1 つの星団 (本土 or 島 1 つ) の座標と前提の線を組み立てる。
 *
 * 入力が同じなら出力も同じ (乱数も現在時刻も使わない)。星団の外にある前提
 * (島の根が持つ本土の前提など) は `prereqsOf` が落とすので、線も引かれず
 * 深さにも数えられない — 島の根は島の中心になる。
 *
 * `fillCircle`: 余った角度を扇の外の空ではなく、木の兄弟の間に配る。島は
 * カテゴリが 1 つで扇も 1 つなので、これを立てないと星が楔に詰まる。
 */
function layoutCluster(nodes: SkillMapStageNode[], opts?: { fillCircle?: boolean }): RadialLayout {
  if (nodes.length === 0) return EMPTY_LAYOUT;
  const fillCircle = opts?.fillCircle === true;

  const duplicatedIds = duplicatedIdsOf(nodes);
  const known = new Set(nodes.map((n) => n.id));
  // 複製は id が同じでも親が扇で違うので、線と深さは **その星自身** の `parent_id` を見る。
  // 配列で返すのは下流 (深さ・木・線) が「前提の並び」で書かれているため。要素は高々 1。
  const prereqsOfNode = (node: SkillMapStageNode): string[] =>
    node.parent_id !== undefined && known.has(node.parent_id) && node.parent_id !== node.id
      ? [node.parent_id]
      : [];
  /** 複製を区別する鍵 (`id::扇`)。複製が無くても同じ形にしておく。 */
  const keyOf = (node: SkillMapStageNode): string => `${node.id}::${sectorKeyOf(node)}`;
  /**
   * 前提の星 (複製の解決込み)。前提が複製されていれば **同じ扇の複製** を親にする
   * (FE の Git は JS の次、BE の Git は Node の次 — 深さも扇ごとに数える)。
   * 同じ扇に無ければ全部の複製を見る (いちばん深い複製の次に置く)。
   */
  const prereqNodesOf = (node: SkillMapStageNode): SkillMapStageNode[] =>
    prereqsOfNode(node).flatMap((id) => {
      const copies = nodes.filter((n) => n.id === id);
      const sameSector = copies.find((c) => sectorKeyOf(c) === sectorKeyOf(node));
      return sameSector ? [sameSector] : copies;
    });

  const depths = computeDepths(nodes, keyOf, prereqNodesOf, fillCircle);
  const linked = new Set<string>();
  for (const node of nodes) {
    for (const prereq of prereqNodesOf(node)) {
      linked.add(keyOf(node));
      linked.add(keyOf(prereq));
    }
  }
  const maxLinkedDepth = Math.max(
    0,
    ...nodes.filter((n) => linked.has(keyOf(n))).map((n) => depths.get(keyOf(n)) ?? 0),
  );
  // 線に触れていない「霧より先」の星は「その先」へ送る (中心に居座らせない)。
  const ringOf = (node: SkillMapStageNode): number =>
    node.visibility !== "full" && !linked.has(keyOf(node))
      ? maxLinkedDepth + 1
      : (depths.get(keyOf(node)) ?? 0);

  // 中心 (深さ 0) が 1 つだけなら真ん中の 1 点に置く。それ以外は扇で分ける。
  const ring0 = nodes.filter((n) => ringOf(n) === 0);
  const singleCenter = ring0.length === 1 ? ring0[0] : undefined;

  /** 扇に載る星 (中心の 1 点は除く)。 */
  const fanned = nodes.filter((n) => n !== singleCenter);

  /**
   * 基本の半径 = 扇に載る深さの順位 × 1 歩。中心が 1 点なら深さ 1 が 1 歩目、
   * 前提なしが複数あって中心が無ければ深さ 0 が 1 歩目 (中心の 1 点に重ねない)。
   */
  const ringIds = [...new Set(fanned.map(ringOf))].sort((a, b) => a - b);
  const rankOfRing = new Map(ringIds.map((ring, i) => [ring, i + 1]));
  const baseRadiusOf = (node: SkillMapStageNode): number =>
    (rankOfRing.get(ringOf(node)) ?? 1) * DEPTH_STEP;
  /** その星が要る角度幅 (rad)。名前札の幅を、その星の半径で割ったもの。 */
  const needOf = (node: SkillMapStageNode): number =>
    (MIN_SEPARATION * SEPARATION_MARGIN) / baseRadiusOf(node);

  const byName = (a: SkillMapStageNode, b: SkillMapStageNode) =>
    sortKeyOf(a).localeCompare(sortKeyOf(b), "ja") || a.id.localeCompare(b.id);

  /**
   * 扇ごとの「前提の木」。木の親は「同じ扇にいる、より内側の前提」から選ぶ
   * (いちばん外を優先)。扇をまたぐ前提しか持たない星は、その扇の根として扱う。
   * 親のリングが子より内側である以上、木に循環は無い (深さが単調に増えるため)。
   *
   * 部分木の角度幅 = max(自分の幅, 子の幅の和)。親は子の中央に立ち、直列の講座は
   * 放射状の 1 本線、枝分かれは親の左右へ開く。
   */
  interface SectorTree {
    key: string;
    roots: SkillMapStageNode[];
    childrenOf: Map<string, SkillMapStageNode[]>;
    widthOf: (n: SkillMapStageNode) => number;
    width: number;
  }
  const sectorKeys = [...new Set(fanned.map(sectorKeyOf))].sort((a, b) => a.localeCompare(b, "ja"));
  const trees: SectorTree[] = sectorKeys.map((key) => {
    const members = fanned.filter((n) => sectorKeyOf(n) === key);
    const memberIds = new Set(members.map((m) => m.id));
    const childrenOf = new Map<string, SkillMapStageNode[]>();
    const roots: SkillMapStageNode[] = [];
    for (const member of members) {
      // 複製がある id は byId だと片方しか引けないので、この扇にいる複製を引く。
      const parent = prereqsOfNode(member)
        .filter((p) => memberIds.has(p))
        .map((p) => members.find((m) => m.id === p))
        .filter((p): p is SkillMapStageNode => p !== undefined && ringOf(p) < ringOf(member))
        .sort((a, b) => ringOf(b) - ringOf(a) || byName(a, b))[0];
      if (parent) {
        const siblings = childrenOf.get(parent.id) ?? [];
        siblings.push(member);
        childrenOf.set(parent.id, siblings);
      } else {
        roots.push(member);
      }
    }
    roots.sort(byName);
    for (const siblings of childrenOf.values()) siblings.sort(byName);

    const widths = new Map<string, number>();
    const widthOf = (n: SkillMapStageNode): number => {
      const cached = widths.get(n.id);
      if (cached !== undefined) return cached;
      const children = childrenOf.get(n.id) ?? [];
      const width = Math.max(
        needOf(n),
        children.reduce((sum, child) => sum + widthOf(child), 0),
      );
      widths.set(n.id, width);
      return width;
    };
    const width = roots.reduce((sum, root) => sum + widthOf(root), 0);
    return { key, roots, childrenOf, widthOf, width };
  });

  /**
   * 必要な角度の合計が「一周 − 扇の間の空」を超えるときだけ、半径を一様に伸ばす。
   * 角度は半径に反比例するので、`scale` 倍に伸ばせば必要な角度は 1/scale になる。
   */
  const sectorGap = fillCircle
    ? 0
    : trees.length > 0
      ? Math.min(SECTOR_GAP, Math.PI / trees.length)
      : 0;
  const available = Math.PI * 2 - sectorGap * trees.length;
  const totalWidth = trees.reduce((sum, t) => sum + t.width, 0);
  const scale = Math.max(1, totalWidth / Math.max(1e-9, available));
  const radiusOf = (node: SkillMapStageNode): number => baseRadiusOf(node) * scale;

  /**
   * 角度を確定させる。名前順の最初の扇を真上に向け、あとは時計回りに、扇と扇の
   * 間に余った角度を均等に挟む。ゆらぎは自分の幅の余白の範囲内 + 半径方向は
   * 1 歩の一部だけなので、上で見積もった間隔は崩れない。
   *
   * `fillCircle` のときは余りを扇の外に置かず、兄弟 (同じ親の子 / 扇の根どうし)
   * の間に均等に挟む。一人っ子は親の幅を受け継ぐので、鎖は放射の 1 本のまま。
   */
  interface AngledNode {
    node: SkillMapStageNode;
    sector: string;
    ring: number;
    angle: number;
    radius: number;
  }
  const angled: AngledNode[] = [];
  const sectorMid = new Map<string, number>();
  {
    const spare = Math.max(0, Math.PI * 2 - totalWidth / scale);
    const gap = fillCircle || trees.length === 0 ? 0 : spare / trees.length;
    const firstSpan = fillCircle
      ? trees.length > 0
        ? available / trees.length
        : 0
      : (trees[0]?.width ?? 0) / scale;
    let cursor = START_ANGLE - firstSpan / 2;
    for (const tree of trees) {
      const span = fillCircle ? available / Math.max(1, trees.length) : tree.width / scale;
      sectorMid.set(tree.key, cursor + span / 2);
      const widthOfScaled = (n: SkillMapStageNode): number => tree.widthOf(n) / scale;
      const place = (n: SkillMapStageNode, from: number, width: number): void => {
        const radius = radiusOf(n);
        const need = needOf(n) / scale;
        const [ja, jr] = jitterOf(keyOf(n));
        const slack = Math.max(0, width - need);
        angled.push({
          node: n,
          sector: tree.key,
          ring: ringOf(n),
          angle: from + width / 2 + ja * Math.min(slack / 2, JITTER_ARC / radius),
          radius: radius + jr * JITTER_RADIAL,
        });
        const children = tree.childrenOf.get(n.id) ?? [];
        const only = children[0];
        if (children.length === 1 && only) {
          // 一人っ子は親の幅をそのまま受け継ぐ (直列の鎖は放射の 1 本)。
          place(only, from, width);
          return;
        }
        if (fillCircle) {
          spread(children, from, width, place, widthOfScaled);
          return;
        }
        // 本土: 兄弟は必要角だけ詰めて親の中央に寄せ、余りは扇の外の空。
        const childrenWidth = children.reduce((sum, c) => sum + widthOfScaled(c), 0);
        let childCursor = from + (width - childrenWidth) / 2;
        for (const child of children) {
          const childWidth = widthOfScaled(child);
          place(child, childCursor, childWidth);
          childCursor += childWidth;
        }
      };
      if (fillCircle) {
        spread(tree.roots, cursor, span, place, widthOfScaled);
        cursor += span;
      } else {
        for (const root of tree.roots) {
          const width = widthOfScaled(root);
          place(root, cursor, width);
          cursor += width;
        }
        cursor += gap;
      }
    }
  }

  const maxRadius = Math.max(DEPTH_STEP, ...angled.map((a) => a.radius));
  const centerX = maxRadius + EDGE_PAD;
  const centerY = maxRadius + EDGE_PAD;

  const placed: RadialNode[] = [];
  if (singleCenter) {
    const sector = sectorKeyOf(singleCenter);
    placed.push({
      node: singleCenter,
      instanceId: instanceIdOf(singleCenter, duplicatedIds),
      x: centerX,
      y: centerY,
      ring: 0,
      sector,
    });
  }
  for (const { node, sector, ring, angle, radius } of angled) {
    placed.push({
      node,
      instanceId: instanceIdOf(node, duplicatedIds),
      ring,
      sector,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  }

  // 描画順を固定する (DOM の順が毎回変わると、フォーカス移動の順も変わる)。
  placed.sort(
    (a, b) => a.ring - b.ring || a.y - b.y || a.x - b.x || a.instanceId.localeCompare(b.instanceId),
  );

  const placedOfCanonical = (canonicalId: string, preferSector: string): RadialNode | undefined =>
    placed.find((p) => p.instanceId === canonicalId) ??
    placed.find((p) => p.node.id === canonicalId && p.sector === preferSector) ??
    placed.find((p) => p.node.id === canonicalId);

  const edges: RadialEdge[] = [];
  // 線は 1 星 (複製は 1 複製) につき親からの 1 本。前提が複数でも線は増えない。
  for (const to of placed) {
    for (const prereqId of prereqsOfNode(to.node)) {
      const from = placedOfCanonical(prereqId, to.sector);
      if (!from) continue;
      edges.push({
        fromId: from.instanceId,
        toId: to.instanceId,
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

  // 扇の見出しは、その扇のいちばん外の星の少し先 (扇の中央線上) に置く。
  const sectors = sectorKeys.map((key) => {
    const outermost = Math.max(
      DEPTH_STEP,
      ...angled.filter((a) => a.sector === key).map((a) => a.radius),
    );
    const mid = sectorMid.get(key) ?? START_ANGLE;
    return {
      key,
      labelX: centerX + (outermost + EDGE_PAD / 2) * Math.cos(mid),
      labelY: centerY + (outermost + EDGE_PAD / 2) * Math.sin(mid),
    };
  });

  return {
    nodes: placed,
    edges,
    sectors,
    islands: [],
    bounds: boundsOf(placed),
    width: (maxRadius + EDGE_PAD) * 2,
    height: (maxRadius + EDGE_PAD) * 2,
    centerX,
    centerY,
  };
}

function boundsOf(nodes: RadialNode[]): RadialBounds {
  return {
    minX: Math.min(...nodes.map((p) => p.x)),
    minY: Math.min(...nodes.map((p) => p.y)),
    maxX: Math.max(...nodes.map((p) => p.x)),
    maxY: Math.max(...nodes.map((p) => p.y)),
  };
}

/** 星団まるごとの平行移動 (組み上げ時に本土 / 島を最終位置へ運ぶ)。 */
function shiftCluster(layout: RadialLayout, dx: number, dy: number) {
  return {
    nodes: layout.nodes.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })),
    edges: layout.edges.map((e) => ({
      ...e,
      x1: e.x1 + dx,
      y1: e.y1 + dy,
      x2: e.x2 + dx,
      y2: e.y2 + dy,
    })),
    sectors: layout.sectors.map((s) => ({ ...s, labelX: s.labelX + dx, labelY: s.labelY + dy })),
  };
}

/**
 * 星団の外接: クラスタ原点 (深さ 0 の根) からいちばん遠い星までの距離。
 * 本土と同じく根を中心に置く。扇が 1 つでも外接の真ん中へずらさない —
 * ずらすと根が縁に寄り、同心円に見えなくなる。円は描かないが、島どうしが
 * 重ならない軌道半径の計算に使う。
 */
function clusterExtentOf(layout: RadialLayout): { cx: number; cy: number; extent: number } {
  const cx = layout.centerX;
  const cy = layout.centerY;
  const extent = Math.max(0, ...layout.nodes.map((p) => Math.hypot(p.x - cx, p.y - cy)));
  return { cx, cy, extent };
}

/** 星団のいちばん上の星の縁のすぐ上。タイトルの下端をここに置く。 */
function islandLabelY(nodes: RadialNode[]): number {
  const top = Math.min(...nodes.map((p) => p.y - (p.ring === 0 ? STAR_R_ROOT : STAR_R)));
  return top - ISLAND_LABEL_PAD;
}

/**
 * 盤面全体を組み立てる: 本土 (島でないカテゴリ) + 島たち。
 *
 * 島は本土の外周を回る 1 つの軌道の上に、キー順 (ja) で真上から時計回りに
 * 等間隔で置く。軌道の半径は「本土に触れない」「島どうしが触れない」の両方を
 * 満たすまで広げる。島が 1 つも無ければ本土だけの盤面になる (従来と同じ)。
 */
export function layoutRadialSkillTree(nodes: SkillMapStageNode[]): RadialLayout {
  const expanded = expandAppearances(nodes);
  const islandNodes = new Map<string, SkillMapStageNode[]>();
  const mainlandNodes: SkillMapStageNode[] = [];
  for (const node of expanded) {
    const category = node.category ?? "";
    if (SKILL_MAP_ISLAND_CATEGORIES.has(category)) {
      islandNodes.set(category, [...(islandNodes.get(category) ?? []), node]);
    } else {
      mainlandNodes.push(node);
    }
  }

  const main = layoutCluster(mainlandNodes);
  if (islandNodes.size === 0) return main;

  const islandKeys = [...islandNodes.keys()].sort((a, b) => a.localeCompare(b, "ja"));
  const clusters = islandKeys.map((key) => {
    const layout = layoutCluster(islandNodes.get(key) ?? [], { fillCircle: true });
    return { key, layout, extent: clusterExtentOf(layout) };
  });
  const orbitRadii = clusters.map((c) => c.extent.extent + ISLAND_PAD);
  const maxOrbit = Math.max(...orbitRadii);

  // 軌道半径: 本土と重ならない距離を基本に、島どうしの間隔 (隣の島との弦長) でも広げる。
  const mainOuter =
    main.nodes.length === 0
      ? 0
      : Math.max(...main.nodes.map((p) => Math.hypot(p.x - main.centerX, p.y - main.centerY)));
  let orbit = mainOuter + ISLAND_GAP + maxOrbit;
  if (clusters.length >= 2) {
    orbit = Math.max(
      orbit,
      (2 * maxOrbit + ISLAND_GAP) / (2 * Math.sin(Math.PI / clusters.length)),
    );
  }

  const half = Math.max(mainOuter, orbit + maxOrbit) + EDGE_PAD;
  const shiftedMain = shiftCluster(main, half - main.centerX, half - main.centerY);

  const islands: RadialIsland[] = [];
  const nodesOut = [...shiftedMain.nodes];
  const edgesOut = [...shiftedMain.edges];
  clusters.forEach(({ key, layout, extent }, i) => {
    const angle = START_ANGLE + (Math.PI * 2 * i) / clusters.length;
    const cx = half + orbit * Math.cos(angle);
    const cy = half + orbit * Math.sin(angle);
    const shifted = shiftCluster(layout, cx - extent.cx, cy - extent.cy);
    nodesOut.push(...shifted.nodes);
    edgesOut.push(...shifted.edges);
    const radius = orbitRadii[i] ?? maxOrbit;
    islands.push({
      key,
      cx,
      cy,
      radius,
      labelX: cx,
      labelY: islandLabelY(shifted.nodes),
    });
  });

  return {
    nodes: nodesOut,
    edges: edgesOut,
    // 扇の見出しは本土のぶんだけ。島は 1 カテゴリ = 1 島なので、扇見出しではなく
    // 島タイトル (islands) が名前を出す。
    sectors: shiftedMain.sectors,
    islands,
    bounds: boundsOf(nodesOut),
    width: half * 2,
    height: half * 2,
    centerX: half,
    centerY: half,
  };
}
