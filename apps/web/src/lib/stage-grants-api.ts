import type {
  StageGrantGuidance,
  StageGrantGuidanceRequest,
  StageGrantGuidanceSummary,
  StageGrantSources,
} from "@stella/shared/stage-grants/types";
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
  sources: StageGrantSources;
  exemption_sources: StageGrantSources;
  guidance?: StageGrantGuidance | null;
  id: string;
  display_name: string;
  email: string | null;
  role?: string;
  selectable: boolean;
  assigned: boolean;
  exempted: boolean;
  unlocked_by_skill_check: boolean;
  prerequisites_cleared: boolean;
  prerequisite_status: "done" | "doing" | "none";
}

export interface StageGrantLearnerPage {
  manual_assigned_count?: number;
  guidance_summary?: StageGrantGuidanceSummary;
  stage: {
    id: string;
    slug: string;
    title: string;
    category: string | null;
    prerequisites: { id: string; slug: string; title: string }[];
  };
  counts: StageGrantLearnerCounts;
  total: number;
  next_offset: number | null;
  learners: StageGrantLearnerDetail[];
}

export interface StageGrantLearnerQuery {
  groupId?: string;
  q?: string;
  status?: "all" | "assigned" | "unassigned" | "exempted";
  prereq?: "all" | "done" | "doing" | "none" | "not_done";
  offset?: number;
  limit?: number;
}

export interface StageGrantDiff {
  descendants?: boolean;
  add?: string[];
  remove?: string[];
  exempt?: string[];
  unexempt?: string[];
}

export interface UpdatedStageGrants {
  stage_id: string;
  counts: StageGrantLearnerCounts;
  ancestor_grants: StageAncestorGrant[];
  descendant_grants: StageAncestorGrant[];
  descendant_removals: StageAncestorGrant[];
}

function stageGrantLearnerQuery(params: StageGrantLearnerQuery): string {
  const search = new URLSearchParams();
  if (params.groupId) search.set("groupId", params.groupId);
  if (params.q) search.set("q", params.q);
  if (params.status && params.status !== "all") search.set("status", params.status);
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

export interface StageGrantDescendant {
  id: string;
  slug: string;
  title: string;
}

export function listStageGrantDescendants(stageId: string, signal?: AbortSignal) {
  return apiFetch<{ stages: StageGrantDescendant[] }>(
    `/api/stage-grants/${encodeURIComponent(stageId)}/descendants`,
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
    descendant_grants: Array.isArray(body.descendant_grants) ? body.descendant_grants : [],
    descendant_removals: Array.isArray(body.descendant_removals) ? body.descendant_removals : [],
  };
}

export function updateStageGrantGuidance(stageId: string, guidance: StageGrantGuidanceRequest) {
  return apiFetch<{ updated: number; guidance: StageGrantGuidance }>(
    `/api/stage-grants/${encodeURIComponent(stageId)}/guidance`,
    {
      method: "PATCH",
      body: guidance,
    },
  );
}
