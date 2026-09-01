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

export async function listStageGrants(): Promise<StageGrantsPayload> {
  return apiFetch<StageGrantsPayload>("/api/stage-grants");
}

export async function saveStageGrants(stageId: string, profileIds: string[]): Promise<void> {
  await apiFetch(`/api/stage-grants/${encodeURIComponent(stageId)}`, {
    method: "PUT",
    body: { profile_ids: profileIds },
  });
}
