import type { GroupReflections } from "@stella/shared/groups/types";
import { sql, type SQL } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { ApiError } from "./authz.js";
import { decodePosition, encodePosition } from "./integration-read.js";

const PAGE_SIZE = 30;
// String.prototype.trim と同じ空白を、空の振り返りの判定に使う。
const WHITESPACE =
  " \t\n\v\f\r\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff";

export function hasReflectionText(explanation: SQL) {
  return sql`trim(${explanation}, ${WHITESPACE}) <> ''`;
}

export async function loadGroupReflections(
  db: Db,
  groupId: string,
  cursor: string | undefined,
): Promise<GroupReflections> {
  let before = sql``;
  if (cursor !== undefined) {
    const position = decodePosition(cursor);
    if (
      !Array.isArray(position) ||
      position.length !== 3 ||
      position[0] !== groupId ||
      !Number.isSafeInteger(position[1]) ||
      typeof position[2] !== "string"
    )
      throw new ApiError("カーソルが不正です", 400);
    before = sql`and (x.submitted_at, x.id) < (${position[1]}, ${position[2]})`;
  }

  type Row = Omit<GroupReflections["reflections"][number], "hidden"> & { hidden: 0 | 1 };
  const rows = await db.all<Row>(sql`
    select x.id submissionId, coalesce(m.peer_name, p.display_name) name, s.title stageTitle,
      t.title taskTitle, x.submitted_at submittedAt, x.explanation reflection,
      x.reflection_hidden_at is not null hidden
    from group_members m
    join profiles p on p.id = m.profile_id
    join submissions x on x.student_id = m.profile_id
    join tasks t on t.id = x.task_id
    join sections u on u.id = t.section_id
    join group_stages gs on gs.group_id = m.group_id and gs.stage_id = u.stage_id
    join stages s on s.id = gs.stage_id
    where m.group_id = ${groupId} and x.share_reflection = 1
      and ${hasReflectionText(sql`x.explanation`)} ${before}
    order by x.submitted_at desc, x.id desc
    limit ${PAGE_SIZE + 1}
  `);
  const page = rows.slice(0, PAGE_SIZE);
  const last = page.at(-1);
  return {
    reflections: page.map((row) => ({ ...row, hidden: row.hidden === 1 })),
    nextCursor:
      rows.length > PAGE_SIZE && last
        ? encodePosition([groupId, last.submittedAt, last.submissionId])
        : null,
  };
}
