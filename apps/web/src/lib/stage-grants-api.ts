import { apiFetch } from "./api-client";

/** 保存時に自動で足した、祖先のステージへの割当。 */
export interface StageAncestorGrant {
  stage_id: string;
  profile_ids: string[];
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
  prereq?: "all" | "done" | "doing" | "none" | "not_done";
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
