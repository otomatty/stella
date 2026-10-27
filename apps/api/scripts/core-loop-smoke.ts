/**
 * コア学習ループの半自動 E2E スモーク (Issue #64)。
 *
 *   bun run smoke:core                 # 既定 http://127.0.0.1:8787
 *   SMOKE_BASE_URL=... bun run smoke:core
 *
 * 起動中の API に対して HTTP だけで
 * 「ステージ作成 → 公開 → **受講者が自分で開始** → 進捗 → 課題提出 → 添削確定 → 通知 →
 *   修了証発行 → 監査ログ確認 → 後片付け」
 * を 1 本走らせ、 各ステップの結果を検証する。 ブラウザは使わないため CI でも回せる
 * (`.github/workflows/ci.yml` の core-loop ジョブ)。
 *
 * Phase 3b で **管理者の割当は廃止** した。 このスモークもその契約に合わせてあり、
 * 学習者が `POST /api/stages/:id/start` で解放済みの星を自分で始める。 退役した
 * 割当 API (`POST /api/enrollments` / `/bulk` / プリセット適用) が 410 を返すことも
 * ここで見張る。 一方で **退役しなかったもの** も同じだけ見張る — 割当プリセットの
 * 定義 CRUD (`PATCH /api/enrollment-presets/:id`) と、 始まったあとの staff の後始末
 * (`PATCH /api/enrollments/:id` の期限設定 / 解除)。 まとめて消してしまう変更を
 * 素通しさせないため。
 *
 * 認証は OAuth を通さず、 `AUTH_JWT_SECRET` で seed プロフィール用の JWT を直接発行する
 * (README「ローカルログイン」と同じ方法)。 そのため `login` の監査記録だけは対象外。
 *
 * 前提: `bun run db:migrate && bun run db:seed` 済みで、 API が起動していること。
 * 副作用: 作成したステージ / 受講登録は最後に削除する。 提出物には削除 API がないため
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
const SALES_ID = process.env.SMOKE_SALES_ID ?? "seed-sales";

/** VS Code の「講師に引き継ぐ」 が添える採点失敗サマリの最小形 (Issue #9)。 */
const SMOKE_GRADING_SUMMARY = {
  cleared: false,
  checks: { lint: true, ast: true, tests: false },
  language: "js",
  lint: [],
  ast: [],
  failedTests: [{ name: "[smoke] 失敗テスト", error: "expected 1, got 0" }],
  passedTestCount: 0,
  totalTestCount: 1,
};

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
    .setIssuer("stella-api")
    .setAudience("stella-web")
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
  const sales = await mintToken(secret, SALES_ID);

  // 再実行しても衝突しないよう slug に実行時刻を混ぜる。
  const stamp = Date.now().toString(36);
  const slug = `smoke-core-loop-${stamp}`;
  const stageTitle = `[smoke] コア学習ループ ${stamp}`;

  let stageId = "";
  let lessonId = "";
  let quizId = "";
  let questionId = "";
  let correctOptionId = "";
  let wrongOptionId = "";
  let enrollmentId = "";
  let presetId = "";
  let soloPresetId = "";
  let sharedPresetId = "";
  let submissionId = "";
  const smokeAssignmentId = `smoke-assignment-${stamp}`;
  let certificateId = "";
  let certCode = "";
  // 判定訂正の巻き戻しで消される 1 通目の修了証 id (監査ログの突合に使う)。
  let reclaimedCertificateId = "";
  // 添削確定後の引き継ぎで生まれる 2 件目の提出 (判定訂正のステップで両方を下げる)。
  let secondSubmissionId = "";

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

  await step("営業は CMS API にアクセスできない (403)", async () => {
    const r = await call("POST", "/api/cms/stages", {
      token: sales,
      body: { slug: `smoke-sales-deny-${stamp}`, title: "[smoke] sales deny", status: "draft" },
    });
    assert(r.status === 403, `403 を期待したが ${r.status}`);
  });

  await step("営業は監査ログを閲覧できない (403)", async () => {
    const r = await call("GET", "/api/audit-logs?limit=10", { token: sales });
    assert(r.status === 403, `403 を期待したが ${r.status}`);
  });

  await step("営業は受講登録 API を使えない (403)", async () => {
    const r = await call("GET", "/api/enrollments", { token: sales });
    assert(r.status === 403, `403 を期待したが ${r.status}`);
  });

  await step("営業は面談対策の割当一覧を取得できる", async () => {
    const res = await ok("GET", "/api/interview-prep/assignments", { token: sales });
    assert(Array.isArray(res.rows), "rows が配列でない");
  });

  await step("営業は面談対策の割当を更新できる", async () => {
    await ok("PUT", `/api/interview-prep/assignments/${LEARNER_ID}`, {
      token: sales,
      body: { categories: ["JS/React"] },
    });
    const listed = await ok("GET", "/api/interview-prep/assignments", { token: sales });
    const row = listed.rows.find((r: { profile_id: string }) => r.profile_id === LEARNER_ID);
    assert(row?.categories?.includes("JS/React"), "割当が保存されていない");
  });

  await step("営業は面談対策の質問を全件閲覧できる", async () => {
    const res = await ok("GET", "/api/interview-prep/questions", { token: sales });
    assert(res.rows.length > 0, "質問が 0 件");
    assert(res.assignedCategories?.length > 0, "assignedCategories が空");
  });

  await step("面談対策の割当は営業・講師を拒否する", async () => {
    for (const [label, profileId] of [
      ["営業", SALES_ID],
      ["講師", INSTRUCTOR_ID],
    ] as const) {
      const r = await call("PUT", `/api/interview-prep/assignments/${profileId}`, {
        token: admin,
        body: { categories: ["SQL"] },
      });
      assert(r.status === 400, `${label} への割当は 400 を期待したが ${r.status}`);
      assert(
        r.body?.error === "面談対策の割当は受講者と管理者のみ対象です",
        `${label}: エラーメッセージが想定と異なる: ${JSON.stringify(r.body)}`,
      );
    }
  });

  await step("管理者は受講者と同じく面談対策の対象にできる", async () => {
    await ok("PUT", `/api/interview-prep/assignments/${ADMIN_ID}`, {
      token: admin,
      body: { categories: ["SQL"] },
    });

    const listed = await ok("GET", "/api/interview-prep/assignments", { token: admin });
    const row = listed.rows.find((r: { profile_id: string }) => r.profile_id === ADMIN_ID);
    assert(row?.categories?.includes("SQL"), "管理者の割当が保存されていない");
    assert(row?.role === "admin", `対象者の行に role が付かない: ${JSON.stringify(row)}`);

    // 管理者も自分の練習を記録できる (受講者と同じ経路)。
    const questions = await ok("GET", `/api/interview-prep/questions?profileId=${ADMIN_ID}`, {
      token: admin,
    });
    const first = questions.rows?.[0]?.no as number | undefined;
    assert(typeof first === "number", "割当ぶんの質問が返らない");
    await ok("PUT", `/api/interview-prep/progress/${first}`, {
      token: admin,
      body: { event: "read" },
    });

    // 後片付け: 割当を空へ戻す (モニタリング一覧に常時並ばせない)。
    await ok("PUT", `/api/interview-prep/assignments/${ADMIN_ID}`, {
      token: admin,
      body: { categories: [] },
    });
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

  await step("Admin がステージを作成する (draft)", async () => {
    const res = await ok("POST", "/api/cms/stages", {
      token: admin,
      body: {
        slug,
        title: stageTitle,
        category: "smoke",
        status: "draft",
        require_all_lessons: true,
        require_quiz_pass: false,
        require_assignment_pass: true,
        auto_issue_certificate: true,
      },
    });
    stageId = res.row.id;
    assert(stageId, "stage.id が返らない");
    assert(res.row.status === "draft", `status が draft でない: ${res.row.status}`);
  });

  await step("Admin がセクションと課題レッスンを追加する", async () => {
    const section = await ok("POST", "/api/cms/sections", {
      token: admin,
      body: { stage_id: stageId, title: "[smoke] セクション", order: 0 },
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

  // 受講者にカタログを渡さない (スキルツリーの「霧」を API 境界で守る)。 受講者から
  // 見えるのは自分の割当 (`/api/enrollments/mine`) と視界つきの `/api/skill-map/mine` だけ。
  await step("受講者はステージ一覧も未受講ステージの詳細も引けない", async () => {
    const list = await call("GET", "/api/cms/stages", { token: learner });
    assert(list.status === 403, `受講者にステージ一覧が返っている (${list.status})`);
    const detail = await call("GET", `/api/cms/stages/${stageId}`, { token: learner });
    assert(detail.status === 403, `未受講ステージの詳細が引けている (${detail.status})`);
  });

  await step("Admin がステージを公開する", async () => {
    await ok("PATCH", `/api/cms/stages/${stageId}/status`, {
      token: admin,
      body: { status: "published" },
    });
    const res = await ok("GET", "/api/cms/stages", { token: admin });
    const row = (res.rows as Array<{ id: string; status: string }>).find((r) => r.id === stageId);
    assert(row?.status === "published", "公開したステージが staff の一覧で published にならない");
    // 公開しただけでは受講者に開かない (受講登録が要る)。
    const detail = await call("GET", `/api/cms/stages/${stageId}`, { token: learner });
    assert(detail.status === 403, `未受講のまま公開ステージが引けている (${detail.status})`);
  });

  await step(
    "割当が無くても道に星が出て、次の一歩の候補になる (プレースメントの材料)",
    async () => {
      // Phase 3b: 受講登録は「割り当てられるもの」ではなくなった。 公開された星は登録が
      // 無くても道に出て、 ホームのプレースメントが選ばせる候補 (`next_stage_ids`) に並ぶ。
      const res = await ok("GET", "/api/skill-map/mine", { token: learner });
      const node = (res.skill_map.stages as Array<{ id: string; enrolled?: boolean }>).find(
        (row) => row.id === stageId,
      );
      assert(node, "公開したステージが受講者の道に出ない");
      assert(node.enrolled === false, `始める前から enrolled になっている: ${node.enrolled}`);
      assert(
        (res.skill_map.next_stage_ids as string[]).includes(stageId),
        "前提の無い公開ステージが「次の一歩」の候補に出ない",
      );
    },
  );

  await step("受講者が解放済みのステージを自分で開始する", async () => {
    const res = await ok("POST", `/api/stages/${stageId}/start`, { token: learner });
    enrollmentId = res.enrollment.id;
    assert(enrollmentId, "enrollment.id が返らない");
    assert(res.created === true, "初回の開始が created:true にならない");
    assert(res.state === "unlocked", `開始時の state が unlocked でない: ${res.state}`);
    // 自己開始に期限は付かない (自分で始めた星がホームの「期限超過」に並ばないように)。
    assert(res.enrollment.due_at === null, `自己開始に期限が付いている: ${res.enrollment.due_at}`);
    assert(res.enrollment.required === false, "自己開始が必須扱いになっている");

    const mine = await ok("GET", "/api/enrollments/mine", { token: learner });
    assert(
      mine.rows.some((r: { stage_id: string }) => r.stage_id === stageId),
      "受講者の enrollment 一覧に出ない",
    );
    // 受講登録が詳細を開ける唯一の鍵 (旧 VS Code 拡張もこの順で引く)。
    const detail = await ok("GET", `/api/cms/stages/${stageId}`, { token: learner });
    assert(detail.stage?.stage?.id === stageId, "自分で開始しても詳細が引けない");
  });

  await step("二重に開始しても登録は増えない (冪等)", async () => {
    const again = await ok("POST", `/api/stages/${stageId}/start`, { token: learner });
    assert(again.created === false, "2 回目の開始が created:true になっている");
    assert(again.enrollment.id === enrollmentId, "2 回目の開始で別の登録が作られた");
    const rows = await ok("GET", `/api/enrollments?userIds=${LEARNER_ID}`, { token: admin });
    const hits = rows.rows.filter((r: { stage_id: string }) => r.stage_id === stageId);
    assert(hits.length === 1, `同じ星の登録が ${hits.length} 件ある (1 件のはず)`);
  });

  // クリア済みの星を弾くことは、実際にクリアしてからでないと確かめられない
  // (修了証の発行まで進んだあとの 「修了後にもう一度開始できない」 ステップで見る)。
  await step("存在しないステージは自分で開始できない", async () => {
    // 存在しない星は 「割当が無い」 「霧の中」 と同じ汎用文言で断る (存在を漏らさない)。
    const missing = await call("POST", `/api/stages/does-not-exist-${stamp}/start`, {
      token: learner,
    });
    assert(missing.status === 400, `存在しない星は 400 を期待したが ${missing.status}`);
    assert(
      missing.body?.error === "受講登録のないステージは選べません",
      `汎用文言と異なる: ${JSON.stringify(missing.body)}`,
    );
  });

  await step("学習を見る側のロール (講師 / 営業) は自己開始できない (403)", async () => {
    for (const [label, token] of [
      ["講師", instructor],
      ["営業", sales],
    ] as const) {
      const r = await call("POST", `/api/stages/${stageId}/start`, { token });
      assert(r.status === 403, `${label}: 403 を期待したが ${r.status}`);
    }
  });

  await step("退役した割当 API は 410 を返す (Phase 3b)", async () => {
    const retired: Array<[string, string, unknown]> = [
      ["POST", "/api/enrollments", { userId: LEARNER_ID, stageId, required: true }],
      [
        "POST",
        "/api/enrollments/bulk",
        { action: "assign", userIds: [LEARNER_ID], stageIds: [stageId] },
      ],
    ];
    for (const [method, path, body] of retired) {
      const r = await call(method, path, { token: admin, body });
      assert(r.status === 410, `${method} ${path} は 410 を期待したが ${r.status}`);
      assert(
        typeof r.body?.error === "string" && r.body.error.includes("/api/stages/"),
        `410 の本文が代替の入口を案内していない: ${JSON.stringify(r.body)}`,
      );
    }
  });

  // プリセットは Phase 3b で **定義だけ** が残った (適用は 410)。 教材削除で空になった
  // プリセットを退役させる CMS 側の後始末が、 まだ生きていることを見るために作る。
  await step("Admin が割当プリセットを作成する (定義のみ)", async () => {
    const res = await ok("POST", "/api/enrollment-presets", {
      token: admin,
      body: {
        name: `[smoke] 新入社員パック ${stamp}`,
        description: "コア学習ループ スモーク用",
        items: [{ stage_id: stageId, required: true, due_offset_days: 14 }],
      },
    });
    presetId = res.row.id;
    assert(presetId, "preset.id が返らない");
    assert(res.row.items.length === 1, `items が 1 件でない: ${res.row.items.length}`);
    assert(res.row.items[0].due_offset_days === 14, "due_offset_days が保存されていない");

    // 名前はテナント内で一意。 同名の二重作成は 409。
    const dup = await call("POST", "/api/enrollment-presets", {
      token: admin,
      body: { name: res.row.name, items: [{ stage_id: stageId }] },
    });
    assert(dup.status === 409, `同名プリセットは 409 を期待したが ${dup.status}`);
  });

  await step("Admin が割当プリセットの定義を更新する (残置 CRUD)", async () => {
    // 適用は退役したが **定義の更新は残置** している (過去の登録が `preset_id` で指す先の
    // 名前や中身を直せないと、 受講状況の出自バッジが古い名前のままになる)。 退役した
    // 適用の巻き添えで PATCH まで落ちていないことを、 ここ 1 ステップで見張る。
    const res = await ok("PATCH", `/api/enrollment-presets/${presetId}`, {
      token: admin,
      body: {
        name: `[smoke] 新入社員パック (改訂) ${stamp}`,
        description: "名前と項目を差し替えた",
        items: [{ stage_id: stageId, required: false, due_offset_days: 30 }],
      },
    });
    assert(res.row.id === presetId, "更新で別の定義が作られている");
    assert(res.row.name.includes("改訂"), `名前が更新されていない: ${res.row.name}`);
    assert(res.row.items.length === 1, `items が 1 件でない: ${res.row.items.length}`);
    assert(
      res.row.items[0].due_offset_days === 30,
      `項目が差し替わっていない: ${res.row.items[0].due_offset_days}`,
    );

    // 読み直しても同じ (応答だけ整えて保存していない、を弾く)。
    const list = await ok("GET", "/api/enrollment-presets", { token: admin });
    const stored = (list.rows as Array<{ id: string; name: string }>).find(
      (r) => r.id === presetId,
    );
    assert(stored?.name === res.row.name, "更新後の名前が一覧に反映されていない");

    const denied = await call("PATCH", `/api/enrollment-presets/${presetId}`, {
      token: learner,
      body: { name: `[smoke] 不正更新 ${stamp}` },
    });
    assert(denied.status === 403, `受講者の更新は 403 を期待したが ${denied.status}`);
  });

  await step("受講者はプリセットを作成できない (403)", async () => {
    const r = await call("POST", "/api/enrollment-presets", {
      token: learner,
      body: { name: `[smoke] 不正 ${stamp}`, items: [{ stage_id: stageId }] },
    });
    assert(r.status === 403, `403 を期待したが ${r.status}`);
  });

  await step("退役した割当プリセットの適用は 410 を返す (Phase 3b)", async () => {
    // 定義の CRUD は残す (過去の `enrollments.preset_id` を引くために残置) が、
    // 受講生へ展開する適用は無い。 dry-run も同じ。
    for (const body of [
      { userIds: [LEARNER_ID], baseDate: "2026-04-01", dryRun: true },
      { userIds: [LEARNER_ID], baseDate: "2026-04-01", conflict: "overwrite" },
    ]) {
      const r = await call("POST", `/api/enrollment-presets/${presetId}/apply`, {
        token: admin,
        body,
      });
      assert(r.status === 410, `適用は 410 を期待したが ${r.status}`);
    }
    // 適用が無い以上、 受講者の登録は自己開始ぶんだけ (期限は付かないまま)。
    const mine = await ok("GET", "/api/enrollments/mine", { token: learner });
    const row = mine.rows.find((r: { stage_id: string }) => r.stage_id === stageId);
    assert(row?.due_at === null, `退役したはずの適用で期限が入っている: ${row?.due_at}`);
  });

  await step("staff が付けた期限は、 受講者が開始し直しても消えない", async () => {
    // 自己開始は期限を付けないが、 始まったあとに staff が締切を足す運用は残っている
    // (`PATCH /api/enrollments/:id` — 受講状況の行メニュー)。 開始が冪等でも
    // 「既定値で上書き」 していると、 受講者がホームでもう一度 「始める」 を押した
    // だけで締切が消える。 一度きりの事故なうえ誰も気づけないので、 ここで見張る。
    const dueAt = "2099-12-31T00:00:00.000Z";
    await ok("PATCH", `/api/enrollments/${enrollmentId}`, {
      token: admin,
      body: { due_at: dueAt, required: true },
    });

    const again = await ok("POST", `/api/stages/${stageId}/start`, { token: learner });
    assert(again.created === false, "既存の登録があるのに created:true になっている");
    assert(
      again.enrollment.due_at === dueAt,
      `再開始で期限が書き換わった: ${again.enrollment.due_at}`,
    );
    assert(again.enrollment.required === true, "再開始で必須フラグが既定値へ戻った");

    // 以降のステップ (修了条件 / 修了証) を期限超過の状態で回さないよう元に戻す。
    // `due_at: null` を受け付けること自体も確かめておく (行メニューの 「期限を外す」)。
    await ok("PATCH", `/api/enrollments/${enrollmentId}`, {
      token: admin,
      body: { due_at: null, required: false },
    });
    const mine = await ok("GET", "/api/enrollments/mine", { token: learner });
    const cleared = mine.rows.find((r: { stage_id: string }) => r.stage_id === stageId);
    assert(cleared?.due_at === null, `期限を外せていない: ${cleared?.due_at}`);
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
    const res = await ok("GET", `/api/certificates/completion/${stageId}`, { token: learner });
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
        assignmentId: smokeAssignmentId,
        stageTitle,
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

  // Issue #9: VS Code の「講師に引き継ぐ」。 採点失敗サマリを添えて再提出しても
  // 未添削の行を上書きする (キューを増殖させない)。
  await step("VS Code から詰まりを引き継ぐと未添削の提出を上書きする", async () => {
    const res = await ok("POST", "/api/submissions", {
      token: learner,
      body: {
        lessonId,
        assignmentId: smokeAssignmentId,
        stageTitle,
        sectionTitle: "[smoke] セクション",
        assignmentTitle: "[smoke] 課題レッスン",
        code: "console.log('escalated');",
        priority: "high",
        attempt: 1,
        gradingSummary: SMOKE_GRADING_SUMMARY,
      },
    });
    assert(res.row.id === submissionId, "同一課題の未添削提出が上書きされず新規作成された");
    assert(res.row.attempt === 2, `attempt が 2 でない: ${res.row.attempt}`);
    assert(res.row.priority === "high", `priority が high でない: ${res.row.priority}`);
    assert(res.row.code.includes("escalated"), "提出コードが上書きされていない");
    assert(
      res.row.grading_summary?.failedTests?.[0]?.name === "[smoke] 失敗テスト",
      "採点失敗サマリが保存されていない",
    );
  });

  await step("講師の添削キューに提出が現れる", async () => {
    const res = await ok("GET", "/api/submissions", { token: instructor });
    const mine = res.rows.filter(
      (r: { assignment_id: string | null }) => r.assignment_id === smokeAssignmentId,
    );
    assert(mine.length === 1, `同一課題の提出が ${mine.length} 件ある (1 件のはず)`);
    const row = mine[0];
    assert(row.id === submissionId, "添削キューに提出が出ない");
    assert(row.student_id === LEARNER_ID, "提出者が一致しない");
    assert(row.grading_summary?.cleared === false, "採点失敗サマリが講師側に届いていない");
  });

  await step("受講者は他人の提出を添削できない (403)", async () => {
    const r = await call("PATCH", `/api/submissions/${submissionId}`, {
      token: learner,
      body: { status: "passed", verdict: "pass" },
    });
    assert(r.status === 403, `403 を期待したが ${r.status}`);
  });

  // Issue #9: 講師が開いている間に学習者が引き継ぎ直したら、 その添削は確定させない。
  await step("開いていた版が古くなった添削は 409", async () => {
    const opened = await ok("GET", `/api/submissions/${submissionId}`, { token: instructor });
    const staleVersion = opened.row.submitted_at;

    // 学習者が同じ課題を引き継ぎ直す (= submitted_at が進む)。
    await ok("POST", "/api/submissions", {
      token: learner,
      body: {
        lessonId,
        assignmentId: smokeAssignmentId,
        stageTitle,
        assignmentTitle: "[smoke] 課題レッスン",
        code: "console.log('re-escalated');",
        priority: "high",
        attempt: 1,
        gradingSummary: SMOKE_GRADING_SUMMARY,
      },
    });

    const stale = await call("PATCH", `/api/submissions/${submissionId}`, {
      token: instructor,
      body: { expectedSubmittedAt: staleVersion, status: "passed", verdict: "pass" },
    });
    assert(stale.status === 409, `409 を期待したが ${stale.status}`);

    // 壊れた版指定が 409 に化けないこと (原因が分からなくなる)。
    const malformed = await call("PATCH", `/api/submissions/${submissionId}`, {
      token: instructor,
      body: { expectedSubmittedAt: "not-a-date", status: "passed", verdict: "pass" },
    });
    assert(malformed.status === 400, `400 を期待したが ${malformed.status}`);

    const current = await ok("GET", `/api/submissions/${submissionId}`, { token: instructor });
    assert(current.row.status === "pending", "409 のはずが添削が確定してしまった");
    assert(current.row.code.includes("re-escalated"), "引き継ぎ直したコードが載っていない");
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

  // Issue #9: 添削が確定した後の引き継ぎは、 確定済みの添削を pending へ巻き戻さない。
  await step("添削確定後の引き継ぎは確定済みの提出を上書きしない", async () => {
    const res = await ok("POST", "/api/submissions", {
      token: learner,
      body: {
        lessonId,
        assignmentId: smokeAssignmentId,
        stageTitle,
        sectionTitle: "[smoke] セクション",
        assignmentTitle: "[smoke] 課題レッスン",
        code: "console.log('after review');",
        priority: "high",
        attempt: 1,
        gradingSummary: SMOKE_GRADING_SUMMARY,
      },
    });
    assert(res.row.id !== submissionId, "確定済みの提出が上書きされた");
    assert(res.row.attempt === 4, `attempt が 4 でない: ${res.row.attempt}`);
    secondSubmissionId = res.row.id;

    const before = await ok("GET", `/api/submissions/${submissionId}`, { token: learner });
    assert(before.row.verdict === "pass", "確定済みの添削が巻き戻された");
    assert(before.row.status === "passed", "確定済みの提出が pending に戻った");

    // 後片付け: 新しい提出も確定して、 添削待ちキューに残さない。
    await ok("PATCH", `/api/submissions/${res.row.id}`, {
      token: instructor,
      body: { status: "passed", verdict: "pass", reviewNotes: "[smoke] 再引き継ぎも合格" },
    });
  });

  // Issue #9: 壊れた採点サマリは黙って捨てず 400。 講師画面が落ちる payload を弾く。
  await step("壊れた採点サマリ付きの提出は 400", async () => {
    const r = await call("POST", "/api/submissions", {
      token: learner,
      body: {
        lessonId,
        assignmentId: `${smokeAssignmentId}-invalid`,
        stageTitle,
        assignmentTitle: "[smoke] 不正サマリ",
        code: "console.log('bad');",
        priority: "normal",
        attempt: 1,
        gradingSummary: { ...SMOKE_GRADING_SUMMARY, lint: [null] },
      },
    });
    assert(r.status === 400, `400 を期待したが ${r.status}`);
  });

  await step("修了条件の達成で修了証が自動発行される", async () => {
    // 講師の添削確定 (合格) が最後の条件だったので、 その時点でサーバが自動発行し、
    // 受講登録も completed になっている — 受講者は何も操作しない。
    const completion = await ok("GET", `/api/certificates/completion/${stageId}`, {
      token: learner,
    });
    assert(completion.completion.met === true, "添削合格後も修了条件を満たさない");
    assert(
      completion.completion.has_certificate === true,
      "修了条件を満たしたのに修了証が自動発行されていない",
    );

    const mine = await ok("GET", "/api/certificates/mine", { token: learner });
    const cert = mine.rows.find((r: { stage_id: string }) => r.stage_id === stageId);
    assert(cert, "自分の修了証一覧に自動発行分が出ない");
    certificateId = cert.id;
    certCode = cert.cert_code;
    assert(certificateId, "certificate.id が返らない");
    assert(certCode, "cert_code が返らない");

    const enrolled = await ok("GET", "/api/enrollments/mine", { token: learner });
    const row = enrolled.rows.find((r: { stage_id: string }) => r.stage_id === stageId);
    assert(row?.status === "completed", `自動発行で登録が completed にならない: ${row?.status}`);
  });

  await step("受講者は修了証を手動発行できない (staff 専用・再発行はべき等)", async () => {
    // 受講者の手動発行は廃止 (条件達成での自動発行に置き換え)。
    const denied = await call("POST", "/api/certificates/issue", {
      token: learner,
      body: { stageId, userId: LEARNER_ID },
    });
    assert(denied.status === 403, `受講者の発行は 403 を期待したが ${denied.status}`);

    // staff の発行 (Gradebook) は残る。 既発行ならべき等に既存を返す。
    const again = await ok("POST", "/api/certificates/issue", {
      token: instructor,
      body: { stageId, userId: LEARNER_ID },
    });
    assert(again.certificate.already_existed === true, "既発行なのに新規扱いになっている");
    assert(again.certificate.cert_code === certCode, "cert_code が発行ごとに変わっている");
    const verified = await ok("GET", `/api/certificates/verify/${certCode}`);
    assert(
      verified.verification?.valid === true,
      `検証が valid でない: ${JSON.stringify(verified)}`,
    );
    assert(verified.verification.cert_code === certCode, "検証結果の cert_code が一致しない");
  });

  // 誤って付けた合格の訂正 (PR #288 レビュー指摘)。自動発行の修了証は、条件が崩れた
  // 時点で削除 + 受講登録を active に巻き戻す。
  await step("合格の取り消しで自動発行の修了証が巻き戻る", async () => {
    reclaimedCertificateId = certificateId;

    // 同じレッスンに合格提出が 2 件 (最初の提出と引き継ぎ直しの提出) あるため、
    // 片方を下げただけでは条件は崩れない = 修了証は残る。
    await ok("PATCH", `/api/submissions/${submissionId}`, {
      token: instructor,
      body: { status: "resubmit", verdict: "resubmit", reviewNotes: "[smoke] 判定訂正 1" },
    });
    const still = await ok("GET", `/api/certificates/completion/${stageId}`, { token: learner });
    assert(still.completion.has_certificate === true, "条件が崩れていないのに修了証が消えた");

    // もう 1 件も下げると全条件が崩れる → 修了証の削除 + 登録の active 戻し。
    await ok("PATCH", `/api/submissions/${secondSubmissionId}`, {
      token: instructor,
      body: { status: "resubmit", verdict: "resubmit", reviewNotes: "[smoke] 判定訂正 2" },
    });
    const gone = await ok("GET", `/api/certificates/completion/${stageId}`, { token: learner });
    assert(gone.completion.met === false, "合格を取り消したのに修了条件を満たしたまま");
    assert(gone.completion.has_certificate === false, "合格を取り消したのに修了証が残っている");
    const enrolled = await ok("GET", "/api/enrollments/mine", { token: learner });
    const row = enrolled.rows.find((r: { stage_id: string }) => r.stage_id === stageId);
    assert(row?.status === "active", `巻き戻しで登録が active に戻らない: ${row?.status}`);
  });

  await step("再び合格にすると修了証が発行し直される", async () => {
    await ok("PATCH", `/api/submissions/${submissionId}`, {
      token: instructor,
      body: { status: "passed", verdict: "pass", reviewNotes: "[smoke] 合格に戻す" },
    });
    const completion = await ok("GET", `/api/certificates/completion/${stageId}`, {
      token: learner,
    });
    assert(completion.completion.has_certificate === true, "再合格で修了証が発行し直されない");
    // 以降のステップ (クリア済みの開始拒否 / 監査ログ) は発行し直した修了証を見る。
    const mine = await ok("GET", "/api/certificates/mine", { token: learner });
    const cert = mine.rows.find((r: { stage_id: string }) => r.stage_id === stageId);
    assert(cert, "発行し直した修了証が一覧に出ない");
    assert(cert.cert_code !== certCode, "削除したはずの修了証がそのまま残っている");
    certificateId = cert.id;
    certCode = cert.cert_code;
  });

  await step("クリア済みのステージは自分で開始できない (400)", async () => {
    // 修了まで進んだ星は評価器が `cleared` を返す。 ここを通すと、 続けて呼ばれる
    // `PUT /api/skill-map/active-stage` がクリア済みを弾いて行き止まりになるので、
    // 開始の時点で断る。 **理由はそのまま返してよい** — 本人が終わらせた星なので、
    // 霧の向こうを漏らす汎用文言 (存在しない星と同じ文言) にする必要が無い。
    const r = await call("POST", `/api/stages/${stageId}/start`, { token: learner });
    assert(r.status === 400, `クリア済みの開始は 400 を期待したが ${r.status}`);
    assert(
      r.body?.error === "クリア済みのステージです",
      `クリア済みの文言と異なる: ${JSON.stringify(r.body)}`,
    );

    // 断られても登録は残る (「もう始められない」 と 「登録が消えた」 は別)。
    const mine = await ok("GET", "/api/enrollments/mine", { token: learner });
    assert(
      mine.rows.some((row: { stage_id: string }) => row.stage_id === stageId),
      "開始を断られた拍子に受講登録まで消えている",
    );
  });

  await step("主要操作が監査ログに残っている (Issue #64)", async () => {
    const res = await ok("GET", "/api/audit-logs?limit=200", { token: admin });
    const rows = res.rows as Array<{ action: string; target_id: string | null }>;
    const has = (action: string, targetId: string) =>
      rows.some((r) => r.action === action && r.target_id === targetId);
    assert(has("stage_publish", stageId), "stage_publish が記録されていない");
    // Phase 3b: 登録を作るのは受講者の自己開始だけ (`enrollment_create` はもう出ない)。
    assert(has("stage_self_start", enrollmentId), "stage_self_start が記録されていない");
    assert(
      !rows.some((r) => r.action === "enrollment_create" && r.target_id === enrollmentId),
      "退役した enrollment_create が記録されている",
    );
    assert(
      has("enrollment_preset_create", presetId),
      "enrollment_preset_create が記録されていない",
    );
    // 残置した定義の CRUD も監査に載る (適用だけが退役した)。
    assert(
      has("enrollment_preset_update", presetId),
      "enrollment_preset_update が記録されていない",
    );
    // staff の後始末 (期限の設定 / 解除) も残る。
    assert(has("enrollment_update", enrollmentId), "enrollment_update が記録されていない");
    // 過去の実行が残した行で通ってしまわないよう、 今回発行した修了証 ID で突き合わせる。
    assert(has("certificate_issue", certificateId), "certificate_issue が記録されていない");
    // 判定訂正で巻き戻した 1 通目も記録される (PR #288)。
    assert(
      has("certificate_reclaim", reclaimedCertificateId),
      "certificate_reclaim が記録されていない",
    );
  });

  await step("退役したプリセットの名前は再利用できる", async () => {
    // 削除は archived を立てる論理削除。 一意制約を無条件にすると消した名前が永久に予約され、
    // 画面上は削除したのに同じ名前で作り直せない (PR #151 のレビュー指摘)。
    const name = `[smoke] 名前再利用 ${stamp}`;
    const first = await ok("POST", "/api/enrollment-presets", {
      token: admin,
      body: { name, items: [{ stage_id: stageId }] },
    });
    const dup = await call("POST", "/api/enrollment-presets", {
      token: admin,
      body: { name, items: [{ stage_id: stageId }] },
    });
    assert(dup.status === 409, `アクティブ同士の同名は 409 を期待したが ${dup.status}`);

    await ok("DELETE", `/api/enrollment-presets/${first.row.id}`, { token: admin });
    const again = await call("POST", "/api/enrollment-presets", {
      token: admin,
      body: { name, items: [{ stage_id: stageId }] },
    });
    assert(again.status === 200, `退役後の同名作成は 200 を期待したが ${again.status}`);
    await ok("DELETE", `/api/enrollment-presets/${again.body.row.id}`, { token: admin });
  });

  await step("教材だけを含むプリセットを用意する (削除の巻き添えを見る)", async () => {
    const res = await ok("POST", "/api/enrollment-presets", {
      token: admin,
      body: {
        name: `[smoke] 単一教材 ${stamp}`,
        items: [{ stage_id: stageId, due_offset_days: 7 }],
      },
    });
    soloPresetId = res.row.id;
    assert(soloPresetId, "preset.id が返らない");

    // 別教材も含むプリセット。 こちらは削除で空にならないので退役しないが、 中身は減る。
    const others = await ok("GET", "/api/cms/stages", { token: admin });
    const other = (others.rows as Array<{ id: string }>).find((r) => r.id !== stageId);
    assert(other, "スモーク用以外の教材が無い (seed 済みか確認)");
    const shared = await ok("POST", "/api/enrollment-presets", {
      token: admin,
      body: {
        name: `[smoke] 複数教材 ${stamp}`,
        items: [{ stage_id: stageId }, { stage_id: other.id }],
      },
    });
    sharedPresetId = shared.row.id;
    assert(shared.row.updated_at, "updated_at が返らない");
  });

  // --- 後片付け -----------------------------------------------------
  // 失敗しても以降のステップを止めない。 ステージ削除で section / lesson / 進捗 /
  // 修了証は cascade で消える。
  await step("後片付け: プリセット / 受講登録 / ステージを削除する", async () => {
    if (presetId) {
      await ok("DELETE", `/api/enrollment-presets/${presetId}`, { token: admin });
      const list = await ok("GET", "/api/enrollment-presets", { token: admin });
      assert(
        !list.rows.some((r: { id: string }) => r.id === presetId),
        "退役したプリセットが一覧に残っている",
      );
    }
    if (enrollmentId) await ok("DELETE", `/api/enrollments/${enrollmentId}`, { token: admin });
    if (stageId) await ok("DELETE", `/api/cms/stages/${stageId}`, { token: admin });
    const res = await ok("GET", "/api/audit-logs?limit=200", { token: admin });
    const rows = res.rows as Array<{
      action: string;
      target_id: string | null;
      metadata: Record<string, unknown>;
    }>;
    const deleteLog = rows.find((r) => r.action === "stage_delete" && r.target_id === stageId);
    assert(deleteLog, "stage_delete が記録されていない");

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

    // 空にならなかったプリセットは残る (中身は 1 件減っている)。
    assert(
      list.rows.some((r: { id: string }) => r.id === sharedPresetId),
      "空にならなかったプリセットまで退役している",
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
