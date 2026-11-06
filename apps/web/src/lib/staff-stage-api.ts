import type { StaffStageTasksResponse } from "@stella/shared/tasks/staff-stage";
import { apiFetch } from "./api-client";

export async function fetchStaffStageTasks(
  stageId: string,
  signal?: AbortSignal,
): Promise<StaffStageTasksResponse> {
  return apiFetch<StaffStageTasksResponse>(
    `/api/staff/stages/${encodeURIComponent(stageId)}/tasks`,
    { signal },
  );
}
