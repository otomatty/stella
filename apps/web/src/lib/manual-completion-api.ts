import type {
  ManualCompletionRequest,
  ManualCompletionResult,
  ManualCompletionView,
  ManualRevokeRequest,
  ManualRevokeResult,
} from "@stella/shared/tasks/manual-completion";
import { apiFetch, ApiClientError } from "./api-client";
export type CompletionView = ManualCompletionView & { userName: string; stageTitle: string };
export function fetchManualCompletion(userId: string, stageId: string, signal?: AbortSignal) {
  return apiFetch<CompletionView>(
    `/api/task-manual-completion?${new URLSearchParams({ userId, stageId })}`,
    { signal },
  );
}
export function completeManually(body: ManualCompletionRequest) {
  return apiFetch<ManualCompletionResult>("/api/task-manual-completion", { method: "POST", body });
}
export async function revokeManualCompletion(
  body: ManualRevokeRequest,
): Promise<ManualRevokeResult> {
  try {
    return await apiFetch<ManualRevokeResult>("/api/task-manual-completion/revoke", {
      method: "POST",
      body,
    });
  } catch (error) {
    if (
      error instanceof ApiClientError &&
      error.status === 409 &&
      error.data &&
      typeof error.data === "object" &&
      "blocked" in error.data &&
      "deleted" in error.data &&
      Array.isArray(error.data.blocked) &&
      typeof error.data.deleted === "number"
    )
      return error.data as ManualRevokeResult;
    throw error;
  }
}
