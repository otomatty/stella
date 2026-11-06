/**
 * Extra ステージの割り当てを差分で書く。
 *
 * 追加・削除・免除の id は 1 文に並べると D1 の 100 バインドを超える。
 * 何を書くかは純関数で決め、SQL は `rowsPerInsert` で測った行数に分ける。
 * 測るのは実行しないダミーの Drizzle で、実際の文は呼び出し元の db で組む。
 */

import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import type { Db } from "../db/client.js";
import { stageGrants, stageUnlocks } from "../db/schema.js";
import { chunk, rowsPerInsert } from "./enrollment-bulk.js";
import { isAssignableStageGrantProfile, type StageGrantParse } from "./stage-grant-learners.js";

export interface StageGrantDiff {
  add: string[];
  remove: string[];
  exempt: string[];
  unexempt: string[];
}

export interface PreparedStageGrantDiff {
  /** このステージに新たに足す。既にある人は含まない。 */
  added: string[];
  /** 外す依頼。割り当てが無くても delete は空振りする。 */
  removed: string[];
  /** staff の免除を足す。腕試しの行がある人は含まない (上書きしない)。 */
  exempted: string[];
  /** staff の免除を外す依頼。 */
  unexempted: string[];
  /** remove と unexempt の和。via = staff の行だけを消す。 */
  deleteStaffIds: string[];
}

const UNASSIGNABLE = "割当できないユーザーが含まれています";
const EXEMPT_REQUIRES_GRANT = "前提を免除できるのは、割り当てるユーザーだけです";

function readIdList(value: unknown, label: string): StageGrantParse<string[]> {
  if (value === undefined) return { ok: true, value: [] };
  if (!Array.isArray(value) || !value.every((id) => typeof id === "string")) {
    return { ok: false, error: `${label} は文字列の配列で指定してください` };
  }
  return {
    ok: true,
    value: [...new Set(value.map((id) => id.trim()).filter((id) => id !== ""))],
  };
}

function sharesId(left: readonly string[], right: readonly string[]): boolean {
  const ids = new Set(left);
  return right.some((id) => ids.has(id));
}

/** 4 つとも空、または追加と削除 (免除とその解除) が重なれば、その説明。 */
export function stageGrantDiffShapeError(diff: StageGrantDiff): string | null {
  if (sharesId(diff.add, diff.remove)) {
    return "同じユーザーを追加と削除の両方に指定できません";
  }
  if (sharesId(diff.exempt, diff.unexempt)) {
    return "同じユーザーを免除と免除の解除の両方に指定できません";
  }
  if (
    diff.add.length === 0 &&
    diff.remove.length === 0 &&
    diff.exempt.length === 0 &&
    diff.unexempt.length === 0
  ) {
    return "変更するユーザーを指定してください";
  }
  return null;
}

export function parseStageGrantDiff(body: unknown): StageGrantParse<StageGrantDiff> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "変更内容はオブジェクトで指定してください" };
  }
  const record = body as Record<string, unknown>;
  const add = readIdList(record.add, "add");
  if (!add.ok) return add;
  const remove = readIdList(record.remove, "remove");
  if (!remove.ok) return remove;
  const exempt = readIdList(record.exempt, "exempt");
  if (!exempt.ok) return exempt;
  const unexempt = readIdList(record.unexempt, "unexempt");
  if (!unexempt.ok) return unexempt;
  const diff = {
    add: add.value,
    remove: remove.value,
    exempt: exempt.value,
    unexempt: unexempt.value,
  };
  const shape = stageGrantDiffShapeError(diff);
  if (shape) return { ok: false, error: shape };
  return { ok: true, value: diff };
}

export function prepareStageGrantDiff(
  diff: StageGrantDiff,
  profiles: ReadonlyMap<string, { role: string; disabled: boolean }>,
  assigned: ReadonlySet<string>,
  otherViaUnlocks: ReadonlySet<string>,
): StageGrantParse<PreparedStageGrantDiff> {
  for (const id of diff.add) {
    const profile = profiles.get(id);
    if (!profile || !isAssignableStageGrantProfile(profile)) {
      return { ok: false, error: UNASSIGNABLE };
    }
  }
  for (const id of diff.exempt) {
    const profile = profiles.get(id);
    if (!profile) {
      return { ok: false, error: UNASSIGNABLE };
    }
  }
  const finalAssigned = new Set(assigned);
  for (const id of diff.remove) finalAssigned.delete(id);
  for (const id of diff.add) finalAssigned.add(id);
  if (diff.exempt.some((id) => !finalAssigned.has(id))) {
    return { ok: false, error: EXEMPT_REQUIRES_GRANT };
  }
  return {
    ok: true,
    value: {
      added: diff.add.filter((id) => !assigned.has(id)),
      removed: [...diff.remove],
      exempted: diff.exempt.filter((id) => !otherViaUnlocks.has(id)),
      unexempted: [...diff.unexempt],
      deleteStaffIds: [...new Set([...diff.remove, ...diff.unexempt])],
    },
  };
}

export function assignmentAfterDiff(
  assigned: ReadonlySet<string>,
  staffUnlocks: ReadonlySet<string>,
  plan: PreparedStageGrantDiff,
): { assigned: Set<string>; staffUnlocks: Set<string> } {
  const nextAssigned = new Set(assigned);
  for (const id of plan.removed) nextAssigned.delete(id);
  for (const id of plan.added) nextAssigned.add(id);
  const nextStaff = new Set(staffUnlocks);
  for (const id of plan.deleteStaffIds) nextStaff.delete(id);
  for (const id of plan.exempted) nextStaff.add(id);
  return { assigned: nextAssigned, staffUnlocks: nextStaff };
}

/** 祖先ステージへ足す行。既にある組は触らない。 */
export function ancestorGrantRows(
  ancestorStageIds: readonly string[],
  profileIds: readonly string[],
  existing: ReadonlySet<string>,
): { stageId: string; profileId: string }[] {
  const rows: { stageId: string; profileId: string }[] = [];
  for (const stageId of ancestorStageIds) {
    for (const profileId of profileIds) {
      if (existing.has(`${stageId}\0${profileId}`)) continue;
      rows.push({ stageId, profileId });
    }
  }
  return rows;
}

export function groupAncestorGrants(
  rows: readonly { stageId: string; profileId: string }[],
): { stage_id: string; profile_ids: string[] }[] {
  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    const list = grouped.get(row.stageId) ?? [];
    list.push(row.profileId);
    grouped.set(row.stageId, list);
  }
  return [...grouped.entries()].map(([stage_id, profile_ids]) => ({ stage_id, profile_ids }));
}

function measureDb(): Db {
  const dummy = {
    prepare: () => ({ bind: () => ({}) }),
    batch: async () => [],
    exec: async () => ({}),
    dump: async () => "",
  };
  return drizzle(dummy as never);
}

const measured = measureDb();

function sampleIds(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `measure-${index}`);
}

/** ステージ id を `in` に並べる文の、1 文あたりの件数。 */
export function stageIdListChunkSize(
  build: (db: Db, ids: string[]) => { toSQL: () => { params: unknown[] } },
): number {
  return rowsPerInsert((count) => build(measured, sampleIds(count)));
}

type GrantInsert = { stageId: string; profileId: string; grantedBy: string };
type UnlockInsert = { userId: string; stageId: string; via: "staff"; unlockedAt: Date };

function insertGrants(db: Db, rows: GrantInsert[]) {
  return db.insert(stageGrants).values(rows).onConflictDoNothing();
}

function deleteGrants(db: Db, stageId: string, profileIds: string[]) {
  return db
    .delete(stageGrants)
    .where(and(eq(stageGrants.stageId, stageId), inArray(stageGrants.profileId, profileIds)));
}

function deleteStaffUnlocks(db: Db, stageId: string, userIds: string[]) {
  return db
    .delete(stageUnlocks)
    .where(
      and(
        eq(stageUnlocks.stageId, stageId),
        eq(stageUnlocks.via, "staff"),
        inArray(stageUnlocks.userId, userIds),
      ),
    );
}

function insertStaffUnlocks(db: Db, rows: UnlockInsert[]) {
  return db
    .insert(stageUnlocks)
    .values(rows)
    .onConflictDoNothing({ target: [stageUnlocks.userId, stageUnlocks.stageId] });
}

export interface StageGrantWriteInput {
  stageId: string;
  grantedBy: string;
  grantRows: readonly { stageId: string; profileId: string }[];
  removeProfileIds: readonly string[];
  deleteStaffUserIds: readonly string[];
  exemptUserIds: readonly string[];
  unlockedAt?: Date;
}

export function grantRowsByStageStatements(db: Db, stageIds: readonly string[]) {
  if (stageIds.length === 0) return [];
  const size = stageIdListChunkSize((database, ids) =>
    database
      .select({ stageId: stageGrants.stageId, profileId: stageGrants.profileId })
      .from(stageGrants)
      .where(inArray(stageGrants.stageId, ids)),
  );
  return chunk([...stageIds], size).map((part) =>
    db
      .select({ stageId: stageGrants.stageId, profileId: stageGrants.profileId })
      .from(stageGrants)
      .where(inArray(stageGrants.stageId, part)),
  );
}

/** 差分の insert / delete を、どの文も 100 バインド以下になるよう分ける。 */
export function planStageGrantWriteStatements(db: Db, input: StageGrantWriteInput) {
  const unlockedAt = input.unlockedAt ?? new Date();
  const statements = [];
  if (input.removeProfileIds.length > 0) {
    const size = rowsPerInsert((count) => deleteGrants(measured, input.stageId, sampleIds(count)));
    for (const part of chunk([...input.removeProfileIds], size)) {
      statements.push(deleteGrants(db, input.stageId, part));
    }
  }
  if (input.grantRows.length > 0) {
    const size = rowsPerInsert((count) =>
      insertGrants(
        measured,
        Array.from({ length: count }, (_, index) => ({
          stageId: input.stageId,
          profileId: `measure-${index}`,
          grantedBy: input.grantedBy,
        })),
      ),
    );
    const rows = input.grantRows.map((row) => ({ ...row, grantedBy: input.grantedBy }));
    for (const part of chunk(rows, size)) statements.push(insertGrants(db, part));
  }
  if (input.deleteStaffUserIds.length > 0) {
    const size = rowsPerInsert((count) =>
      deleteStaffUnlocks(measured, input.stageId, sampleIds(count)),
    );
    for (const part of chunk([...input.deleteStaffUserIds], size)) {
      statements.push(deleteStaffUnlocks(db, input.stageId, part));
    }
  }
  if (input.exemptUserIds.length > 0) {
    const size = rowsPerInsert((count) =>
      insertStaffUnlocks(
        measured,
        Array.from({ length: count }, (_, index) => ({
          userId: `measure-${index}`,
          stageId: input.stageId,
          via: "staff" as const,
          unlockedAt,
        })),
      ),
    );
    const rows = input.exemptUserIds.map((userId) => ({
      userId,
      stageId: input.stageId,
      via: "staff" as const,
      unlockedAt,
    }));
    for (const part of chunk(rows, size)) statements.push(insertStaffUnlocks(db, part));
  }
  return statements;
}
