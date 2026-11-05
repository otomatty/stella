/**
 * 講師・管理者のステージ管理で、盤面に載せる星とカードに出す星を分ける。
 *
 * 盤面は受講者と同じ `layoutRadialSkillTree`。アーカイブは最初から外す。
 * カテゴリも親も無い下書き (新規作成直後) を一緒に渡すと、レイアウトは仮の扇
 * 「？？？」に置いて入口の星を中心から外してしまう。なので、扇を持つか、
 * 扇を持つ星まで親をたどれるものだけを盤面の候補にする。候補にしたあとで
 * レイアウトが置かなかった星も、カードの一覧へ戻す。
 */

import type { StaffSkillMapStageNode } from "@/lib/skill-map-api";
import { layoutRadialSkillTree } from "@/components/learner/tree/radial-layout";

export interface StageManagementCounts {
  published: number;
  draft: number;
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
  let published = 0;
  let draft = 0;
  let extra = 0;
  for (const stage of stages) {
    if (stage.status === "published") published += 1;
    else if (stage.status === "draft") draft += 1;
    if (stage.audience === "granted" && stage.status !== "archived") extra += 1;
  }
  return { published, draft, extra };
}

export function formatStageManagementCounts(counts: StageManagementCounts): string {
  return `公開中 ${counts.published} · 下書き ${counts.draft} · Extra ${counts.extra}`;
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

/** 公開中なら下書きへ、それ以外 (下書き・アーカイブ) は公開へ。 */
export function nextPublishStatus(status: StaffSkillMapStageNode["status"]): "draft" | "published" {
  return status === "published" ? "draft" : "published";
}

export function publishToggleLabel(status: StaffSkillMapStageNode["status"]): string {
  return status === "published" ? "下書きに戻す" : "公開する";
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
