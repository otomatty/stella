import type { IntegrationStageInput } from "@stella/shared/integrations/types";
import type { Env } from "../env.js";
import { parseGuidance } from "./stage-grant-guidance.js";
import { ApiError } from "./authz.js";

export function parseIntegrationStage(value: unknown): Required<IntegrationStageInput> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ApiError("Invalid stage", 400);
  const row = value as Record<string, unknown>;
  if (
    typeof row.slug !== "string" ||
    !/^[a-z0-9][a-z0-9-]{0,199}$/.test(row.slug) ||
    (row.exempt !== undefined && typeof row.exempt !== "boolean")
  )
    throw new ApiError("Invalid slug or exempt", 400);
  let due = row.due_at ?? null;
  // 日付だけの場合は、管理画面と同じ日本時間のその日の終わりとして扱う。
  if (typeof due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(due)) due = `${due}T23:59:59+09:00`;
  const { guidance } = parseGuidance({
    source_name: null,
    due_at: due,
    message: row.message ?? null,
    all: true,
  });
  return {
    slug: row.slug,
    due_at: guidance.due_at,
    message: guidance.message,
    exempt: row.exempt === true,
  };
}

/** 一つの batch 内で呼ぶ。対象はこのグループが所有する割り当てだけ。 */
export function removeGroupGrantStatements(
  binding: Env["DB"],
  groupId: string,
  profileId?: string,
) {
  const memberFilter = profileId
    ? " AND g.profile_id = ?"
    : " AND NOT EXISTS (SELECT 1 FROM integration_group_stages s WHERE s.group_id = g.source_group_id AND s.stage_id = g.stage_id)";
  const params = profileId ? [groupId, profileId] : [groupId];
  const owned = `SELECT g.id FROM stage_grants g WHERE g.source_group_id = ? ${memberFilter}`;
  const unstarted =
    "NOT EXISTS (SELECT 1 FROM enrollments e WHERE e.user_id = g.profile_id AND e.stage_id = g.stage_id)";
  return [
    binding
      .prepare(`DELETE FROM stage_unlocks WHERE source_group_id = ? AND via = 'staff' AND EXISTS (
      SELECT 1 FROM stage_grants g WHERE g.id IN (${owned}) AND ${unstarted}
      AND g.profile_id = stage_unlocks.user_id AND g.stage_id = stage_unlocks.stage_id
    )`)
      .bind(groupId, ...params),
    binding
      .prepare(
        `DELETE FROM stage_grants WHERE id IN (SELECT g.id FROM stage_grants g WHERE g.id IN (${owned}) AND ${unstarted})`,
      )
      .bind(...params),
    binding
      .prepare(
        `UPDATE stage_grants SET source_name = NULL, due_at = NULL, message = NULL WHERE id IN (${owned})`,
      )
      .bind(...params),
  ];
}

/** INSERT SELECT で人数に比例するバインドを避ける。手動・他グループの行は変更しない。 */
export function applyGroupStageStatements(binding: Env["DB"], groupId: string, sourceName: string) {
  const now = Math.floor(Date.now() / 1000);
  return [
    binding
      .prepare(`INSERT INTO stage_grants
      (id, tenant_id, stage_id, profile_id, source_group_id, source_name, due_at, message, granted_at)
      SELECT lower(hex(randomblob(16))), p.tenant_id, s.stage_id, m.profile_id, s.group_id, ?, s.due_at, s.message, ?
      FROM integration_group_stages s JOIN integration_group_members m ON m.group_id = s.group_id
      JOIN profiles p ON p.id = m.profile_id
      WHERE s.group_id = ? AND p.role = 'student' AND p.disabled = 0
      ON CONFLICT(stage_id, profile_id) DO UPDATE SET source_name = excluded.source_name, due_at = excluded.due_at, message = excluded.message
      WHERE stage_grants.source_group_id = excluded.source_group_id`)
      .bind(sourceName, now, groupId),
    binding
      .prepare(`DELETE FROM stage_unlocks WHERE source_group_id = ? AND via = 'staff'
      AND EXISTS (SELECT 1 FROM integration_group_stages s JOIN integration_group_members m ON m.group_id = s.group_id
        WHERE s.group_id = ? AND s.stage_id = stage_unlocks.stage_id AND m.profile_id = stage_unlocks.user_id AND s.exempt = 0)`)
      .bind(groupId, groupId),
    binding
      .prepare(`INSERT INTO stage_unlocks (id, tenant_id, user_id, stage_id, via, source_group_id, unlocked_at)
      SELECT lower(hex(randomblob(16))), g.tenant_id, g.profile_id, g.stage_id, 'staff', g.source_group_id, ?
      FROM stage_grants g JOIN integration_group_stages s ON s.group_id = g.source_group_id AND s.stage_id = g.stage_id
      JOIN integration_group_members m ON m.group_id = s.group_id AND m.profile_id = g.profile_id
      WHERE s.group_id = ? AND s.exempt = 1
      ON CONFLICT(user_id, stage_id) DO NOTHING`)
      .bind(now, groupId),
  ];
}
