/**
 * 管理レポート API (Issue #75)。
 *
 * 管理画面「レポート」の横断エクスポート経路。 KPI ダッシュボード (#28) は「今の状態」の
 * 集計、 成績台帳 (#26) はコース単位の一覧であるのに対し、 ここは「期間で切った明細を
 * まとめて書き出す」ことを目的とする。 列定義は `@falcon/shared/admin/reports` に置き、
 * CSV 化はフロント (`lib/csv`) が行う (アプリ内の他の CSV 出力と同じ経路)。
 *
 * 認可は同テナントの admin / platform_admin のみ。 母集合を caller.tenantId に固定する
 * ことで越テナント参照を構造的に遮断する。
 */

import { Hono } from "hono";
import { and, count, desc, eq, gte, inArray, lte } from "drizzle-orm";
import {
  isReportType,
  reportDayBoundaryToIso,
  type AuditReportRow,
  type CertificateReportRow,
  type EnrollmentReportRow,
  type GradeReportRow,
  type ReportRow,
  type ReportType,
} from "@falcon/shared/admin/reports";

import {
  auditLogs,
  certificates,
  courses,
  enrollments,
  lessonProgress,
  lessons,
  profiles,
  quizAttempts,
  quizzes,
  sections,
  submissions,
} from "../db/schema.js";
import type { Db } from "../db/client.js";
import { ApiError, errorResponse, getCaller, requireTenantAdmin } from "../lib/authz.js";
import type { Env } from "../env.js";

export const reportsRoute = new Hono<{ Bindings: Env }>();

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

/**
 * 1 クエリの IN 句に並べる ID の上限。 D1 (Cloudflare) はクエリあたりのバインド変数に
 * 上限があるため、 ページ内の user が多いときは分割して問い合わせる。
 */
const IN_CHUNK_SIZE = 90;

interface Range {
  from: Date | null;
  to: Date | null;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * クエリの from/to を Date に。 不正な値は 400。
 *
 * `YYYY-MM-DD` の日付だけを渡された場合は、 画面から渡す場合 (`reportPeriodToIso`) と
 * 同じアプリ基準 TZ の日境界として解釈する (from = その日の 00:00、 to = 23:59:59.999)。
 * そうしないと直叩き時だけ UTC 深夜起点になり、 「カレンダー日 inclusive」とずれる。
 */
function parseRange(fromRaw: string | undefined, toRaw: string | undefined): Range {
  const parse = (raw: string | undefined, name: string, endOfDay: boolean): Date | null => {
    if (!raw) return null;
    const iso = reportDayBoundaryToIso(raw, endOfDay) ?? raw;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) throw new ApiError(`${name} の日時が不正です`, 400);
    return d;
  };
  const from = parse(fromRaw, "from", false);
  const to = parse(toRaw, "to", true);
  if (from && to && from > to) throw new ApiError("from が to より後になっています", 400);
  return { from, to };
}

function round(n: number): number {
  return Math.round(n);
}

/**
 * 期間指定つきのレポート明細。
 *
 * `GET /api/reports/:type?from=&to=&limit=&offset=`
 * from/to は ISO 日時 (inclusive)。 省略時は無制限。
 */
reportsRoute.get("/api/reports/:type", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireTenantAdmin(caller);

    const type = c.req.param("type");
    if (!isReportType(type)) {
      throw new ApiError("レポート種別が不正です", 400);
    }

    const q = c.req.query();
    const range = parseRange(q.from, q.to);
    const limit = Math.min(Math.max(Number(q.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const offset = Math.max(Number(q.offset) || 0, 0);

    const { rows, total } = await buildReport(
      db,
      caller.tenantId,
      type as ReportType,
      range,
      limit,
      offset,
    );

    return c.json({
      report: {
        type,
        from: range.from?.toISOString() ?? null,
        to: range.to?.toISOString() ?? null,
        total,
        rows,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

async function buildReport(
  db: Db,
  tenantId: string,
  type: ReportType,
  range: Range,
  limit: number,
  offset: number,
): Promise<{ rows: ReportRow[]; total: number }> {
  switch (type) {
    case "enrollments":
      return enrollmentsReport(db, tenantId, range, limit, offset);
    case "grades":
      return gradesReport(db, tenantId, range, limit, offset);
    case "certificates":
      return certificatesReport(db, tenantId, range, limit, offset);
    case "audit":
      return auditReport(db, tenantId, range, limit, offset);
    default:
      // 種別を増やしたときに分岐の取りこぼしをコンパイルエラーにする。
      return assertNeverType(type);
  }
}

function assertNeverType(type: never): never {
  throw new ApiError(`レポート種別が未実装です: ${String(type)}`, 400);
}

// ---------------------------------------------------------------
// 受講状況
// ---------------------------------------------------------------

/** 受講登録 (期間 = 登録日時) の明細に、 レッスン進捗から算出した進捗率を添える。 */
async function enrollmentsReport(
  db: Db,
  tenantId: string,
  range: Range,
  limit: number,
  offset: number,
): Promise<{ rows: EnrollmentReportRow[]; total: number }> {
  const conds = [eq(enrollments.tenantId, tenantId)];
  if (range.from) conds.push(gte(enrollments.enrolledAt, range.from));
  if (range.to) conds.push(lte(enrollments.enrolledAt, range.to));

  const totalRow = (
    await db
      .select({ value: count() })
      .from(enrollments)
      .where(and(...conds))
  )[0];

  const page = await db
    .select({
      userId: enrollments.userId,
      userName: profiles.displayName,
      email: profiles.email,
      courseId: enrollments.courseId,
      courseTitle: courses.title,
      status: enrollments.status,
      required: enrollments.required,
      enrolledAt: enrollments.enrolledAt,
      dueAt: enrollments.dueAt,
      completedAt: enrollments.completedAt,
    })
    .from(enrollments)
    .innerJoin(profiles, eq(profiles.id, enrollments.userId))
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .where(and(...conds))
    .orderBy(desc(enrollments.enrolledAt))
    .limit(limit)
    .offset(offset);

  // 進捗率のための突合。 1 行ずつ問い合わせると N+1 になるため、 ページ分の
  // course / user をまとめて引いてから JS で突き合わせる (analytics と同じ方針)。
  const courseIds = [...new Set(page.map((r) => r.courseId))];
  const userIds = [...new Set(page.map((r) => r.userId))];

  // D1 のバインド変数上限に収まるよう、 ID の一覧は分割して問い合わせる。
  const lessonRows = (
    await Promise.all(
      chunk(courseIds, IN_CHUNK_SIZE).map((ids) =>
        db
          .select({ lessonId: lessons.id, courseId: sections.courseId })
          .from(lessons)
          .innerJoin(sections, eq(sections.id, lessons.sectionId))
          .where(inArray(sections.courseId, ids)),
      ),
    )
  ).flat();
  const lessonIdsByCourse = new Map<string, string[]>();
  const pageLessonIds = new Set<string>();
  for (const r of lessonRows) {
    const arr = lessonIdsByCourse.get(r.courseId) ?? [];
    arr.push(r.lessonId);
    lessonIdsByCourse.set(r.courseId, arr);
    pageLessonIds.add(r.lessonId);
  }

  // 完了進捗はページ上の user に絞って読む。 レッスン ID でも絞りたいところだが、
  // 二つ目の大きな IN 句はバインド変数上限に触れるため、 対象コース外のレッスンは
  // 取得後に `pageLessonIds` で落とす。
  const progressRows = (
    await Promise.all(
      chunk(userIds, IN_CHUNK_SIZE).map((ids) =>
        db
          .select({ userId: lessonProgress.userId, lessonId: lessonProgress.lessonId })
          .from(lessonProgress)
          .where(
            and(
              eq(lessonProgress.tenantId, tenantId),
              inArray(lessonProgress.userId, ids),
              eq(lessonProgress.completed, true),
            ),
          ),
      ),
    )
  ).flat();
  const completedByUser = new Map<string, Set<string>>();
  for (const r of progressRows) {
    if (!pageLessonIds.has(r.lessonId)) continue;
    const set = completedByUser.get(r.userId) ?? new Set<string>();
    set.add(r.lessonId);
    completedByUser.set(r.userId, set);
  }

  const rows: EnrollmentReportRow[] = page.map((r) => {
    const lessonIds = lessonIdsByCourse.get(r.courseId) ?? [];
    const completed = completedByUser.get(r.userId) ?? new Set<string>();
    const done = lessonIds.filter((id) => completed.has(id)).length;
    return {
      user_id: r.userId,
      user_name: r.userName,
      email: r.email,
      course_id: r.courseId,
      course_title: r.courseTitle,
      status: r.status,
      required: r.required,
      enrolled_at: r.enrolledAt.toISOString(),
      due_at: r.dueAt?.toISOString() ?? null,
      completed_at: r.completedAt?.toISOString() ?? null,
      completed_lessons: done,
      total_lessons: lessonIds.length,
      progress_pct: lessonIds.length === 0 ? 0 : round((done * 100) / lessonIds.length),
    };
  });

  return { rows, total: Number(totalRow?.value ?? 0) };
}

// ---------------------------------------------------------------
// 成績
// ---------------------------------------------------------------

/**
 * 小テスト受験と課題提出を提出日時の降順に 1 本化した明細。
 *
 * 別テーブルの明細を混ぜるため SQL 1 本では limit/offset を掛けられないが、
 * 件数は両テーブルの COUNT で正確に数える (取得件数から推測しない)。 ページの組み立ては
 * 各テーブルから先頭 `offset + limit` 件ずつ取れば足りる: 併合後に順位 `offset + limit`
 * 未満へ入る行は、 自テーブル内でも必ずその順位より前にあるため。 これにより
 * 「読み込み上限を超えた分が黙って欠ける」ことが起きない。
 */
async function gradesReport(
  db: Db,
  tenantId: string,
  range: Range,
  limit: number,
  offset: number,
): Promise<{ rows: GradeReportRow[]; total: number }> {
  const quizConds = [eq(quizAttempts.tenantId, tenantId)];
  if (range.from) quizConds.push(gte(quizAttempts.submittedAt, range.from));
  if (range.to) quizConds.push(lte(quizAttempts.submittedAt, range.to));

  const subConds = [eq(submissions.tenantId, tenantId)];
  if (range.from) subConds.push(gte(submissions.submittedAt, range.from));
  if (range.to) subConds.push(lte(submissions.submittedAt, range.to));

  const [quizCountRow, subCountRow] = await Promise.all([
    db
      .select({ value: count() })
      .from(quizAttempts)
      .where(and(...quizConds)),
    db
      .select({ value: count() })
      .from(submissions)
      .where(and(...subConds)),
  ]);
  const total = Number(quizCountRow[0]?.value ?? 0) + Number(subCountRow[0]?.value ?? 0);

  // 併合後のページを確定させるのに必要な件数 (各テーブルから見た上限)。
  const head = offset + limit;

  const attempts = await db
    .select({
      userId: quizAttempts.userId,
      userName: profiles.displayName,
      email: profiles.email,
      lessonTitle: lessons.title,
      courseTitle: courses.title,
      score: quizAttempts.score,
      maxScore: quizAttempts.maxScore,
      passed: quizAttempts.passed,
      submittedAt: quizAttempts.submittedAt,
    })
    .from(quizAttempts)
    .innerJoin(profiles, eq(profiles.id, quizAttempts.userId))
    .leftJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
    .leftJoin(lessons, eq(lessons.id, quizzes.lessonId))
    .leftJoin(sections, eq(sections.id, lessons.sectionId))
    .leftJoin(courses, eq(courses.id, sections.courseId))
    .where(and(...quizConds))
    .orderBy(desc(quizAttempts.submittedAt))
    .limit(head);

  // studentId は null 許容 (デモ由来の提出) のため leftJoin で受講者名を補う。
  const subs = await db
    .select({
      studentId: submissions.studentId,
      userName: profiles.displayName,
      email: profiles.email,
      courseTitle: submissions.courseTitle,
      assignmentTitle: submissions.assignmentTitle,
      status: submissions.status,
      submittedAt: submissions.submittedAt,
      reviewedAt: submissions.reviewedAt,
    })
    .from(submissions)
    .leftJoin(profiles, eq(profiles.id, submissions.studentId))
    .where(and(...subConds))
    .orderBy(desc(submissions.submittedAt))
    .limit(head);

  const quizRows: GradeReportRow[] = attempts.map((a) => ({
    kind: "quiz",
    user_id: a.userId,
    user_name: a.userName,
    email: a.email,
    course_title: a.courseTitle ?? "",
    item_title: a.lessonTitle ?? "",
    score: a.score,
    max_score: a.maxScore,
    score_pct: a.maxScore === 0 ? 0 : round((a.score * 100) / a.maxScore),
    result: a.passed ? "passed" : "failed",
    submitted_at: a.submittedAt.toISOString(),
    reviewed_at: null,
  }));

  const submissionRows: GradeReportRow[] = subs.map((s) => ({
    kind: "assignment",
    user_id: s.studentId,
    user_name: s.userName ?? "",
    email: s.email ?? null,
    course_title: s.courseTitle,
    item_title: s.assignmentTitle,
    score: null,
    max_score: null,
    score_pct: null,
    result: s.status,
    submitted_at: s.submittedAt.toISOString(),
    reviewed_at: s.reviewedAt?.toISOString() ?? null,
  }));

  const merged = [...quizRows, ...submissionRows].sort((a, b) =>
    a.submitted_at < b.submitted_at ? 1 : a.submitted_at > b.submitted_at ? -1 : 0,
  );

  return { rows: merged.slice(offset, head), total };
}

// ---------------------------------------------------------------
// 修了証
// ---------------------------------------------------------------

async function certificatesReport(
  db: Db,
  tenantId: string,
  range: Range,
  limit: number,
  offset: number,
): Promise<{ rows: CertificateReportRow[]; total: number }> {
  const conds = [eq(certificates.tenantId, tenantId)];
  if (range.from) conds.push(gte(certificates.issuedAt, range.from));
  if (range.to) conds.push(lte(certificates.issuedAt, range.to));

  const totalRow = (
    await db
      .select({ value: count() })
      .from(certificates)
      .where(and(...conds))
  )[0];

  const page = await db
    .select({
      certCode: certificates.certCode,
      userId: certificates.userId,
      recipientName: certificates.recipientName,
      email: profiles.email,
      courseTitle: certificates.courseTitle,
      issuedAt: certificates.issuedAt,
      issuedBy: certificates.issuedBy,
      revoked: certificates.revoked,
    })
    .from(certificates)
    .leftJoin(profiles, eq(profiles.id, certificates.userId))
    .where(and(...conds))
    .orderBy(desc(certificates.issuedAt))
    .limit(limit)
    .offset(offset);

  const rows: CertificateReportRow[] = page.map((r) => ({
    cert_code: r.certCode,
    user_id: r.userId,
    user_name: r.recipientName,
    email: r.email ?? null,
    course_title: r.courseTitle,
    issued_at: r.issuedAt.toISOString(),
    issued_by: r.issuedBy,
    revoked: r.revoked,
  }));

  return { rows, total: Number(totalRow?.value ?? 0) };
}

// ---------------------------------------------------------------
// 監査
// ---------------------------------------------------------------

/**
 * 監査ログの期間切り出し。 監査ページ (#27) は絞り込み中心の閲覧画面なのに対し、
 * ここはレポートとして他の種別と同じ期間・同じ書式で書き出すための経路。
 */
async function auditReport(
  db: Db,
  tenantId: string,
  range: Range,
  limit: number,
  offset: number,
): Promise<{ rows: AuditReportRow[]; total: number }> {
  const conds = [eq(auditLogs.tenantId, tenantId)];
  if (range.from) conds.push(gte(auditLogs.createdAt, range.from));
  if (range.to) conds.push(lte(auditLogs.createdAt, range.to));

  const totalRow = (
    await db
      .select({ value: count() })
      .from(auditLogs)
      .where(and(...conds))
  )[0];

  const page = await db
    .select({
      createdAt: auditLogs.createdAt,
      actorId: auditLogs.actorId,
      actorName: auditLogs.actorName,
      actorRole: auditLogs.actorRole,
      action: auditLogs.action,
      targetType: auditLogs.targetType,
      targetId: auditLogs.targetId,
      ip: auditLogs.ip,
    })
    .from(auditLogs)
    .where(and(...conds))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  const rows: AuditReportRow[] = page.map((r) => ({
    created_at: r.createdAt.toISOString(),
    actor_id: r.actorId,
    actor_name: r.actorName,
    actor_role: r.actorRole,
    action: r.action,
    target_type: r.targetType,
    target_id: r.targetId,
    ip: r.ip,
  }));

  return { rows, total: Number(totalRow?.value ?? 0) };
}
