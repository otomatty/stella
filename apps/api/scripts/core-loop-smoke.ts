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
  let quizId = "";
  let questionId = "";
  let correctOptionId = "";
  let wrongOptionId = "";
  let enrollmentId = "";
  let presetId = "";
  let soloPresetId = "";
  let sharedPresetId = "";
  let sharedPresetUpdatedAt = "";
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

  await step("Admin が割当プリセットを作成する", async () => {
    const res = await ok("POST", "/api/enrollment-presets", {
      token: admin,
      body: {
        name: `[smoke] 新入社員パック ${stamp}`,
        description: "コア学習ループ スモーク用",
        items: [{ course_id: courseId, required: true, due_offset_days: 14 }],
      },
    });
    presetId = res.row.id;
    assert(presetId, "preset.id が返らない");
    assert(res.row.items.length === 1, `items が 1 件でない: ${res.row.items.length}`);
    assert(res.row.items[0].due_offset_days === 14, "due_offset_days が保存されていない");

    // 名前はテナント内で一意。 同名の二重作成は 409。
    const dup = await call("POST", "/api/enrollment-presets", {
      token: admin,
      body: { name: res.row.name, items: [{ course_id: courseId }] },
    });
    assert(dup.status === 409, `同名プリセットは 409 を期待したが ${dup.status}`);
  });

  await step("受講者はプリセットを作成できない (403)", async () => {
    const r = await call("POST", "/api/enrollment-presets", {
      token: learner,
      body: { name: `[smoke] 不正 ${stamp}`, items: [{ course_id: courseId }] },
    });
    assert(r.status === 403, `403 を期待したが ${r.status}`);
  });

  await step("実在しない基準日は 400 で弾く (期限が静かにずれない)", async () => {
    // JS の Date は 2026-02-30 を NaN にせず 3/2 へ繰り上げる。 形式チェックだけだと
    // 「受け付けたのに期限がずれる」 ため、 暦として実在するかまで見る (PR #151 のレビュー指摘)。
    for (const baseDate of ["2026-02-30", "2026-04-31", "", "2026/04/01"]) {
      const r = await call("POST", `/api/enrollment-presets/${presetId}/apply`, {
        token: admin,
        body: { userIds: [LEARNER_ID], baseDate, dryRun: true },
      });
      assert(
        r.status === 400,
        `baseDate=${JSON.stringify(baseDate)} は 400 を期待したが ${r.status}`,
      );
    }
    // 省略も 400。 サーバ (UTC) の日付で代用すると JST では 1 日ずれるため既定値を置かない。
    const omitted = await call("POST", `/api/enrollment-presets/${presetId}/apply`, {
      token: admin,
      body: { userIds: [LEARNER_ID], dryRun: true },
    });
    assert(omitted.status === 400, `baseDate 省略は 400 を期待したが ${omitted.status}`);
  });

  await step("編集後のプリセットへ古い版で適用しようとすると 409", async () => {
    // 大人数への適用は分割送信になる。 その途中や見積もりの後に他の管理者が編集すると、
    // 前半と後半で内容が変わる / 見ていない割当が通る (PR #151 のレビュー指摘)。
    const before = await ok("GET", "/api/enrollment-presets", { token: admin });
    const stale = before.rows.find((r: { id: string }) => r.id === presetId);
    assert(stale?.updated_at, "updated_at が返らない");

    // 版が一致していれば通る。
    const fresh = await call("POST", `/api/enrollment-presets/${presetId}/apply`, {
      token: admin,
      body: {
        userIds: [LEARNER_ID],
        baseDate: "2026-04-01",
        dryRun: true,
        expectedUpdatedAt: stale.updated_at,
      },
    });
    assert(fresh.status === 200, `一致する版は 200 を期待したが ${fresh.status}`);

    // 編集して版を進めると、 古い版を指した適用は 409。
    await ok("PATCH", `/api/enrollment-presets/${presetId}`, {
      token: admin,
      body: {
        name: `[smoke] 新入社員パック ${stamp}`,
        items: [{ course_id: courseId, required: true, due_offset_days: 14 }],
      },
    });
    const conflicted = await call("POST", `/api/enrollment-presets/${presetId}/apply`, {
      token: admin,
      body: {
        userIds: [LEARNER_ID],
        baseDate: "2026-04-01",
        dryRun: true,
        expectedUpdatedAt: stale.updated_at,
      },
    });
    assert(conflicted.status === 409, `古い版は 409 を期待したが ${conflicted.status}`);
  });

  await step("dry-run は既存登録をスキップと数え、 DB を変えない", async () => {
    const res = await ok("POST", `/api/enrollment-presets/${presetId}/apply`, {
      token: admin,
      body: { userIds: [LEARNER_ID], baseDate: "2026-04-01", conflict: "skip", dryRun: true },
    });
    assert(res.dry_run === true, "dry_run が true でない");
    assert(res.skipped === 1, `既存登録は skipped 1 を期待したが ${res.skipped}`);
    assert(res.assigned === 0, `dry-run の assigned は 0 を期待したが ${res.assigned}`);
    // 既存の enrollment (期限なしで作った) が dry-run で書き換わっていないこと。
    const mine = await ok("GET", "/api/enrollments/mine", { token: learner });
    const row = mine.rows.find((r: { course_id: string }) => r.course_id === courseId);
    assert(row?.due_at === null, `dry-run で期限が書き込まれている: ${row?.due_at}`);
  });

  await step("プリセット適用で期限が基準日から展開される", async () => {
    const res = await ok("POST", `/api/enrollment-presets/${presetId}/apply`, {
      token: admin,
      body: { userIds: [INSTRUCTOR_ID], baseDate: "2026-04-01", conflict: "skip" },
    });
    assert(res.assigned === 1, `assigned 1 を期待したが ${res.assigned}`);
    const rows = await ok("GET", `/api/enrollments?userIds=${INSTRUCTOR_ID}`, { token: admin });
    const row = rows.rows.find((r: { course_id: string }) => r.course_id === courseId);
    assert(row, "適用した受講登録が見つからない");
    // 2026-04-01 + 14 日 = 2026-04-15 (UTC 0 時)。
    assert(
      row.due_at === "2026-04-15T00:00:00.000Z",
      `期限が基準日 + 14 日になっていない: ${row.due_at}`,
    );
    assert(row.required === true, "required がプリセットの指定を反映していない");
    assert(row.preset_id === presetId, "preset_id が記録されていない");
  });

  await step("skip では既存の期限を上書きしない / overwrite では上書きする", async () => {
    // 直前の適用で instructor は登録済み。 skip なら何も変わらない。
    const skipped = await ok("POST", `/api/enrollment-presets/${presetId}/apply`, {
      token: admin,
      body: { userIds: [INSTRUCTOR_ID], baseDate: "2026-05-01", conflict: "skip" },
    });
    assert(skipped.skipped === 1, `skip で skipped 1 を期待したが ${skipped.skipped}`);
    const afterSkip = await ok("GET", `/api/enrollments?userIds=${INSTRUCTOR_ID}`, {
      token: admin,
    });
    const rowSkip = afterSkip.rows.find((r: { course_id: string }) => r.course_id === courseId);
    assert(
      rowSkip.due_at === "2026-04-15T00:00:00.000Z",
      `skip なのに期限が変わっている: ${rowSkip.due_at}`,
    );

    const overwritten = await ok("POST", `/api/enrollment-presets/${presetId}/apply`, {
      token: admin,
      body: { userIds: [INSTRUCTOR_ID], baseDate: "2026-05-01", conflict: "overwrite" },
    });
    assert(
      overwritten.overwritten === 1,
      `overwrite で overwritten 1 を期待したが ${overwritten.overwritten}`,
    );
    const afterOverwrite = await ok("GET", `/api/enrollments?userIds=${INSTRUCTOR_ID}`, {
      token: admin,
    });
    const rowOverwrite = afterOverwrite.rows.find(
      (r: { course_id: string }) => r.course_id === courseId,
    );
    // 2026-05-01 + 14 日 = 2026-05-15。
    assert(
      rowOverwrite.due_at === "2026-05-15T00:00:00.000Z",
      `overwrite で期限が更新されていない: ${rowOverwrite.due_at}`,
    );
  });

  await step("別のプリセットを被せても登録の出自 (preset_id) は変わらない", async () => {
    // preset_id は 「この登録を作ったプリセット」。 上書きで書き換えると、 差分適用の
    // 手掛かりになる 「どのプリセットで登録した受講生か」 が崩れる (PR #151 のレビュー指摘)。
    const other = await ok("POST", "/api/enrollment-presets", {
      token: admin,
      body: {
        name: `[smoke] 別プリセット ${stamp}`,
        items: [{ course_id: courseId, required: false, due_offset_days: 3 }],
      },
    });
    await ok("POST", `/api/enrollment-presets/${other.row.id}/apply`, {
      token: admin,
      body: { userIds: [INSTRUCTOR_ID], baseDate: "2026-06-01", conflict: "overwrite" },
    });
    const rows = await ok("GET", `/api/enrollments?userIds=${INSTRUCTOR_ID}`, { token: admin });
    const row = rows.rows.find((r: { course_id: string }) => r.course_id === courseId);
    // 値は新しいプリセットのものに変わるが、 出自は最初に作ったプリセットのまま。
    assert(
      row.due_at === "2026-06-04T00:00:00.000Z",
      `overwrite で期限が更新されていない: ${row.due_at}`,
    );
    assert(row.required === false, "overwrite で必須が更新されていない");
    assert(
      row.preset_id === presetId,
      `出自が書き換わっている: ${row.preset_id} (期待: ${presetId})`,
    );
    await ok("DELETE", `/api/enrollment-presets/${other.row.id}`, { token: admin });
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

  await step("Admin が確認クイズを作成する", async () => {
    const quiz = await ok("POST", "/api/cms/quiz/ensure", {
      token: admin,
      body: { lessonId },
    });
    quizId = quiz.row.id;
    assert(quizId, "quiz.id が返らない");
    const q = await ok("POST", "/api/cms/quiz-questions", {
      token: admin,
      body: {
        quiz_id: quizId,
        kind: "single",
        prompt: "[smoke] 1 + 1 = ?",
        explanation: "2 です。",
        points: 1,
        order: 0,
      },
    });
    questionId = q.row.id;
    const o1 = await ok("POST", "/api/cms/quiz-options", {
      token: admin,
      body: { question_id: questionId, label: "2", is_correct: true, order: 0 },
    });
    correctOptionId = o1.row.id;
    const o2 = await ok("POST", "/api/cms/quiz-options", {
      token: admin,
      body: { question_id: questionId, label: "3", is_correct: false, order: 1 },
    });
    wrongOptionId = o2.row.id;
  });

  await step("受講者がクイズに誤答してもカードは同日再出題されない", async () => {
    await ok("POST", `/api/quiz/${quizId}/attempt`, {
      token: learner,
      body: { answers: [{ question_id: questionId, selected_option_ids: [wrongOptionId] }] },
    });
    // 誤答カードは翌日 due (同日再出題なし)。 今日のリストには出ないことを検証する。
    const today = await ok("GET", "/api/srs/today", { token: learner });
    const listed = today.review.questions.some((q: { id: string }) => q.id === questionId);
    assert(!listed, "誤答した設問が同日の復習リストに出ている");
  });

  await step("復習の連続正解で SM-2 の間隔が 1 日 → 6 日と伸びる", async () => {
    const first = await ok("POST", "/api/srs/answer", {
      token: learner,
      body: { question_id: questionId, selected_option_ids: [correctOptionId] },
    });
    assert(first.result.correct === true, "正解のはずが誤答判定");
    assert(
      first.result.interval_days === 1,
      `1 回目の正解は 1 日のはずが ${first.result.interval_days}`,
    );
    const second = await ok("POST", "/api/srs/answer", {
      token: learner,
      body: { question_id: questionId, selected_option_ids: [correctOptionId] },
    });
    assert(
      second.result.interval_days === 6,
      `2 回目の連続正解は 6 日のはずが ${second.result.interval_days}`,
    );
    assert(/^\d{4}-\d{2}-\d{2}$/.test(second.result.due_date), "due_date が YYYY-MM-DD でない");
    const today = await ok("GET", "/api/srs/today", { token: learner });
    assert(
      today.review.answered_today >= 2,
      `answered_today が増えていない (${today.review.answered_today})`,
    );
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
    assert(
      has("enrollment_preset_create", presetId),
      "enrollment_preset_create が記録されていない",
    );
    assert(has("enrollment_preset_apply", presetId), "enrollment_preset_apply が記録されていない");
    // 過去の実行が残した行で通ってしまわないよう、 今回発行した修了証 ID で突き合わせる。
    assert(has("certificate_issue", certificateId), "certificate_issue が記録されていない");
  });

  await step("退役したプリセットの名前は再利用できる", async () => {
    // 削除は archived を立てる論理削除。 一意制約を無条件にすると消した名前が永久に予約され、
    // 画面上は削除したのに同じ名前で作り直せない (PR #151 のレビュー指摘)。
    const name = `[smoke] 名前再利用 ${stamp}`;
    const first = await ok("POST", "/api/enrollment-presets", {
      token: admin,
      body: { name, items: [{ course_id: courseId }] },
    });
    const dup = await call("POST", "/api/enrollment-presets", {
      token: admin,
      body: { name, items: [{ course_id: courseId }] },
    });
    assert(dup.status === 409, `アクティブ同士の同名は 409 を期待したが ${dup.status}`);

    await ok("DELETE", `/api/enrollment-presets/${first.row.id}`, { token: admin });
    const again = await call("POST", "/api/enrollment-presets", {
      token: admin,
      body: { name, items: [{ course_id: courseId }] },
    });
    assert(again.status === 200, `退役後の同名作成は 200 を期待したが ${again.status}`);
    await ok("DELETE", `/api/enrollment-presets/${again.body.row.id}`, { token: admin });
  });

  await step("教材だけを含むプリセットを用意する (削除の巻き添えを見る)", async () => {
    const res = await ok("POST", "/api/enrollment-presets", {
      token: admin,
      body: {
        name: `[smoke] 単一教材 ${stamp}`,
        items: [{ course_id: courseId, due_offset_days: 7 }],
      },
    });
    soloPresetId = res.row.id;
    assert(soloPresetId, "preset.id が返らない");

    // 別教材も含むプリセット。 こちらは削除で空にならないので退役しないが、 中身は減る。
    const others = await ok("GET", "/api/cms/courses", { token: admin });
    const other = (others.rows as Array<{ id: string }>).find((r) => r.id !== courseId);
    assert(other, "スモーク用以外の教材が無い (seed 済みか確認)");
    const shared = await ok("POST", "/api/enrollment-presets", {
      token: admin,
      body: {
        name: `[smoke] 複数教材 ${stamp}`,
        items: [{ course_id: courseId }, { course_id: other.id }],
      },
    });
    sharedPresetId = shared.row.id;
    sharedPresetUpdatedAt = shared.row.updated_at;
    assert(sharedPresetUpdatedAt, "updated_at が返らない");
  });

  // --- 後片付け -----------------------------------------------------
  // 失敗しても以降のステップを止めない。 コース削除で section / lesson / 進捗 /
  // 修了証は cascade で消える。
  await step("後片付け: プリセット / 受講登録 / コースを削除する", async () => {
    if (presetId) {
      await ok("DELETE", `/api/enrollment-presets/${presetId}`, { token: admin });
      const list = await ok("GET", "/api/enrollment-presets", { token: admin });
      assert(
        !list.rows.some((r: { id: string }) => r.id === presetId),
        "退役したプリセットが一覧に残っている",
      );
    }
    if (enrollmentId) await ok("DELETE", `/api/enrollments/${enrollmentId}`, { token: admin });
    if (courseId) await ok("DELETE", `/api/cms/courses/${courseId}`, { token: admin });
    const res = await ok("GET", "/api/audit-logs?limit=200", { token: admin });
    const rows = res.rows as Array<{
      action: string;
      target_id: string | null;
      metadata: Record<string, unknown>;
    }>;
    const deleteLog = rows.find((r) => r.action === "course_delete" && r.target_id === courseId);
    assert(deleteLog, "course_delete が記録されていない");

    // 教材を消すとプリセットの項目も cascade で消える。 空になったプリセットは
    // 「適用すれば必ず失敗する」 ので退役させ、 監査から辿れるようにしている。
    const list = await ok("GET", "/api/enrollment-presets", { token: admin });
    assert(
      !list.rows.some((r: { id: string }) => r.id === soloPresetId),
      "教材削除で空になったプリセットが有効なまま残っている",
    );
    const archived = deleteLog.metadata?.archived_presets as Array<{ id: string }> | undefined;
    assert(
      archived?.some((p) => p.id === soloPresetId),
      "巻き添えで退役したプリセットが監査ログに残っていない",
    );

    // 空にならなかったプリセットは残るが、 中身は減っている。 版が進んでいないと、
    // 適用中の分割送信が 「約束した 409 を出さずに減った内容で適用する」。
    assert(
      list.rows.some((r: { id: string }) => r.id === sharedPresetId),
      "空にならなかったプリセットまで退役している",
    );
    const stale = await call("POST", `/api/enrollment-presets/${sharedPresetId}/apply`, {
      token: admin,
      body: {
        userIds: [LEARNER_ID],
        baseDate: "2026-04-01",
        dryRun: true,
        expectedUpdatedAt: sharedPresetUpdatedAt,
      },
    });
    assert(
      stale.status === 409,
      `教材削除で中身が減ったプリセットは古い版で 409 を期待したが ${stale.status}`,
    );
    await ok("DELETE", `/api/enrollment-presets/${sharedPresetId}`, { token: admin });
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
