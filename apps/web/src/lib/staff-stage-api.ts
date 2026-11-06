import type { StaffStageTasksResponse, StaffTaskDetail } from "@stella/shared/tasks/staff-stage";
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

export async function fetchStaffTaskDetail(
  taskId: string,
  signal?: AbortSignal,
): Promise<StaffTaskDetail> {
  return apiFetch<StaffTaskDetail>(`/api/staff/tasks/detail?taskId=${encodeURIComponent(taskId)}`, {
    signal,
  });
}
