/**
 * 講師・管理者のステージ管理で、盤面に載せる星とカードに出す星を分ける。
 *
 * 盤面は受講者と同じ `layoutRadialSkillTree`。アーカイブは最初から外す。
 * カテゴリも親も無い下書き (新規作成直後) を一緒に渡すと、レイアウトは仮の扇
 * 「？？？」に置いて入口の星を中心から外してしまう。なので、扇を持つか、
 * 扇を持つ星まで親をたどれるものだけを盤面の候補にする。候補にしたあとで
 * レイアウトが置かなかった星も、カードの一覧へ戻す。
 */

import { SKILL_MAP_ISLAND_CATEGORIES, SKILL_MAP_ISLANDS } from "@stella/shared/skill-map/islands";

import type { StaffSkillMapStageNode } from "@/lib/skill-map-api";
import { layoutRadialSkillTree } from "@/components/learner/tree/radial-layout";

export interface StageManagementCounts {
  total: number;
  extra: number;
}

export interface StaffStagePlan {
  /** SkillTree に渡す星。外した星への線は外してある。 */
  board: StaffSkillMapStageNode[];
  /** アーカイブと、盤面に置けなかった星。入力の順。 */
  offBoard: StaffSkillMapStageNode[];
}

export function stageManagementCounts(
  stages: readonly StaffSkillMapStageNode[],
): StageManagementCounts {
  let total = 0;
  let extra = 0;
  for (const stage of stages) {
    if (stage.status !== "archived") total += 1;
    if (stage.audience === "granted" && stage.status !== "archived") extra += 1;
  }
  return { total, extra };
}

export function formatStageManagementCounts(counts: StageManagementCounts): string {
  return `全 ${counts.total} ステージ · Extra ${counts.extra}`;
}

/** 星の名前のそばの札。下書きと Extra は両方付くことがある。 */
export function staffStarTag(node: {
  status?: StaffSkillMapStageNode["status"];
  audience?: StaffSkillMapStageNode["audience"];
}): string | null {
  const parts: string[] = [];
  if (node.status === "draft") parts.push("下書き");
  if (node.audience === "granted") parts.push("Extra");
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function stageStatusLabel(status: StaffSkillMapStageNode["status"]): string {
  switch (status) {
    case "published":
      return "公開中";
    case "draft":
      return "下書き";
    case "archived":
      return "アーカイブ";
  }
}

export function stageAudienceLabel(
  audience: StaffSkillMapStageNode["audience"],
): "Basic" | "Extra" {
  return audience === "granted" ? "Extra" : "Basic";
}

export function offBoardNote(stage: StaffSkillMapStageNode): string {
  if (stage.status === "archived") return "アーカイブのため、盤面には載せていません";
  return "カテゴリも親も無いため、盤面には載せていません";
}

export function stageManagementTitle(role: "admin" | "instructor"): string {
  return role === "admin" ? "ステージ管理" : "ステージ";
}

/**
 * ステージ名・slug で絞る。空白だけなら候補を出さない (一覧を全部開かない)。
 */
export function filterStagesByQuery<T extends { title?: string; slug?: string }>(
  stages: readonly T[],
  query: string,
): T[] {
  const needle = query.trim().toLocaleLowerCase("ja");
  if (needle === "") return [];
  return stages.filter((stage) => {
    const title = (stage.title ?? "").toLocaleLowerCase("ja");
    const slug = (stage.slug ?? "").toLocaleLowerCase("ja");
    return title.includes(needle) || slug.includes(needle);
  });
}

/** 受講者のレイアウトと同じ規則で、仮の扇「？？？」になる名前か。 */
function hasSector(node: StaffSkillMapStageNode): boolean {
  const key = node.category ?? node.theme ?? "";
  return key.trim() !== "";
}

function parentIdsOf(node: StaffSkillMapStageNode): string[] {
  const ids: string[] = [];
  if (node.parent_id !== undefined) ids.push(node.parent_id);
  for (const id of Object.values(node.appearance_parent_ids ?? {})) ids.push(id);
  return ids;
}

function isAnchored(
  node: StaffSkillMapStageNode,
  byId: ReadonlyMap<string, StaffSkillMapStageNode>,
  memo: Map<string, boolean>,
  stack: Set<string>,
): boolean {
  const cached = memo.get(node.id);
  if (cached !== undefined) return cached;
  if (hasSector(node)) {
    memo.set(node.id, true);
    return true;
  }
  if (stack.has(node.id)) return false;
  stack.add(node.id);
  const ok = parentIdsOf(node).some((id) => {
    const parent = byId.get(id);
    return parent ? isAnchored(parent, byId, memo, stack) : false;
  });
  stack.delete(node.id);
  memo.set(node.id, ok);
  return ok;
}

function stripParents(
  node: StaffSkillMapStageNode,
  keep: ReadonlySet<string>,
): StaffSkillMapStageNode {
  const parentId =
    node.parent_id !== undefined && keep.has(node.parent_id) ? node.parent_id : undefined;
  const keptAppearance: Record<string, string> = {};
  for (const [sector, id] of Object.entries(node.appearance_parent_ids ?? {})) {
    if (keep.has(id)) keptAppearance[sector] = id;
  }
  const appearance = Object.keys(keptAppearance).length > 0 ? keptAppearance : undefined;
  const sameParent = parentId === node.parent_id;
  const previous = node.appearance_parent_ids;
  const sameAppearance =
    appearance === undefined
      ? previous === undefined
      : previous !== undefined &&
        Object.keys(previous).length === Object.keys(keptAppearance).length &&
        Object.entries(keptAppearance).every(([sector, id]) => previous[sector] === id);
  if (sameParent && sameAppearance) return node;

  const next: StaffSkillMapStageNode = { ...node };
  if (parentId === undefined) delete next.parent_id;
  else next.parent_id = parentId;
  if (appearance === undefined) delete next.appearance_parent_ids;
  else next.appearance_parent_ids = appearance;
  return next;
}

/**
 * 開いた直後に寄せる入口の星。
 * 盤面の中心 (`layoutRadialSkillTree` で `ring === 0`。複数あればレイアウト順の先頭)。
 * 中心が無いときは盤面の先頭。盤面が空なら null。
 */
export function entryStageId(board: readonly StaffSkillMapStageNode[]): string | null {
  const center = layoutRadialSkillTree([...board]).nodes.find((placed) => placed.ring === 0);
  return center?.node.id ?? board[0]?.id ?? null;
}

export function planStaffStages(stages: readonly StaffSkillMapStageNode[]): StaffStagePlan {
  const active = stages.filter((stage) => stage.status !== "archived");
  const byId = new Map(active.map((stage) => [stage.id, stage]));
  const memo = new Map<string, boolean>();
  const anchored = active.filter((stage) => isAnchored(stage, byId, memo, new Set()));
  const anchoredIds = new Set(anchored.map((stage) => stage.id));
  const stripped = anchored.map((stage) => stripParents(stage, anchoredIds));
  const placedIds = new Set(layoutRadialSkillTree(stripped).nodes.map((placed) => placed.node.id));
  const boardIds = new Set(
    stripped.filter((stage) => placedIds.has(stage.id)).map((stage) => stage.id),
  );
  const board = stripped
    .filter((stage) => boardIds.has(stage.id))
    .map((stage) => stripParents(stage, boardIds));
  const offBoard = stages.filter((stage) => !boardIds.has(stage.id));
  return { board, offBoard };
}

export interface StaffIslandEntry {
  key: string;
  count: number;
  stages: StaffSkillMapStageNode[];
  visibility: string;
  prerequisite: { id: string; title: string; routeKey: string } | null;
  next: { key: string; visibility: string }[];
  allExtra: boolean;
}

/** 盤面の目次。表示条件と、星を開くための前提は別々に示す。 */
export function staffMapContents(
  board: readonly StaffSkillMapStageNode[],
  stages: readonly StaffSkillMapStageNode[],
): {
  mainland: { title: "開発スキル"; count: number; routes: { key: string; count: number }[] };
  islands: StaffIslandEntry[];
} {
  const byId = new Map(board.map((stage) => [stage.id, stage]));
  const bySlug = new Map(stages.map((stage) => [stage.slug, stage]));
  const entryId = entryStageId(board);
  const routeKey = (stage: StaffSkillMapStageNode) => stage.category ?? stage.theme ?? "";
  const groups = new Map<string, StaffSkillMapStageNode[]>();
  for (const stage of board) {
    const key = routeKey(stage);
    const group = groups.get(key) ?? [];
    group.push(stage);
    groups.set(key, group);
  }
  const visibilityOf = (key: string): string => {
    const requires = SKILL_MAP_ISLANDS.find((island) => island.category === key)?.requires ?? [];
    if (requires.length === 0) return "割り当てのみ";
    const names = requires.map((slug) => {
      const stage = bySlug.get(slug);
      return stage?.id === entryId || slug === "dev-env-basics" ? "入口" : (stage?.title ?? slug);
    });
    return `${names.join("、")} クリア後`;
  };
  const depth = (stage: StaffSkillMapStageNode): number => {
    const seen = new Set([stage.id]);
    let current = stage;
    let result = 0;
    while (current.parent_id) {
      const parent = byId.get(current.parent_id);
      if (!parent || seen.has(parent.id)) break;
      seen.add(parent.id);
      result += 1;
      current = parent;
    }
    return result;
  };
  const preferredRoutes = ["基礎", "フロントエンド", "バックエンド", "フルスタック"];
  const routes = [...groups]
    .filter(([key]) => !SKILL_MAP_ISLAND_CATEGORIES.has(key))
    .map(([key, group]) => ({ key, count: group.length }))
    .sort((a, b) => {
      const rank = (key: string) => {
        const index = preferredRoutes.indexOf(key);
        return index < 0 ? preferredRoutes.length : index;
      };
      return rank(a.key) - rank(b.key) || a.key.localeCompare(b.key, "ja");
    });
  const islands = [...groups]
    .filter(([key]) => SKILL_MAP_ISLAND_CATEGORIES.has(key))
    .sort(([a], [b]) => a.localeCompare(b, "ja"))
    .map(([key, group]): StaffIslandEntry => {
      const ordered = [...group].sort(
        (a, b) =>
          depth(a) - depth(b) ||
          (a.title ?? a.slug ?? "").localeCompare(b.title ?? b.slug ?? "", "ja"),
      );
      const ids = new Set(group.map((stage) => stage.id));
      const root = ordered.find((stage) => !stage.parent_id || !ids.has(stage.parent_id));
      const parent = root?.parent_id ? byId.get(root.parent_id) : undefined;
      const next = [...groups]
        .filter(
          ([otherKey, other]) =>
            otherKey !== key &&
            SKILL_MAP_ISLAND_CATEGORIES.has(otherKey) &&
            other.some((stage) => stage.parent_id !== undefined && ids.has(stage.parent_id)),
        )
        .map(([otherKey]) => ({ key: otherKey, visibility: visibilityOf(otherKey) }))
        .sort((a, b) => a.key.localeCompare(b.key, "ja"));
      return {
        key,
        count: group.length,
        stages: ordered,
        visibility: visibilityOf(key),
        prerequisite: parent
          ? {
              id: parent.id,
              title: parent.title ?? parent.slug ?? parent.id,
              routeKey: routeKey(parent),
            }
          : null,
        next,
        allExtra: group.every((stage) => stage.audience === "granted"),
      };
    });
  return {
    mainland: {
      title: "開発スキル",
      count: routes.reduce((sum, route) => sum + route.count, 0),
      routes,
    },
    islands,
  };
}
