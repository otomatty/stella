/**
 * コア学習ループの半自動 E2E スモーク (Issue #64)。
 *
 *   bun run smoke:core                 # 既定 http://127.0.0.1:8787
 *   SMOKE_BASE_URL=... bun run smoke:core
 *
 * 起動中の API に対して HTTP だけで
 * 「コース作成 → 公開 → 受講登録 → 進捗 → 課題提出 → 添削確定 → 通知 → 修了証発行 →
 *   監査ログ確認 → 後片付け」
 * を 1 本走らせ、 各ステップの結果を検証する。 ブラウザは使わないため CI でも回せる
 * (`.github/workflows/ci.yml` の core-loop ジョブ)。
 *
 * 認証は OAuth を通さず、 `AUTH_JWT_SECRET` で seed プロフィール用の JWT を直接発行する
 * (README「ローカルログイン」と同じ方法)。 そのため `login` の監査記録だけは対象外。
 *
 * 前提: `bun run db:migrate && bun run db:seed` 済みで、 API が起動していること。
 * 副作用: 作成したコース / 受講登録は最後に削除する。 提出物には削除 API がないため
 * `[smoke]` 付きの提出が 1 件残る (添削確定済みなのでキューには出ない)。
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { SignJWT } from "jose";

const apiDir = join(import.meta.dirname, "..");
const BASE = (process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/$/, "");

const LEARNER_ID = process.env.SMOKE_LEARNER_ID ?? "seed-learner";
const INSTRUCTOR_ID = process.env.SMOKE_INSTRUCTOR_ID ?? "seed-instructor";
const ADMIN_ID = process.env.SMOKE_ADMIN_ID ?? "seed-admin";

/**
 * `.dev.vars` (KEY=VALUE 形式) から 1 つ読む。 env が優先。
 * 行末の CR を落としてから解釈する (`.dev.vars.example` は CRLF 保存のため)。
 */
function readDevVar(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  try {
    const text = readFileSync(join(apiDir, ".dev.vars"), "utf8");
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      if (line.slice(0, eq).trim() !== key) continue;
      return line
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
    }
  } catch {
    // .dev.vars が無い場合は env のみで判断する。
  }
  return undefined;
}

async function mintToken(secret: string, userId: string): Promise<string> {
  return new SignJWT({ email: `${userId}@example.local` })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer("falcon-api")
    .setAudience("falcon-web")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(secret));
}

// --- HTTP ヘルパ ---------------------------------------------------

interface CallResult {
  status: number;
  body: any;
}

async function call(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown } = {},
): Promise<CallResult> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // JSON でないレスポンス (エラーページ等) はそのまま持つ。
  }
  return { status: res.status, body };
}

/** 2xx を期待する。 それ以外はステータスと本文を添えて落とす。 */
async function ok(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown } = {},
): Promise<any> {
  const r = await call(method, path, opts);
  if (r.status < 200 || r.status >= 300) {
    throw new Error(`${method} ${path} → ${r.status} ${JSON.stringify(r.body)}`);
  }
  return r.body;
}

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

// --- ステップ実行 ---------------------------------------------------

let failures = 0;
let stepNo = 0;

async function step(title: string, fn: () => Promise<void>): Promise<void> {
  stepNo += 1;
  const label = `${String(stepNo).padStart(2, " ")}. ${title}`;
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failures += 1;
    console.log(`  ✗ ${label}`);
    console.log(`      ${err instanceof Error ? err.message : String(err)}`);
  }
}

// --- 本体 -----------------------------------------------------------

async function main(): Promise<void> {
  const secret = readDevVar("AUTH_JWT_SECRET");
  if (!secret) {
    console.error("✗ AUTH_JWT_SECRET が未設定です (env か apps/api/.dev.vars に設定してください)");
    process.exit(1);
  }

  const admin = await mintToken(secret, ADMIN_ID);
  const instructor = await mintToken(secret, INSTRUCTOR_ID);
  const learner = await mintToken(secret, LEARNER_ID);

  // 再実行しても衝突しないよう slug に実行時刻を混ぜる。
  const stamp = Date.now().toString(36);
  const slug = `smoke-core-loop-${stamp}`;
  const courseTitle = `[smoke] コア学習ループ ${stamp}`;

  let courseId = "";
  let lessonId = "";
  let enrollmentId = "";
  let submissionId = "";
  let certificateId = "";
  let certCode = "";

  console.log(`コア学習ループ スモーク → ${BASE}\n`);

  await step("API が応答し JWT が設定済み", async () => {
    const health = await ok("GET", "/api/healthz");
    assert(health.ok === true, `healthz が ok:true でない: ${JSON.stringify(health)}`);
    assert(
      health.jwtConfigured === true,
      "AUTH_JWT_SECRET が API 側で未設定 (jwtConfigured:false)",
    );
  });

  await step("未認証リクエストは 401", async () => {
    const r = await call("GET", "/api/me");
    assert(r.status === 401, `401 を期待したが ${r.status}`);
  });

  await step("受講者が設定画面からユーザー名を変更できる", async () => {
    const before = await ok("GET", "/api/me", { token: learner });
    const original = before.profile.display_name as string;
    // Google ログインで同期されるアバターはフロントが /api/me から読む。
    assert("avatar_url" in before.profile, "/api/me が avatar_url を返さない");
    const next = `[smoke] ユーザー名 ${stamp}`;

    const saved = await ok("POST", "/api/me", {
      token: learner,
      body: { display_name: ` ${next} ` },
    });
    assert(
      saved.profile.display_name === next,
      `display_name が trim して保存されない: ${saved.profile.display_name}`,
    );

    const empty = await call("POST", "/api/me", {
      token: learner,
      body: { display_name: "   " },
    });
    assert(empty.status === 400, `空のユーザー名は 400 を期待したが ${empty.status}`);

    const tooLong = await call("POST", "/api/me", {
      token: learner,
      body: { display_name: "あ".repeat(51) },
    });
    assert(tooLong.status === 400, `51文字は 400 を期待したが ${tooLong.status}`);

    // 以降のステップ (提出者名の表示など) に影響させないよう元の名前へ戻す。
    await ok("POST", "/api/me", { token: learner, body: { display_name: original } });
  });

  await step("Admin がコースを作成する (draft)", async () => {
    const res = await ok("POST", "/api/cms/courses", {
      token: admin,
      body: {
        slug,
        title: courseTitle,
        category: "smoke",
        status: "draft",
        require_all_lessons: true,
        require_quiz_pass: false,
        require_assignment_pass: true,
        auto_issue_certificate: true,
      },
    });
    courseId = res.row.id;
    assert(courseId, "course.id が返らない");
    assert(res.row.status === "draft", `status が draft でない: ${res.row.status}`);
  });

  await step("Admin がセクションと課題レッスンを追加する", async () => {
    const section = await ok("POST", "/api/cms/sections", {
      token: admin,
      body: { course_id: courseId, title: "[smoke] セクション", order: 0 },
    });
    const lesson = await ok("POST", "/api/cms/lessons", {
      token: admin,
      body: {
        section_id: section.row.id,
        title: "[smoke] 課題レッスン",
        type: "assignment",
        order: 0,
      },
    });
    lessonId = lesson.row.id;
    assert(lessonId, "lesson.id が返らない");
  });

  await step("draft コースは受講者に見えない", async () => {
    const res = await ok("GET", "/api/cms/courses", { token: learner });
    const found = res.rows.some((r: { id: string }) => r.id === courseId);
    assert(!found, "draft のコースが受講者の一覧に出ている");
  });

  await step("Admin がコースを公開する", async () => {
    await ok("PATCH", `/api/cms/courses/${courseId}/status`, {
      token: admin,
      body: { status: "published" },
    });
    const res = await ok("GET", "/api/cms/courses", { token: learner });
    const found = res.rows.some((r: { id: string }) => r.id === courseId);
    assert(found, "公開したコースが受講者の一覧に出ない");
  });

  await step("Admin が受講者を登録する", async () => {
    const res = await ok("POST", "/api/enrollments", {
      token: admin,
      body: { userId: LEARNER_ID, courseId, required: true },
    });
    enrollmentId = res.row.id;
    assert(enrollmentId, "enrollment.id が返らない");
    const mine = await ok("GET", "/api/enrollments/mine", { token: learner });
    assert(
      mine.rows.some((r: { course_id: string }) => r.course_id === courseId),
      "受講者の enrollment 一覧に出ない",
    );
  });

  await step("受講者がレッスンを完了にする (進捗が永続化される)", async () => {
    await ok("POST", "/api/lesson-progress", {
      token: learner,
      body: {
        rows: [
          {
            lesson_id: lessonId,
            completed: true,
            last_page: null,
            viewed_pages: [],
            watched_sec: null,
            updated_at: new Date().toISOString(),
          },
        ],
      },
    });
    const res = await ok("GET", "/api/lesson-progress", { token: learner });
    const row = res.rows.find((r: { lesson_id: string }) => r.lesson_id === lessonId);
    assert(row, "進捗が保存されていない");
    assert(row.completed === true, "進捗が completed になっていない");
  });

  await step("課題未合格の時点では修了条件を満たさない", async () => {
    const res = await ok("GET", `/api/certificates/completion/${courseId}`, { token: learner });
    assert(res.completion.met === false, "課題未合格なのに修了条件を満たしている");
  });

  await step("受講者が課題を提出する", async () => {
    const res = await ok("POST", "/api/submissions", {
      token: learner,
      body: {
        lessonId,
        courseTitle,
        sectionTitle: "[smoke] セクション",
        assignmentTitle: "[smoke] 課題レッスン",
        code: "console.log('smoke');",
        priority: "normal",
        attempt: 1,
      },
    });
    submissionId = res.row.id;
    assert(submissionId, "submission.id が返らない");
    assert(res.row.status === "pending", `status が pending でない: ${res.row.status}`);
  });

  await step("講師の添削キューに提出が現れる", async () => {
    const res = await ok("GET", "/api/submissions", { token: instructor });
    const row = res.rows.find((r: { id: string }) => r.id === submissionId);
    assert(row, "添削キューに提出が出ない");
    assert(row.student_id === LEARNER_ID, "提出者が一致しない");
  });

  await step("受講者は他人の提出を添削できない (403)", async () => {
    const r = await call("PATCH", `/api/submissions/${submissionId}`, {
      token: learner,
      body: { status: "passed", verdict: "pass" },
    });
    assert(r.status === 403, `403 を期待したが ${r.status}`);
  });

  await step("講師が添削を確定する (合格)", async () => {
    const res = await ok("PATCH", `/api/submissions/${submissionId}`, {
      token: instructor,
      body: {
        status: "passed",
        verdict: "pass",
        reviewNotes: "[smoke] 合格",
        rubric: [],
        aiSuggestions: [],
      },
    });
    assert(res.row.verdict === "pass", `verdict が pass でない: ${res.row.verdict}`);
    assert(res.row.status === "passed", `status が passed でない: ${res.row.status}`);
  });

  await step("受講者に添削完了の通知が届く", async () => {
    const res = await ok("GET", "/api/notifications", { token: learner });
    const hit = res.rows.find(
      (n: { type: string; payload: { submission_id?: string } | null }) =>
        n.type === "review_completed" && n.payload?.submission_id === submissionId,
    );
    assert(hit, "review_completed の通知が生成されていない");
  });

  await step("受講者が自分の提出から確定結果を読める", async () => {
    const res = await ok("GET", "/api/submissions/mine", { token: learner });
    const row = res.rows.find((r: { id: string }) => r.id === submissionId);
    assert(row, "自分の提出一覧に出ない");
    assert(row.verdict === "pass", "verdict が受講者側に反映されていない");
  });

  await step("修了条件を満たし、 修了証を発行できる", async () => {
    const completion = await ok("GET", `/api/certificates/completion/${courseId}`, {
      token: learner,
    });
    assert(completion.completion.met === true, "添削合格後も修了条件を満たさない");
    const res = await ok("POST", "/api/certificates/issue", {
      token: learner,
      body: { courseId, userId: LEARNER_ID },
    });
    certificateId = res.certificate.id;
    certCode = res.certificate.cert_code;
    assert(certificateId, "certificate.id が返らない");
    assert(certCode, "cert_code が返らない");
    assert(res.certificate.already_existed === false, "初回発行なのに already_existed が true");
  });

  await step("修了証の再発行はべき等で、 未認証でも検証できる", async () => {
    const again = await ok("POST", "/api/certificates/issue", {
      token: learner,
      body: { courseId, userId: LEARNER_ID },
    });
    assert(again.certificate.already_existed === true, "2 回目の発行が新規扱いになっている");
    assert(again.certificate.cert_code === certCode, "cert_code が発行ごとに変わっている");
    const verified = await ok("GET", `/api/certificates/verify/${certCode}`);
    assert(
      verified.verification?.valid === true,
      `検証が valid でない: ${JSON.stringify(verified)}`,
    );
    assert(verified.verification.cert_code === certCode, "検証結果の cert_code が一致しない");
  });

  await step("主要操作が監査ログに残っている (Issue #64)", async () => {
    const res = await ok("GET", "/api/audit-logs?limit=200", { token: admin });
    const rows = res.rows as Array<{ action: string; target_id: string | null }>;
    const has = (action: string, targetId: string) =>
      rows.some((r) => r.action === action && r.target_id === targetId);
    assert(has("course_publish", courseId), "course_publish が記録されていない");
    assert(has("enrollment_create", enrollmentId), "enrollment_create が記録されていない");
    // 過去の実行が残した行で通ってしまわないよう、 今回発行した修了証 ID で突き合わせる。
    assert(has("certificate_issue", certificateId), "certificate_issue が記録されていない");
  });

  // --- 後片付け -----------------------------------------------------
  // 失敗しても以降のステップを止めない。 コース削除で section / lesson / 進捗 /
  // 修了証は cascade で消える。
  await step("後片付け: 受講登録とコースを削除する", async () => {
    if (enrollmentId) await ok("DELETE", `/api/enrollments/${enrollmentId}`, { token: admin });
    if (courseId) await ok("DELETE", `/api/cms/courses/${courseId}`, { token: admin });
    const res = await ok("GET", "/api/audit-logs?limit=200", { token: admin });
    const rows = res.rows as Array<{ action: string; target_id: string | null }>;
    assert(
      rows.some((r) => r.action === "course_delete" && r.target_id === courseId),
      "course_delete が記録されていない",
    );
  });

  console.log();
  if (failures > 0) {
    console.error(`✗ コア学習ループ スモーク失敗 (${failures}/${stepNo} ステップ)`);
    process.exit(1);
  }
  console.log(`✓ コア学習ループ スモーク OK (${stepNo} ステップ)`);
}

main().catch((err) => {
  console.error("\n✗ スモーク実行中に想定外のエラー:");
  console.error(err instanceof Error ? (err.stack ?? err.message) : err);
  process.exit(1);
});
