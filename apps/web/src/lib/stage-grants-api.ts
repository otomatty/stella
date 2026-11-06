import { apiFetch } from "./api-client";

export interface StageGrantStageRow {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  profile_ids: string[];
  /** 割り当てた受講者のうち、前提を免除した人。古い API が省いたときは空配列。 */
  unlocked_profile_ids: string[];
  /** 応答の受講者のうち、このステージの前提をすべてクリアしている人。古い API が省いたときは空配列。 */
  prerequisites_cleared_profile_ids: string[];
}

/** ステージごとの未保存の割当と、前提を免除する受講者。 */
export interface StageGrantDraft {
  profileIds: string[];
  unlockedIds: string[];
}

export interface StageGrantLearnerRow {
  id: string;
  display_name: string;
  email: string | null;
  /** false = 無効化 / ロール変更済みだが grant が残っている。外すことはできる。 */
  selectable: boolean;
}

export interface StageGrantsPayload {
  stages: StageGrantStageRow[];
  learners: StageGrantLearnerRow[];
}

/** 保存時に自動で足した、祖先のステージへの割当。 */
export interface StageAncestorGrant {
  stage_id: string;
  profile_ids: string[];
}

export interface SavedStageGrants {
  stage_id: string;
  profile_ids: string[];
  unlocked_profile_ids: string[];
  ancestor_grants: StageAncestorGrant[];
}

export async function listStageGrants(): Promise<StageGrantsPayload> {
  const body = await apiFetch<{
    stages: (Omit<
      StageGrantStageRow,
      "unlocked_profile_ids" | "prerequisites_cleared_profile_ids"
    > & {
      unlocked_profile_ids?: string[];
      prerequisites_cleared_profile_ids?: string[];
    })[];
    learners: StageGrantLearnerRow[];
  }>("/api/stage-grants");
  return {
    learners: body.learners,
    stages: body.stages.map((stage) => ({
      ...stage,
      unlocked_profile_ids: stage.unlocked_profile_ids ?? [],
      prerequisites_cleared_profile_ids: stage.prerequisites_cleared_profile_ids ?? [],
    })),
  };
}

export interface StageGrantLearnerCounts {
  learners: number;
  assigned: number;
  unassigned: number;
  exempted: number;
}

export interface StageGrantLearnerDetail {
  id: string;
  display_name: string;
  email: string | null;
  selectable: boolean;
  instructor: { id: string; display_name: string } | null;
  assigned: boolean;
  exempted: boolean;
  unlocked_by_skill_check: boolean;
  prerequisites_cleared: boolean;
  prerequisite_status: "done" | "doing" | "none";
}

export interface StageGrantLearnerPage {
  stage: {
    id: string;
    slug: string;
    title: string;
    category: string | null;
    prerequisites: { id: string; slug: string; title: string }[];
  };
  counts: StageGrantLearnerCounts;
  instructors: { id: string; display_name: string }[];
  total: number;
  next_offset: number | null;
  learners: StageGrantLearnerDetail[];
}

export interface StageGrantLearnerQuery {
  q?: string;
  status?: "all" | "assigned" | "unassigned" | "exempted";
  /** `all` / `mine` / `none` / 講師の profile id。 */
  instructor?: string;
  prereq?: "all" | "done" | "doing" | "none";
  offset?: number;
  limit?: number;
}

export interface StageGrantDiff {
  add?: string[];
  remove?: string[];
  exempt?: string[];
  unexempt?: string[];
}

export interface UpdatedStageGrants {
  stage_id: string;
  counts: StageGrantLearnerCounts;
  ancestor_grants: StageAncestorGrant[];
}

function stageGrantLearnerQuery(params: StageGrantLearnerQuery): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.status && params.status !== "all") search.set("status", params.status);
  if (params.instructor && params.instructor !== "all") search.set("instructor", params.instructor);
  if (params.prereq && params.prereq !== "all") search.set("prereq", params.prereq);
  if (params.offset !== undefined) search.set("offset", String(params.offset));
  if (params.limit !== undefined) search.set("limit", String(params.limit));
  const query = search.toString();
  return query === "" ? "" : `?${query}`;
}

/** 1 ステージの受講者を、検索・絞り込み・ページ分けして取る。 */
export async function listStageGrantLearners(
  stageId: string,
  params: StageGrantLearnerQuery = {},
  signal?: AbortSignal,
): Promise<StageGrantLearnerPage> {
  return apiFetch<StageGrantLearnerPage>(
    `/api/stage-grants/${encodeURIComponent(stageId)}/learners${stageGrantLearnerQuery(params)}`,
    { signal },
  );
}

/** 割り当ての差分 (追加・削除・前提の免除) を保存する。 */
export async function updateStageGrants(
  stageId: string,
  diff: StageGrantDiff,
): Promise<UpdatedStageGrants> {
  const body = await apiFetch<Partial<UpdatedStageGrants>>(
    `/api/stage-grants/${encodeURIComponent(stageId)}`,
    { method: "PATCH", body: diff },
  );
  return {
    stage_id: body.stage_id ?? stageId,
    counts: body.counts ?? { learners: 0, assigned: 0, unassigned: 0, exempted: 0 },
    ancestor_grants: Array.isArray(body.ancestor_grants) ? body.ancestor_grants : [],
  };
}

export async function saveStageGrants(
  stageId: string,
  profileIds: string[],
  unlockedProfileIds: string[],
): Promise<SavedStageGrants> {
  const body = await apiFetch<Partial<SavedStageGrants>>(
    `/api/stage-grants/${encodeURIComponent(stageId)}`,
    {
      method: "PUT",
      body: { profile_ids: profileIds, unlocked_profile_ids: unlockedProfileIds },
    },
  );
  return {
    stage_id: body.stage_id ?? stageId,
    profile_ids: body.profile_ids ?? profileIds,
    unlocked_profile_ids: body.unlocked_profile_ids ?? unlockedProfileIds,
    ancestor_grants: Array.isArray(body.ancestor_grants) ? body.ancestor_grants : [],
  };
}

function unionIds(current: readonly string[], added: readonly string[]): string[] {
  const seen = new Set(current);
  const next = [...current];
  for (const id of added) {
    if (seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  return next;
}

/**
 * 保存したステージの割当と前提の免除を渡した一覧で置き換え、その下書きも保存結果に合わせる。
 * 自動で足した祖先には受講者を和集合で足す。
 * 祖先の前提の免除は変えない。祖先の下書きは未保存の編集を残し、足された受講者だけを加える。
 */
export function applySavedStageGrants(
  stages: readonly StageGrantStageRow[],
  drafts: Record<string, StageGrantDraft>,
  savedStageId: string,
  savedProfileIds: readonly string[],
  savedUnlockedIds: readonly string[],
  ancestorGrants: readonly StageAncestorGrant[],
): { stages: StageGrantStageRow[]; drafts: Record<string, StageGrantDraft> } {
  const additions = new Map<string, string[]>();
  for (const grant of ancestorGrants) {
    if (grant.stage_id === savedStageId || grant.profile_ids.length === 0) continue;
    const list = additions.get(grant.stage_id) ?? [];
    for (const id of grant.profile_ids) {
      if (!list.includes(id)) list.push(id);
    }
    additions.set(grant.stage_id, list);
  }

  const nextStages = stages.map((stage) => {
    if (stage.id === savedStageId) {
      return {
        ...stage,
        profile_ids: [...savedProfileIds],
        unlocked_profile_ids: [...savedUnlockedIds],
      };
    }
    const added = additions.get(stage.id);
    if (!added) return stage;
    return { ...stage, profile_ids: unionIds(stage.profile_ids, added) };
  });

  const nextDrafts: Record<string, StageGrantDraft> = {
    ...drafts,
    [savedStageId]: {
      profileIds: [...savedProfileIds],
      unlockedIds: [...savedUnlockedIds],
    },
  };
  for (const stage of stages) {
    if (stage.id === savedStageId) continue;
    const added = additions.get(stage.id);
    if (!added) continue;
    const current = drafts[stage.id] ?? { profileIds: [], unlockedIds: [] };
    nextDrafts[stage.id] = {
      profileIds: unionIds(current.profileIds, added),
      unlockedIds: [...current.unlockedIds],
    };
  }

  return { stages: nextStages, drafts: nextDrafts };
}

/** 前提を免除するチップ。前提クリア済みは押せない。無効な受講者の名前には「（無効）」を付ける。 */
export function stageGrantExemptionChip(
  learner: Pick<StageGrantLearnerRow, "display_name" | "selectable">,
  prerequisitesCleared: boolean,
): { pressable: boolean; label: string; ariaLabel: string } {
  const name = learner.selectable ? learner.display_name : `${learner.display_name}（無効）`;
  if (prerequisitesCleared) {
    const label = `${name}（前提クリア済み）`;
    return { pressable: false, label, ariaLabel: label };
  }
  return { pressable: true, label: name, ariaLabel: `前提を免除する ${name}` };
}

/** 保存成功のトースト。祖先に足したときはステージ名を「・」でつなぐ。 */
export function formatSavedStageGrantsMessage(
  stageTitle: string,
  stages: readonly StageGrantStageRow[],
  ancestorGrants: readonly StageAncestorGrant[],
): string {
  const titles: string[] = [];
  const seen = new Set<string>();
  for (const grant of ancestorGrants) {
    if (grant.profile_ids.length === 0 || seen.has(grant.stage_id)) continue;
    seen.add(grant.stage_id);
    const title = stages.find((row) => row.id === grant.stage_id)?.title;
    if (title) titles.push(title);
  }
  const saved = `「${stageTitle}」の割当を保存しました`;
  if (titles.length === 0) return saved;
  return `${saved}。前のステージ「${titles.join("・")}」にも割り当てました`;
}
