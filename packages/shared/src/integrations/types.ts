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
  key: string;
  name: string;
  memberCount: number;
  clientId: string;
}
export interface IntegrationClient {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: IntegrationScope[];
  enabled: boolean;
  lastUsedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}
