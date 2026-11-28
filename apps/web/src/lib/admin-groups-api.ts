import { apiFetch, type ApiOptions } from "./api-client";
import type { GroupStage } from "./admin-group-stages";

export const ADMIN_GROUPS = "/api/admin/groups";

export interface GroupSummary {
  id: string;
  name: string;
  kind: "admin" | "integration";
  clientName: string | null;
  memberCount: number;
  stageCount: number;
  shareProgress: boolean;
  shareActivity: boolean;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  displayName: string;
  email: string | null;
  peerName: string | null;
  externalId: string | null;
  joinedAt: string;
}

export interface GroupDetail {
  group: GroupSummary;
  members: GroupMember[];
  stages: GroupStage[];
}

export type GroupRequest = <T>(suffix?: string, options?: ApiOptions) => Promise<T>;

export function groupRequest(id: string): GroupRequest {
  return (suffix = "", options) =>
    apiFetch(`${ADMIN_GROUPS}/${encodeURIComponent(id)}${suffix}`, options);
}
