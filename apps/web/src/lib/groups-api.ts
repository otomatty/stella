import type {
  GroupPeerProgress,
  GroupTimeline,
  GroupTimelineEvent,
  LearnerGroup,
} from "@stella/shared/groups/types";
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

type ReactionResponse = { reactions: GroupTimelineEvent["reactions"] };

export function getGroupTimeline(
  groupId: string,
  cursor?: string,
  signal?: AbortSignal,
): Promise<GroupTimeline> {
  const query = cursor === undefined ? "" : `?${new URLSearchParams({ cursor })}`;
  return apiFetch<GroupTimeline>(`/api/groups/${encodeURIComponent(groupId)}/timeline${query}`, {
    signal,
  });
}

export function addGroupReaction(
  groupId: string,
  key: string,
  emoji: string,
): Promise<ReactionResponse> {
  return apiFetch<ReactionResponse>(
    `/api/groups/${encodeURIComponent(groupId)}/timeline/reactions`,
    {
      method: "POST",
      body: { key, emoji },
    },
  );
}

export function removeGroupReaction(
  groupId: string,
  key: string,
  emoji: string,
): Promise<ReactionResponse> {
  return apiFetch<ReactionResponse>(
    `/api/groups/${encodeURIComponent(groupId)}/timeline/reactions`,
    {
      method: "DELETE",
      body: { key, emoji },
    },
  );
}
