# 面談対策(Interview Prep)機能 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SES未経験エンジニア向けの面談対策(188問の想定質問集 + 割当ベースの表示制御)を LMS に追加する。

**Architecture:** 質問バンクはリポジトリの JSON が正本 → 既存 seed パイプライン(upsert/prune・安定UUID)で D1 に投入。API は割当カテゴリ + `全案件共通` でフィルタして返す。web は learner 向け(一覧 / ランダム出題)と staff 向け(割当管理)を単一ルート `/interview-prep` でロール分岐。

**Tech Stack:** Bun workspaces / Hono + Drizzle (D1, SQLite) / Vite + React + TanStack Router (file-based) / Vitest。

**Spec:** `docs/superpowers/specs/2026-08-14-interview-prep-design.md`

## Global Constraints

- lint は Biome (`bun run lint`)、静的解析の主役は `bun run typecheck` (tsc strict)。
- packages/shared 内部の相対 import は `.js` 拡張子付き (NodeNext)。web からは `@stella/shared/<subpath>` (package.json の exports に登録必須)。
- コミットメッセージは既存に倣い `feat(scope): 日本語要約` 形式。
- テナントは `ses` 固定 (既存教材コースと同じ)。
- カテゴリ定数: 割当可能 = `PHP/JS` / `SQL` / `テスト`、常時表示 = `全案件共通`。優先度 = `A`(必修) / `B`(推奨) / `C`(参考)。
- `apps/web/src/routeTree.gen.ts` は Vite プラグイン生成。新ルート追加後は `bun run dev` を一度起動するか `bunx vite build` を実行して gen を更新してから typecheck すること。
- Windows で `dev:api` を止めた後は workerd が :8787 を掴んだまま残ることがある。`Get-NetTCPConnection -LocalPort 8787 -State Listen` → `Stop-Process -Force` で掃除してから再起動。

---

### Task 1: shared — 型・質問データ・表示フィルタ

**Files:**
- Create: `packages/shared/src/interview/types.ts`
- Create: `packages/shared/src/interview/questions.json` (188問データ)
- Create: `packages/shared/src/interview/questions.ts` (型付きアクセサ)
- Create: `packages/shared/src/interview/filter.ts`
- Test: `packages/shared/src/interview/filter.test.ts`
- Modify: `packages/shared/package.json` (exports 追加)

**Interfaces:**
- Produces: `InterviewQuestion` 型、`ASSIGNABLE_CATEGORIES: readonly ['PHP/JS','SQL','テスト']`、`COMMON_CATEGORY = '全案件共通'`、`isAssignableCategory(v: unknown): boolean`、`INTERVIEW_QUESTIONS: InterviewQuestion[]`、`visibleQuestions<T extends {category: string}>(all: T[], assignedCategories: string[]): T[]`

- [ ] **Step 1: 質問データ JSON を配置**

`docs/superpowers/specs/2026-08-14-interview-prep-questions.json`(上司提供 HTML から抽出した中間ファイル)を正規化して `packages/shared/src/interview/questions.json` にコピーする(欠落フィールドを null に、`is_reverse` を boolean に揃える):

> 実施後メモ: この中間ファイルは正本を二重に持たないよう削除済み。正本は `packages/shared/src/interview/questions.json` のみ。以下は実行時点の記録。

```bash
bun -e "
const raw = await Bun.file('docs/superpowers/specs/2026-08-14-interview-prep-questions.json').json();
const norm = raw.map(d => ({
  no: d.no, category: d.category, subcategory: d.subcategory, freq: d.freq,
  question: d.question, time: d.time ?? null, keywords: d.keywords ?? null,
  intent: d.intent ?? null, answer_template: d.answer_template ?? null,
  deep1: d.deep1 ?? null, deep2: d.deep2 ?? null, deep3: d.deep3 ?? null,
  ng: d.ng ?? null, criteria: d.criteria ?? null, is_reverse: Boolean(d.is_reverse),
}));
if (norm.length !== 188) throw new Error('expected 188, got ' + norm.length);
const nos = new Set(norm.map(d => d.no));
if (nos.size !== 188) throw new Error('duplicate no');
await Bun.write('packages/shared/src/interview/questions.json', JSON.stringify(norm, null, 2) + String.fromCharCode(10));
console.log('ok', norm.length);
"
```

Expected: `ok 188`

- [ ] **Step 2: 型と定数を書く**

`packages/shared/src/interview/types.ts`:

```ts
/**
 * 面談対策 (Interview Prep) — 想定質問の型とカテゴリ定数。
 *
 * 質問データの正本は同ディレクトリの `questions.json` (上司提案の想定質問集 188 問)。
 * D1 へは seed (upsert/prune) で投入し、 API / web はこの型を共有する。
 */

export interface InterviewQuestion {
  no: number;
  /** 案件種別: ASSIGNABLE_CATEGORIES のいずれか、 または COMMON_CATEGORY */
  category: string;
  subcategory: string;
  /** 優先度: A 必修 / B 推奨 / C 参考 */
  freq: "A" | "B" | "C";
  question: string;
  /** 目安回答時間 (例: "30秒") */
  time: string | null;
  keywords: string | null;
  /** 面談官の質問意図 */
  intent: string | null;
  /** 穴埋め式「回答の型」。 HTML 文字列 (class="blank" の span が穴) */
  answer_template: string | null;
  deep1: string | null;
  deep2: string | null;
  deep3: string | null;
  /** 避けたい回答 */
  ng: string | null;
  /** 評価軸 */
  criteria: string | null;
  /** 逆質問 (エンジニア側から聞く質問) */
  is_reverse: boolean;
}

/** 講師が受講者へ割当できる案件種別。 共通カテゴリは割当対象外で常時表示。 */
export const ASSIGNABLE_CATEGORIES = ["PHP/JS", "SQL", "テスト"] as const;
export type AssignableCategory = (typeof ASSIGNABLE_CATEGORIES)[number];

export const COMMON_CATEGORY = "全案件共通";

export function isAssignableCategory(v: unknown): v is AssignableCategory {
  return (
    typeof v === "string" &&
    (ASSIGNABLE_CATEGORIES as readonly string[]).includes(v)
  );
}
```

`packages/shared/src/interview/questions.ts`:

```ts
import raw from "./questions.json";
import type { InterviewQuestion } from "./types.js";

/** 想定質問バンク (188 問)。 正本は questions.json。 */
export const INTERVIEW_QUESTIONS = raw as InterviewQuestion[];
```

- [ ] **Step 3: フィルタの失敗するテストを書く**

`packages/shared/src/interview/filter.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { visibleQuestions } from "./filter.js";
import { INTERVIEW_QUESTIONS } from "./questions.js";

const q = (no: number, category: string) => ({ no, category });

describe("visibleQuestions", () => {
  const all = [
    q(1, "PHP/JS"),
    q(2, "SQL"),
    q(3, "テスト"),
    q(4, "全案件共通"),
  ];

  it("割当なしなら共通カテゴリのみ", () => {
    expect(visibleQuestions(all, []).map((x) => x.no)).toEqual([4]);
  });

  it("割当カテゴリ + 共通を返す", () => {
    expect(visibleQuestions(all, ["PHP/JS"]).map((x) => x.no)).toEqual([1, 4]);
    expect(
      visibleQuestions(all, ["SQL", "テスト"]).map((x) => x.no),
    ).toEqual([2, 3, 4]);
  });

  it("未知の割当カテゴリは無視される (該当行が無いだけ)", () => {
    expect(visibleQuestions(all, ["Java"]).map((x) => x.no)).toEqual([4]);
  });
});

describe("INTERVIEW_QUESTIONS", () => {
  it("188 問で no が一意", () => {
    expect(INTERVIEW_QUESTIONS).toHaveLength(188);
    expect(new Set(INTERVIEW_QUESTIONS.map((d) => d.no)).size).toBe(188);
  });

  it("カテゴリと優先度が既知の値のみ", () => {
    const cats = new Set(INTERVIEW_QUESTIONS.map((d) => d.category));
    expect([...cats].sort()).toEqual(["PHP/JS", "SQL", "テスト", "全案件共通"].sort());
    for (const d of INTERVIEW_QUESTIONS) {
      expect(["A", "B", "C"]).toContain(d.freq);
    }
  });

  /**
   * web は answer_template を `<span class="blank">` で split して React 要素に
   * 変換する (dangerouslySetInnerHTML を使わない)。 他のタグが混ざると素の
   * テキストとして表示されてしまうため、 データ側で不変条件として縛る。
   */
  it("HTML タグは answer_template の blank span のみ", () => {
    for (const d of INTERVIEW_QUESTIONS) {
      for (const [field, value] of Object.entries(d)) {
        if (typeof value !== "string") continue;
        const tags = value.match(/<[^>]+>/g) ?? [];
        const allowed =
          field === "answer_template"
            ? ['<span class="blank">', "</span>"]
            : [];
        for (const tag of tags) {
          expect(allowed, `${field} (no=${d.no}) の ${tag}`).toContain(tag);
        }
      }
    }
  });
});
```

- [ ] **Step 4: テストが失敗することを確認**

Run: `bun run test -- packages/shared/src/interview`
Expected: FAIL (`filter.js` が存在しない)

- [ ] **Step 5: フィルタを実装**

`packages/shared/src/interview/filter.ts`:

```ts
import { COMMON_CATEGORY } from "./types.js";

/**
 * 受講者に見せる質問: 共通カテゴリ + 割当カテゴリのみ。
 * API (D1 行) と web (バンドル済み fixtures) の両方で使うため category だけに依存する。
 */
export function visibleQuestions<T extends { category: string }>(
  all: T[],
  assignedCategories: string[],
): T[] {
  const allowed = new Set([COMMON_CATEGORY, ...assignedCategories]);
  return all.filter((q) => allowed.has(q.category));
}
```

`packages/shared/package.json` の `exports` に追加 (`"./enrollment/access"` の行の後):

```json
    "./interview/types": "./src/interview/types.ts",
    "./interview/questions": "./src/interview/questions.ts",
    "./interview/filter": "./src/interview/filter.ts"
```

- [ ] **Step 6: テストが通ることを確認**

Run: `bun run test -- packages/shared/src/interview`
Expected: PASS (6 tests)

Run: `bun run typecheck`
Expected: エラーなし (resolveJsonModule は tsconfig.base.json で有効)

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/interview packages/shared/package.json
git commit -m "feat(shared): 面談対策の想定質問バンク(188問)と表示フィルタを追加"
```

---

### Task 2: D1 — スキーマ・マイグレーション・seed

**Files:**
- Modify: `apps/api/src/db/schema.ts` (テーブル2枚 + APP_TABLES)
- Create: `apps/api/drizzle/0011_*.sql` (`db:generate` が生成)
- Modify: `packages/shared/scripts/export-seed-sql.ts` (質問バンクの upsert/prune)

**Interfaces:**
- Consumes: Task 1 の `INTERVIEW_QUESTIONS` (`../src/interview/questions.js`)
- Produces: Drizzle テーブル `interviewQuestions` (列: `id, tenantId, no, category, subcategory, freq, question, time, keywords, intent, answerTemplate, deep1, deep2, deep3, ng, criteria, isReverse, createdAt, updatedAt`)、`interviewPrepAssignments` (列: `id, tenantId, profileId, categories(JSON string[]), assignedBy, updatedAt`)

- [ ] **Step 1: schema.ts にテーブルを追加**

`apps/api/src/db/schema.ts` の「監査ログ」セクションの前に追加:

```ts
// ---------------------------------------------------------------
// 面談対策 (Interview Prep)
// ---------------------------------------------------------------

/**
 * 面談対策の想定質問バンク。 正本はリポジトリの
 * `packages/shared/src/interview/questions.json` で、 seed が upsert/prune する
 * (教材コースと同じ運用 — CMS 編集 UI は無い)。
 */
export const interviewQuestions = sqliteTable(
  "interview_questions",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    no: integer("no").notNull(),
    category: text("category").notNull(),
    subcategory: text("subcategory").notNull(),
    freq: text("freq", { enum: ["A", "B", "C"] }).notNull(),
    question: text("question").notNull(),
    time: text("time"),
    keywords: text("keywords"),
    intent: text("intent"),
    answerTemplate: text("answer_template"),
    deep1: text("deep1"),
    deep2: text("deep2"),
    deep3: text("deep3"),
    ng: text("ng"),
    criteria: text("criteria"),
    isReverse: integer("is_reverse", { mode: "boolean" }).notNull().default(false),
    createdAt: tsNow("created_at"),
    updatedAt: tsNowUpd("updated_at"),
  },
  (t) => ({
    tenantNoUnique: uniqueIndex("interview_questions_tenant_no_uq").on(t.tenantId, t.no),
  }),
);

/** 受講者ごとの面談対策カテゴリ割当。 共通カテゴリは割当に含めず常時表示。 */
export const interviewPrepAssignments = sqliteTable(
  "interview_prep_assignments",
  {
    id: uuid(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    categories: json<string[]>("categories", []),
    assignedBy: text("assigned_by"),
    updatedAt: tsNowUpd("updated_at"),
  },
  (t) => ({
    tenantProfileUnique: uniqueIndex("interview_prep_assignments_tenant_profile_uq").on(
      t.tenantId,
      t.profileId,
    ),
  }),
);
```

`APP_TABLES` 配列 (`"support_inquiries"` の後) に追加:

```ts
  "interview_questions",
  "interview_prep_assignments",
```

- [ ] **Step 2: マイグレーションを生成して適用**

```bash
bun run --filter=@stella/api db:generate
```

Expected: `apps/api/drizzle/0011_*.sql` が生成され、`CREATE TABLE interview_questions` / `interview_prep_assignments` と 2 つの UNIQUE INDEX を含む。

```bash
bun run --filter=@stella/api db:migrate
```

Expected: `1 migration applied` 相当の出力。

- [ ] **Step 3: export-seed-sql.ts に質問バンクの emit を追加**

`packages/shared/scripts/export-seed-sql.ts`:

import 追加 (`findAssignment` の import の近く):

```ts
import { INTERVIEW_QUESTIONS } from "../src/interview/questions.js";
```

関数を追加 (`emitQuiz` の後):

```ts
/** 面談対策の想定質問バンク (upsert + prune)。 questions.json が正本。 */
function emitInterviewQuestions(tenantId: string) {
  const ids: string[] = [];
  const bool = (v: boolean) => (isSqlite ? (v ? "1" : "0") : v ? "true" : "false");
  const opt = (v: string | null) => (v ? strLit(v) : "null");
  for (const q of INTERVIEW_QUESTIONS) {
    const id = stableUuid(`interview-q:${tenantId}:${q.no}`);
    ids.push(id);
    lines.push(
      `insert into ${tbl("interview_questions")} (id, tenant_id, no, category, subcategory, freq, question, time, keywords, intent, answer_template, deep1, deep2, deep3, ng, criteria, is_reverse${isSqlite ? ", created_at, updated_at" : ""}) values ('${id}', '${esc(tenantId)}', ${q.no}, ${strLit(q.category)}, ${strLit(q.subcategory)}, '${q.freq}', ${strLit(q.question)}, ${opt(q.time)}, ${opt(q.keywords)}, ${opt(q.intent)}, ${opt(q.answer_template)}, ${opt(q.deep1)}, ${opt(q.deep2)}, ${opt(q.deep3)}, ${opt(q.ng)}, ${opt(q.criteria)}, ${bool(q.is_reverse)}${isSqlite ? `, ${nowExpr()}, ${nowExpr()}` : ""}) on conflict (id) do update set category = excluded.category, subcategory = excluded.subcategory, freq = excluded.freq, question = excluded.question, time = excluded.time, keywords = excluded.keywords, intent = excluded.intent, answer_template = excluded.answer_template, deep1 = excluded.deep1, deep2 = excluded.deep2, deep3 = excluded.deep3, ng = excluded.ng, criteria = excluded.criteria, is_reverse = excluded.is_reverse, updated_at = ${nowExpr()};`,
    );
  }
  lines.push(
    `delete from ${tbl("interview_questions")} where tenant_id = '${esc(tenantId)}' and id not in (${sqlIn(ids)});`,
  );
}
```

呼び出しを追加 (`for (const c of COACH_COURSES) emitCourse("coach", c);` の直後 — CONTENT_ONLY でも実行される位置):

```ts
emitInterviewQuestions("ses");
```

- [ ] **Step 4: seed を流して行数を確認**

```bash
bun run --filter=@stella/api db:seed
```

```bash
cd apps/api; bunx wrangler d1 execute falcon-db --local --command "select count(*) as n, sum(is_reverse) as reverse from interview_questions; select count(*) from interview_prep_assignments;"
```

Expected: `n = 188`, `reverse = 11`、assignments は 0 行。もう一度 `db:seed` を流しても 188 のまま (べき等)。

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/db/schema.ts apps/api/drizzle packages/shared/scripts/export-seed-sql.ts
git commit -m "feat(api): 面談対策の質問バンクと割当テーブルを追加しseedで投入する"
```

---

### Task 3: API — /api/interview-prep ルート

**Files:**
- Create: `apps/api/src/routes/interview-prep.ts`
- Modify: `apps/api/src/index.ts` (mount)
- Modify: `packages/shared/src/admin/audit-actions.ts` (action ラベル追加)

**Interfaces:**
- Consumes: Task 1 の `ASSIGNABLE_CATEGORIES` / `COMMON_CATEGORY` / `isAssignableCategory` / `visibleQuestions` (`@stella/shared/interview/*`)、Task 2 の Drizzle テーブル。
- Produces:
  - `GET /api/interview-prep/questions` → `{ rows: InterviewQuestion[], assignedCategories: string[] }` (受講者: 割当+共通のみ / staff: 全件 + 全カテゴリ)
  - `GET /api/interview-prep/assignments` → `{ rows: { profile_id, display_name, email, categories }[] }` (staff のみ、テナント内の student 全員)
  - `PUT /api/interview-prep/assignments/:profileId` body `{ categories: string[] }` → `{ ok: true }` (staff のみ)

- [ ] **Step 1: audit action を登録**

`packages/shared/src/admin/audit-actions.ts` の `LABELS` に追加 (`r2_orphan_cleanup` の後):

```ts
  // 面談対策
  interview_prep_assign: "面談対策の割当",
```

- [ ] **Step 2: ルートを実装**

`apps/api/src/routes/interview-prep.ts`:

```ts
/**
 * 面談対策 (Interview Prep) API。
 *
 * アプリ層認可:
 *   - 受講者: 割当カテゴリ + 全案件共通の質問のみ read
 *   - staff (instructor/admin/platform_admin): 質問全件 read、 割当の read/write
 */

import { Hono } from "hono";
import { and, asc, eq } from "drizzle-orm";

import {
  ASSIGNABLE_CATEGORIES,
  isAssignableCategory,
} from "@stella/shared/interview/types";
import { visibleQuestions } from "@stella/shared/interview/filter";

import { interviewPrepAssignments, interviewQuestions, profiles } from "../db/schema.js";
import {
  ApiError,
  errorResponse,
  getCaller,
  isStaffRole,
  requireRole,
} from "../lib/authz.js";
import { clientIp, recordAudit } from "../lib/audit.js";
import type { Env } from "../env.js";

export const interviewPrepRoute = new Hono<{ Bindings: Env }>();

const Q_SELECT = {
  no: interviewQuestions.no,
  category: interviewQuestions.category,
  subcategory: interviewQuestions.subcategory,
  freq: interviewQuestions.freq,
  question: interviewQuestions.question,
  time: interviewQuestions.time,
  keywords: interviewQuestions.keywords,
  intent: interviewQuestions.intent,
  answer_template: interviewQuestions.answerTemplate,
  deep1: interviewQuestions.deep1,
  deep2: interviewQuestions.deep2,
  deep3: interviewQuestions.deep3,
  ng: interviewQuestions.ng,
  criteria: interviewQuestions.criteria,
  is_reverse: interviewQuestions.isReverse,
} as const;

/** 質問一覧。 受講者は割当カテゴリ + 共通のみ、 staff は全件。 */
interviewPrepRoute.get("/api/interview-prep/questions", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const rows = await db
      .select(Q_SELECT)
      .from(interviewQuestions)
      .where(eq(interviewQuestions.tenantId, caller.tenantId))
      .orderBy(asc(interviewQuestions.no));
    if (isStaffRole(caller.role)) {
      return c.json({ rows, assignedCategories: [...ASSIGNABLE_CATEGORIES] });
    }
    const assigned = await db
      .select({ categories: interviewPrepAssignments.categories })
      .from(interviewPrepAssignments)
      .where(
        and(
          eq(interviewPrepAssignments.tenantId, caller.tenantId),
          eq(interviewPrepAssignments.profileId, caller.id),
        ),
      )
      .limit(1);
    const categories = assigned[0]?.categories ?? [];
    return c.json({
      rows: visibleQuestions(rows, categories),
      assignedCategories: categories,
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** staff: テナント内の受講者一覧 + 割当カテゴリ (割当管理画面用)。 */
interviewPrepRoute.get("/api/interview-prep/assignments", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const students = await db
      .select({
        profile_id: profiles.id,
        display_name: profiles.displayName,
        email: profiles.email,
      })
      .from(profiles)
      .where(
        and(
          eq(profiles.tenantId, caller.tenantId),
          eq(profiles.role, "student"),
          eq(profiles.disabled, false),
        ),
      )
      .orderBy(asc(profiles.displayName));
    const assignments = await db
      .select({
        profile_id: interviewPrepAssignments.profileId,
        categories: interviewPrepAssignments.categories,
      })
      .from(interviewPrepAssignments)
      .where(eq(interviewPrepAssignments.tenantId, caller.tenantId));
    const byProfile = new Map(assignments.map((a) => [a.profile_id, a.categories]));
    return c.json({
      rows: students.map((s) => ({
        ...s,
        categories: byProfile.get(s.profile_id) ?? [],
      })),
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** staff: 受講者の割当カテゴリを upsert する。 */
interviewPrepRoute.put("/api/interview-prep/assignments/:profileId", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const profileId = c.req.param("profileId");
    const body = (await c.req.json()) as { categories?: unknown };
    if (
      !Array.isArray(body.categories) ||
      !body.categories.every(isAssignableCategory)
    ) {
      throw new ApiError(
        `categories は ${ASSIGNABLE_CATEGORIES.join(" / ")} の配列で指定してください`,
        400,
      );
    }
    const target = await db
      .select({ id: profiles.id, tenantId: profiles.tenantId })
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1);
    if (!target[0] || target[0].tenantId !== caller.tenantId) {
      throw new ApiError("対象の受講者が見つかりません", 404);
    }
    const categories = [...new Set(body.categories)];
    await db
      .insert(interviewPrepAssignments)
      .values({
        tenantId: caller.tenantId,
        profileId,
        categories,
        assignedBy: caller.id,
      })
      .onConflictDoUpdate({
        target: [interviewPrepAssignments.tenantId, interviewPrepAssignments.profileId],
        set: { categories, assignedBy: caller.id, updatedAt: new Date() },
      });
    await recordAudit(db, caller, {
      action: "interview_prep_assign",
      targetType: "interview_prep_assignment",
      targetId: profileId,
      ip: clientIp(c),
      metadata: { categories },
    });
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});
```

- [ ] **Step 3: index.ts にマウント**

`apps/api/src/index.ts`:

```ts
import { interviewPrepRoute } from "./routes/interview-prep.js";
```

`app.route("/", enrollmentsRoute);` の後に:

```ts
app.route("/", interviewPrepRoute);
```

- [ ] **Step 4: typecheck**

Run: `bun run typecheck`
Expected: エラーなし。

- [ ] **Step 5: dev:api を起動して手動検証**

`apps/api/.dev.vars` の `AUTH_JWT_SECRET` を使い JWT を発行 (jose は apps/api の依存に入っている):

```bash
cd apps/api; bun -e "
import { SignJWT } from 'jose';
const secretLine = (await Bun.file('.dev.vars').text()).split(/\r?\n/).find(l => l.startsWith('AUTH_JWT_SECRET='));
const secret = new TextEncoder().encode(secretLine.split('=')[1].trim().replace(/^\"|\"$/g, ''));
for (const sub of ['seed-learner', 'seed-instructor']) {
  const jwt = await new SignJWT({}).setProtectedHeader({ alg: 'HS256' })
    .setIssuer('falcon-api').setAudience('falcon-web').setSubject(sub)
    .setIssuedAt().setExpirationTime('2h').sign(secret);
  console.log(sub + '=' + jwt);
}
"
```

`bun run dev:api` を起動した状態で (以下 `$LEARNER` / `$INSTRUCTOR` は上の出力):

1. 未割当の受講者 → 共通のみ:
   `curl -s -H "Authorization: Bearer $LEARNER" http://127.0.0.1:8787/api/interview-prep/questions`
   Expected: `rows` が 50 件 (全て `"category":"全案件共通"`)、`assignedCategories: []`
2. 受講者が割当 API → 403:
   `curl -s -X PUT -H "Authorization: Bearer $LEARNER" -H "Content-Type: application/json" -d '{"categories":["SQL"]}' http://127.0.0.1:8787/api/interview-prep/assignments/seed-learner`
   Expected: `{"error":"権限がありません"}` (403)
3. 講師が割当:
   `curl -s -X PUT -H "Authorization: Bearer $INSTRUCTOR" -H "Content-Type: application/json" -d '{"categories":["SQL"]}' http://127.0.0.1:8787/api/interview-prep/assignments/seed-learner`
   Expected: `{"ok":true}`
4. 割当後の受講者 → 共通 + SQL:
   `curl -s -H "Authorization: Bearer $LEARNER" http://127.0.0.1:8787/api/interview-prep/questions`
   Expected: `rows` が 96 件 (共通50 + SQL46)、`assignedCategories: ["SQL"]`
5. 不正カテゴリ → 400:
   `curl -s -X PUT -H "Authorization: Bearer $INSTRUCTOR" -H "Content-Type: application/json" -d '{"categories":["Java"]}' http://127.0.0.1:8787/api/interview-prep/assignments/seed-learner`
   Expected: 400 `{"error":"categories は PHP/JS / SQL / テスト の配列で指定してください"}`
6. 講師の一覧:
   `curl -s -H "Authorization: Bearer $INSTRUCTOR" http://127.0.0.1:8787/api/interview-prep/assignments`
   Expected: `rows` に `seed-learner` が含まれ `categories: ["SQL"]`

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/interview-prep.ts apps/api/src/index.ts packages/shared/src/admin/audit-actions.ts
git commit -m "feat(api): 面談対策の質問取得・割当APIを追加"
```

---

### Task 4: web — ナビ・ルート・受講者画面(一覧 / ランダム出題)

**Files:**
- Create: `apps/web/src/lib/interview-prep-api.ts`
- Create: `apps/web/src/components/learner/InterviewPrep.tsx`
- Create: `apps/web/src/routes/_app/interview-prep.tsx`
- Modify: `apps/web/src/components/shell/Sidebar.tsx` (NavId + NAV)
- Modify: `apps/web/src/components/shell/AppShell.tsx` (PAGE_LABELS / PATH_BY_PAGE)

**Interfaces:**
- Consumes: Task 1 の `InterviewQuestion` / `INTERVIEW_QUESTIONS` / `visibleQuestions` / `ASSIGNABLE_CATEGORIES` / `COMMON_CATEGORY`、Task 3 の API。
- Produces: `fetchInterviewQuestions(): Promise<{rows, assignedCategories}>`、`listInterviewPrepAssignments()`、`saveInterviewPrepAssignment(profileId, categories)` (Task 5 が使用)。`InterviewPrepPage({ backendEnabled }: { backendEnabled: boolean })` コンポーネント。

- [ ] **Step 1: API クライアントを書く**

`apps/web/src/lib/interview-prep-api.ts`:

```ts
/**
 * 面談対策 (Interview Prep) のデータアクセス層。 認可はサーバ側:
 *   - 受講者: 割当カテゴリ + 共通の質問のみ返る
 *   - staff: 全件 + 割当の read/write
 */

import type { InterviewQuestion } from "@stella/shared/interview/types";
import { apiFetch } from "./api-client";

export interface InterviewQuestionsResult {
  rows: InterviewQuestion[];
  /** 受講者: 自分の割当。 staff: 全カテゴリ。 */
  assignedCategories: string[];
}

export async function fetchInterviewQuestions(): Promise<InterviewQuestionsResult> {
  return apiFetch<InterviewQuestionsResult>("/api/interview-prep/questions");
}

export interface InterviewPrepAssignmentRow {
  profile_id: string;
  display_name: string;
  email: string | null;
  categories: string[];
}

export async function listInterviewPrepAssignments(): Promise<
  InterviewPrepAssignmentRow[]
> {
  const { rows } = await apiFetch<{ rows: InterviewPrepAssignmentRow[] }>(
    "/api/interview-prep/assignments",
  );
  return rows ?? [];
}

export async function saveInterviewPrepAssignment(
  profileId: string,
  categories: string[],
): Promise<void> {
  await apiFetch(
    `/api/interview-prep/assignments/${encodeURIComponent(profileId)}`,
    { method: "PUT", body: { categories } },
  );
}
```

- [ ] **Step 2: 受講者画面を書く**

`apps/web/src/components/learner/InterviewPrep.tsx`。上司提案シートの2モードを移植する。設計要点:

- データ取得: `backendEnabled` なら `fetchInterviewQuestions()`、未設定 (デモ) なら `INTERVIEW_QUESTIONS` 全件 + 全カテゴリ扱い。
- フィルタ state: `cat`(初期 `'ALL'`。チップは割当カテゴリ + 共通のみ表示) / `freq`(初期 `'A'`) / `query`。
- `answer_template` は `<span class="blank">…</span>` で split して穴だけスタイル付き span、他は素のテキストとして React 要素で描画する (`dangerouslySetInnerHTML` は使わない)。データ中の HTML タグはこの span のみ (Task 1 のテストで担保)。
- ランダム出題: フィルタ後プールから `no` の配列をシャッフルし、1問ずつ表示 → タイマー (1秒 interval、スタート/一時停止/リセット) → 「回答例を表示」で開示 → 前へ/次へ/シャッフル。

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Loader2, ChevronDown, ChevronRight, Play, Pause, X } from '@/lib/icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { InterviewQuestion } from '@stella/shared/interview/types';
import {
  ASSIGNABLE_CATEGORIES,
  COMMON_CATEGORY,
} from '@stella/shared/interview/types';
import { INTERVIEW_QUESTIONS } from '@stella/shared/interview/questions';
import { fetchInterviewQuestions } from '@/lib/interview-prep-api';
import { cn } from '@/lib/utils';

type Freq = 'ALL' | 'A' | 'B' | 'C';
const FREQ_LABELS: Record<Exclude<Freq, 'ALL'>, string> = {
  A: 'A 必修',
  B: 'B 推奨',
  C: 'C 参考',
};

/**
 * 回答の型を描画する。 `<span class="blank">…</span>` が「自分の経験で埋める穴」で、
 * データ中の HTML タグはこれのみ (packages/shared のテストで担保)。 split の
 * 奇数インデックスがキャプチャ = 穴の中身。
 */
function AnswerTemplate({ template }: { template: string }) {
  const parts = template.split(/<span class="blank">(.*?)<\/span>/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: split 結果は位置が同一性
            key={i}
            className="px-1.5 py-px rounded-sm bg-brand/10 text-brand font-bold"
          >
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

function shuffle(nos: number[]): number[] {
  const a = [...nos];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function Chip({ active, children, onClick }: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-2.5 py-1 rounded-full text-[12px] border cursor-pointer transition-colors',
        active
          ? 'bg-brand text-white border-brand'
          : 'bg-card text-ink-2 border-border hover:bg-sunken',
      )}
    >
      {children}
    </button>
  );
}

export function InterviewPrepPage({ backendEnabled }: { backendEnabled: boolean }) {
  const [rows, setRows] = useState<InterviewQuestion[]>([]);
  const [assigned, setAssigned] = useState<string[]>([]);
  const [loading, setLoading] = useState(backendEnabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!backendEnabled) {
      // デモ (fixtures) モード: 全件表示
      setRows(INTERVIEW_QUESTIONS);
      setAssigned([...ASSIGNABLE_CATEGORIES]);
      return;
    }
    let cancelled = false;
    fetchInterviewQuestions()
      .then((r) => {
        if (cancelled) return;
        setRows(r.rows);
        setAssigned(r.assignedCategories);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [backendEnabled]);

  const [mode, setMode] = useState<'list' | 'quiz'>('list');
  const [cat, setCat] = useState<string>('ALL');
  const [freq, setFreq] = useState<Freq>('A');
  const [query, setQuery] = useState('');

  // 表示対象カテゴリのチップ: 割当カテゴリが 1 つ以上あるときだけ出す
  const catChips = useMemo(() => {
    const cats = [...assigned, COMMON_CATEGORY].filter((c) =>
      rows.some((r) => r.category === c),
    );
    return cats.length > 1 ? cats : [];
  }, [assigned, rows]);

  const pool = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((d) => {
      if (cat !== 'ALL' && d.category !== cat) return false;
      if (freq !== 'ALL' && d.freq !== freq) return false;
      if (!q) return true;
      return [d.question, d.keywords, d.subcategory, d.intent].some(
        (v) => v && v.toLowerCase().includes(q),
      );
    });
  }, [rows, cat, freq, query]);

  if (loading) {
    return (
      <Card className="p-12 flex items-center justify-center gap-2 text-sm text-ink-3">
        <Loader2 size={16} className="animate-spin" />
        読み込み中…
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="p-12 text-center text-sm text-destructive">
        想定質問の取得に失敗しました: {error}
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        title="面談対策"
        sub={`クライアント面談の想定質問 ${rows.length} 問 — 回答の型に自分の経験を当てはめて、声に出して練習しましょう`}
      />

      {/* モード切替 */}
      <div className="flex items-center gap-1.5 mb-3">
        {(
          [
            ['list', '一覧'],
            ['quiz', 'ランダム出題'],
          ] as const
        ).map(([key, label]) => (
          <Chip key={key} active={mode === key} onClick={() => setMode(key)}>
            {label}
          </Chip>
        ))}
      </div>

      {/* フィルタ */}
      <Card className="p-3 mb-4 flex flex-col gap-2">
        {catChips.length > 0 ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-ink-4 w-14">案件種別</span>
            <Chip active={cat === 'ALL'} onClick={() => setCat('ALL')}>
              すべて
            </Chip>
            {catChips.map((c) => (
              <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
                {c}
              </Chip>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-ink-4 w-14">優先度</span>
          <Chip active={freq === 'ALL'} onClick={() => setFreq('ALL')}>
            すべて
          </Chip>
          {(Object.keys(FREQ_LABELS) as Array<Exclude<Freq, 'ALL'>>).map((f) => (
            <Chip key={f} active={freq === f} onClick={() => setFreq(f)}>
              {FREQ_LABELS[f]}
            </Chip>
          ))}
          <span className="ml-auto text-[12px] text-ink-3">該当 {pool.length} 問</span>
        </div>
        {mode === 'list' ? (
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="質問文・キーワードで検索"
            className="h-8 text-[13px]"
          />
        ) : null}
      </Card>

      {pool.length === 0 ? (
        <Card className="p-12 text-center text-sm text-ink-3">
          条件に合う質問がありません。フィルターを緩めてください。
        </Card>
      ) : mode === 'list' ? (
        <QuestionList pool={pool} />
      ) : (
        <QuizMode pool={pool} />
      )}
    </>
  );
}

function FreqBadge({ freq }: { freq: 'A' | 'B' | 'C' }) {
  return (
    <span
      className={cn(
        'text-[10.5px] px-1.5 py-[1px] rounded font-semibold shrink-0',
        freq === 'A'
          ? 'bg-destructive/10 text-destructive'
          : freq === 'B'
            ? 'border border-border text-ink-2'
            : 'bg-muted text-ink-3',
      )}
    >
      {FREQ_LABELS[freq]}
    </span>
  );
}

/** 一覧モード: アコーディオンで 意図 → 回答の型 → 深掘り → NG → 評価軸。 */
function QuestionList({ pool }: { pool: InterviewQuestion[] }) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  return (
    <div className="flex flex-col gap-2">
      {pool.map((d) => (
        <Card key={d.no} className="p-0 overflow-hidden">
          <button
            type="button"
            className="w-full text-left p-3.5 flex items-start gap-2.5 cursor-pointer hover:bg-sunken transition-colors"
            onClick={() => setOpen((s) => ({ ...s, [d.no]: !s[d.no] }))}
          >
            <FreqBadge freq={d.freq} />
            {d.is_reverse ? (
              <span className="text-[10.5px] px-1.5 py-[1px] rounded bg-brand/10 text-brand font-semibold shrink-0">
                聞く質問
              </span>
            ) : null}
            <span className="flex-1 min-w-0">
              <span className="block text-[13.5px] font-medium">{d.question}</span>
              <span className="block text-[11.5px] text-ink-4 mt-0.5">
                {d.category} ・ {d.subcategory}
                {d.time ? ` ・ 目安 ${d.time}` : ''}
              </span>
            </span>
            {open[d.no] ? (
              <ChevronDown size={15} className="shrink-0 mt-1 text-ink-4" />
            ) : (
              <ChevronRight size={15} className="shrink-0 mt-1 text-ink-4" />
            )}
          </button>
          {open[d.no] ? <QuestionDetail d={d} /> : null}
        </Card>
      ))}
    </div>
  );
}

function DetailBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4 mb-1">
        {label}
      </div>
      <div className="text-[13px] leading-relaxed">{children}</div>
    </div>
  );
}

function QuestionDetail({ d }: { d: InterviewQuestion }) {
  const deeps = [d.deep1, d.deep2, d.deep3].filter((v): v is string => Boolean(v));
  const [shownDeeps, setShownDeeps] = useState<Record<number, boolean>>({});
  return (
    <div className="border-t border-border p-3.5 flex flex-col gap-3 bg-sunken/40">
      {d.intent ? <DetailBlock label="Intent ・ 質問の意図">{d.intent}</DetailBlock> : null}
      {d.is_reverse ? (
        <p className="text-[12px] text-ink-3">
          これはあなたが面談官に「聞く」質問です。回答準備ではなく、質問文自体を覚えておきましょう。
        </p>
      ) : null}
      {d.answer_template ? (
        <DetailBlock label={d.is_reverse ? 'Prep ・ 準備のポイント' : 'Answer ・ 回答の型'}>
          <AnswerTemplate template={d.answer_template} />
        </DetailBlock>
      ) : null}
      {!d.is_reverse && deeps.length > 0 ? (
        <DetailBlock label="Follow-up ・ 深掘り対応（答えてから開く）">
          <div className="flex flex-col gap-1.5">
            {deeps.map((t, i) => (
              <div key={t}>
                <button
                  type="button"
                  className="text-[12px] text-brand underline underline-offset-2 cursor-pointer"
                  onClick={() => setShownDeeps((s) => ({ ...s, [i]: !s[i] }))}
                >
                  深掘り{'①②③'[i]} {shownDeeps[i] ? 'を閉じる' : 'を見る'}
                </button>
                {shownDeeps[i] ? <p className="mt-1">{t}</p> : null}
              </div>
            ))}
          </div>
        </DetailBlock>
      ) : null}
      {d.ng ? <DetailBlock label="Avoid ・ 避けたい回答">{d.ng}</DetailBlock> : null}
      {d.criteria ? <DetailBlock label="Criteria ・ 評価軸">{d.criteria}</DetailBlock> : null}
    </div>
  );
}

/** ランダム出題モード: タイマー付きフラッシュカード。 */
function QuizMode({ pool }: { pool: InterviewQuestion[] }) {
  const [order, setOrder] = useState<number[]>(() => shuffle(pool.map((d) => d.no)));
  const [qi, setQi] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sec, setSec] = useState(0);
  const [running, setRunning] = useState(false);

  // フィルタが変わったら出題順を作り直す
  useEffect(() => {
    setOrder(shuffle(pool.map((d) => d.no)));
    setQi(0);
    setRevealed(false);
    setSec(0);
    setRunning(false);
  }, [pool]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const cur = pool.find((d) => d.no === order[qi % Math.max(order.length, 1)]);
  if (!cur) return null;

  const fmt = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
  const move = (delta: number) => {
    setQi((i) => (i + delta + order.length) % order.length);
    setRevealed(false);
    setSec(0);
    setRunning(false);
  };

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between text-[12px] text-ink-3">
        <span>
          {(qi % order.length) + 1} / {order.length}
        </span>
        <span>
          {cur.category} ・ {cur.subcategory}
          {cur.time ? ` ・ 目安 ${cur.time}` : ''}
        </span>
      </div>

      <div className="flex items-start gap-2.5">
        <FreqBadge freq={cur.freq} />
        <p className="text-[15px] font-medium leading-relaxed flex-1">{cur.question}</p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[20px] font-semibold tabular-nums">{fmt(sec)}</span>
        <button
          type="button"
          className="px-2.5 py-1 rounded-sm border border-border text-[12px] cursor-pointer hover:bg-sunken inline-flex items-center gap-1"
          onClick={() => setRunning((v) => !v)}
        >
          {running ? <Pause size={12} /> : <Play size={12} />}
          {running ? '一時停止' : sec > 0 ? '再開' : 'スタート'}
        </button>
        <button
          type="button"
          className="px-2.5 py-1 rounded-sm border border-border text-[12px] cursor-pointer hover:bg-sunken inline-flex items-center gap-1"
          onClick={() => {
            setSec(0);
            setRunning(false);
          }}
        >
          <X size={12} />
          リセット
        </button>
      </div>

      {!revealed ? (
        <button
          type="button"
          className="p-4 rounded-sm border border-dashed border-border text-[13px] text-ink-3 cursor-pointer hover:bg-sunken"
          onClick={() => {
            setRevealed(true);
            setRunning(false);
          }}
        >
          まず声に出して答える → 回答例を表示
        </button>
      ) : (
        <QuestionDetail d={cur} />
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="px-3 py-1.5 rounded-sm border border-border text-[12.5px] cursor-pointer hover:bg-sunken"
          onClick={() => move(-1)}
        >
          前の問題
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-sm bg-brand text-white text-[12.5px] cursor-pointer hover:opacity-90"
          onClick={() => move(1)}
        >
          次の問題
        </button>
        <button
          type="button"
          className="ml-auto text-[12px] text-ink-3 underline underline-offset-2 cursor-pointer"
          onClick={() => {
            setOrder(shuffle(pool.map((d) => d.no)));
            setQi(0);
            setRevealed(false);
            setSec(0);
            setRunning(false);
          }}
        >
          出題順をシャッフルし直す
        </button>
      </div>
    </Card>
  );
}
```

実装時の注意:
- `PageHeader` の props は既存利用箇所 (`InstructorGeneric.tsx` の `<PageHeader title=... sub=... />`) に合わせる。
- `bg-brand/10` `text-brand` `text-ink-2` 等の Tailwind トークンは既存コンポーネント (`Sidebar.tsx` / `InstructorGeneric.tsx`) で使われているものに合わせる。存在しないトークンを使わないこと。
- `biome-ignore` コメントが不要 (該当ルールが無効) なら削除する。

- [ ] **Step 3: ルートファイルとナビを追加**

`apps/web/src/routes/_app/interview-prep.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useAppShell } from '@/components/shell/app-shell-context';
import { RoleGuard } from '@/components/shell/RoleGuard';
import { InterviewPrepPage } from '@/components/learner/InterviewPrep';

export const Route = createFileRoute('/_app/interview-prep')({
  component: InterviewPrep,
});

function InterviewPrep() {
  const s = useAppShell();
  return (
    <RoleGuard allow={['learner']} page="interview-prep">
      <InterviewPrepPage backendEnabled={s.backendEnabled} />
    </RoleGuard>
  );
}
```

(Task 5 でロール分岐を足すまでは learner 専用。)

`apps/web/src/components/shell/Sidebar.tsx`:
- `NavId` union に `'interview-prep'` を追加 (`'cert'` の後)。
- `NAV.learner` の `cert` の前に追加:

```ts
    { id: 'interview-prep', label: '面談対策', icon: MessageCircle },
```

- import に `MessageCircle` を追加 (`@/lib/icons` に既存)。

`apps/web/src/components/shell/AppShell.tsx`:
- `PAGE_LABELS` に `'interview-prep': '面談対策',` を追加 (`cert` の行の後)。
- `PATH_BY_PAGE` に `'interview-prep': '/interview-prep',` を追加 (`cert` の行の後)。
- (`pageKeyFromPath` は `PATH_BY_PAGE` の逆引きで自動解決されるため変更不要。)

- [ ] **Step 4: routeTree を再生成して typecheck**

```bash
cd apps/web; bunx vite build
```

Expected: `src/routeTree.gen.ts` に `/_app/interview-prep` が入りビルド成功。

```bash
bun run typecheck; bun run lint
```

Expected: エラーなし。

- [ ] **Step 5: ブラウザで受講者動線を手動確認**

前提: `dev:api` 起動済み + Task 3 の割当 (`seed-learner` に `["SQL"]`) 済み。`bun run dev` (:5173) を起動し、seed-learner の JWT を **localhost:5173 の origin 上で** `localStorage.setItem('falcon_auth_token_v1', '<JWT>')` してリロード。

確認項目:
1. サイドバーに「面談対策」が表示され、クリックで `/interview-prep` に遷移。パンくずが「面談対策」。
2. 初期表示は「A 必修」フィルタで、SQL + 共通のみ (カテゴリチップに PHP/JS・テスト が出ない)。
3. 質問カードを開くと 意図 → 回答の型 (穴がハイライト) → 深掘り(個別開閉) → NG → 評価軸 が出る。逆質問は「聞く質問」バッジ。
4. ランダム出題タブ: タイマー動作、「回答例を表示」で開示、前へ/次へ/シャッフル、フィルタ変更でプールが変わる。
5. 既存画面 (ダッシュボード / コース / 修了証) の表示が壊れていない。

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/interview-prep-api.ts apps/web/src/components/learner/InterviewPrep.tsx apps/web/src/routes/_app/interview-prep.tsx apps/web/src/components/shell/Sidebar.tsx apps/web/src/components/shell/AppShell.tsx apps/web/src/routeTree.gen.ts
git commit -m "feat(web): 面談対策ページ(一覧/ランダム出題)を受講者ナビに追加"
```

---

### Task 5: web — staff 割当管理画面

**Files:**
- Create: `apps/web/src/components/instructor/InterviewPrepAssignments.tsx`
- Modify: `apps/web/src/routes/_app/interview-prep.tsx` (ロール分岐)
- Modify: `apps/web/src/components/shell/Sidebar.tsx` (instructor NAV)

**Interfaces:**
- Consumes: Task 4 の `listInterviewPrepAssignments` / `saveInterviewPrepAssignment`、Task 1 の `ASSIGNABLE_CATEGORIES`。

- [ ] **Step 1: 割当管理画面を書く**

`apps/web/src/components/instructor/InterviewPrepAssignments.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from '@/lib/icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { ASSIGNABLE_CATEGORIES } from '@stella/shared/interview/types';
import {
  listInterviewPrepAssignments,
  saveInterviewPrepAssignment,
  type InterviewPrepAssignmentRow,
} from '@/lib/interview-prep-api';

export function InterviewPrepAssignmentsPage({
  backendEnabled,
}: {
  backendEnabled: boolean;
}) {
  const [rows, setRows] = useState<InterviewPrepAssignmentRow[]>([]);
  const [loading, setLoading] = useState(backendEnabled);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!backendEnabled) return;
    let cancelled = false;
    listInterviewPrepAssignments()
      .then((r) => {
        if (!cancelled) setRows(r);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [backendEnabled]);

  const toggle = async (row: InterviewPrepAssignmentRow, category: string) => {
    const next = row.categories.includes(category)
      ? row.categories.filter((c) => c !== category)
      : [...row.categories, category];
    const prev = rows;
    // 楽観更新 → 失敗時ロールバック
    setRows((rs) =>
      rs.map((r) =>
        r.profile_id === row.profile_id ? { ...r, categories: next } : r,
      ),
    );
    setSavingId(row.profile_id);
    try {
      await saveInterviewPrepAssignment(row.profile_id, next);
      toast(`${row.display_name} の面談対策を更新しました`);
    } catch (e) {
      setRows(prev);
      toast.error(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="面談対策の割当"
        sub="受講者ごとに対策する案件種別を設定します。全案件共通の質問は常に全員へ表示されます"
      />
      {!backendEnabled ? (
        <Card className="p-12 text-center text-sm text-ink-3">
          デモモードでは割当を編集できません。
        </Card>
      ) : loading ? (
        <Card className="p-12 flex items-center justify-center gap-2 text-sm text-ink-3">
          <Loader2 size={16} className="animate-spin" />
          読み込み中…
        </Card>
      ) : error ? (
        <Card className="p-12 text-center text-sm text-destructive">
          受講者一覧の取得に失敗しました: {error}
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>受講者</TableHead>
                {ASSIGNABLE_CATEGORIES.map((c) => (
                  <TableHead key={c} className="text-center w-28">
                    {c}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.profile_id}>
                  <TableCell>
                    <div className="text-[13px] font-medium">{row.display_name}</div>
                    <div className="text-[11.5px] text-ink-4">{row.email ?? ''}</div>
                  </TableCell>
                  {ASSIGNABLE_CATEGORIES.map((c) => (
                    <TableCell key={c} className="text-center">
                      <input
                        type="checkbox"
                        className="size-4 accent-[var(--brand)] cursor-pointer"
                        checked={row.categories.includes(c)}
                        disabled={savingId === row.profile_id}
                        onChange={() => void toggle(row, c)}
                        aria-label={`${row.display_name} に ${c} を割当`}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={1 + ASSIGNABLE_CATEGORIES.length}
                    className="text-center text-sm text-ink-3 p-8"
                  >
                    受講者がいません。
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
```

実装時の注意: `accent-[var(--brand)]` の CSS 変数名は Task 4 Step 2 と同様に実際のトークン名へ合わせる。

- [ ] **Step 2: ルートをロール分岐にする**

`apps/web/src/routes/_app/interview-prep.tsx` を全置換:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useAppShell } from '@/components/shell/app-shell-context';
import { InterviewPrepPage } from '@/components/learner/InterviewPrep';
import { InterviewPrepAssignmentsPage } from '@/components/instructor/InterviewPrepAssignments';

export const Route = createFileRoute('/_app/interview-prep')({
  component: InterviewPrep,
});

/** learner は練習画面、 staff (instructor/admin) は割当管理画面。 */
function InterviewPrep() {
  const s = useAppShell();
  if (s.role === 'instructor' || s.role === 'admin') {
    return <InterviewPrepAssignmentsPage backendEnabled={s.backendEnabled} />;
  }
  return <InterviewPrepPage backendEnabled={s.backendEnabled} />;
}
```

`apps/web/src/components/shell/Sidebar.tsx` の `NAV.instructor`、`students` の後に追加:

```ts
    { id: 'interview-prep', label: '面談対策', icon: MessageCircle },
```

- [ ] **Step 3: typecheck + lint**

Run: `bun run typecheck; bun run lint`
Expected: エラーなし。

- [ ] **Step 4: ブラウザで講師動線を手動確認**

`seed-instructor` の JWT を localStorage にセットしてリロード:
1. サイドバー「面談対策」→ 受講者一覧テーブルに Seed Learner が表示され、SQL にチェックが入っている (Task 3 の割当)。
2. 「テスト」をチェック → toast 表示。seed-learner に切り替えると PHP/JS 以外のカテゴリチップが増えている。
3. チェックを全て外す → seed-learner では共通のみに戻る。

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/instructor/InterviewPrepAssignments.tsx apps/web/src/routes/_app/interview-prep.tsx apps/web/src/components/shell/Sidebar.tsx
git commit -m "feat(web): 講師向けの面談対策割当画面を追加"
```

---

### Task 6: 総合検証

**Files:** なし (検証のみ。修正が出た場合は該当タスクのファイル)

- [ ] **Step 1: CI ゲートをローカルで通す**

```bash
bun run lint; bun run typecheck; bun run test; bun run build
```

Expected: すべて成功。

- [ ] **Step 2: コア学習ループが壊れていないことを確認**

`dev:api` 起動済みの状態で:

```bash
bun run smoke:core
```

Expected: PASS (面談対策はコアループ外だが、マウント追加・seed 変更のリグレッションが無いことの確認)。

- [ ] **Step 3: 手動確認チェックリストの最終確認**

- 受講者: 未割当 → 共通のみ / 割当後 → 該当カテゴリ追加 / A→B/C フィルタ拡張 / ランダム出題一巡
- 講師: 割当変更が即受講者表示に反映 / 監査ログ画面に「面談対策の割当」が出る
- 既存機能: ダッシュボード・レッスン・添削フローに変化なし

- [ ] **Step 4: 仕上げ**

計画からの逸脱 (CSS 変数名・PageHeader props 等の現物合わせ) があればスペック/計画に追記して:

```bash
git add -A; git commit -m "docs: 面談対策の実装計画を完了状態に更新"
```

---

## Self-Review 済みメモ

- スペック全要件のタスク対応: UI 2モード (Task 4) / 割当制御 (Task 3, 5) / seed 運用 (Task 2) / エラー処理 (Task 3 Step 5 の 400・403 検証) / テスト (Task 1) — 網羅。
- 初期リリース対象外 (AI模擬面談・提出添削・進捗記録) はどのタスクにも含まれない (YAGNI)。
- 型シグネチャ整合: `visibleQuestions<T extends {category:string}>` を API (Task 3) と web デモパス (Task 4) が共有。API レスポンス snake_case は `InterviewQuestion` のフィールド名と一致。
