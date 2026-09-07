/**
 * 殿堂 (Hall of Fame) の D1 読み書き (Phase 5)。
 *
 * `hall_of_fame_entries` への出入りと、公開時に固定する「歩んだ道」の組み立てを持つ。
 * **誰に見せてよいかの判定は置かない** — 状態の門番は純関数
 * (`@stella/shared/hall-of-fame/types`) にあり、絞り込みはルート側が行う。
 */

import { and, asc, desc, eq } from "drizzle-orm";

import {
  EMPTY_HOF_CHAPTERS,
  normalizeHofChapters,
  normalizeHofPath,
  type HallOfFameChapters,
  type HallOfFamePathStage,
  type HallOfFameStatus,
} from "@stella/shared/hall-of-fame/types";

import type { Db } from "../db/client.js";
import { certificates, enrollments, hallOfFameEntries, profiles, stages } from "../db/schema.js";

export interface HallOfFameRow {
  id: string;
  userId: string;
  status: HallOfFameStatus;
  jobTitle: string;
  quote: string;
  chapters: HallOfFameChapters;
  pathSnapshot: HallOfFamePathStage[];
  nominatedBy: string | null;
  nominatedAt: Date;
  submittedAt: Date | null;
  publishedAt: Date | null;
  publishedBy: string | null;
  closedAt: Date | null;
}

/**
 * 実名を添えた 1 行 (掲載は実名なので、表示名は常にこの結合から採る)。
 *
 * ロールは持たない。推薦できるのが受講者だけかの判定は `loadNominationTarget` が
 * 推薦の瞬間に行うもので、既にある掲載の読み出しには要らない (載ったあとに本人の
 * ロールが変わっても、掲載されたのは「そのとき受講者だった本人の物語」)。
 */
export interface HallOfFameRowWithProfile extends HallOfFameRow {
  displayName: string;
  initials: string | null;
}

const ROW_COLS = {
  id: hallOfFameEntries.id,
  userId: hallOfFameEntries.userId,
  status: hallOfFameEntries.status,
  jobTitle: hallOfFameEntries.jobTitle,
  quote: hallOfFameEntries.quote,
  chapters: hallOfFameEntries.chapters,
  pathSnapshot: hallOfFameEntries.pathSnapshot,
  nominatedBy: hallOfFameEntries.nominatedBy,
  nominatedAt: hallOfFameEntries.nominatedAt,
  submittedAt: hallOfFameEntries.submittedAt,
  publishedAt: hallOfFameEntries.publishedAt,
  publishedBy: hallOfFameEntries.publishedBy,
  closedAt: hallOfFameEntries.closedAt,
} as const;

const PROFILE_COLS = {
  displayName: profiles.displayName,
  initials: profiles.initials,
} as const;

/**
 * D1 から来た行を整える。
 *
 * JSON 列 (章 / 歩んだ道) は必ず正規化を通す — 手で書き換えた行や、章の構成が
 * 変わったあとの古い行が混ざっても画面が壊れないようにするため。
 */
function toRow(raw: {
  id: string;
  userId: string;
  status: string;
  jobTitle: string;
  quote: string;
  chapters: unknown;
  pathSnapshot: unknown;
  nominatedBy: string | null;
  nominatedAt: Date;
  submittedAt: Date | null;
  publishedAt: Date | null;
  publishedBy: string | null;
  closedAt: Date | null;
}): HallOfFameRow {
  return {
    id: raw.id,
    userId: raw.userId,
    status: raw.status as HallOfFameStatus,
    jobTitle: raw.jobTitle,
    quote: raw.quote,
    chapters: normalizeHofChapters(raw.chapters),
    pathSnapshot: normalizeHofPath(raw.pathSnapshot),
    nominatedBy: raw.nominatedBy,
    nominatedAt: raw.nominatedAt,
    submittedAt: raw.submittedAt,
    publishedAt: raw.publishedAt,
    publishedBy: raw.publishedBy,
    closedAt: raw.closedAt,
  };
}

/** 本人ぶんの 1 行 (無ければ null)。 */
export async function loadEntryByUser(
  db: Db,
  tenantId: string,
  userId: string,
): Promise<HallOfFameRow | null> {
  const rows = await db
    .select(ROW_COLS)
    .from(hallOfFameEntries)
    .where(and(eq(hallOfFameEntries.tenantId, tenantId), eq(hallOfFameEntries.userId, userId)))
    .limit(1);
  const row = rows[0];
  return row ? toRow(row) : null;
}

/** id 引き。**テナントで必ず絞る** (他テナントの掲載を id 直打ちで読ませない)。 */
export async function loadEntryById(
  db: Db,
  tenantId: string,
  id: string,
): Promise<HallOfFameRowWithProfile | null> {
  const rows = await db
    .select({ ...ROW_COLS, ...PROFILE_COLS })
    .from(hallOfFameEntries)
    .innerJoin(profiles, eq(profiles.id, hallOfFameEntries.userId))
    .where(and(eq(hallOfFameEntries.tenantId, tenantId), eq(hallOfFameEntries.id, id)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { ...toRow(row), displayName: row.displayName, initials: row.initials };
}

/** 公開中の掲載を新着順で (トップの一覧)。 */
export async function listPublishedEntries(
  db: Db,
  tenantId: string,
): Promise<HallOfFameRowWithProfile[]> {
  const rows = await db
    .select({ ...ROW_COLS, ...PROFILE_COLS })
    .from(hallOfFameEntries)
    .innerJoin(profiles, eq(profiles.id, hallOfFameEntries.userId))
    .where(and(eq(hallOfFameEntries.tenantId, tenantId), eq(hallOfFameEntries.status, "published")))
    .orderBy(desc(hallOfFameEntries.publishedAt));
  return rows.map((row) => ({
    ...toRow(row),
    displayName: row.displayName,
    initials: row.initials,
  }));
}

/** 全状態の一覧 (管理者の運用画面)。新しい動きから順に見たいので推薦の新しい順。 */
export async function listAllEntries(
  db: Db,
  tenantId: string,
): Promise<HallOfFameRowWithProfile[]> {
  const rows = await db
    .select({ ...ROW_COLS, ...PROFILE_COLS })
    .from(hallOfFameEntries)
    .innerJoin(profiles, eq(profiles.id, hallOfFameEntries.userId))
    .where(eq(hallOfFameEntries.tenantId, tenantId))
    .orderBy(desc(hallOfFameEntries.nominatedAt));
  return rows.map((row) => ({
    ...toRow(row),
    displayName: row.displayName,
    initials: row.initials,
  }));
}

/** 推薦の可否を判定するのに必要なだけのプロフィール。 */
export interface NominationTarget {
  id: string;
  role: string;
  disabled: boolean;
}

/** 推薦先の候補になりうるプロフィール (同テナントのみ)。 */
export async function loadNominationTarget(
  db: Db,
  tenantId: string,
  userId: string,
): Promise<NominationTarget | null> {
  const rows = await db
    .select({ id: profiles.id, role: profiles.role, disabled: profiles.disabled })
    .from(profiles)
    .where(and(eq(profiles.id, userId), eq(profiles.tenantId, tenantId)))
    .limit(1);
  const row = rows[0];
  return row ? { id: row.id, role: row.role, disabled: row.disabled } : null;
}

export interface HallOfFameCandidate {
  id: string;
  name: string;
  email: string | null;
}

/**
 * まだ招待していない受講者 (推薦の候補)。
 *
 * **並び順は表示名。学習実績では並べない** — 実績順に並べた候補一覧は、それ自体が
 * 選出条件の答え合わせになる (誰が上位かが運営以外にも読める形で残る)。
 */
export async function listNominationCandidates(
  db: Db,
  tenantId: string,
  nominableRole: string,
): Promise<HallOfFameCandidate[]> {
  const rows = await db
    .select({
      id: profiles.id,
      name: profiles.displayName,
      email: profiles.email,
      entryId: hallOfFameEntries.id,
    })
    .from(profiles)
    // join も tenant で閉じる。一意キーは (tenant_id, user_id) なので、テナントを移った
    // 受講者に別テナントの行が残っていると、user_id だけで繋いだ join がその行を拾い、
    // このテナントでは一度も招待していない人が候補から消える。
    .leftJoin(
      hallOfFameEntries,
      and(eq(hallOfFameEntries.userId, profiles.id), eq(hallOfFameEntries.tenantId, tenantId)),
    )
    .where(
      and(
        eq(profiles.tenantId, tenantId),
        eq(profiles.role, nominableRole as "student"),
        eq(profiles.disabled, false),
      ),
    )
    .orderBy(asc(profiles.displayName));
  return rows
    .filter((row) => row.entryId === null)
    .map((row) => ({ id: row.id, name: row.name, email: row.email }));
}

/** 推薦を作る (`status = nominated`)。重複は呼び出し側が事前に弾く。 */
export async function insertNomination(
  db: Db,
  input: { tenantId: string; userId: string; nominatedBy: string },
): Promise<HallOfFameRow> {
  const inserted = await db
    .insert(hallOfFameEntries)
    .values({
      tenantId: input.tenantId,
      userId: input.userId,
      status: "nominated",
      jobTitle: "",
      quote: "",
      chapters: EMPTY_HOF_CHAPTERS,
      pathSnapshot: [],
      nominatedBy: input.nominatedBy,
      nominatedAt: new Date(),
    })
    .returning(ROW_COLS);
  const row = inserted[0];
  if (!row) throw new Error("殿堂の推薦が行を返しませんでした");
  return toRow(row);
}

export interface HallOfFameEntryPatch {
  status?: HallOfFameStatus;
  jobTitle?: string;
  quote?: string;
  chapters?: HallOfFameChapters;
  pathSnapshot?: HallOfFamePathStage[];
  submittedAt?: Date | null;
  publishedAt?: Date | null;
  publishedBy?: string | null;
  closedAt?: Date | null;
}

/**
 * 状態と本文を書き換える。
 *
 * **`expectedStatus` を必ず渡す。** 「読んで確かめてから書く」の隙間 (2 タブで同時に
 * 公開と辞退を押す等) を where 句で閉じる — D1 に比較交換は無いが、更新条件に今の
 * 状態を含めれば、想定と違う状態の行は 0 件更新になって呼び出し側が気づける。
 * 返り値が null なら「もう別の状態になっていた」。
 *
 * **公開は `expectedSubmittedAt` も渡す。** 状態だけでは足りない — 本人は `submitted`
 * のまま本文を書き直せる (状態は動かないが版は進む) ので、読んでから書くまでの間に
 * 編集が挟まると、状態を見るだけの更新条件では通ってしまい、管理者が読んでいない
 * 文章が公開される。版まで条件に含めて初めて「読んだ版だけを公開する」が成立する。
 */
export async function updateEntry(
  db: Db,
  tenantId: string,
  id: string,
  expectedStatus: HallOfFameStatus,
  patch: HallOfFameEntryPatch,
  expectedSubmittedAt?: Date,
): Promise<HallOfFameRow | null> {
  const updated = await db
    .update(hallOfFameEntries)
    .set(patch)
    .where(
      and(
        eq(hallOfFameEntries.tenantId, tenantId),
        eq(hallOfFameEntries.id, id),
        eq(hallOfFameEntries.status, expectedStatus),
        ...(expectedSubmittedAt ? [eq(hallOfFameEntries.submittedAt, expectedSubmittedAt)] : []),
      ),
    )
    .returning(ROW_COLS);
  const row = updated[0];
  return row ? toRow(row) : null;
}

/**
 * 公開時点の「歩んだ道」を組み立てる。
 *
 * クリアの定義はスキルツリー (`lib/skill-map-data.ts`) と同じ **修了した受講登録 ∪
 * 失効していない修了証**。片方だけ見ると、修了証を手で出したステージや自動発行を
 * 切ったステージで殿堂とスキルツリーの言うことが食い違う。
 *
 * 並びは **点いた順** (最も古い記録が先)。数ではなく道筋を見せるための順序で、
 * 件数や XP は載せない。
 *
 * ## 公開ステージだけを写す
 *
 * `stages.status = 'published'` で必ず絞る。下書き (`draft`) や退役 (`archived`) の
 * ステージは **誰にも公開されていない教材** なので、そのタイトルが殿堂という
 * 全ロールに開いた画面に出るのは、運営がまだ公開を決めていない教材名の漏洩になる。
 * 掲載は写しなので、公開したあとに教材が退役してもこの写しは残る — 止められるのは
 * 「写す瞬間に公開されていたか」だけで、それがここの唯一の判定。
 *
 * ## 霧 (視界) は掛けない — 受容した設計判断
 *
 * 殿堂の「歩んだ道」は **閲覧者の視界と無関係に** 公開ステージのタイトルを見せる。
 * 学びの地図の霧 (`skill-map`) は「自分の道から目移りしないため」の仕掛けであって
 * 教材名の秘匿ではない。殿堂に出るのは管理者が 1 件ずつ公開を判断した「先を歩いた
 * 人の物語」で、その道の先が垣間見えることはゴール勾配として設計の意図どおり。
 * よって閲覧者ごとに道を伏せる処理は入れない (入れると、同じ掲載が読む人によって
 * 別の物語になり、本人が同意した「掲載される内容」が確定しなくなる)。
 */
export async function buildPathSnapshot(
  db: Db,
  tenantId: string,
  userId: string,
): Promise<HallOfFamePathStage[]> {
  const completed = await db
    .select({
      stageId: enrollments.stageId,
      title: stages.title,
      at: enrollments.completedAt,
      enrolledAt: enrollments.enrolledAt,
    })
    .from(enrollments)
    .innerJoin(stages, eq(stages.id, enrollments.stageId))
    .where(
      and(
        eq(enrollments.userId, userId),
        eq(enrollments.status, "completed"),
        eq(stages.tenantId, tenantId),
        eq(stages.status, "published"),
      ),
    )
    .orderBy(asc(enrollments.completedAt));

  const certified = await db
    .select({ stageId: certificates.stageId, title: stages.title, at: certificates.issuedAt })
    .from(certificates)
    .innerJoin(stages, eq(stages.id, certificates.stageId))
    .where(
      and(
        eq(certificates.userId, userId),
        eq(certificates.revoked, false),
        eq(stages.tenantId, tenantId),
        eq(stages.status, "published"),
      ),
    )
    .orderBy(asc(certificates.issuedAt));

  /** ステージごとに「最も古い記録」を採る (登録と修了証の両方がある星は 1 つに畳む)。 */
  const byStage = new Map<string, { title: string; at: number }>();
  const add = (stageId: string, title: string, at: Date | null) => {
    // 完了時刻が入っていない古い行は、順序の手掛かりが無いので末尾へ回す。
    const ms = at ? at.getTime() : Number.MAX_SAFE_INTEGER;
    const prev = byStage.get(stageId);
    if (!prev || ms < prev.at) byStage.set(stageId, { title, at: ms });
  };
  for (const row of completed) add(row.stageId, row.title, row.at ?? row.enrolledAt);
  for (const row of certified) add(row.stageId, row.title, row.at);

  return [...byStage.entries()]
    .sort((a, b) => a[1].at - b[1].at)
    .map(([id, value]) => ({ id, title: value.title }));
}
