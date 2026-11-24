export const INTEGRATION_SCOPES = [
  "groups:write",
  "members:write",
  "stages:write",
  "progress:read",
  "events:read",
] as const;
export type IntegrationScope = (typeof INTEGRATION_SCOPES)[number];
export const INTEGRATION_SCOPE_DESCRIPTIONS = {
  "groups:write": "グループを作る・名前を直す",
  "members:write": "グループの人を足す・外す",
  "stages:write": "見せるステージと期限を決める",
  "progress:read": "進み具合を読む",
  "events:read": "できごとを読む",
} as const satisfies Record<IntegrationScope, string>;
export function isIntegrationScopes(value: unknown): value is IntegrationScope[] {
  return Array.isArray(value) && value.every((scope) => INTEGRATION_SCOPES.includes(scope));
}
export const INTEGRATION_GROUP_KEY = /^[A-Za-z0-9:_-]{1,100}$/;
export interface IntegrationGroup {
  id: string;
  key: string | null;
  name: string;
  memberCount: number;
  clientId: string | null;
}
export interface IntegrationClient {
  id: string;
  name: string;
  tokenPrefix: string;
  allowedStagePrefixes: string[];
  scopes: IntegrationScope[];
  enabled: boolean;
  lastUsedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 空配列はすべて拒否。空文字を許すと全ステージに一致するので禁止する。 */
export function isAllowedStagePrefixes(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= 100 &&
    value.every((prefix) => typeof prefix === "string" && /^[a-z0-9][a-z0-9-]{0,99}$/.test(prefix))
  );
}
export interface IntegrationMemberInput {
  email: string;
  displayName?: string;
  externalId?: string | null;
  peerName?: string | null;
}
export interface IntegrationMemberResult {
  index: number;
  status: "invited" | "existing" | "already_member" | "failed";
  id: string | null;
  code?:
    | "invalid_email"
    | "invalid_member"
    | "external_id_conflict"
    | "not_invitable"
    | "invite_failed";
}
export interface IntegrationStageInput {
  slug: string;
  due_at?: string | null;
  message?: string | null;
  exempt?: boolean;
}

export type IntegrationSource = "tests" | "ai" | "human" | "manual";
export interface IntegrationTaskProgress {
  id: string;
  title: string;
  /** at 指定時は状態を復元せず省略する。 */
  status?: string;
  pendingReview?: boolean;
  passed: boolean;
  passedAt: string | null;
  source: IntegrationSource | null;
  submissionUrl?: string;
  problems?: { total: number; passed: number; sources: ("tests" | "manual")[] };
}
export interface IntegrationProgress {
  members: {
    id: string;
    externalId: string | null;
    email: string;
    displayName: string;
    lastActiveDate?: string | null;
    stages: {
      slug: string;
      status: "assigned" | "started" | "cleared";
      startedAt: string | null;
      clearedAt: string | null;
      progressUrl: string;
      units: { id: string; title: string; tasks: IntegrationTaskProgress[] }[];
    }[];
  }[];
  next: string | null;
  hasMore: boolean;
}
export interface IntegrationEvent {
  id: string;
  type:
    | "stage_started"
    | "stage_cleared"
    | "stage_clear_revoked"
    | "stage_unassigned"
    | "task_passed"
    | "task_returned"
    | "task_pass_revoked"
    | "problems_passed"
    | "problems_revoked";
  occurredAt: string;
  person: { id: string; externalId: string | null };
  stage: string;
  taskId?: string;
  source?: IntegrationSource | null;
  submissionUrl?: string;
  reason?: "resubmit" | "fail" | "removed";
  count?: number;
  problemsPassed?: number;
}
