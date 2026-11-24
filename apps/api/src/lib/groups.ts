import type { IntegrationStageInput } from "@stella/shared/integrations/types";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { groupMembers, groups, groupStages, profiles, stages } from "../db/schema.js";
import type { Env } from "../env.js";
import { ApiError } from "./authz.js";
import { learnerOnly } from "./learner-scope.js";
import { hasNoIslandPrerequisites, parentSlugFromRow } from "./stage-audience.js";
import { parseGuidance } from "./stage-grant-guidance.js";

type GroupChanges = { name?: string; shareProgress?: boolean };
type GroupNameChange =
  | ({ name: string } & ({ clientId: string; externalKey: string } | { createdBy: string }))
  | ({ id: string } & ({ name: string; shareProgress?: boolean } | { shareProgress: boolean }));

export async function createOrRenameGroup(db: Db, group: GroupNameChange) {
  const [saved] =
    "id" in group
      ? await updateGroupSettings(db, group.id, group)
      : await db
          .insert(groups)
          .values(group)
          .onConflictDoUpdate({
            target: [groups.clientId, groups.externalKey],
            set: { name: group.name, updatedAt: new Date() },
          })
          .returning();
  if (!saved) throw new ApiError("Not found", 404);
  return saved;
}

function updateGroupSettings(db: Db, id: string, { name, shareProgress }: GroupChanges) {
  return db
    .update(groups)
    .set({ name, shareProgress, updatedAt: new Date() })
    .where(and(eq(groups.id, id), name === undefined ? undefined : isNull(groups.clientId)))
    .returning();
}

export async function deleteAdminGroup(db: Db, id: string) {
  const [deleted] = await db
    .delete(groups)
    .where(and(eq(groups.id, id), isNull(groups.clientId)))
    .returning({ id: groups.id });
  if (!deleted) throw new ApiError("Not found", 404);
}

export async function setGroupPeerName(
  db: Db,
  groupId: string,
  profileId: string,
  peerName: string | null,
) {
  const [member] = await db
    .update(groupMembers)
    .set({ peerName })
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.profileId, profileId)))
    .returning({ id: groupMembers.profileId });
  if (!member) throw new ApiError("Not found", 404);
}

export async function patchAdminGroupMembers(
  db: Db,
  groupId: string,
  add: readonly string[],
  remove: readonly string[],
) {
  const addedIds = sql`json_each(${JSON.stringify(add)})`;
  const removedIds = sql`select value from json_each(${JSON.stringify(remove)})`;
  const invalid = db
    .select({ id: sql<string>`requested.value` })
    .from(sql`${addedIds} as requested`)
    .where(sql`not exists (
      select 1 from ${profiles} where ${profiles.id} = requested.value
        and ${profiles.disabled} = 0 and ${learnerOnly(profiles.id)}
    )`);
  // 受講者の状態を確認し、差分を適用するまでを同じ batch に入れる。
  // 不正な追加が一つでもあれば、削除・追加ともに行わない。
  const valid = sql`not exists (${invalid.getSQL()}) and exists (
    select 1 from ${groups} where ${groups.id} = ${groupId} and ${groups.clientId} is null
  )`;
  const [invalidRows, removed, added] = await db.batch([
    invalid,
    db
      .delete(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          sql`${groupMembers.profileId} in (${removedIds}) and ${valid}`,
        ),
      )
      .returning({ id: groupMembers.profileId }),
    db
      .insert(groupMembers)
      .select(
        sql`select ${groupId}, value, null, null, ${Date.now()} from ${addedIds} where ${valid}`,
      )
      .onConflictDoNothing({ target: [groupMembers.groupId, groupMembers.profileId] })
      .returning({ id: groupMembers.profileId }),
  ]);
  return {
    invalidIds: invalidRows.map((row) => row.id),
    added: added.length,
    removed: removed.length,
  };
}

export function addGroupMemberStatement(
  binding: Env["DB"],
  groupId: string,
  profileId: string,
  fields: { externalId?: string | null; peerName?: string | null },
) {
  // 招待やプロフィール検索の後で無効化・昇格されたアカウントも追加しない。
  return binding
    .prepare(
      `INSERT INTO group_members (group_id, profile_id, external_id, peer_name, joined_at)
      SELECT ?, id, ?, ?, ? FROM profiles WHERE id = ? AND role = 'student' AND disabled = 0
      ON CONFLICT(group_id, profile_id) DO UPDATE SET
        external_id = CASE WHEN ? THEN excluded.external_id ELSE group_members.external_id END,
        peer_name = CASE WHEN ? THEN excluded.peer_name ELSE group_members.peer_name END
      RETURNING profile_id`,
    )
    .bind(
      groupId,
      fields.externalId ?? null,
      fields.peerName ?? null,
      Date.now(),
      profileId,
      fields.externalId !== undefined ? 1 : 0,
      fields.peerName !== undefined ? 1 : 0,
    );
}

export async function removeGroupMember(db: Db, groupId: string, profileId: string) {
  await db
    .delete(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.profileId, profileId)));
}

function parseGroupStage(value: unknown): Required<IntegrationStageInput> {
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

export async function replaceGroupStages(
  db: Db,
  group: Pick<typeof groups.$inferSelect, "id" | "clientId">,
  inputs: readonly unknown[],
  prefixes?: readonly string[],
) {
  const allowedStagePrefixes = group.clientId === null ? undefined : (prefixes ?? []);
  const errors: { slug: unknown; code: string }[] = [];
  const settings: (Required<IntegrationStageInput> & { stageId: string })[] = [];
  const seen = new Set<string>();
  const stageRows = new Map<string, typeof stages.$inferSelect>();
  for (const raw of inputs) {
    let input: Required<IntegrationStageInput>;
    try {
      input = parseGroupStage(raw);
    } catch {
      errors.push({
        slug:
          raw && typeof raw === "object" ? ((raw as Record<string, unknown>).slug ?? null) : null,
        code: "invalid_stage",
      });
      continue;
    }
    if (seen.has(input.slug)) {
      errors.push({ slug: input.slug, code: "duplicate_slug" });
      continue;
    }
    seen.add(input.slug);
    if (
      allowedStagePrefixes !== undefined &&
      !allowedStagePrefixes.some((prefix) => input.slug.startsWith(prefix))
    ) {
      errors.push({ slug: input.slug, code: "prefix_not_allowed" });
      continue;
    }
    const [stage] = await db.select().from(stages).where(eq(stages.slug, input.slug)).limit(1);
    if (stage?.audience !== "granted") {
      errors.push({ slug: input.slug, code: "not_granted" });
      continue;
    }
    stageRows.set(stage.slug, stage);
    settings.push({ ...input, stageId: stage.id });
  }
  if (errors.length) return { ok: false as const, errors };
  // 親を自動で割り当てると、クライアントに許した接頭辞の外まで広がりうる。
  // 同じ要求に granted の祖先がすべて含まれることを、書き込み前に確かめる。
  const included = new Set(settings.map((setting) => setting.slug));
  const missingParents = new Set<string>();
  for (const setting of settings) {
    let row = stageRows.get(setting.slug);
    const visited = new Set<string>([setting.slug]);
    while (row && !hasNoIslandPrerequisites(row)) {
      const parentSlug = parentSlugFromRow(row);
      if (!parentSlug || visited.has(parentSlug)) break;
      visited.add(parentSlug);
      row = stageRows.get(parentSlug);
      if (!row) {
        [row] = await db.select().from(stages).where(eq(stages.slug, parentSlug)).limit(1);
        if (row) stageRows.set(parentSlug, row);
      }
      if (row?.audience === "granted" && !included.has(parentSlug)) missingParents.add(parentSlug);
    }
  }
  for (const slug of missingParents) errors.push({ slug, code: "parent_not_included" });
  if (errors.length) return { ok: false as const, errors };
  const remove = db.delete(groupStages).where(eq(groupStages.groupId, group.id));
  await db.batch([
    remove,
    ...settings.map((setting) =>
      db.insert(groupStages).values({
        groupId: group.id,
        stageId: setting.stageId,
        dueAt: setting.due_at,
        message: setting.message,
        exempt: setting.exempt,
      }),
    ),
  ]);
  return { ok: true as const, stages: settings.map(({ stageId: _, ...setting }) => setting) };
}
