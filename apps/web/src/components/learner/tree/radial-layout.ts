/**
 * スキルツリーの星座レイアウト — 純関数。React も DOM も知らない (単体で試せる)。
 *
 * ## 決めたレイアウト: 本土は「枝の腕」、島は錨のそば
 *
 * 本土 (島でないカテゴリ) は、入口を根にした 1 本の木なら **枝の腕** で置く。
 * 線 1 本の長さは `BRANCH_STEP`。子は部分木の星が多い順 (同数は表示名、さらに id)
 * に並び、根の子は扇状に開く。その先の一人っ子は、直前の枝分かれから数えた歩数
 * `run` が `STRAIGHT` 以上のときだけ `CURL` だけ折れ、枝分かれは `SPLIT` で開く。
 * 画面の y は下向きなので、正の角は時計回り。乱数も現在時刻も使わない。
 *
 * 角度の組は GAP {90, 110, 130, 150, 180}°、SPLIT {40, 50, 60}°、
 * CURL {20, 30, 40}°、STRAIGHT {0, 1} の順で全部試し、星が `BRANCH_MIN_DIST`
 * 以上離れ、線分が端点以外で交差しない候補だけ残す。スコアは根からいちばん遠い
 * 星までの距離 R に、根と全星の重心のずれ off の 0.8 倍を足したもの。最小の組を
 * 採り、同点は列挙の先を採る。
 *
 * 次のどれかなら枝の腕は使わず、従来の放射 (`layoutCluster`。深さ = 半径、
 * カテゴリ = 扇) に戻す。
 * - 星団の中に親を持たない星がちょうど 1 つでない。
 * - 同じステージの複製がある (id が重複する)。
 * - 上の条件を満たす角度の組が 1 つも無い。
 *
 * ## 島 — 錨にした星の外側
 *
 * `SKILL_MAP_ISLANDS` のカテゴリは本土の木に混ぜない。島の中の並びは従来どおり
 * 放射 (根が中心、余りは兄弟の間)。置き場所だけ、島の根の親 (錨) で決める。
 * 錨が本土の星 (根以外) ならその星の方向、別の島の星ならその島の角度、
 * それ以外 (本土の根・親が無い・盤面に無い) は、既に使った角度のいちばん広い
 * 隙間へキー順に等間隔で置く。使った角度が無ければ真上から時計回りに等分する。
 * 島は根を中心に回し、星の重心が外を向くようにしてから、本土の張り出しの外へ
 * `ISLAND_SEA` だけ離して置く。衝突円が重なる島は 0.5° ずつ角度を広げ、
 * 720 回でも残れば後の島をその方向の外へずらす。
 * **本土と島を結ぶ線は引かない** (表示条件は複数になりうるので、線 1 本では嘘に
 * なる)。島がそもそも応答に入るかはサーバが表示条件で決める — ここは届いた星を
 * 並べるだけ。
 *
 * ## 霧の星と幽霊ノードの置き場
 *
 * 枝の腕にならない入力は放射に戻る。どの線にも触れていない「霧より先」の星だけを
 * 最外の深さの 1 つ先へ送る (前提の線が来ない星は深さ 0 になり、中心に居座って
 * しまうため)。見えている星の前提として参照されている星は、線に従って本来の深さに
 * 置く。
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
/** 枝の腕: 線 1 本の長さ (px)。 */
export const BRANCH_STEP = 100;
/** 枝の腕: 星どうしの最小距離 (px)。満たせない角度の組は捨てる。 */
export const BRANCH_MIN_DIST = 85;
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
/** 本土の張り出しと島の根のあいだに空ける海 (px)。 */
const ISLAND_SEA = 100;
/** 島の衝突円を、重心から最も遠い星のさらに外へ広げる余白 (px)。 */
const ISLAND_COLLISION_PAD = 40;
/** 重なった島の角度を 1 回で広げる量 (rad)。0.5°。 */
const ISLAND_SEPARATION_STEP = 0.5 * (Math.PI / 180);
/** 角度を広げる回数の上限。残った重なりは後の島を外へずらす。 */
const ISLAND_SEPARATION_ITERS = 720;
/** 枝の腕の扇見出しを、カテゴリの重心から根の反対側へ押し出す距離 (px)。 */
const SECTOR_LABEL_PUSH = 60;
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
  /** タイトルの置き場所 (星団の外接の上辺の少し上)。 */
  labelX: number;
  labelY: number;
  /** 島の星の中心の外接矩形。 */
  bounds: RadialBounds;
  /** 錨の星の instanceId。本土の根や親が無い島には付けない。 */
  anchorId?: string;
}

export interface RadialLayout {
  nodes: RadialNode[];
  edges: RadialEdge[];
  /** 扇の見出し (カテゴリ名と、その置き場所)。本土のぶんだけ (島はタイトルで示す)。 */
  sectors: { key: string; labelX: number; labelY: number }[];
  /** 本土から離れて浮かぶ島。 */
  islands: RadialIsland[];
  /**
   * 星の外接範囲。パンの可動域をここで決めると、「盤面の隅だけ見えていて星は全部画面外」を
   * 防ぎつつ、どの星も画面の中央へ持ってこられる。
   * 枝の腕や島を含む盤面は外接に `EDGE_PAD` を足した矩形 (正方形とは限らない)。
   * 放射に戻して島も無いときは、従来どおり円に外接する正方形。
   */
  bounds: RadialBounds;
  /** 本土の星の中心の外接。本土が空なら null。 */
  mainlandBounds: RadialBounds | null;
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
  mainlandBounds: null,
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
 *
 * 本土が枝の腕にならないときのフォールバックと、島の中の並びの両方で使う。
 * 星の座標の決め方は変えない。
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
   * 部分木の角度幅 = max(自分の幅, 子の幅の和)。親は子の中央に立ち、直列のステージは
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

  const bounds = boundsOf(placed);
  return {
    nodes: placed,
    edges,
    sectors,
    islands: [],
    bounds,
    mainlandBounds: bounds,
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

/** 星団のいちばん上の星の縁のすぐ上。タイトルの下端をここに置く。 */
function islandLabelY(nodes: RadialNode[]): number {
  const top = Math.min(...nodes.map((p) => p.y - (p.ring === 0 ? STAR_R_ROOT : STAR_R)));
  return top - ISLAND_LABEL_PAD;
}

function centroidOf(points: readonly { x: number; y: number }[]): { x: number; y: number } {
  if (points.length === 0) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  for (const point of points) {
    x += point.x;
    y += point.y;
  }
  return { x: x / points.length, y: y / points.length };
}

/** 枝の腕の探索順。同点は先に試した組を採る。 */
const BRANCH_GAPS = [90, 110, 130, 150, 180];
const BRANCH_SPLITS = [40, 50, 60];
const BRANCH_CURLS = [20, 30, 40];
const BRANCH_STRAIGHTS = [0, 1];

interface BranchTree {
  root: SkillMapStageNode;
  childrenOf: Map<string, SkillMapStageNode[]>;
  nodes: SkillMapStageNode[];
}

function compareBranchChildren(
  a: SkillMapStageNode,
  b: SkillMapStageNode,
  sizeOf: ReadonlyMap<string, number>,
): number {
  const bySize = (sizeOf.get(b.id) ?? 0) - (sizeOf.get(a.id) ?? 0);
  if (bySize !== 0) return bySize;
  const byKey = sortKeyOf(a).localeCompare(sortKeyOf(b), "ja");
  if (byKey !== 0) return byKey;
  return a.id.localeCompare(b.id);
}

/** 本土が枝の腕になれる木。なれなければ null (放射へ戻す)。 */
function branchTreeOf(nodes: SkillMapStageNode[]): BranchTree | null {
  if (nodes.length === 0 || duplicatedIdsOf(nodes).size > 0) return null;
  const known = new Set(nodes.map((node) => node.id));
  const parentIdOf = (node: SkillMapStageNode): string | undefined =>
    node.parent_id !== undefined && known.has(node.parent_id) && node.parent_id !== node.id
      ? node.parent_id
      : undefined;
  const roots = nodes.filter((node) => parentIdOf(node) === undefined);
  const root = roots.length === 1 ? roots[0] : undefined;
  if (!root) return null;

  const childrenOf = new Map<string, SkillMapStageNode[]>();
  for (const node of nodes) {
    const parentId = parentIdOf(node);
    if (parentId === undefined) continue;
    const siblings = childrenOf.get(parentId);
    if (siblings) siblings.push(node);
    else childrenOf.set(parentId, [node]);
  }

  const sizeOf = new Map<string, number>();
  const visiting = new Set<string>();
  const measure = (id: string): number | null => {
    const cached = sizeOf.get(id);
    if (cached !== undefined) return cached;
    if (visiting.has(id)) return null;
    visiting.add(id);
    let total = 1;
    for (const child of childrenOf.get(id) ?? []) {
      const sub = measure(child.id);
      if (sub === null) return null;
      total += sub;
    }
    visiting.delete(id);
    sizeOf.set(id, total);
    return total;
  };
  if (measure(root.id) === null || sizeOf.size !== nodes.length) return null;
  for (const siblings of childrenOf.values()) {
    siblings.sort((a, b) => compareBranchChildren(a, b, sizeOf));
  }
  return { root, childrenOf, nodes };
}

interface DraftStar {
  node: SkillMapStageNode;
  x: number;
  y: number;
  dir: number;
  curl: number;
  /** null は枝分かれとして置いた星。次の一人っ子の run は 0 から数える。 */
  run: number | null;
  ring: number;
}

function placeBranch(
  tree: BranchTree,
  gap: number,
  split: number,
  curl: number,
  straight: number,
): DraftStar[] | null {
  const placed = new Map<string, DraftStar>();
  const root: DraftStar = {
    node: tree.root,
    x: 0,
    y: 0,
    dir: 0,
    curl: 1,
    run: null,
    ring: 0,
  };
  placed.set(root.node.id, root);

  function put(
    parent: DraftStar,
    child: SkillMapStageNode,
    dir: number,
    childCurl: number,
    run: number | null,
  ): boolean {
    const draft: DraftStar = {
      node: child,
      x: parent.x + BRANCH_STEP * Math.cos(dir),
      y: parent.y + BRANCH_STEP * Math.sin(dir),
      dir,
      curl: childCurl,
      run,
      ring: parent.ring + 1,
    };
    placed.set(child.id, draft);
    return placeChildren(draft, false);
  }

  function placeChildren(parent: DraftStar, fromRoot: boolean): boolean {
    const children = tree.childrenOf.get(parent.node.id) ?? [];
    const count = children.length;
    if (count === 0) return true;
    if (fromRoot) {
      const step = Math.min(gap, (Math.PI * 2) / count);
      for (let i = 0; i < count; i++) {
        const child = children[i];
        if (!child || !put(parent, child, -i * step, i === 0 ? 1 : -1, null)) return false;
      }
      return true;
    }
    if (count === 1) {
      const child = children[0];
      if (!child) return false;
      const run = parent.run === null ? 0 : parent.run + 1;
      const dir = parent.dir + (run >= straight ? parent.curl * curl : 0);
      return put(parent, child, dir, parent.curl, run);
    }
    for (let i = 0; i < count; i++) {
      const child = children[i];
      if (!child) return false;
      const factor = 1 - (2 * i) / (count - 1);
      const childCurl = factor < 0 ? -1 : 1;
      if (!put(parent, child, parent.dir + split * factor, childCurl, null)) return false;
    }
    return true;
  }

  if (!placeChildren(root, true) || placed.size !== tree.nodes.length) return null;
  return [...placed.values()];
}

interface Segment {
  from: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function orient(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

/** 端点を共有しない線分が、途中で厳密に交わるか。 */
function segmentsProperlyCross(a: Segment, b: Segment): boolean {
  const o1 = orient(a.x1, a.y1, a.x2, a.y2, b.x1, b.y1);
  const o2 = orient(a.x1, a.y1, a.x2, a.y2, b.x2, b.y2);
  const o3 = orient(b.x1, b.y1, b.x2, b.y2, a.x1, a.y1);
  const o4 = orient(b.x1, b.y1, b.x2, b.y2, a.x2, a.y2);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

function branchAccepts(drafts: readonly DraftStar[]): boolean {
  for (let i = 0; i < drafts.length; i++) {
    for (let j = i + 1; j < drafts.length; j++) {
      const a = drafts[i];
      const b = drafts[j];
      if (!a || !b) continue;
      if (Math.hypot(a.x - b.x, a.y - b.y) < BRANCH_MIN_DIST - 1e-6) return false;
    }
  }
  const byId = new Map(drafts.map((draft) => [draft.node.id, draft]));
  const edges: Segment[] = [];
  for (const draft of drafts) {
    const parentId = draft.node.parent_id;
    if (parentId === undefined) continue;
    const parent = byId.get(parentId);
    if (!parent) continue;
    edges.push({
      from: parent.node.id,
      to: draft.node.id,
      x1: parent.x,
      y1: parent.y,
      x2: draft.x,
      y2: draft.y,
    });
  }
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const a = edges[i];
      const b = edges[j];
      if (!a || !b) continue;
      const shares = a.from === b.from || a.from === b.to || a.to === b.from || a.to === b.to;
      if (shares || !segmentsProperlyCross(a, b)) continue;
      return false;
    }
  }
  return true;
}

function branchScore(drafts: readonly DraftStar[]): number {
  const center = centroidOf(drafts);
  let radius = 0;
  for (const draft of drafts) radius = Math.max(radius, Math.hypot(draft.x, draft.y));
  return radius + 0.8 * Math.hypot(center.x, center.y);
}

function searchBranch(tree: BranchTree): DraftStar[] | null {
  const deg = Math.PI / 180;
  let best: { score: number; drafts: DraftStar[] } | null = null;
  for (const gapDeg of BRANCH_GAPS) {
    for (const splitDeg of BRANCH_SPLITS) {
      for (const curlDeg of BRANCH_CURLS) {
        for (const straight of BRANCH_STRAIGHTS) {
          const drafts = placeBranch(tree, gapDeg * deg, splitDeg * deg, curlDeg * deg, straight);
          if (!drafts || !branchAccepts(drafts)) continue;
          const score = branchScore(drafts);
          if (!best || score < best.score) best = { score, drafts };
        }
      }
    }
  }
  return best?.drafts ?? null;
}

function sectorLabels(
  nodes: readonly RadialNode[],
  root: RadialNode | undefined,
): { key: string; labelX: number; labelY: number }[] {
  const rest = root ? nodes.filter((node) => node.instanceId !== root.instanceId) : [...nodes];
  const keys = [...new Set(rest.map((node) => node.sector))].sort((a, b) =>
    a.localeCompare(b, "ja"),
  );
  const originX = root?.x ?? 0;
  const originY = root?.y ?? 0;
  return keys.map((key) => {
    const center = centroidOf(rest.filter((node) => node.sector === key));
    const dx = center.x - originX;
    const dy = center.y - originY;
    const len = Math.hypot(dx, dy);
    const ux = len < 1e-9 ? 1 : dx / len;
    const uy = len < 1e-9 ? 0 : dy / len;
    return {
      key,
      labelX: center.x + ux * SECTOR_LABEL_PUSH,
      labelY: center.y + uy * SECTOR_LABEL_PUSH,
    };
  });
}

function draftsToLayout(drafts: readonly DraftStar[]): RadialLayout {
  const duplicatedIds = duplicatedIdsOf(drafts.map((draft) => draft.node));
  const nodes: RadialNode[] = drafts.map((draft) => ({
    node: draft.node,
    instanceId: instanceIdOf(draft.node, duplicatedIds),
    x: draft.x,
    y: draft.y,
    ring: draft.ring,
    sector: sectorKeyOf(draft.node),
  }));
  nodes.sort(
    (a, b) => a.ring - b.ring || a.y - b.y || a.x - b.x || a.instanceId.localeCompare(b.instanceId),
  );
  const byId = new Map(nodes.map((node) => [node.node.id, node]));
  const edges: RadialEdge[] = [];
  for (const to of nodes) {
    const parentId = to.node.parent_id;
    if (parentId === undefined || parentId === to.node.id) continue;
    const from = byId.get(parentId);
    if (!from) continue;
    edges.push({
      fromId: from.instanceId,
      toId: to.instanceId,
      satisfied: from.node.state === "cleared",
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
    });
  }
  edges.sort((a, b) => a.fromId.localeCompare(b.fromId) || a.toId.localeCompare(b.toId));
  const root = nodes.find((node) => node.ring === 0);
  const bounds = boundsOf(nodes);
  return {
    nodes,
    edges,
    sectors: sectorLabels(nodes, root),
    islands: [],
    bounds,
    mainlandBounds: bounds,
    width: 0,
    height: 0,
    centerX: root?.x ?? 0,
    centerY: root?.y ?? 0,
  };
}

function layoutBranch(nodes: SkillMapStageNode[]): RadialLayout | null {
  const tree = branchTreeOf(nodes);
  if (!tree) return null;
  const drafts = searchBranch(tree);
  if (!drafts) return null;
  return draftsToLayout(drafts);
}

function rotateAround(
  x: number,
  y: number,
  originX: number,
  originY: number,
  cos: number,
  sin: number,
): { x: number; y: number } {
  const dx = x - originX;
  const dy = y - originY;
  return { x: originX + dx * cos - dy * sin, y: originY + dx * sin + dy * cos };
}

/** 根 → 重心 が θ を向く回転。星が 1 つ、または重心が根と重なるときは回さない。 */
function islandTurn(
  layout: RadialLayout,
  root: RadialNode,
  theta: number,
): { cos: number; sin: number } {
  if (layout.nodes.length <= 1) return { cos: 1, sin: 0 };
  const center = centroidOf(layout.nodes);
  const vx = center.x - root.x;
  const vy = center.y - root.y;
  if (vx * vx + vy * vy < 1e-12) return { cos: 1, sin: 0 };
  const delta = theta - Math.atan2(vy, vx);
  return { cos: Math.cos(delta), sin: Math.sin(delta) };
}

function poseIsland(
  layout: RadialLayout,
  root: RadialNode,
  theta: number,
  extra: number,
  mainlandCenter: { x: number; y: number },
  mainland: readonly RadialNode[],
): { nodes: RadialNode[]; edges: RadialEdge[] } {
  const turn = islandTurn(layout, root, theta);
  const rotatedNodes = layout.nodes.map((node) => {
    const at = rotateAround(node.x, node.y, root.x, root.y, turn.cos, turn.sin);
    return { ...node, x: at.x, y: at.y };
  });
  const rotatedEdges = layout.edges.map((edge) => {
    const start = rotateAround(edge.x1, edge.y1, root.x, root.y, turn.cos, turn.sin);
    const end = rotateAround(edge.x2, edge.y2, root.x, root.y, turn.cos, turn.sin);
    return { ...edge, x1: start.x, y1: start.y, x2: end.x, y2: end.y };
  });
  const rotatedRoot =
    rotatedNodes.find((node) => node.instanceId === root.instanceId) ?? rotatedNodes[0] ?? root;
  const ux = Math.cos(theta);
  const uy = Math.sin(theta);
  let back = 0;
  for (const node of rotatedNodes) {
    const inward = -((node.x - rotatedRoot.x) * ux + (node.y - rotatedRoot.y) * uy);
    if (inward > back) back = inward;
  }
  let reach = 0;
  if (mainland.length > 0) {
    let max = Number.NEGATIVE_INFINITY;
    for (const node of mainland) {
      const dot = (node.x - mainlandCenter.x) * ux + (node.y - mainlandCenter.y) * uy;
      if (dot > max) max = dot;
    }
    reach = max + STAR_R;
  }
  const dist = reach + ISLAND_SEA + back + extra;
  const dx = mainlandCenter.x + dist * ux - rotatedRoot.x;
  const dy = mainlandCenter.y + dist * uy - rotatedRoot.y;
  return {
    nodes: rotatedNodes.map((node) => ({ ...node, x: node.x + dx, y: node.y + dy })),
    edges: rotatedEdges.map((edge) => ({
      ...edge,
      x1: edge.x1 + dx,
      y1: edge.y1 + dy,
      x2: edge.x2 + dx,
      y2: edge.y2 + dy,
    })),
  };
}

function collisionCircle(nodes: readonly RadialNode[]): { x: number; y: number; r: number } {
  const center = centroidOf(nodes);
  let far = 0;
  for (const node of nodes) far = Math.max(far, Math.hypot(node.x - center.x, node.y - center.y));
  return { x: center.x, y: center.y, r: far + STAR_R + ISLAND_COLLISION_PAD };
}

function circlesOverlap(
  a: { x: number; y: number; r: number },
  b: { x: number; y: number; r: number },
): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r - 1e-6;
}

function normalizeAngle(angle: number): number {
  const turn = Math.PI * 2;
  const wrapped = angle % turn;
  return wrapped < 0 ? wrapped + turn : wrapped;
}

function distinctAngles(angles: readonly number[]): number[] {
  const sorted = angles.map(normalizeAngle).sort((a, b) => a - b);
  const out: number[] = [];
  for (const angle of sorted) {
    const prev = out[out.length - 1];
    if (prev === undefined || angle - prev > 1e-9) out.push(angle);
  }
  const first = out[0];
  const last = out[out.length - 1];
  if (
    first !== undefined &&
    last !== undefined &&
    out.length > 1 &&
    Math.PI * 2 - (last - first) <= 1e-9
  ) {
    out.pop();
  }
  return out;
}

function assignRootAngles(
  roots: readonly { key: string }[],
  used: readonly number[],
): Map<string, number> {
  const theta = new Map<string, number>();
  const count = roots.length;
  if (count === 0) return theta;
  const occupied = distinctAngles(used);
  if (occupied.length === 0) {
    for (let index = 0; index < count; index++) {
      const root = roots[index];
      if (!root) continue;
      theta.set(root.key, -Math.PI / 2 + (Math.PI * 2 * index) / count);
    }
    return theta;
  }
  let bestStart = occupied[0] ?? 0;
  let bestGap = -1;
  for (let i = 0; i < occupied.length; i++) {
    const start = occupied[i] ?? 0;
    const next = occupied[(i + 1) % occupied.length] ?? start;
    const gap = i === occupied.length - 1 ? next + Math.PI * 2 - start : next - start;
    if (gap > bestGap) {
      bestGap = gap;
      bestStart = start;
    }
  }
  for (let index = 0; index < count; index++) {
    const root = roots[index];
    if (!root) continue;
    theta.set(root.key, bestStart + (bestGap * (index + 1)) / (count + 1));
  }
  return theta;
}

interface IslandDraft {
  key: string;
  kind: "mainland" | "island" | "root";
  anchorId?: string;
  anchorIslandKey?: string;
  anchor?: RadialNode;
  theta: number;
  extra: number;
  layout: RadialLayout;
  root: RadialNode;
  nodes: RadialNode[];
  edges: RadialEdge[];
}

interface IslandPlaced {
  key: string;
  anchorId?: string;
  rootInstanceId: string;
  nodes: RadialNode[];
  edges: RadialEdge[];
}

function islandDrafts(
  keys: readonly string[],
  groups: ReadonlyMap<string, SkillMapStageNode[]>,
): IslandDraft[] {
  const drafts: IslandDraft[] = [];
  for (const key of keys) {
    const layout = layoutCluster(groups.get(key) ?? [], { fillCircle: true });
    const root = layout.nodes.find((node) => node.ring === 0) ?? layout.nodes[0];
    if (!root) continue;
    drafts.push({
      key,
      kind: "root",
      theta: 0,
      extra: 0,
      layout,
      root,
      nodes: layout.nodes,
      edges: layout.edges,
    });
  }
  return drafts;
}

function cycleKeys(graph: ReadonlyMap<string, string>): Set<string> {
  const state = new Map<string, "visiting" | "done">();
  const inCycle = new Set<string>();
  const stack: string[] = [];
  const visit = (key: string): void => {
    const mark = state.get(key);
    if (mark === "done") return;
    if (mark === "visiting") {
      const start = stack.indexOf(key);
      for (const cycleKey of stack.slice(Math.max(0, start))) inCycle.add(cycleKey);
      return;
    }
    state.set(key, "visiting");
    stack.push(key);
    const next = graph.get(key);
    if (next !== undefined) visit(next);
    stack.pop();
    state.set(key, "done");
  };
  for (const key of graph.keys()) visit(key);
  return inCycle;
}

function demoteIslandCycles(drafts: IslandDraft[]): void {
  const graph = new Map<string, string>();
  for (const draft of drafts) {
    if (draft.kind === "island" && draft.anchorIslandKey !== undefined) {
      graph.set(draft.key, draft.anchorIslandKey);
    }
  }
  const cycled = cycleKeys(graph);
  for (const draft of drafts) {
    if (!cycled.has(draft.key)) continue;
    draft.kind = "root";
    draft.anchorId = undefined;
    draft.anchorIslandKey = undefined;
    draft.anchor = undefined;
  }
}

function classifyIslands(drafts: IslandDraft[], mainland: readonly RadialNode[]): void {
  const mainlandById = new Map<string, RadialNode>();
  for (const node of mainland) {
    if (!mainlandById.has(node.node.id)) mainlandById.set(node.node.id, node);
  }
  const onIsland = new Map<string, { key: string; node: RadialNode }>();
  for (const draft of drafts) {
    for (const node of draft.layout.nodes) {
      if (!onIsland.has(node.node.id)) onIsland.set(node.node.id, { key: draft.key, node });
    }
  }
  for (const draft of drafts) {
    const parentId = draft.root.node.parent_id;
    const anchor = parentId === undefined ? undefined : mainlandById.get(parentId);
    const host = parentId === undefined ? undefined : onIsland.get(parentId);
    if (anchor && anchor.ring !== 0) {
      draft.kind = "mainland";
      draft.anchorId = anchor.instanceId;
      draft.anchor = anchor;
      continue;
    }
    if (host && host.key !== draft.key) {
      draft.kind = "island";
      draft.anchorId = host.node.instanceId;
      draft.anchorIslandKey = host.key;
      continue;
    }
    draft.kind = "root";
  }
  demoteIslandCycles(drafts);
}

function assignIslandThetas(drafts: IslandDraft[], center: { x: number; y: number }): void {
  const thetaOf = new Map<string, number>();
  for (const draft of drafts) {
    if (draft.kind !== "mainland" || !draft.anchor) continue;
    const theta = Math.atan2(draft.anchor.y - center.y, draft.anchor.x - center.x);
    draft.theta = theta;
    thetaOf.set(draft.key, theta);
  }
  const waiting = drafts.filter((draft) => draft.kind === "island");
  let guard = waiting.length;
  while (waiting.length > 0 && guard > 0) {
    guard -= 1;
    let progressed = false;
    for (let i = waiting.length - 1; i >= 0; i--) {
      const draft = waiting[i];
      const parentTheta =
        draft?.anchorIslandKey === undefined ? undefined : thetaOf.get(draft.anchorIslandKey);
      if (!draft || parentTheta === undefined) continue;
      draft.theta = parentTheta;
      thetaOf.set(draft.key, parentTheta);
      waiting.splice(i, 1);
      progressed = true;
    }
    if (!progressed) break;
  }
  for (const draft of waiting) {
    draft.kind = "root";
    draft.anchorId = undefined;
    draft.anchorIslandKey = undefined;
  }
  const roots = drafts.filter((draft) => draft.kind === "root");
  const used = drafts.filter((draft) => draft.kind !== "root").map((draft) => draft.theta);
  const angles = assignRootAngles(roots, used);
  for (const draft of roots) draft.theta = angles.get(draft.key) ?? draft.theta;
}

function separateIslands(drafts: IslandDraft[], pose: (draft: IslandDraft) => void): void {
  for (let iter = 0; iter < ISLAND_SEPARATION_ITERS; iter++) {
    let moved = false;
    for (let i = 0; i < drafts.length; i++) {
      for (let j = i + 1; j < drafts.length; j++) {
        const earlier = drafts[i];
        const later = drafts[j];
        if (!earlier || !later) continue;
        const overlap = circlesOverlap(
          collisionCircle(earlier.nodes),
          collisionCircle(later.nodes),
        );
        if (!overlap) continue;
        earlier.theta -= ISLAND_SEPARATION_STEP;
        later.theta += ISLAND_SEPARATION_STEP;
        pose(earlier);
        pose(later);
        moved = true;
      }
    }
    if (!moved) return;
  }
  for (let i = 0; i < drafts.length; i++) {
    for (let j = i + 1; j < drafts.length; j++) {
      const earlier = drafts[i];
      const later = drafts[j];
      if (!earlier || !later) continue;
      const a = collisionCircle(earlier.nodes);
      const b = collisionCircle(later.nodes);
      const overlap = a.r + b.r - Math.hypot(a.x - b.x, a.y - b.y);
      if (overlap <= 1e-6) continue;
      later.extra += overlap;
      pose(later);
    }
  }
}

function layoutIslands(
  main: RadialLayout,
  groups: ReadonlyMap<string, SkillMapStageNode[]>,
): IslandPlaced[] {
  const keys = [...groups.keys()].sort((a, b) => a.localeCompare(b, "ja"));
  const drafts = islandDrafts(keys, groups);
  if (drafts.length === 0) return [];
  classifyIslands(drafts, main.nodes);
  const center = centroidOf(main.nodes);
  assignIslandThetas(drafts, center);
  const pose = (draft: IslandDraft): void => {
    const posed = poseIsland(
      draft.layout,
      draft.root,
      draft.theta,
      draft.extra,
      center,
      main.nodes,
    );
    draft.nodes = posed.nodes;
    draft.edges = posed.edges;
  };
  for (const draft of drafts) pose(draft);
  separateIslands(drafts, pose);
  return drafts.map((draft) => ({
    key: draft.key,
    rootInstanceId: draft.root.instanceId,
    nodes: draft.nodes,
    edges: draft.edges,
    ...(draft.anchorId !== undefined ? { anchorId: draft.anchorId } : {}),
  }));
}

function radialIslandOf(island: IslandPlaced): RadialIsland {
  const bounds = boundsOf(island.nodes);
  const root =
    island.nodes.find((node) => node.instanceId === island.rootInstanceId) ?? island.nodes[0];
  const origin = root ?? { x: bounds.minX, y: bounds.minY };
  let farthest = 0;
  for (const node of island.nodes) {
    farthest = Math.max(farthest, Math.hypot(node.x - origin.x, node.y - origin.y));
  }
  const placed: RadialIsland = {
    key: island.key,
    cx: origin.x,
    cy: origin.y,
    radius: farthest + ISLAND_PAD,
    labelX: (bounds.minX + bounds.maxX) / 2,
    labelY: island.nodes.length === 0 ? bounds.minY : islandLabelY(island.nodes),
    bounds,
  };
  if (island.anchorId !== undefined) placed.anchorId = island.anchorId;
  return placed;
}

/** 全星の外接が EDGE_PAD より内側に入るよう平行移動し、盤面の寸法を決める。 */
function packBoard(main: RadialLayout, islands: readonly IslandPlaced[]): RadialLayout {
  const all = [...main.nodes, ...islands.flatMap((island) => island.nodes)];
  if (all.length === 0) return EMPTY_LAYOUT;
  const raw = boundsOf(all);
  const dx = EDGE_PAD - raw.minX;
  const dy = EDGE_PAD - raw.minY;
  const shiftedMain = shiftCluster(main, dx, dy);
  const shiftedIslands = islands.map((island) => ({
    ...island,
    nodes: island.nodes.map((node) => ({ ...node, x: node.x + dx, y: node.y + dy })),
    edges: island.edges.map((edge) => ({
      ...edge,
      x1: edge.x1 + dx,
      y1: edge.y1 + dy,
      x2: edge.x2 + dx,
      y2: edge.y2 + dy,
    })),
  }));
  const nodes = [...shiftedMain.nodes, ...shiftedIslands.flatMap((island) => island.nodes)];
  const edges = [...shiftedMain.edges, ...shiftedIslands.flatMap((island) => island.edges)];
  const width = raw.maxX - raw.minX + 2 * EDGE_PAD;
  const height = raw.maxY - raw.minY + 2 * EDGE_PAD;
  const root = shiftedMain.nodes.find((node) => node.ring === 0);
  const centerX = root ? root.x : main.nodes.length === 0 ? width / 2 : main.centerX + dx;
  const centerY = root ? root.y : main.nodes.length === 0 ? height / 2 : main.centerY + dy;
  return {
    nodes,
    edges,
    // 扇の見出しは本土のぶんだけ。島は島タイトル (islands) が名前を出す。
    sectors: shiftedMain.sectors,
    islands: shiftedIslands.map(radialIslandOf),
    bounds: boundsOf(nodes),
    mainlandBounds: shiftedMain.nodes.length === 0 ? null : boundsOf(shiftedMain.nodes),
    width,
    height,
    centerX,
    centerY,
  };
}

/**
 * 盤面全体を組み立てる: 本土 (枝の腕、または放射) + 錨のそばの島。
 *
 * 本土が枝の腕にならず島も無いときは、放射の結果をそのまま返す。
 */
export function layoutRadialSkillTree(nodes: SkillMapStageNode[]): RadialLayout {
  const expanded = expandAppearances(nodes);
  const islandGroups = new Map<string, SkillMapStageNode[]>();
  const mainlandNodes: SkillMapStageNode[] = [];
  for (const node of expanded) {
    const category = node.category ?? "";
    if (SKILL_MAP_ISLAND_CATEGORIES.has(category)) {
      const group = islandGroups.get(category);
      if (group) group.push(node);
      else islandGroups.set(category, [node]);
    } else {
      mainlandNodes.push(node);
    }
  }

  const branched = layoutBranch(mainlandNodes);
  if (!branched && islandGroups.size === 0) return layoutCluster(mainlandNodes);
  const main = branched ?? layoutCluster(mainlandNodes);
  return packBoard(main, layoutIslands(main, islandGroups));
}
