/**
 * スキルツリー (ステージグラフ) の評価器 — 純関数。I/O を持たない。
 *
 * 星 = 教材 (ステージ) そのもの。前提を満たしていない星は**開けない (locked)**。
 * 受講者に見せる範囲も同時に決める: 確定した過去は全部、具体的な未来は 2 歩、
 * その先は霧 (テーマ名だけ)。
 *
 * ## 仕様として決めたこと
 *
 * **前提の参照は slug**、状態のキーは **ステージ id**。正本 (`courses/<slug>/course.json`)
 * は id を知らないため、グラフの辺は slug で書き、評価器が id へ解く。
 *
 * **前提が複数あるときは AND** (全部クリアで開く)。例外は見た目の複製
 * (`appearances.ts` の扇ごとの前提) だけで、組どうしは OR (どれか 1 組を満たせば開く)。
 * 通常の講座は AND のまま。
 *
 * **状態の優先順位**は cleared > active > unlocked > locked。
 * - `cleared` … クリア済み (修了)
 * - `active`  … いま進めている星。前提が未充足でも locked には落とさない。着手済みの
 *               受講者を後から締め出す方が害が大きいため (割当の順序ミスなどで起こる)
 * - `unlocked` … 前提を全部クリア済み、または飛び級 (`unlockedStageIds`) で開いた星
 * - `locked`  … それ以外
 *
 * **視界は無向グラフ上の最短距離**で決める。起点は「いま手が届く星」= cleared ∪ active ∪
 * unlocked の全体。そこから
 * - 距離 0〜1 → `full`      (中身まで見せる)
 * - 距離 2    → `name-only` (名前と解放条件だけ。到達説明は見せない)
 * - 距離 3 以上 → `fog`     (名前はぼかしの予告のみ。slug・到達説明・解放条件は見せない)
 *
 * 辺の向きを見ない (無向) のは、飛び級で先の星を点けたときに、飛ばした手前の星が
 * 霧に沈まないようにするため。起点に unlocked を含めるのは、1 つもクリアしていない
 * 受講者の視界が真っ白にならないようにするため (入口の星は常に unlocked)。
 * 辺は **親** (`parent`、複製は扇ごとの前提) だけで、線の無い前提は視界に数えない —
 * 画面に見える線と視界の広がり方を一致させる。
 *
 * **エラーは投げない。** 未知 slug と循環はビルド時 (`packages/content` の manifest) に
 * 落とすのが正で、実行時は安全側に倒す:
 * - 未知 slug … 「決してクリアされない前提」として扱う → その星は locked のまま。
 *   ただし **生の slug は外に出さない** (下記)
 * - 循環 … 互いに前提を満たせないので全員 locked になる。黙って死角にならないよう、
 *   検出した循環を `cycles` に載せて呼び出し側がログに出せるようにする
 *
 * ## 解放条件で名前を伏せるのは 2 段階
 *
 * 1. **未知 slug はこの層で伏せる** (`UNKNOWN_PREREQUISITE_LABEL`)。入力に無い slug は
 *    「未公開 / 削除済みのステージ」か綴り違いのどちらかで、どちらにせよ受講者に
 *    見せてよい名前ではない。生の slug は URL や CMS の識別子でもあるため、
 *    呼び出し側の実装ミスで漏れないよう評価器の出口で落としきる
 * 2. **視界 (`fog`) による伏せ字は呼び出し側 (API)**。こちらは「誰に対して伏せるか」が
 *    配信側の責務で、評価器は `lockReasons[].stageId` を添えて判断材料だけ渡す
 */

/** 星の状態。`unlocked` は「前提を満たしていて今すぐ開ける」。 */
export type SkillMapState = "cleared" | "active" | "unlocked" | "locked";

/**
 * 星の見え方。
 * - `full`      … タイトル・到達説明まで見せてよい
 * - `name-only` … タイトルと解放条件だけ。到達説明は見せない
 * - `fog`       … タイトルはぼかしの予告のみ (画面側で伏せる)。解放条件や slug は出さない
 */
export type SkillMapVisibility = "full" | "name-only" | "fog";

/** 評価器に渡す 1 ステージぶんの情報。 */
export interface SkillMapStage {
  id: string;
  slug: string;
  title: string;
  /** 前提ステージの **slug**。空配列 = 入口の星。 */
  prerequisites: string[];
  /**
   * スキルツリーで線を引く親の **slug** (`prerequisites` のうちの 1 つ)。視界の辺はこれだけ。
   * 未設定なら `prerequisites` の先頭 (`parentSlugOf`)。複製 (`appearances.ts`) は扇ごとの
   * 前提 (各 1 つ) が親なので、この項目は見ない。
   */
  parent?: string;
  /** 到達説明「このスキルを身につけた人は◯◯ができる」。 */
  canDo?: string;
  /** 霧の中で見せるテーマ名。 */
  theme?: string;
  /**
   * スキルツリーの星に出す講座アイコンの R2 キー (`stages.icon_path`)。
   * 評価器は使わない素通しの項目 — 秘匿 (霧の星に出さない) は API 層が visibility で決める。
   */
  iconPath?: string;
  category: string;
  /** 「次の一歩」の並び順のヒント (小さいほど先)。未指定は最後尾。 */
  order?: number;
}

export interface SkillMapInput {
  stages: SkillMapStage[];
  clearedStageIds: Set<string>;
  /** いま進めている星。1 つだけ (受講者が同時に複数を進めていても代表を 1 つ選ぶ)。 */
  activeStageId?: string;
  /** 飛び級 (腕試し合格) で開いた星。前提を満たしていなくても `unlocked` にする。 */
  unlockedStageIds?: Set<string>;
}

/**
 * 入力に無い slug を前提に書いている星の、解放条件の表示名。
 *
 * 生の slug を出すと、未公開 (draft) や削除済みステージの識別子が受講者に漏れる。
 * 「開かない理由がある」ことだけを伝えて名前は伏せる。
 */
export const UNKNOWN_PREREQUISITE_LABEL = "非公開の教材";

/** 未充足の前提 1 件。表示名と、呼び出し側が視界で伏せ直すための id。 */
export interface SkillMapLockReason {
  /** 前提ステージの id。入力に無い slug (未知 / 番兵) のときは付かない。 */
  stageId?: string;
  /** そのまま出してよい表示名 (未知 slug は `UNKNOWN_PREREQUISITE_LABEL`)。 */
  label: string;
}

export interface SkillMapResult {
  states: Map<string, SkillMapState>;
  visibility: Map<string, SkillMapVisibility>;
  /**
   * 解放条件。未充足の前提ステージを並べる。`locked` の星にだけ入る。
   *
   * 表示名は既にこの層で安全側に伏せてあるが (未知 slug)、視界による伏せ字は
   * 呼び出し側が `stageId` を見て行う (このモジュールは「誰が見るか」を知らない)。
   */
  lockReasons: Map<string, SkillMapLockReason[]>;
  /** 「次の一歩」候補 = `unlocked` の星を推奨順に並べたもの。 */
  nextStageIds: string[];
  /** 検出した前提の循環 (ステージ id の並び)。空なら健全。 */
  cycles: string[][];
}

import { appearancePrerequisitesOf } from "./appearances.js";

/** 視界の段: この距離までが `full`。 */
const FULL_DISTANCE = 1;
/** 視界の段: この距離までが `name-only`。以遠は `fog`。 */
const NAME_ONLY_DISTANCE = 2;

function visibilityForDistance(distance: number | undefined): SkillMapVisibility {
  if (distance === undefined) return "fog";
  if (distance <= FULL_DISTANCE) return "full";
  if (distance <= NAME_ONLY_DISTANCE) return "name-only";
  return "fog";
}

/**
 * 前提グラフの循環を全部見つける (Tarjan の強連結成分)。
 *
 * 自己参照 (自分を前提に書く) も 1 要素の循環として拾う。
 */
function findCycles(stages: SkillMapStage[], prereqIds: Map<string, string[]>): string[][] {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const cycles: string[][] = [];
  let counter = 0;

  const strongConnect = (id: string): void => {
    index.set(id, counter);
    low.set(id, counter);
    counter++;
    stack.push(id);
    onStack.add(id);

    for (const next of prereqIds.get(id) ?? []) {
      if (!index.has(next)) {
        strongConnect(next);
        low.set(id, Math.min(low.get(id) ?? 0, low.get(next) ?? 0));
      } else if (onStack.has(next)) {
        low.set(id, Math.min(low.get(id) ?? 0, index.get(next) ?? 0));
      }
    }

    if (low.get(id) !== index.get(id)) return;
    const component: string[] = [];
    for (;;) {
      const popped = stack.pop();
      if (popped === undefined) break;
      onStack.delete(popped);
      component.push(popped);
      if (popped === id) break;
    }
    const selfLoop = component.length === 1 && (prereqIds.get(id) ?? []).includes(id);
    if (component.length > 1 || selfLoop) cycles.push(component.reverse());
  };

  for (const stage of stages) {
    if (!index.has(stage.id)) strongConnect(stage.id);
  }
  return cycles;
}

/** 開く条件の組。カタログがあれば扇ごと (OR)、無ければ D1 の 1 組 (AND)。 */
function prerequisiteGroupsOf(stage: SkillMapStage): string[][] {
  const catalog = appearancePrerequisitesOf(stage.slug);
  if (catalog) return Object.values(catalog).map((slugs) => [...slugs]);
  return [stage.prerequisites];
}

/**
 * 線を引く親の slug。`parent` → 前提の先頭 → なし。
 * CMS で作った行は `parent` を持たないので、前提 1 つなら今までどおり線がつく。
 */
export function parentSlugOf(
  stage: Pick<SkillMapStage, "parent" | "prerequisites">,
): string | undefined {
  return stage.parent ?? stage.prerequisites[0];
}

/** 視界の辺の元。複製は扇ごとの親 (各 1 つ)、通常は `parentSlugOf`。 */
function parentSlugsOf(stage: SkillMapStage): string[] {
  const catalog = appearancePrerequisitesOf(stage.slug);
  if (catalog) return Object.values(catalog).flatMap((slugs) => slugs.slice(0, 1));
  const parent = parentSlugOf(stage);
  return parent === undefined ? [] : [parent];
}

function unmetReasonsFor(
  slugs: readonly string[],
  idBySlug: Map<string, string>,
  stageById: Map<string, SkillMapStage>,
  clearedStageIds: Set<string>,
): SkillMapLockReason[] {
  const unmet: SkillMapLockReason[] = [];
  for (const slug of slugs) {
    const id = idBySlug.get(slug);
    if (id === undefined) {
      unmet.push({ label: UNKNOWN_PREREQUISITE_LABEL });
      continue;
    }
    if (!clearedStageIds.has(id)) {
      unmet.push({ stageId: id, label: stageById.get(id)?.title ?? UNKNOWN_PREREQUISITE_LABEL });
    }
  }
  return unmet;
}

function resolveIds(slugs: readonly string[], idBySlug: Map<string, string>): string[] {
  const ids: string[] = [];
  for (const slug of slugs) {
    const id = idBySlug.get(slug);
    if (id !== undefined) ids.push(id);
  }
  return ids;
}

/**
 * ステージグラフを評価して、状態・視界・解放条件・次の一歩を出す。
 *
 * 計算量は O(V + E)。講座数は 2 桁なので素朴な実装で足りる。
 */
export function evaluateSkillMap(input: SkillMapInput): SkillMapResult {
  const { stages, clearedStageIds, activeStageId, unlockedStageIds } = input;

  // slug → id。同じ slug が複数あれば後勝ち (テナント内で slug は一意という前提)。
  const idBySlug = new Map<string, string>();
  for (const stage of stages) idBySlug.set(stage.slug, stage.id);
  const stageById = new Map(stages.map((s) => [s.id, s]));

  const groupsOf = new Map<string, string[][]>();
  /** id → 前提の id 一覧 (入力に無い slug は落とす。ロック理由には別途残す)。 */
  const prereqIds = new Map<string, string[]>();
  for (const stage of stages) {
    const groups = prerequisiteGroupsOf(stage);
    groupsOf.set(stage.id, groups);
    prereqIds.set(stage.id, resolveIds([...new Set(groups.flat())], idBySlug));
  }

  const states = new Map<string, SkillMapState>();
  const lockReasons = new Map<string, SkillMapLockReason[]>();

  for (const stage of stages) {
    const groups = groupsOf.get(stage.id) ?? [stage.prerequisites];
    const unmet = unmetReasonsFor(
      [...new Set(groups.flat())],
      idBySlug,
      stageById,
      clearedStageIds,
    );
    const anyGroupMet = groups.some(
      (group) => unmetReasonsFor(group, idBySlug, stageById, clearedStageIds).length === 0,
    );

    if (clearedStageIds.has(stage.id)) {
      states.set(stage.id, "cleared");
      continue;
    }
    if (stage.id === activeStageId) {
      states.set(stage.id, "active");
      continue;
    }
    if (anyGroupMet || unlockedStageIds?.has(stage.id)) {
      states.set(stage.id, "unlocked");
      continue;
    }
    states.set(stage.id, "locked");
    lockReasons.set(stage.id, unmet);
  }

  // 無向の隣接表 (視界の距離用)。辺は **親** だけ (画面の線と同じ 1 本)。線の無い前提は
  // 解放条件としては効くが、視界はそちらへ伸びない (見えている線と広がり方を一致させる)。
  // 複製は扇ごとに親を持つ。開いた星から満たしていない扇へ橋を渡さない (FE で Git を
  // 開いても BE の Node が手前に見えないようにする)。ロック中は全扇の親を辿れる。
  const neighbours = new Map<string, Set<string>>();
  for (const stage of stages) neighbours.set(stage.id, new Set());
  for (const stage of stages) {
    const parents = parentSlugsOf(stage);
    const cleared = parents.filter((slug) => {
      const parentId = idBySlug.get(slug);
      return parentId !== undefined && clearedStageIds.has(parentId);
    });
    const visSlugs = states.get(stage.id) === "locked" || cleared.length === 0 ? parents : cleared;
    for (const parent of resolveIds(visSlugs, idBySlug)) {
      if (parent === stage.id) continue;
      neighbours.get(stage.id)?.add(parent);
      neighbours.get(parent)?.add(stage.id);
    }
  }

  // 起点 = いま手が届く星。そこからの最短距離で視界の段を決める。
  const distance = new Map<string, number>();
  const queue: string[] = [];
  for (const stage of stages) {
    if (states.get(stage.id) === "locked") continue;
    distance.set(stage.id, 0);
    queue.push(stage.id);
  }
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head];
    if (id === undefined) continue;
    const d = distance.get(id) ?? 0;
    for (const next of neighbours.get(id) ?? []) {
      if (distance.has(next)) continue;
      distance.set(next, d + 1);
      queue.push(next);
    }
  }

  const visibility = new Map<string, SkillMapVisibility>();
  for (const stage of stages) {
    visibility.set(stage.id, visibilityForDistance(distance.get(stage.id)));
  }

  return {
    states,
    visibility,
    lockReasons,
    nextStageIds: recommendNext(stages, states),
    cycles: findCycles(stages, prereqIds),
  };
}

/**
 * 「次の一歩」の推奨順。
 *
 * いま進めている / クリア済みのカテゴリを続ける方が迷いにくいので、同じカテゴリを先に
 * 出す。同点は `order` → 前提の数 (浅い星から) → slug の順で、常に同じ並びになるようにする。
 */
function recommendNext(stages: SkillMapStage[], states: Map<string, SkillMapState>): string[] {
  const ongoing = new Set<string>();
  for (const stage of stages) {
    const state = states.get(stage.id);
    if (state === "active" || state === "cleared") ongoing.add(stage.category);
  }
  const rank = (stage: SkillMapStage) => (ongoing.has(stage.category) ? 0 : 1);

  return stages
    .filter((s) => states.get(s.id) === "unlocked")
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
        a.prerequisites.length - b.prerequisites.length ||
        a.slug.localeCompare(b.slug),
    )
    .map((s) => s.id);
}
