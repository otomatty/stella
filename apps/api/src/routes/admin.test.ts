import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Env } from "../env.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { bookPrefix } from "../lib/library-store.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { adminRoute } from "./admin.js";

describe("ユーザー管理", () => {
  const SECRET = "admin-test-secret";
  let db: ReturnType<typeof sqliteD1>;
  let env: Env;
  let app: ReturnType<typeof mountTestApp>["app"];

  beforeEach(() => {
    db = sqliteD1();
    db.sqlite.exec(`
      INSERT INTO tenants (id, name, active_count, active, created_at, updated_at) VALUES
        ('ses', 'SES', 0, 1, 1, 1);
      INSERT INTO profiles (id, tenant_id, role, display_name, email, disabled, name_source, created_at) VALUES
        ('admin', 'ses', 'admin', '管理者', 'admin@example.test', 0, 'invite', 1),
        ('taken', 'ses', 'student', '別', 'taken@example.test', 0, 'invite', 2);
    `);
    env = { DB: db.binding, AUTH_JWT_SECRET: SECRET } as Env;
    app = mountTestApp(env, adminRoute).app;
  });
  afterEach(() => db.sqlite.close());

  const token = () => signAccessToken(SECRET, "admin", "admin@example.test");

  it("招待するとロールが保存され、受講登録は作られない", async () => {
    const res = await request(app, env, "/api/admin/users/invite", {
      method: "POST",
      token: await token(),
      body: JSON.stringify({
        invites: [{ email: "new@example.test", displayName: "新規", role: "student" }],
      }),
    });
    expect(res.status).toBe(200);
    const body = await json<{ results: { email: string; ok: boolean; userId?: string }[] }>(res);
    expect(body.results).toEqual([
      { email: "new@example.test", ok: true, userId: body.results[0]?.userId },
    ]);
    const row = db.sqlite
      .prepare("select role from profiles where email = ?")
      .get("new@example.test") as { role: string };
    expect(row).toEqual({ role: "student" });
    expect(
      db.sqlite.prepare("select count(*) as n from enrollments").get() as { n: number },
    ).toEqual({ n: 0 });
  });

  it("登録済みのメールは同じ文言で拒む", async () => {
    const res = await request(app, env, "/api/admin/users/invite", {
      method: "POST",
      token: await token(),
      body: JSON.stringify({
        invites: [{ email: "taken@example.test", displayName: "別", role: "student" }],
      }),
    });
    const body = await json<{ results: { email: string; ok: boolean; error?: string }[] }>(res);
    expect(body.results).toEqual([
      {
        email: "taken@example.test",
        ok: false,
        error: "このメールアドレスは既に登録されています",
      },
    ]);
    expect(JSON.stringify(body)).not.toContain("別のテナント");
  });

  it("廃止した講師ロールは招待も変更も受け付けない", async () => {
    const invite = await request(app, env, "/api/admin/users/invite", {
      method: "POST",
      token: await token(),
      body: JSON.stringify({
        invites: [{ email: "new@example.test", displayName: "新規", role: "instructor" }],
      }),
    });
    expect(invite.status).toBe(400);

    const change = await request(app, env, "/api/admin/users/role", {
      method: "POST",
      token: await token(),
      body: JSON.stringify({ userId: "taken", role: "instructor" }),
    });
    expect(change.status).toBe(400);
    const row = db.sqlite.prepare("select role from profiles where id = ?").get("taken") as {
      role: string;
    };
    expect(row).toEqual({ role: "student" });
  });

  it("存在しないユーザーは 404", async () => {
    const res = await request(app, env, "/api/admin/users/disable", {
      method: "POST",
      token: await token(),
      body: JSON.stringify({ userId: "missing", disabled: true }),
    });
    expect(res.status).toBe(404);
  });
});

const SECRET = "admin-delete-test-secret";
const ADMIN = "33333333-3333-4333-8333-333333333333";
const INSTRUCTOR = "44444444-4444-4444-8444-444444444444";
const PLATFORM = "66666666-6666-4666-8666-666666666666";
const LEARNER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const BOOK_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const BOOK_B = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const BOOK_OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const SUB_A = "sub-learner-a";
const SUB_B = "sub-learner-b";
const SUB_OTHER = "sub-other";
const AI_REVIEW = "ai-review-learner";
const MISSING = "00000000-0000-4000-8000-000000000000";

describe("受講者の削除 (POST /api/admin/users/delete、実 SQLite)", () => {
  let database: ReturnType<typeof sqliteD1>;
  let env: Env;
  let app: ReturnType<typeof mountTestApp>["app"];

  function run(query: string, ...params: (string | number)[]) {
    database.sqlite.prepare(query).run(...params);
  }

  function countRows(query: string, ...params: string[]): number {
    const row = database.sqlite.prepare(query).get(...params) as { n: number };
    return Number(row.n);
  }

  function seed() {
    run(
      `INSERT INTO tenants
        (id, name, active_count, active, test_mode, created_at, updated_at)
       VALUES (?, ?, 0, 1, 0, 1, 1)`,
      "ses",
      "SES",
    );
    const profile = `INSERT INTO profiles
      (id, tenant_id, role, display_name, email, disabled, created_at)
     VALUES (?, ?, ?, ?, ?, 0, 1)`;
    run(profile, ADMIN, "ses", "admin", "管理者", "admin@example.com");
    run(profile, INSTRUCTOR, "ses", "admin", "講師", "staff@example.com");
    run(profile, PLATFORM, "ses", "platform_admin", "基盤", "platform@example.com");
    run(profile, LEARNER, "ses", "student", "受講者太郎", "Learner@Example.com");
    run(profile, OTHER, "ses", "student", "別の受講者", "other@example.com");

    const authUser = `INSERT INTO auth_users
      (id, email, name, email_verified, created_at, updated_at)
     VALUES (?, ?, ?, 1, 1, 1)`;
    run(authUser, LEARNER, "auth-learner@example.com", "受講者太郎");
    run(authUser, OTHER, "auth-other@example.com", "別の受講者");
    const session = `INSERT INTO auth_sessions
      (id, user_id, token, expires_at, created_at, updated_at)
     VALUES (?, ?, ?, 1, 1, 1)`;
    run(session, "sess-learner", LEARNER, "tok-learner");
    run(session, "sess-other", OTHER, "tok-other");
    const account = `INSERT INTO auth_accounts
      (id, user_id, account_id, provider_id, created_at, updated_at)
     VALUES (?, ?, ?, 'google', 1, 1)`;
    run(account, "acct-learner", LEARNER, "google-learner");
    run(account, "acct-other", OTHER, "google-other");

    run("INSERT INTO skills (id, title) VALUES ('html', 'HTML')");
    const submission = `INSERT INTO submissions
      (id, tenant_id, student_id, stage_title, assignment_title, code, submitted_at)
     VALUES (?, 'ses', ?, 'ステージ', '課題', 'code', 1)`;
    run(submission, SUB_A, LEARNER);
    run(submission, SUB_B, LEARNER);
    run(submission, SUB_OTHER, OTHER);
    const file = `INSERT INTO submission_files
      (submission_id, path, object_key, sha256, bytes)
     VALUES (?, 'index.html', ?, 'abc', 1)`;
    run(file, SUB_A, "objects/learner");
    run(file, SUB_OTHER, "objects/other");
    run(
      `INSERT INTO submission_reviews
        (id, submission_id, source, verdict, notes, created_at)
       VALUES ('rev-learner', ?, 'human', 'pass', 'ok', 1)`,
      SUB_A,
    );
    run(
      `INSERT INTO ai_review_jobs
        (submission_id, tenant_id, state, attempts, next_attempt_at, enqueued_at)
       VALUES (?, 'ses', 'queued', 0, 1, 1)`,
      SUB_A,
    );
    run(
      `INSERT INTO ai_reviews (
        id, submission_id, tenant_id, task_id, task_content_hash, task_kind,
        outcome, prompt_version, threshold_version, created_at
      ) VALUES (?, ?, 'ses', 'task', 'hash', 'html', 'confirmed', 'p', 't', 1)`,
      AI_REVIEW,
      SUB_A,
    );
    run(
      `INSERT INTO submission_checks
        (id, tenant_id, submission_id, ai_review_id, reviewer_id, result, created_at)
       VALUES ('check-learner', 'ses', ?, ?, ?, 'confirmed', 1)`,
      SUB_A,
      AI_REVIEW,
      INSTRUCTOR,
    );
    run(
      `INSERT INTO ai_review_overrides (
        id, tenant_id, submission_id, ai_review_id, source,
        ai_verdict, human_verdict, reviewer_id, created_at
      ) VALUES ('over-learner', 'ses', ?, ?, 'post-check', 'pass', 'resubmit', ?, 1)`,
      SUB_A,
      AI_REVIEW,
      INSTRUCTOR,
    );
    const evidence = `INSERT INTO skill_evidence
      (id, tenant_id, user_id, skill_id, level, submission_id, assisted, created_at)
     VALUES (?, 'ses', ?, 'html', 'independent', ?, 0, 1)`;
    run(evidence, "ev-learner", LEARNER, SUB_A);
    run(evidence, "ev-other", OTHER, SUB_OTHER);

    const book = `INSERT INTO library_books
      (id, tenant_id, owner_id, package_id, title, authors, created_at, updated_at)
     VALUES (?, 'ses', ?, ?, '本', '[]', 1, 1)`;
    run(book, BOOK_A, LEARNER, "pkg-a");
    run(book, BOOK_B, LEARNER, "pkg-b");
    run(book, BOOK_OTHER, OTHER, "pkg-other");
    const bookFile = `INSERT INTO library_files (
      id, tenant_id, book_id, content_key, kind, content_type, size, r2_key,
      created_at, updated_at
    ) VALUES (?, 'ses', ?, 'cover', 'cover', 'image/webp', 1, ?, 1, 1)`;
    run(bookFile, "file-a", BOOK_A, `library/ses/${BOOK_A}/files/file-a`);
    run(bookFile, "file-other", BOOK_OTHER, `library/ses/${BOOK_OTHER}/files/file-other`);

    const note = `INSERT INTO notifications
      (id, user_id, tenant_id, type, title, payload, created_at)
     VALUES (?, ?, 'ses', 'learner_stumble', ?, ?, 1)`;
    run(note, "note-own", LEARNER, "自分宛", "{}");
    run(note, "note-payload", INSTRUCTOR, "つまずき", `{"userId":"${LEARNER}"}`);
    run(note, "note-title", INSTRUCTOR, `つまずき ${LEARNER}`, "{}");
    run(note, "note-other", INSTRUCTOR, "別の人", `{"userId":"${OTHER}"}`);
    run(note, "note-other-own", OTHER, "自分宛", "{}");

    const audit = `INSERT INTO audit_logs (
      id, tenant_id, actor_id, actor_name, actor_role, action,
      target_type, target_id, metadata, created_at
    ) VALUES (?, 'ses', ?, ?, ?, ?, ?, ?, ?, 1)`;
    run(
      audit,
      "audit-invite",
      ADMIN,
      "管理者",
      "admin",
      "user_invite",
      "user",
      LEARNER,
      '{"email":"Learner@Example.com","role":"student"}',
    );
    run(
      audit,
      "audit-actor",
      LEARNER,
      "受講者太郎",
      "student",
      "login",
      "session",
      "sess-learner",
      '{"email":"Learner@Example.com"}',
    );
    run(
      audit,
      "audit-other",
      OTHER,
      "別の受講者",
      "student",
      "login",
      "session",
      "sess-other",
      '{"email":"other@example.com"}',
    );

    const link = `INSERT INTO auth_vscode_links
      (id, user_id, code_hash, expires_at, created_at)
     VALUES (?, ?, ?, 1, 1)`;
    run(link, "link-learner", LEARNER, "hash-learner");
    run(link, "link-other", OTHER, "hash-other");
    const inquiry = `INSERT INTO support_inquiries
      (id, email, message, user_id, created_at)
     VALUES (?, ?, ?, ?, 1)`;
    run(inquiry, "inq-learner", "Learner@Example.com", "助けて", LEARNER);
    run(inquiry, "inq-other", "other@example.com", "別件", OTHER);
    run(
      `INSERT INTO support_inquiries (id, email, message, created_at)
       VALUES ('inq-anon', 'anon@example.com', '公開', 1)`,
    );
  }

  beforeEach(() => {
    database = sqliteD1();
    seed();
    env = { DB: database.binding, AUTH_JWT_SECRET: SECRET } as Env;
    app = mountTestApp(env, adminRoute).app;
  });
  afterEach(() => database.sqlite.close());

  async function remove(body: unknown, as = ADMIN) {
    return request(app, env, "/api/admin/users/delete", {
      method: "POST",
      token: await signAccessToken(SECRET, as, "caller@example.test"),
      body: JSON.stringify(body),
    });
  }

  function expectNotDeleted() {
    expect(countRows("SELECT count(*) AS n FROM profiles WHERE id = ?", LEARNER)).toBe(1);
    expect(countRows("SELECT count(*) AS n FROM submissions WHERE student_id = ?", LEARNER)).toBe(
      2,
    );
    expect(countRows("SELECT count(*) AS n FROM library_books WHERE owner_id = ?", LEARNER)).toBe(
      2,
    );
    expect(countRows("SELECT count(*) AS n FROM library_r2_purges")).toBe(0);
    expect(countRows("SELECT count(*) AS n FROM audit_logs WHERE action = 'user_delete'")).toBe(0);
    expect(countRows("SELECT count(*) AS n FROM profiles WHERE id = ?", OTHER)).toBe(1);
    expect(countRows("SELECT count(*) AS n FROM submissions WHERE student_id = ?", OTHER)).toBe(1);
  }

  async function expectRejected(body: unknown, status: number, message: string, as = ADMIN) {
    const res = await remove(body, as);
    expect(res.status).toBe(status);
    expect(await json<{ error: string }>(res)).toEqual({ error: message });
    expectNotDeleted();
  }

  it("受講者を消すと提出・本棚・接続・認証が消え、監査の個人情報だけ外れる", async () => {
    const before = Date.now();
    const res = await remove({
      userId: LEARNER,
      confirmEmail: "  learner@example.com ",
    });
    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({
      ok: true,
      deleted: { submissions: 2, library_books: 2 },
    });

    expect(countRows("SELECT count(*) AS n FROM profiles WHERE id = ?", LEARNER)).toBe(0);
    expect(countRows("SELECT count(*) AS n FROM auth_users WHERE id = ?", LEARNER)).toBe(0);
    expect(countRows("SELECT count(*) AS n FROM auth_sessions WHERE user_id = ?", LEARNER)).toBe(0);
    expect(countRows("SELECT count(*) AS n FROM auth_accounts WHERE user_id = ?", LEARNER)).toBe(0);
    expect(countRows("SELECT count(*) AS n FROM submissions WHERE student_id = ?", LEARNER)).toBe(
      0,
    );
    expect(
      countRows("SELECT count(*) AS n FROM submission_files WHERE submission_id = ?", SUB_A),
    ).toBe(0);
    expect(
      countRows("SELECT count(*) AS n FROM submission_reviews WHERE submission_id = ?", SUB_A),
    ).toBe(0);
    expect(
      countRows("SELECT count(*) AS n FROM ai_review_jobs WHERE submission_id = ?", SUB_A),
    ).toBe(0);
    expect(countRows("SELECT count(*) AS n FROM ai_reviews WHERE submission_id = ?", SUB_A)).toBe(
      0,
    );
    expect(
      countRows("SELECT count(*) AS n FROM submission_checks WHERE submission_id = ?", SUB_A),
    ).toBe(0);
    expect(
      countRows("SELECT count(*) AS n FROM ai_review_overrides WHERE submission_id = ?", SUB_A),
    ).toBe(0);
    expect(countRows("SELECT count(*) AS n FROM skill_evidence WHERE user_id = ?", LEARNER)).toBe(
      0,
    );
    expect(countRows("SELECT count(*) AS n FROM library_books WHERE owner_id = ?", LEARNER)).toBe(
      0,
    );
    expect(countRows("SELECT count(*) AS n FROM library_files WHERE book_id = ?", BOOK_A)).toBe(0);
    expect(
      countRows("SELECT count(*) AS n FROM auth_vscode_links WHERE user_id = ?", LEARNER),
    ).toBe(0);
    expect(
      countRows("SELECT count(*) AS n FROM support_inquiries WHERE user_id = ?", LEARNER),
    ).toBe(0);
    expect(countRows("SELECT count(*) AS n FROM notifications WHERE id = ?", "note-own")).toBe(0);
    expect(countRows("SELECT count(*) AS n FROM notifications WHERE id = ?", "note-payload")).toBe(
      0,
    );

    const purges = database.sqlite
      .prepare("SELECT prefix, created_at FROM library_r2_purges ORDER BY prefix")
      .all() as { prefix: string; created_at: number }[];
    expect(purges.map((row) => row.prefix)).toEqual(
      [bookPrefix(BOOK_A), bookPrefix(BOOK_B)].sort(),
    );
    for (const row of purges) expect(row.created_at).toBeGreaterThanOrEqual(before);

    const keptTitle = database.sqlite
      .prepare("SELECT title, payload FROM notifications WHERE id = 'note-title'")
      .get() as { title: string; payload: string };
    expect(keptTitle.title).toContain(LEARNER);
    expect(keptTitle.payload).toBe("{}");

    const invite = database.sqlite
      .prepare("SELECT actor_name, action, metadata FROM audit_logs WHERE id = 'audit-invite'")
      .get() as { actor_name: string; action: string; metadata: string };
    expect(invite.action).toBe("user_invite");
    expect(invite.actor_name).toBe("管理者");
    expect(JSON.parse(invite.metadata)).toEqual({});
    const acted = database.sqlite
      .prepare(
        "SELECT actor_id, actor_name, action, metadata FROM audit_logs WHERE id = 'audit-actor'",
      )
      .get() as { actor_id: string; actor_name: string; action: string; metadata: string };
    expect(acted.actor_id).toBe(LEARNER);
    expect(acted.action).toBe("login");
    expect(acted.actor_name).toBe("削除したユーザー");
    expect(JSON.parse(acted.metadata)).toEqual({});

    const logged = database.sqlite
      .prepare(
        `SELECT actor_id, actor_name, target_type, target_id, metadata
         FROM audit_logs WHERE action = 'user_delete'`,
      )
      .get() as {
      actor_id: string;
      actor_name: string;
      target_type: string;
      target_id: string;
      metadata: string;
    };
    expect(logged.actor_id).toBe(ADMIN);
    expect(logged.actor_name).toBe("管理者");
    expect(logged.target_type).toBe("user");
    expect(logged.target_id).toBe(LEARNER);
    expect(JSON.parse(logged.metadata)).toEqual({ submissions: 2, library_books: 2 });
    expect(logged.metadata).not.toContain("Learner@Example.com");
    expect(logged.metadata).not.toContain("受講者太郎");
    expect(logged.actor_name).not.toContain("受講者太郎");

    expect(countRows("SELECT count(*) AS n FROM profiles WHERE id = ?", OTHER)).toBe(1);
    expect(countRows("SELECT count(*) AS n FROM auth_users WHERE id = ?", OTHER)).toBe(1);
    expect(countRows("SELECT count(*) AS n FROM auth_sessions WHERE user_id = ?", OTHER)).toBe(1);
    expect(countRows("SELECT count(*) AS n FROM auth_accounts WHERE user_id = ?", OTHER)).toBe(1);
    expect(countRows("SELECT count(*) AS n FROM submissions WHERE id = ?", SUB_OTHER)).toBe(1);
    expect(
      countRows("SELECT count(*) AS n FROM submission_files WHERE submission_id = ?", SUB_OTHER),
    ).toBe(1);
    expect(countRows("SELECT count(*) AS n FROM skill_evidence WHERE id = ?", "ev-other")).toBe(1);
    expect(countRows("SELECT count(*) AS n FROM library_books WHERE id = ?", BOOK_OTHER)).toBe(1);
    expect(countRows("SELECT count(*) AS n FROM library_files WHERE id = ?", "file-other")).toBe(1);
    expect(
      countRows("SELECT count(*) AS n FROM auth_vscode_links WHERE id = ?", "link-other"),
    ).toBe(1);
    expect(countRows("SELECT count(*) AS n FROM support_inquiries WHERE id = ?", "inq-other")).toBe(
      1,
    );
    expect(countRows("SELECT count(*) AS n FROM support_inquiries WHERE id = ?", "inq-anon")).toBe(
      1,
    );
    expect(countRows("SELECT count(*) AS n FROM notifications WHERE id = ?", "note-other")).toBe(1);
    expect(
      countRows("SELECT count(*) AS n FROM notifications WHERE id = ?", "note-other-own"),
    ).toBe(1);
    expect(countRows("SELECT count(*) AS n FROM profiles WHERE id = ?", ADMIN)).toBe(1);
    expect(countRows("SELECT count(*) AS n FROM profiles WHERE id = ?", INSTRUCTOR)).toBe(1);
    const otherAudit = database.sqlite
      .prepare("SELECT actor_name, metadata FROM audit_logs WHERE id = 'audit-other'")
      .get() as { actor_name: string; metadata: string };
    expect(otherAudit.actor_name).toBe("別の受講者");
    expect(JSON.parse(otherAudit.metadata)).toEqual({ email: "other@example.com" });
    expect(countRows("SELECT count(*) AS n FROM skills WHERE id = 'html'")).toBe(1);

    const again = await remove({ userId: LEARNER, confirmEmail: "learner@example.com" });
    expect(again.status).toBe(404);
    expect(await json<{ error: string }>(again)).toEqual({
      error: "対象ユーザーが見つかりません",
    });
  });

  it("自分自身は削除できない", async () => {
    await expectRejected(
      { userId: ADMIN, confirmEmail: "admin@example.com" },
      400,
      "自分自身は削除できません",
    );
  });

  it("受講者以外は削除できない", async () => {
    await expectRejected(
      { userId: INSTRUCTOR, confirmEmail: "staff@example.com" },
      400,
      "削除できるのは受講者だけです",
    );
  });

  it("platform_admin は管理者から削除できない", async () => {
    await expectRejected(
      { userId: PLATFORM, confirmEmail: "platform@example.com" },
      403,
      "platform_admin は操作できません",
    );
  });

  it("確認のメールが違うと消さない", async () => {
    await expectRejected(
      { userId: LEARNER, confirmEmail: "other@example.com" },
      400,
      "確認のメールアドレスが一致しません",
    );
  });

  it("メールアドレスの無い受講者は確認が空でも消せない", async () => {
    run("UPDATE profiles SET email = NULL WHERE id = ?", LEARNER);
    await expectRejected(
      { userId: LEARNER, confirmEmail: "" },
      400,
      "メールアドレスの無い受講者は削除できません",
    );
  });

  it("一覧に出ない auth_users のメールでは消せない", async () => {
    await expectRejected(
      { userId: LEARNER, confirmEmail: "auth-learner@example.com" },
      400,
      "確認のメールアドレスが一致しません",
    );
  });

  it("userId が無いと 400", async () => {
    await expectRejected({}, 400, "userId は必須です");
    await expectRejected({ userId: 1 }, 400, "userId は必須です");
  });

  it("存在しないユーザーは 404", async () => {
    await expectRejected(
      { userId: MISSING, confirmEmail: "nobody@example.com" },
      404,
      "対象ユーザーが見つかりません",
    );
  });

  it("受講者からは削除できない", async () => {
    await expectRejected(
      { userId: OTHER, confirmEmail: "other@example.com" },
      403,
      "権限がありません",
      LEARNER,
    );
  });
});
