import { apiFetch } from "./api-client";

export interface StageGrantStageRow {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  profile_ids: string[];
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

/** 保存時に自動で足した、祖先の講座への割当。 */
export interface StageAncestorGrant {
  stage_id: string;
  profile_ids: string[];
}

export interface SavedStageGrants {
  stage_id: string;
  profile_ids: string[];
  ancestor_grants: StageAncestorGrant[];
}

export async function listStageGrants(): Promise<StageGrantsPayload> {
  return apiFetch<StageGrantsPayload>("/api/stage-grants");
}

export async function saveStageGrants(
  stageId: string,
  profileIds: string[],
): Promise<SavedStageGrants> {
  const body = await apiFetch<Partial<SavedStageGrants>>(
    `/api/stage-grants/${encodeURIComponent(stageId)}`,
    {
      method: "PUT",
      body: { profile_ids: profileIds },
    },
  );
  return {
    stage_id: body.stage_id ?? stageId,
    profile_ids: body.profile_ids ?? profileIds,
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
 * 保存した講座の割当を渡した一覧で置き換え、自動で足した祖先には受講者を和集合で足す。
 * 祖先の下書きは未保存の編集を残し、足された受講者だけを加える。
 */
export function applySavedStageGrants(
  stages: readonly StageGrantStageRow[],
  drafts: Record<string, string[]>,
  savedStageId: string,
  savedProfileIds: readonly string[],
  ancestorGrants: readonly StageAncestorGrant[],
): { stages: StageGrantStageRow[]; drafts: Record<string, string[]> } {
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
      return { ...stage, profile_ids: [...savedProfileIds] };
    }
    const added = additions.get(stage.id);
    if (!added) return stage;
    return { ...stage, profile_ids: unionIds(stage.profile_ids, added) };
  });

  const nextDrafts: Record<string, string[]> = { ...drafts };
  for (const stage of stages) {
    if (stage.id === savedStageId) continue;
    const added = additions.get(stage.id);
    if (!added) continue;
    nextDrafts[stage.id] = unionIds(drafts[stage.id] ?? [], added);
  }

  return { stages: nextStages, drafts: nextDrafts };
}

/** 保存成功のトースト。祖先に足したときは講座名を「・」でつなぐ。 */
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
  return `${saved}。前の講座「${titles.join("・")}」にも割り当てました`;
}
