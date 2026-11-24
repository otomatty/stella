import type { GroupPeerProgress, LearnerGroup } from "@stella/shared/groups/types";
import { apiFetch } from "./api-client";

export async function listMyGroups(signal: AbortSignal): Promise<LearnerGroup[]> {
  const { groups } = await apiFetch<{ groups: LearnerGroup[] }>("/api/groups/mine", { signal });
  return groups;
}

export function getGroupPeers(groupId: string, signal: AbortSignal): Promise<GroupPeerProgress> {
  return apiFetch<GroupPeerProgress>(`/api/groups/${encodeURIComponent(groupId)}/peers`, {
    signal,
  });
}
