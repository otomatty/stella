import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sqliteD1 } from "../testing/sqlite-d1.js";

const TAG = "0071_reset_dev_env_basics_clears";
const SQL = readFileSync(
  fileURLToPath(new URL(`../../drizzle/${TAG}.sql`, import.meta.url)),
  "utf8",
);
const CHECK_A = "dev-env-basics/u08-check-a/a01-check-a";
const OLD_TASK = "dev-env-basics/m0-first-page/q01-first-page";
const ENROLLED_AT = 1_600_000_000_000;
const COMPLETED_AT = 1_700_000_000_000;

describe("0071: 旧版の dev-env-basics でクリアした受講者のクリアを取り消す (実SQLite)", () => {
  let database: ReturnType<typeof sqliteD1>;
  beforeEach(() => {
    database = sqliteD1({ beforeMigration: TAG });
    database.sqlite.exec(`
      insert into tenants (id, name, created_at, updated_at) values
        ('ses', 'テスト', 1, 1), ('other', '別', 1, 1);
      insert into profiles (id, tenant_id, role, display_name, created_at) values
        ('old-clear', 'ses', 'student', '旧クリア', 1),
        ('check-a', 'ses', 'student', '確認A', 1),
        ('check-a-ai', 'ses', 'student', '確認AのAI合格', 1),
        ('check-a-open', 'ses', 'student', '確認Aの未合格', 1),
        ('other-stage', 'ses', 'student', '別ステージ', 1),
        ('cert-only', 'ses', 'student', '修了証だけ', 1),
        ('enroll-only', 'ses', 'student', '登録だけ', 1),
        ('expired', 'ses', 'student', '期限切れ', 1),
        ('other-tenant', 'other', 'student', '別テナント', 1);
      insert into stages (id, tenant_id, slug, title, format, created_at, updated_at,
        require_all_lessons, require_quiz_pass, require_assignment_pass, auto_issue_certificate) values
        ('stage-dev', 'ses', 'dev-env-basics', '入口', 2, 1, 1, 0, 0, 0, 0),
        ('stage-html', 'ses', 'html-css-basics', 'HTML', 2, 1, 1, 0, 1, 0, 1),
        ('stage-dev-other', 'other', 'dev-env-basics', '入口', 2, 1, 1, 0, 0, 0, 0);
      insert into sections (id, stage_id, title, created_at) values
        ('unit-dev', 'stage-dev', '単元', 1);
      insert into tasks (id, section_id, title, kind, pattern, skills, estimated_minutes, "order",
        content_hash, definition, bundle) values
        ('${CHECK_A}', 'unit-dev', '確認A', 'check-a', 'p', '{}', 10, 0, 'h', '{}', '{}'),
        ('${OLD_TASK}', 'unit-dev', '最初のページ', 'basic', 'p', '{}', 10, 1, 'h', '{}', '{}');
      insert into enrollments
        (id, tenant_id, user_id, stage_id, status, enrolled_at, completed_at) values
        ('en-old', 'ses', 'old-clear', 'stage-dev', 'completed', ${ENROLLED_AT}, ${COMPLETED_AT}),
        ('en-a', 'ses', 'check-a', 'stage-dev', 'completed', ${ENROLLED_AT}, ${COMPLETED_AT}),
        ('en-ai', 'ses', 'check-a-ai', 'stage-dev', 'completed', ${ENROLLED_AT}, ${COMPLETED_AT}),
        ('en-open', 'ses', 'check-a-open', 'stage-dev', 'completed', ${ENROLLED_AT}, ${COMPLETED_AT}),
        ('en-html', 'ses', 'other-stage', 'stage-html', 'completed', ${ENROLLED_AT}, ${COMPLETED_AT}),
        ('en-cert', 'ses', 'cert-only', 'stage-dev', 'active', ${ENROLLED_AT}, null),
        ('en-only', 'ses', 'enroll-only', 'stage-dev', 'completed', ${ENROLLED_AT}, ${COMPLETED_AT}),
        ('en-expired', 'ses', 'expired', 'stage-dev', 'expired', ${ENROLLED_AT}, ${COMPLETED_AT}),
        ('en-other', 'other', 'other-tenant', 'stage-dev-other', 'completed', ${ENROLLED_AT}, ${COMPLETED_AT});
      insert into certificates
        (id, tenant_id, user_id, stage_id, cert_code, issued_by, issued_at, recipient_name,
          stage_title, tenant_name, revoked) values
        ('cert-old', 'ses', 'old-clear', 'stage-dev', 'CODE-OLD', 'issuer', ${COMPLETED_AT},
          '旧クリア', '入口', 'テスト', 0),
        ('cert-a', 'ses', 'check-a', 'stage-dev', 'CODE-A', null, ${COMPLETED_AT},
          '確認A', '入口', 'テスト', 0),
        ('cert-ai', 'ses', 'check-a-ai', 'stage-dev', 'CODE-AI', null, ${COMPLETED_AT},
          '確認AのAI合格', '入口', 'テスト', 0),
        ('cert-open', 'ses', 'check-a-open', 'stage-dev', 'CODE-OPEN', null, ${COMPLETED_AT},
          '確認Aの未合格', '入口', 'テスト', 0),
        ('cert-html', 'ses', 'other-stage', 'stage-html', 'CODE-HTML', null, ${COMPLETED_AT},
          '別ステージ', 'HTML', 'テスト', 0),
        ('cert-only', 'ses', 'cert-only', 'stage-dev', 'CODE-ONLY', null, ${COMPLETED_AT},
          '修了証だけ', '入口', 'テスト', 1),
        ('cert-expired', 'ses', 'expired', 'stage-dev', 'CODE-EXPIRED', null, ${COMPLETED_AT},
          '期限切れ', '入口', 'テスト', 0),
        ('cert-other', 'other', 'other-tenant', 'stage-dev-other', 'CODE-OTHER', null, ${COMPLETED_AT},
          '別テナント', '入口', '別', 0);
      insert into lesson_progress
        (id, tenant_id, user_id, lesson_id, completed, updated_at) values
        ('lp-old', 'ses', 'old-clear', 'dev-env-basics/u00-start', 1, ${COMPLETED_AT}),
        ('lp-a', 'ses', 'check-a', 'dev-env-basics/u08-check-a', 1, ${COMPLETED_AT});
      insert into task_progress (user_id, task_id, status, content_hash, updated_at) values
        ('old-clear', '${OLD_TASK}', 'passed', 'h', ${COMPLETED_AT}),
        ('check-a', '${CHECK_A}', 'passed', 'h', ${COMPLETED_AT}),
        ('check-a-ai', '${CHECK_A}', 'ai-passed', 'h', ${COMPLETED_AT}),
        ('check-a-open', '${CHECK_A}', 'submitted', 'h', ${COMPLETED_AT});
      insert into stage_path_events (id, tenant_id, user_id, stage_id, event, at) values
        ('path-old', 'ses', 'old-clear', 'stage-dev', 'cleared', ${COMPLETED_AT});
      insert into audit_logs (id, tenant_id, action, target_type, target_id, created_at) values
        ('audit-old', 'ses', 'certificate_issue', 'certificate', 'cert-old', ${COMPLETED_AT});
    `);
  });
  afterEach(() => database.sqlite.close());

  const migrate = () => database.sqlite.exec(SQL);

  it.each([
    { quiz: 0, auto: 0 },
    { quiz: 0, auto: 1 },
    { quiz: 1, auto: 0 },
    { quiz: 1, auto: 1 },
  ])(
    "全レッスン・全課題の合格を必須にし、クイズ=$quiz・自動発行=$auto は変えない",
    ({ quiz, auto }) => {
      database.sqlite
        .prepare(
          `update stages set require_quiz_pass = ?, auto_issue_certificate = ?
         where id = 'stage-dev'`,
        )
        .run(quiz, auto);

      migrate();

      expect(
        database.sqlite
          .prepare(
            `select require_all_lessons, require_quiz_pass,
                  require_assignment_pass, auto_issue_certificate
           from stages where id = 'stage-dev'`,
          )
          .get(),
      ).toEqual({
        require_all_lessons: 1,
        require_quiz_pass: quiz,
        require_assignment_pass: 1,
        auto_issue_certificate: auto,
      });
    },
  );

  it("ほかのステージと別テナントの同名ステージの修了条件は変えない", () => {
    const conditions = () =>
      database.sqlite
        .prepare(
          `select id, require_all_lessons, require_quiz_pass,
                  require_assignment_pass, auto_issue_certificate
           from stages where id in ('stage-html', 'stage-dev-other') order by id`,
        )
        .all();
    const before = conditions();

    migrate();

    expect(conditions()).toEqual(before);
  });

  const enrollment = (userId: string) =>
    database.sqlite
      .prepare(
        `select id, status, completed_at as completedAt, enrolled_at as enrolledAt
         from enrollments where user_id = ?`,
      )
      .get(userId) as {
      id: string;
      status: string;
      completedAt: number | null;
      enrolledAt: number;
    };

  const certificatesOf = (userId: string) =>
    database.sqlite
      .prepare(
        `select id, cert_code as certCode, issued_by as issuedBy, revoked, stage_id as stageId
         from certificates where user_id = ? order by id`,
      )
      .all(userId) as {
      id: string;
      certCode: string;
      issuedBy: string | null;
      revoked: number;
      stageId: string;
    }[];

  it("旧版の条件でクリアした受講者は、修了証が消え登録が active に戻る", () => {
    migrate();
    expect(certificatesOf("old-clear")).toEqual([]);
    expect(enrollment("old-clear")).toEqual({
      id: "en-old",
      status: "active",
      completedAt: null,
      enrolledAt: ENROLLED_AT,
    });
  });

  it("確認Aに合格している受講者の修了証と完了の登録は残る", () => {
    migrate();
    expect(certificatesOf("check-a")).toEqual([
      {
        id: "cert-a",
        certCode: "CODE-A",
        issuedBy: null,
        revoked: 0,
        stageId: "stage-dev",
      },
    ]);
    expect(enrollment("check-a")).toMatchObject({
      status: "completed",
      completedAt: COMPLETED_AT,
    });
    expect(certificatesOf("check-a-ai")).toEqual([
      {
        id: "cert-ai",
        certCode: "CODE-AI",
        issuedBy: null,
        revoked: 0,
        stageId: "stage-dev",
      },
    ]);
    expect(enrollment("check-a-ai")).toMatchObject({
      status: "completed",
      completedAt: COMPLETED_AT,
    });
  });

  it("確認Aが未合格なら、課題の行があってもクリアは取り消す", () => {
    migrate();
    expect(certificatesOf("check-a-open")).toEqual([]);
    expect(enrollment("check-a-open")).toMatchObject({ status: "active", completedAt: null });
  });

  it("ほかのステージと、別テナントの同名ステージは変えない", () => {
    migrate();
    expect(certificatesOf("other-stage")).toEqual([
      {
        id: "cert-html",
        certCode: "CODE-HTML",
        issuedBy: null,
        revoked: 0,
        stageId: "stage-html",
      },
    ]);
    expect(enrollment("other-stage")).toMatchObject({
      status: "completed",
      completedAt: COMPLETED_AT,
    });
    expect(certificatesOf("other-tenant")).toEqual([
      {
        id: "cert-other",
        certCode: "CODE-OTHER",
        issuedBy: null,
        revoked: 0,
        stageId: "stage-dev-other",
      },
    ]);
    expect(enrollment("other-tenant")).toMatchObject({
      status: "completed",
      completedAt: COMPLETED_AT,
    });
  });

  it("修了証だけの受講者と、完了の登録だけの受講者も取り消す", () => {
    migrate();
    expect(certificatesOf("cert-only")).toEqual([]);
    expect(enrollment("cert-only")).toEqual({
      id: "en-cert",
      status: "active",
      completedAt: null,
      enrolledAt: ENROLLED_AT,
    });
    expect(certificatesOf("enroll-only")).toEqual([]);
    expect(enrollment("enroll-only")).toEqual({
      id: "en-only",
      status: "active",
      completedAt: null,
      enrolledAt: ENROLLED_AT,
    });
  });

  it("完了以外の登録は戻さず、進捗・経路・監査ログは残す", () => {
    const progress = () => ({
      lessons: database.sqlite.prepare("select * from lesson_progress order by id").all(),
      tasks: database.sqlite.prepare("select * from task_progress order by user_id").all(),
      path: database.sqlite.prepare("select * from stage_path_events order by id").all(),
      audits: database.sqlite.prepare("select * from audit_logs order by id").all(),
    });
    const before = progress();
    migrate();
    expect(progress()).toEqual(before);
    expect(enrollment("expired")).toEqual({
      id: "en-expired",
      status: "expired",
      completedAt: COMPLETED_AT,
      enrolledAt: ENROLLED_AT,
    });
    expect(certificatesOf("expired")).toEqual([]);
    migrate();
    expect(progress()).toEqual(before);
    expect(enrollment("old-clear").status).toBe("active");
    expect(database.sqlite.prepare("pragma foreign_key_check").all()).toEqual([]);
  });
});
