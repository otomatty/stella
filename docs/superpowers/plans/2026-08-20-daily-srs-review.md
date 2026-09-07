# デイリー復習(SRS)機能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** クイズで解答した問題をSM-2間隔反復でスケジュールし、毎日「今日の復習」として再出題する。

**Architecture:** SM-2純粋関数を `@stella/shared` に置き、D1に `review_cards` / `review_logs` を追加。クイズ受験と復習解答の両方が同じカード更新関数を通る。APIは `/api/srs/today`(出題)と `/api/srs/answer`(1問採点)の2本。WebはダッシュボードカードとReviewSessionページ。

**Tech Stack:** Hono + Drizzle (D1/SQLite) + Cloudflare Workers / Vite + React + TanStack Router / Vitest

**Spec:** `docs/superpowers/specs/2026-08-20-daily-srs-review-design.md`

## Global Constraints

- Lintは **Biome** (`bun run lint` = `biome ci .`)。`noExplicitAny` / `noNonNullAssertion` / `noConsoleLog`(CLI scriptsは除外)が error。**ローカルではCRLFの影響で全体lintが偽陽性で落ちることがある**ため、検証は変更ファイルだけ `bunx biome ci <files>` で行う(自分がWrite/EditしたファイルはLFなので通る)。
- TypeScript strict。`bun run typecheck` は全ワークスペース対象。新しいworktreeでは先に `bun install`(無いと `tsc` not found)。
- `packages/shared` 内部のimportは相対パス+`.js` 拡張子(例: `import { x } from "../study/activity.js"`)。`apps/api` も同様に `.js` 拡張子。`apps/web` は `@/` エイリアス+拡張子なし。
- `apps/web` の `src/routeTree.gen.ts` はVite pluginが生成する。**新しいrouteファイルを追加したら `bunx vite build`(apps/web内)を先に実行**してから typecheck する。`routeTree.gen.ts` が「変更あり・diff空」になったら `git restore` する。
- 日付境界は必ず `@stella/shared/study/activity` の `toStudyDate` / `addStudyDays`(JST固定オフセット)を使う。独自に日付を切らない。
- 復習は `quiz_attempts` に書かない・`max_attempts` を消費しない・`study_activity` に書かない。
- テスト実行: リポジトリルートで `bun run test`(Vitest、`packages/**/*.test.ts` を拾う)。
- コミットメッセージ末尾: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: SM-2純粋関数 + 日付ヘルパ (`@stella/shared`)

**Files:**
- Create: `packages/shared/src/srs/sm2.ts`
- Create: `packages/shared/src/srs/sm2.test.ts`
- Modify: `packages/shared/src/study/activity.ts`(`studyDateStartMs` を追加)
- Modify: `packages/shared/src/study/activity.test.ts`(テスト1件追加)
- Modify: `packages/shared/package.json`(exports追加)

**Interfaces:**
- Produces: `sm2Next(prev: SrsCardState | null, correct: boolean): SrsCardState`、`interface SrsCardState { ease: number; intervalDays: number; reps: number }`、`INITIAL_EASE = 2.5`、`MIN_EASE = 1.3`(`@stella/shared/srs/sm2`)
- Produces: `studyDateStartMs(date: string, offsetMin?: number): number`(`@stella/shared/study/activity`)— `YYYY-MM-DD`(JST)の日の開始をUTCミリ秒で返す

- [ ] **Step 1: 失敗するテストを書く**

`packages/shared/src/srs/sm2.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { INITIAL_EASE, MIN_EASE, sm2Next } from "./sm2.js";

describe("sm2Next", () => {
  it("新規カードの初回正解は 1 日後", () => {
    expect(sm2Next(null, true)).toEqual({ ease: 2.6, intervalDays: 1, reps: 1 });
  });

  it("2 回目の連続正解は 6 日後", () => {
    const first = sm2Next(null, true);
    expect(sm2Next(first, true)).toEqual({ ease: 2.7, intervalDays: 6, reps: 2 });
  });

  it("3 回目以降は interval × ease で伸びる", () => {
    const second = { ease: 2.7, intervalDays: 6, reps: 2 };
    const third = sm2Next(second, true);
    expect(third).toEqual({ ease: 2.8, intervalDays: Math.round(6 * 2.8), reps: 3 });
  });

  it("誤答で reps と interval がリセットされ ease が下がる", () => {
    const state = { ease: 2.7, intervalDays: 6, reps: 2 };
    expect(sm2Next(state, false)).toEqual({ ease: 2.38, intervalDays: 1, reps: 0 });
  });

  it("新規カードの初回誤答も翌日 due", () => {
    expect(sm2Next(null, false)).toEqual({ ease: 2.18, intervalDays: 1, reps: 0 });
  });

  it("ease は下限 1.3 を下回らない", () => {
    let state = sm2Next(null, false);
    for (let i = 0; i < 10; i++) state = sm2Next(state, false);
    expect(state.ease).toBe(MIN_EASE);
  });

  it("初期 ease は 2.5", () => {
    expect(INITIAL_EASE).toBe(2.5);
  });
});
```

`packages/shared/src/study/activity.test.ts` の末尾の describe 内(既存構造に合わせて適切なdescribeへ)に追加:

```ts
it("studyDateStartMs は JST 0 時の UTC ミリ秒を返す", () => {
  // 2026-08-20 00:00 JST = 2026-08-19 15:00 UTC
  expect(studyDateStartMs("2026-08-20")).toBe(Date.UTC(2026, 7, 19, 15));
});
```

(importに `studyDateStartMs` を追加すること。)

- [ ] **Step 2: テストが失敗することを確認**

Run: `bun run test`
Expected: FAIL(`./sm2.js` が存在しない / `studyDateStartMs` がexportされていない)

- [ ] **Step 3: 実装**

`packages/shared/src/srs/sm2.ts`:

```ts
/**
 * SM-2 間隔反復のコアロジック (デイリー復習 —
 * docs/superpowers/specs/2026-08-20-daily-srs-review-design.md)。
 *
 * 入力は 2 値 (正解 / 誤答)。 SM-2 の quality にマップすると 正解=5 / 誤答=2 で、
 * ease の増減 (+0.10 / -0.32) は式 EF' = EF + (0.1 - (5-q)(0.08 + (5-q)×0.02)) を
 * 定数化したもの。 I/O は持たず、 due 日付の算出は呼び出し側が行う
 * (`toStudyDate` + `addStudyDays`)。
 */

export interface SrsCardState {
  /** SM-2 の ease factor。 初期 2.5、 下限 1.3。 */
  ease: number;
  /** 次回出題までの日数。 */
  intervalDays: number;
  /** 連続正解数 (誤答で 0 に戻る)。 */
  reps: number;
}

export const INITIAL_EASE = 2.5;
export const MIN_EASE = 1.3;

/** 正解 (q=5) の ease 増分。 */
const EASE_GAIN = 0.1;
/** 誤答 (q=2) の ease 減分。 */
const EASE_LOSS = 0.32;

/** 浮動小数の蓄積誤差を抑えるため ease は小数第 2 位に丸めて持つ。 */
function roundEase(v: number): number {
  return Math.round(v * 100) / 100;
}

/** 解答 1 回ぶんカード状態を進める。 `prev` が null なら新規カード (初回解答)。 */
export function sm2Next(prev: SrsCardState | null, correct: boolean): SrsCardState {
  const ease = prev?.ease ?? INITIAL_EASE;
  if (!correct) {
    return { ease: Math.max(MIN_EASE, roundEase(ease - EASE_LOSS)), intervalDays: 1, reps: 0 };
  }
  const nextEase = roundEase(ease + EASE_GAIN);
  const reps = (prev?.reps ?? 0) + 1;
  const intervalDays =
    reps === 1 ? 1 : reps === 2 ? 6 : Math.round((prev?.intervalDays ?? 1) * nextEase);
  return { ease: nextEase, intervalDays, reps };
}
```

`packages/shared/src/study/activity.ts` — `studyDateToMs` の直後に追加:

```ts
/** `YYYY-MM-DD` (アプリ基準 TZ) の一日の開始を UTC ミリ秒で返す。 不正値は NaN。 */
export function studyDateStartMs(date: string, offsetMin = STUDY_TZ_OFFSET_MIN): number {
  return studyDateToMs(date) - offsetMin * 60_000;
}
```

`packages/shared/package.json` の `exports` に追加(`"./study/activity"` の近く):

```json
"./srs/sm2": "./src/srs/sm2.ts",
"./srs/types": "./src/srs/types.ts",
```

(`./srs/types` はTask 3で作るが、exports行はここでまとめて足してよい。typecheckはファイルが無くても `exports` だけでは落ちない。)

- [ ] **Step 4: テストが通ることを確認**

Run: `bun run test`
Expected: PASS(既存テスト含め全部)

- [ ] **Step 5: lint + コミット**

```bash
bunx biome ci packages/shared/src/srs/sm2.ts packages/shared/src/srs/sm2.test.ts packages/shared/src/study/activity.ts packages/shared/src/study/activity.test.ts
git add packages/shared
git commit -m "feat(shared): SM-2間隔反復の純粋関数と日付開始ヘルパを追加"
```

---

### Task 2: D1スキーマ + migration

**Files:**
- Modify: `apps/api/src/db/schema.ts`(`quizAttempts` 定義の直後、「受講登録」セクションの前に追記。importに `index` を追加)
- Create(生成): `apps/api/drizzle/0019_*.sql` + `apps/api/drizzle/meta/*`

**Interfaces:**
- Produces: Drizzleテーブル `reviewCards`(列: `id, tenantId, userId, questionId, ease, intervalDays, reps, dueDate, lastReviewedAt, createdAt`)、`reviewLogs`(列: `id, tenantId, userId, cardId, questionId, correct, answeredAt`)

- [ ] **Step 1: schema.tsにテーブルを追加**

冒頭のimportを変更: `import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";`

`quizAttempts` の閉じ括弧の後に追加:

```ts
// ---------------------------------------------------------------
// デイリー復習 (SRS — docs/superpowers/specs/2026-08-20-daily-srs-review-design.md)
// ---------------------------------------------------------------

/**
 * SM-2 のカード状態。 クイズで解答した設問ごとに 1 枚 (user_id × question_id)。
 * `due_date` はアプリ基準 TZ (Asia/Tokyo) の `YYYY-MM-DD` (study_activity.date と同じ規約)。
 * クイズ本編の受験と復習解答の両方が SM-2 の入力としてここを更新する。
 */
export const reviewCards = sqliteTable(
  "review_cards",
  {
    id: uuid(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => quizQuestions.id, { onDelete: "cascade" }),
    ease: real("ease").notNull().default(2.5),
    intervalDays: integer("interval_days").notNull().default(1),
    reps: integer("reps").notNull().default(0),
    dueDate: text("due_date").notNull(),
    lastReviewedAt: ts("last_reviewed_at").notNull(),
    createdAt: tsNow("created_at"),
  },
  (t) => ({
    userQuestionUnique: uniqueIndex("review_cards_user_question_uq").on(t.userId, t.questionId),
    userDueIdx: index("review_cards_user_due_idx").on(t.userId, t.dueDate),
  }),
);

/**
 * 復習の解答ログ (1 解答 = 1 行の追記)。 「今日の解答数」の算出と、 将来の
 * アルゴリズム移行 (FSRS 等) のための学習データを兼ねる。 クイズ本編の受験は
 * quiz_attempts に残るためここには書かない。
 */
export const reviewLogs = sqliteTable(
  "review_logs",
  {
    id: uuid(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    cardId: text("card_id")
      .notNull()
      .references(() => reviewCards.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull(),
    correct: integer("correct", { mode: "boolean" }).notNull(),
    answeredAt: tsNow("answered_at"),
  },
  (t) => ({
    userAnsweredIdx: index("review_logs_user_answered_idx").on(t.userId, t.answeredAt),
  }),
);
```

- [ ] **Step 2: migrationを生成して内容を確認**

Run: `bun run db:generate`
Expected: `apps/api/drizzle/0019_*.sql` が生成され、中身に `CREATE TABLE \`review_cards\`` と `CREATE TABLE \`review_logs\``、unique index `review_cards_user_question_uq` が含まれる。既存テーブルへのALTER等が混ざっていないこと(混ざっていたらschema.tsの変更が余計なdiffを含んでいる)。

- [ ] **Step 3: ローカルD1に適用**

Run: `bun run db:migrate`
Expected: 正常終了(applied migrations に 0019 が出る)

- [ ] **Step 4: typecheck + コミット**

```bash
bun run typecheck
bunx biome ci apps/api/src/db/schema.ts
git add apps/api/src/db/schema.ts apps/api/drizzle
git commit -m "feat(api): SRS用のreview_cards / review_logsテーブルを追加"
```

---

### Task 3: 共有型 + カード更新lib + クイズ受験フック

**Files:**
- Create: `packages/shared/src/srs/types.ts`
- Create: `apps/api/src/lib/quiz-grading.ts`
- Create: `apps/api/src/lib/srs-cards.ts`
- Modify: `apps/api/src/routes/quiz.ts`(採点の共通化 + 受験後のカード反映)

**Interfaces:**
- Consumes: Task 1の `sm2Next` / `SrsCardState`、Task 2の `reviewCards`
- Produces: `isExactSelection(correct: ReadonlySet<string>, selected: ReadonlySet<string>): boolean`(`apps/api/src/lib/quiz-grading.ts`)
- Produces: `applyOutcomesToCards(db: Db, tenantId: string, userId: string, outcomes: readonly QuestionOutcome[], at: Date): Promise<Map<string, UpdatedCard>>` — `QuestionOutcome = { questionId: string; correct: boolean }`、`UpdatedCard = SrsCardState & { id: string; questionId: string; dueDate: string }`(`apps/api/src/lib/srs-cards.ts`)
- Produces: 型 `SrsTodaySummary { questions: LearnerQuizQuestion[]; answered_today: number; due_total: number; today: string }`、`SrsAnswerResult { question_id: string; correct: boolean; correct_option_ids: string[]; explanation: string | null; due_date: string; interval_days: number }`(`@stella/shared/srs/types`)

- [ ] **Step 1: 共有型を書く**

`packages/shared/src/srs/types.ts`:

```ts
/**
 * デイリー復習 (SRS) の API 型
 * (docs/superpowers/specs/2026-08-20-daily-srs-review-design.md §4)。
 * 設問は受講者向けサニタイズ済み (is_correct / explanation を含めない)。
 */

import type { LearnerQuizQuestion } from "../cms/types.js";

/** `GET /api/srs/today` の戻り値。 */
export interface SrsTodaySummary {
  /** 今日出題する設問 (due の古い順)。 上限 20 − answered_today、 下限 5 (前倒し補充)。 */
  questions: LearnerQuizQuestion[];
  /** 今日すでに復習で解答した数。 */
  answered_today: number;
  /** due (期日切れ) カードの総数 (上限適用前)。 */
  due_total: number;
  /** アプリ基準 TZ での今日 (`YYYY-MM-DD`)。 */
  today: string;
}

/** `POST /api/srs/answer` の戻り値 (1 問ごとの即時フィードバック)。 */
export interface SrsAnswerResult {
  question_id: string;
  correct: boolean;
  correct_option_ids: string[];
  explanation: string | null;
  /** 更新後カードの次回出題日 (`YYYY-MM-DD`)。 */
  due_date: string;
  interval_days: number;
}
```

- [ ] **Step 2: 採点の共通関数を切り出す**

`apps/api/src/lib/quiz-grading.ts`:

```ts
/**
 * 設問 1 問の採点規則: 正解集合と選択集合の完全一致 (順不同・重複無視)。
 * クイズ本編 (`routes/quiz.ts`) と SRS 復習 (`routes/srs.ts`) で共用する。
 */
export function isExactSelection(
  correct: ReadonlySet<string>,
  selected: ReadonlySet<string>,
): boolean {
  return correct.size === selected.size && [...correct].every((id) => selected.has(id));
}
```

- [ ] **Step 3: カード更新libを書く**

`apps/api/src/lib/srs-cards.ts`:

```ts
/**
 * SRS カードの更新 (docs/superpowers/specs/2026-08-20-daily-srs-review-design.md §3)。
 *
 * クイズ本編の受験 (`POST /api/quiz/:id/attempt`) と復習の解答 (`POST /api/srs/answer`) の
 * 両方がここを通り、 SM-2 の入力として一本化される。 review_logs への追記は復習経路のみ
 * (呼び出し側で行う)。
 */

import { and, eq, inArray } from "drizzle-orm";
import { sm2Next, type SrsCardState } from "@stella/shared/srs/sm2";
import { addStudyDays, toStudyDate } from "@stella/shared/study/activity";

import { reviewCards } from "../db/schema.js";
import type { Db } from "../db/client.js";

export interface QuestionOutcome {
  questionId: string;
  correct: boolean;
}

export interface UpdatedCard extends SrsCardState {
  id: string;
  questionId: string;
  dueDate: string;
}

/**
 * 設問ごとの正誤を SM-2 でカードに反映する (無ければ新規作成)。
 * `at` は解答時刻。 due はその時点の学習日 (JST) + intervalDays。
 * 反映後のカードを questionId キーで返す。
 */
export async function applyOutcomesToCards(
  db: Db,
  tenantId: string,
  userId: string,
  outcomes: readonly QuestionOutcome[],
  at: Date,
): Promise<Map<string, UpdatedCard>> {
  const updated = new Map<string, UpdatedCard>();
  if (outcomes.length === 0) return updated;

  const existing = await db
    .select()
    .from(reviewCards)
    .where(
      and(
        eq(reviewCards.userId, userId),
        inArray(
          reviewCards.questionId,
          outcomes.map((o) => o.questionId),
        ),
      ),
    );
  const byQuestion = new Map(existing.map((c) => [c.questionId, c]));
  const today = toStudyDate(at);

  // ponytail: 設問ごとに 1 UPDATE/INSERT。 1 クイズ数問なので十分。 遅くなったら db.batch に。
  for (const o of outcomes) {
    const prev = byQuestion.get(o.questionId);
    const next = sm2Next(
      prev ? { ease: prev.ease, intervalDays: prev.intervalDays, reps: prev.reps } : null,
      o.correct,
    );
    const dueDate = addStudyDays(today, next.intervalDays);
    if (prev) {
      await db
        .update(reviewCards)
        .set({ ...next, dueDate, lastReviewedAt: at })
        .where(eq(reviewCards.id, prev.id));
      updated.set(o.questionId, { id: prev.id, questionId: o.questionId, dueDate, ...next });
    } else {
      const id = crypto.randomUUID();
      await db.insert(reviewCards).values({
        id,
        tenantId,
        userId,
        questionId: o.questionId,
        ...next,
        dueDate,
        lastReviewedAt: at,
      });
      updated.set(o.questionId, { id, questionId: o.questionId, dueDate, ...next });
    }
  }
  return updated;
}
```

- [ ] **Step 4: quiz.tsを修正**

`apps/api/src/routes/quiz.ts`:

1. importを追加:

```ts
import { isExactSelection } from "../lib/quiz-grading.js";
import { applyOutcomesToCards } from "../lib/srs-cards.js";
```

2. 採点部のインライン集合比較(`const isCorrect = correct.size === selected.size && [...correct].every((id) => selected.has(id));` とその上の「集合の完全一致」コメント)を次に置き換え:

```ts
      const isCorrect = isExactSelection(correct, selected);
```

3. `if (inserted.meta.changes === 0) { throw ... }` ブロックの**後**、`return c.json(...)` の**前**に追加:

```ts
    // 解答済みの設問を SRS カード (デイリー復習) に反映する。 受験そのものは
    // quiz_attempts に残るため review_logs には書かない。 上限 429 で弾かれた
    // 受験は上の throw で到達しない (カウントしない)。
    await applyOutcomesToCards(
      db,
      caller.tenantId,
      caller.id,
      results.map((r) => ({ questionId: r.question_id, correct: r.correct })),
      new Date(),
    );
```

- [ ] **Step 5: 検証 + コミット**

```bash
bun run typecheck
bun run test
bunx biome ci packages/shared/src/srs/types.ts apps/api/src/lib/quiz-grading.ts apps/api/src/lib/srs-cards.ts apps/api/src/routes/quiz.ts
git add packages/shared/src/srs/types.ts apps/api/src/lib/quiz-grading.ts apps/api/src/lib/srs-cards.ts apps/api/src/routes/quiz.ts
git commit -m "feat(api): クイズ受験をSM-2カードに反映し採点関数を共通化"
```

---

### Task 4: SRS APIルート

**Files:**
- Create: `apps/api/src/routes/srs.ts`
- Modify: `apps/api/src/index.ts`(import + `app.route("/", srsRoute);` を `studyActivityRoute` の行の直後に追加)

**Interfaces:**
- Consumes: Task 1 `sm2Next`(バックフィルは `applyOutcomesToCards` 経由)、`studyDateStartMs` / `toStudyDate`、Task 3 `isExactSelection` / `applyOutcomesToCards`、`SrsTodaySummary` / `SrsAnswerResult`
- Produces: `GET /api/srs/today` → `{ review: SrsTodaySummary }`、`POST /api/srs/answer` (body `{ question_id, selected_option_ids }`) → `{ result: SrsAnswerResult }`

- [ ] **Step 1: ルートを実装**

`apps/api/src/routes/srs.ts`:

```ts
/**
 * デイリー復習 (SRS) API (docs/superpowers/specs/2026-08-20-daily-srs-review-design.md §4)。
 *
 * ルート名が `review` でないのは講師の課題添削 (review-draft / review-queue) と
 * 衝突するため。 受講者は自分のカードのみ参照でき、 出題は is_correct / explanation を
 * 含めない (quiz.ts と同じサニタイズ)。 復習は quiz_attempts に書かず、 quizzes.max_attempts
 * も消費しない。
 */

import { Hono } from "hono";
import { and, asc, count, eq, gt, gte, inArray, lt, lte, type SQL } from "drizzle-orm";
import { studyDateStartMs, toStudyDate } from "@stella/shared/study/activity";
import type { SrsTodaySummary } from "@stella/shared/srs/types";
import type { QuizAnswer } from "@stella/shared/cms/types";

import {
  courses,
  enrollments,
  lessons,
  quizAttempts,
  quizOptions,
  quizQuestions,
  quizzes,
  reviewCards,
  reviewLogs,
  sections,
} from "../db/schema.js";
import { ApiError, errorResponse, getCaller } from "../lib/authz.js";
import type { Caller } from "../lib/authz.js";
import { isExactSelection } from "../lib/quiz-grading.js";
import { applyOutcomesToCards } from "../lib/srs-cards.js";
import type { Db } from "../db/client.js";

export const srsRoute = new Hono<{ Bindings: Env }>();

/** 1 日の出題上限。 due がこれを超えたぶんは翌日以降に持ち越す。 */
const DAILY_MAX = 20;
/** 1 日の出題下限。 due が足りない日は期日の近いカードを前倒しして埋める。 */
const DAILY_MIN = 5;

/**
 * 受講者がアクセスできるカードを due の古い順に返す。
 * published なコース + active な enrollment の設問に限定する (quiz.ts の
 * isAuthorizedForLesson と同じ条件を join で畳んだもの)。
 */
async function selectAccessibleCards(
  db: Db,
  caller: Caller,
  extra: SQL,
  limitN?: number,
): Promise<Array<{ questionId: string; dueDate: string }>> {
  const base = db
    .select({ questionId: reviewCards.questionId, dueDate: reviewCards.dueDate })
    .from(reviewCards)
    .innerJoin(quizQuestions, eq(quizQuestions.id, reviewCards.questionId))
    .innerJoin(quizzes, eq(quizzes.id, quizQuestions.quizId))
    .innerJoin(lessons, eq(lessons.id, quizzes.lessonId))
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .innerJoin(courses, eq(courses.id, sections.courseId))
    .innerJoin(
      enrollments,
      and(
        eq(enrollments.courseId, courses.id),
        eq(enrollments.userId, caller.id),
        eq(enrollments.status, "active"),
      ),
    )
    .where(
      and(
        eq(reviewCards.userId, caller.id),
        eq(courses.tenantId, caller.tenantId),
        eq(courses.status, "published"),
        extra,
      ),
    )
    .orderBy(asc(reviewCards.dueDate), asc(reviewCards.id));
  return limitN !== undefined ? base.limit(limitN) : base;
}

/**
 * 過去のクイズ受験からカードを遅延生成する (機能リリース前からの利用者向け)。
 * カードが 1 枚でもあれば何もしない。 各クイズの最新受験の answers を採点し直し、
 * 受験時刻を解答時刻としてカード化する。
 */
async function backfillCards(db: Db, caller: Caller): Promise<void> {
  const cardCount = await db
    .select({ n: count() })
    .from(reviewCards)
    .where(eq(reviewCards.userId, caller.id));
  if ((cardCount[0]?.n ?? 0) > 0) return;

  const attempts = await db
    .select({
      quizId: quizAttempts.quizId,
      answers: quizAttempts.answers,
      submittedAt: quizAttempts.submittedAt,
    })
    .from(quizAttempts)
    .where(and(eq(quizAttempts.userId, caller.id), eq(quizAttempts.tenantId, caller.tenantId)))
    .orderBy(asc(quizAttempts.submittedAt));
  if (attempts.length === 0) return;

  // 昇順に舐めて Map を上書きすると各クイズの最新受験だけ残る。
  const latestByQuiz = new Map<string, (typeof attempts)[number]>();
  for (const a of attempts) latestByQuiz.set(a.quizId, a);
  const quizIds = [...latestByQuiz.keys()];

  const questionRows = await db
    .select({ id: quizQuestions.id, quizId: quizQuestions.quizId })
    .from(quizQuestions)
    .where(inArray(quizQuestions.quizId, quizIds));
  const correctRows = await db
    .select({ questionId: quizOptions.questionId, id: quizOptions.id })
    .from(quizOptions)
    .innerJoin(quizQuestions, eq(quizQuestions.id, quizOptions.questionId))
    .where(and(inArray(quizQuestions.quizId, quizIds), eq(quizOptions.isCorrect, true)));
  const correctByQuestion = new Map<string, Set<string>>();
  for (const r of correctRows) {
    const set = correctByQuestion.get(r.questionId) ?? new Set<string>();
    set.add(r.id);
    correctByQuestion.set(r.questionId, set);
  }

  for (const [quizId, attempt] of latestByQuiz) {
    const answers = (Array.isArray(attempt.answers) ? attempt.answers : []) as QuizAnswer[];
    const selectedByQuestion = new Map<string, Set<string>>();
    for (const a of answers) {
      selectedByQuestion.set(a.question_id, new Set(a.selected_option_ids ?? []));
    }
    const outcomes = questionRows
      .filter((q) => q.quizId === quizId)
      .map((q) => ({
        questionId: q.id,
        correct: isExactSelection(
          correctByQuestion.get(q.id) ?? new Set<string>(),
          selectedByQuestion.get(q.id) ?? new Set<string>(),
        ),
      }));
    await applyOutcomesToCards(db, caller.tenantId, caller.id, outcomes, attempt.submittedAt);
  }
}

/** 今日の復習キュー。 due 順に上限 20 − 今日の解答数、 足りなければ前倒しで最低 5 問。 */
srsRoute.get("/api/srs/today", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const now = new Date();
    const today = toStudyDate(now);
    const dayStart = new Date(studyDateStartMs(today));

    await backfillCards(db, caller);

    const answeredRows = await db
      .select({ n: count() })
      .from(reviewLogs)
      .where(and(eq(reviewLogs.userId, caller.id), gte(reviewLogs.answeredAt, dayStart)));
    const answeredToday = answeredRows[0]?.n ?? 0;

    // ponytail: due を全件フェッチして数える。 1 ユーザーのカードは解答済み設問数が
    // 上限なので当面問題ない。 数千枚を超えるようなら count クエリに分ける。
    const due = await selectAccessibleCards(db, caller, lte(reviewCards.dueDate, today));
    const capacity = Math.max(0, DAILY_MAX - answeredToday);
    let picked = due.slice(0, capacity).map((r) => r.questionId);

    // 下限 5 問: due が足りない日は「まだ今日解いていない」カードを期日の近い順に前倒し。
    // 今日すでに解いたカード (クイズ本編含む) は lastReviewedAt で除外する。
    const shortfall = DAILY_MIN - answeredToday - picked.length;
    if (shortfall > 0) {
      const fill = await selectAccessibleCards(
        db,
        caller,
        and(gt(reviewCards.dueDate, today), lt(reviewCards.lastReviewedAt, dayStart)) as SQL,
        shortfall,
      );
      picked = [...picked, ...fill.map((r) => r.questionId)];
    }

    const questionRows = picked.length
      ? await db
          .select({
            id: quizQuestions.id,
            kind: quizQuestions.kind,
            prompt: quizQuestions.prompt,
            points: quizQuestions.points,
            order: quizQuestions.order,
          })
          .from(quizQuestions)
          .where(inArray(quizQuestions.id, picked))
      : [];
    const optionRows = picked.length
      ? await db
          .select({
            id: quizOptions.id,
            questionId: quizOptions.questionId,
            label: quizOptions.label,
            order: quizOptions.order,
          })
          .from(quizOptions)
          .where(inArray(quizOptions.questionId, picked))
          .orderBy(asc(quizOptions.order), asc(quizOptions.id))
      : [];

    const byId = new Map(questionRows.map((q) => [q.id, q]));
    // picked の並び (due 順) を保って出題する。
    const questions = picked.flatMap((id) => {
      const q = byId.get(id);
      if (!q) return [];
      return [
        {
          ...q,
          options: optionRows
            .filter((o) => o.questionId === id)
            .map((o) => ({ id: o.id, label: o.label, order: o.order })),
        },
      ];
    });

    const review: SrsTodaySummary = {
      questions,
      answered_today: answeredToday,
      due_total: due.length,
      today,
    };
    return c.json({ review });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 復習 1 問をサーバ採点し、 SM-2 でカードを更新して review_logs に追記する。 */
srsRoute.post("/api/srs/answer", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const body = (await c.req.json()) as {
      question_id?: unknown;
      selected_option_ids?: unknown;
    };
    const questionId = typeof body.question_id === "string" ? body.question_id : "";
    if (!questionId) throw new ApiError("question_id is required", 400);
    const selected = new Set(
      Array.isArray(body.selected_option_ids)
        ? body.selected_option_ids.filter((v): v is string => typeof v === "string")
        : [],
    );

    // カードが無い設問は復習対象外 (先にクイズ本編を解いてカード化される)。
    // 今日の出題リスト外の解答は許す (前倒し学習)。 上限はサーバでは強制しない。
    const cardRows = await db
      .select({ id: reviewCards.id })
      .from(reviewCards)
      .where(and(eq(reviewCards.userId, caller.id), eq(reviewCards.questionId, questionId)))
      .limit(1);
    if (!cardRows[0]) throw new ApiError("review card not found", 404);

    // 出題時と同じ join で受講権限を確認する (退会・非公開化後の解答を防ぐ)。
    const accessible = await selectAccessibleCards(
      db,
      caller,
      eq(reviewCards.questionId, questionId) as SQL,
      1,
    );
    if (accessible.length === 0) throw new ApiError("not authorized for this question", 403);

    const questionRows = await db
      .select({ explanation: quizQuestions.explanation })
      .from(quizQuestions)
      .where(eq(quizQuestions.id, questionId))
      .limit(1);
    const correctRows = await db
      .select({ id: quizOptions.id })
      .from(quizOptions)
      .where(and(eq(quizOptions.questionId, questionId), eq(quizOptions.isCorrect, true)));
    const correct = new Set(correctRows.map((r) => r.id));
    const isCorrect = isExactSelection(correct, selected);

    const now = new Date();
    const updated = await applyOutcomesToCards(
      db,
      caller.tenantId,
      caller.id,
      [{ questionId, correct: isCorrect }],
      now,
    );
    const next = updated.get(questionId);
    if (!next) throw new ApiError("card update failed", 500);

    await db.insert(reviewLogs).values({
      tenantId: caller.tenantId,
      userId: caller.id,
      cardId: next.id,
      questionId,
      correct: isCorrect,
      answeredAt: now,
    });

    return c.json({
      result: {
        question_id: questionId,
        correct: isCorrect,
        correct_option_ids: [...correct],
        explanation: questionRows[0]?.explanation ?? null,
        due_date: next.dueDate,
        interval_days: next.intervalDays,
      },
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});
```

冒頭importに `import type { Env } from "../env.js";` も追加すること(`Hono<{ Bindings: Env }>` が参照する)。

- [ ] **Step 2: index.tsに登録**

`apps/api/src/index.ts`: import群に `import { srsRoute } from "./routes/srs.js";` を追加(アルファベット順で `searchRoute` の後)、`app.route("/", studyActivityRoute);` の直後に `app.route("/", srsRoute);` を追加。

- [ ] **Step 3: 検証 + コミット**

```bash
bun run typecheck
bunx biome ci apps/api/src/routes/srs.ts apps/api/src/index.ts
git add apps/api/src/routes/srs.ts apps/api/src/index.ts
git commit -m "feat(api): デイリー復習のSRS出題・解答APIを追加"
```

---

### Task 5: WebのAPIクライアント + Hook

**Files:**
- Create: `apps/web/src/lib/srs-api.ts`
- Create: `apps/web/src/hooks/useSrsToday.ts`

**Interfaces:**
- Consumes: Task 3の `SrsTodaySummary` / `SrsAnswerResult`、Task 4のエンドポイント
- Produces: `getSrsToday(): Promise<SrsTodaySummary | null>`、`submitSrsAnswer(questionId: string, selectedOptionIds: string[]): Promise<SrsAnswerResult>`、`useSrsToday(userId: string | null, enabled?: boolean): { review: SrsTodaySummary | null; loading: boolean; error: string | null; refetch: () => Promise<void> }`

- [ ] **Step 1: APIクライアント**

`apps/web/src/lib/srs-api.ts`:

```ts
/**
 * デイリー復習 (SRS) のデータアクセス層
 * (docs/superpowers/specs/2026-08-20-daily-srs-review-design.md §4)。
 * 採点はサーバ側で行い、 正解・解説は解答後にのみ受け取る。
 */

import type { SrsAnswerResult, SrsTodaySummary } from "@stella/shared/srs/types";

import { apiFetch } from "./api-client";

/** 今日の復習キューを取得する。 */
export async function getSrsToday(): Promise<SrsTodaySummary | null> {
  const { review } = await apiFetch<{ review: SrsTodaySummary | null }>("/api/srs/today");
  return review ?? null;
}

/** 復習 1 問を送信してサーバ採点する。 */
export async function submitSrsAnswer(
  questionId: string,
  selectedOptionIds: string[],
): Promise<SrsAnswerResult> {
  const { result } = await apiFetch<{ result: SrsAnswerResult }>("/api/srs/answer", {
    method: "POST",
    body: { question_id: questionId, selected_option_ids: selectedOptionIds },
  });
  if (!result) throw new Error("採点結果が空でした");
  return result;
}
```

- [ ] **Step 2: Hook**

`apps/web/src/hooks/useSrsToday.ts`(`useStudyActivity.ts` と同じ構造):

```ts
/**
 * 今日の復習キューを取得する Hook (デイリー復習 / SRS)。
 * バックエンド未設定 (デモ) / 未ログイン時は no-op で null のまま (ダミー値を出さない)。
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { SrsTodaySummary } from "@stella/shared/srs/types";
import { getSrsToday } from "@/lib/srs-api";
import { isBackendConfigured } from "@/lib/backend";

export interface UseSrsTodayResult {
  review: SrsTodaySummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSrsToday(userId: string | null, enabled = true): UseSrsTodayResult {
  const [review, setReview] = useState<SrsTodaySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    if (!enabled || !userId || !isBackendConfigured()) {
      setReview(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getSrsToday();
      if (reqId !== requestIdRef.current) return;
      setReview(result);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [enabled, userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { review, loading, error, refetch };
}
```

- [ ] **Step 3: 検証 + コミット**

```bash
bun run typecheck
bunx biome ci apps/web/src/lib/srs-api.ts apps/web/src/hooks/useSrsToday.ts
git add apps/web/src/lib/srs-api.ts apps/web/src/hooks/useSrsToday.ts
git commit -m "feat(web): SRS復習APIのクライアントとuseSrsToday Hookを追加"
```

---

### Task 6: 復習ページ (`/review`)

**Files:**
- Create: `apps/web/src/components/learner/ReviewSession.tsx`
- Create: `apps/web/src/routes/_app/review.tsx`
- 生成物: `apps/web/src/routeTree.gen.ts` が更新される

**Interfaces:**
- Consumes: Task 5の `getSrsToday` / `submitSrsAnswer`、`@stella/shared/cms/types` の `LearnerQuizQuestion`
- Produces: ルート `/review`(`_app` 配下、認証済みシェル内)

- [ ] **Step 1: ReviewSessionコンポーネント**

`apps/web/src/components/learner/ReviewSession.tsx`:

```tsx
/**
 * デイリー復習 (SRS) の解答セッション
 * (docs/superpowers/specs/2026-08-20-daily-srs-review-design.md §5)。
 *
 * QuizPlayer (一括提出 → 合否) と違い、 1 問ごとに採点 API を叩いて正誤と解説を
 * 即時表示する。 出題は GET /api/srs/today の due 順で、 セッション中は固定。
 */

import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

import type { LearnerQuizQuestion } from "@stella/shared/cms/types";
import type { SrsAnswerResult, SrsTodaySummary } from "@stella/shared/srs/types";
import { getSrsToday, submitSrsAnswer } from "@/lib/srs-api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ReviewSessionProps {
  currentUserId: string | null;
  backendEnabled: boolean;
}

export const ReviewSession = ({ currentUserId, backendEnabled }: ReviewSessionProps) => {
  const [session, setSession] = useState<SrsTodaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<SrsAnswerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!backendEnabled || !currentUserId) {
      setLoading(false);
      return;
    }
    void getSrsToday()
      .then((review) => {
        if (!cancelled) setSession(review);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "fetch failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [backendEnabled, currentUserId]);

  const questions = session?.questions ?? [];
  const question: LearnerQuizQuestion | undefined = questions[index];
  const done = !loading && questions.length > 0 && index >= questions.length;

  const toggle = useCallback(
    (optionId: string, multiple: boolean) => {
      if (feedback) return; // 解答後は変更不可。
      setSelected((prev) => {
        if (!multiple) return [optionId];
        return prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId];
      });
    },
    [feedback],
  );

  const submit = useCallback(async () => {
    if (!question || feedback) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitSrsAnswer(question.id, selected);
      setFeedback(result);
      if (result.correct) setCorrectCount((n) => n + 1);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }, [question, feedback, selected]);

  const next = useCallback(() => {
    setIndex((i) => i + 1);
    setSelected([]);
    setFeedback(null);
    setSubmitError(null);
  }, []);

  return (
    <>
      <PageHeader
        title="今日の復習"
        sub={
          questions.length > 0 && !done ? (
            <>
              {Math.min(index + 1, questions.length)} / {questions.length} 問
            </>
          ) : (
            <>間隔反復で、 解いた問題を忘れる前に振り返ります</>
          )
        }
      />

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : loadError ? (
        <p className="text-sm text-destructive">今日の復習の取得に失敗しました: {loadError}</p>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground py-4">
              {session && session.answered_today > 0
                ? `今日の復習は完了しています (${session.answered_today} 問解答済み)。 また明日!`
                : "今日の復習はありません。 クイズを解くと、 その問題が数日おきにここへ再出題されます。"}
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/">ダッシュボードへ戻る</Link>
            </Button>
          </CardContent>
        </Card>
      ) : done ? (
        <Card>
          <CardHeader>
            <CardTitle>今日の復習が完了しました</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {questions.length} 問中 {correctCount} 問正解。 間違えた問題は明日また出題されます。
            </p>
            <Button asChild variant="accent">
              <Link to="/">ダッシュボードへ戻る</Link>
            </Button>
          </CardContent>
        </Card>
      ) : question ? (
        <Card>
          <CardHeader>
            <CardTitle>{question.prompt}</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress
              value={Math.round((index / questions.length) * 100)}
              className="mb-4"
              tone="brand"
            />
            {question.kind === "multiple" ? (
              <p className="text-xs text-muted-foreground mb-2">当てはまるものをすべて選択</p>
            ) : null}
            <div className="flex flex-col gap-2" role="group" aria-label="選択肢">
              {question.options.map((o) => {
                const isSelected = selected.includes(o.id);
                const isCorrectOption = feedback?.correct_option_ids.includes(o.id) ?? false;
                return (
                  <button
                    key={o.id}
                    type="button"
                    disabled={feedback != null}
                    onClick={() => toggle(o.id, question.kind === "multiple")}
                    aria-pressed={isSelected}
                    className={cn(
                      "text-left text-sm rounded-md border border-border px-3 py-2 transition-colors",
                      !feedback && isSelected && "border-primary bg-primary/10",
                      feedback && isCorrectOption && "border-success bg-success/10",
                      feedback && isSelected && !isCorrectOption && "border-destructive bg-destructive/10",
                    )}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>

            {feedback ? (
              <div className="mt-4">
                <p className={cn("text-sm font-medium", feedback.correct ? "text-success" : "text-destructive")}>
                  {feedback.correct ? "正解!" : "不正解"}
                </p>
                {feedback.explanation ? (
                  <p className="text-sm text-muted-foreground mt-1">{feedback.explanation}</p>
                ) : null}
                <Button variant="accent" className="mt-4" onClick={next}>
                  {index + 1 < questions.length ? "次の問題へ" : "結果を見る"}
                </Button>
              </div>
            ) : (
              <div className="mt-4">
                {submitError ? (
                  <p className="text-sm text-destructive mb-2">{submitError}</p>
                ) : null}
                <Button
                  variant="accent"
                  disabled={selected.length === 0 || submitting}
                  onClick={() => void submit()}
                >
                  回答する
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
};
```

注意: `Button` の `asChild` / `Progress` の `tone` / `text-success` 等のユーティリティは既存コード(`LearnerDashboard.tsx`)で使用実績のあるものに合わせている。もしビルドで存在しないpropがあれば、`apps/web/src/components/ui/button.tsx` / `progress.tsx` の実装を確認して合わせる(`asChild` が無ければ `<Link>` を `Button` の外に出して `useNavigate` でもよい)。

- [ ] **Step 2: ルートファイル**

`apps/web/src/routes/_app/review.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";

import { useAppShell } from "@/components/shell/app-shell-context";
import { ReviewSession } from "@/components/learner/ReviewSession";

export const Route = createFileRoute("/_app/review")({
  component: ReviewPage,
});

function ReviewPage() {
  const s = useAppShell();
  return <ReviewSession currentUserId={s.currentUserId} backendEnabled={s.backendEnabled} />;
}
```

- [ ] **Step 3: routeTree再生成 + 検証**

```bash
cd apps/web
bunx vite build
cd ../..
bun run typecheck
bunx biome ci apps/web/src/components/learner/ReviewSession.tsx apps/web/src/routes/_app/review.tsx
```

Expected: build成功、typecheck成功。`git status` で `routeTree.gen.ts` が「変更あり・diff空」なら `git restore apps/web/src/routeTree.gen.ts`、実差分(新route追記)があればコミットに含める。

- [ ] **Step 4: コミット**

```bash
git add apps/web/src/components/learner/ReviewSession.tsx apps/web/src/routes/_app/review.tsx apps/web/src/routeTree.gen.ts
git commit -m "feat(web): デイリー復習ページ /review を追加"
```

---

### Task 7: ダッシュボードに「今日の復習」カード

**Files:**
- Modify: `apps/web/src/components/learner/LearnerDashboard.tsx`

**Interfaces:**
- Consumes: Task 5の `useSrsToday`、Task 6のルート `/review`

- [ ] **Step 1: カードを追加**

`LearnerDashboard.tsx` を修正:

1. import追加:

```tsx
import { Link } from "@tanstack/react-router";
import { useSrsToday } from "@/hooks/useSrsToday";
```

(アイコンは既存importの `Sparkles` を使う。)

2. コンポーネント冒頭(`useStudyActivity` 呼び出しの近く)にhook追加:

```tsx
  // 「今日の復習」(SRS) の残り問題数。 カードが無い/今日ぶんゼロなら出さない。
  const { review } = useSrsToday(currentUserId, backendEnabled);
```

3. KPIグリッド(`<div className="grid gap-3 mb-6 grid-cols-1 sm:grid-cols-3">...</div>`)の**直後**に追加:

```tsx
      {review && (review.questions.length > 0 || review.answered_today > 0) ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles size={14} /> 今日の復習
              </span>
            </CardTitle>
            <CardActions>
              {review.questions.length > 0 ? (
                <Button asChild variant="accent" size="sm">
                  <Link to="/review">復習を始める</Link>
                </Button>
              ) : null}
            </CardActions>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {review.questions.length > 0 ? (
                <>
                  残り <strong className="text-foreground">{review.questions.length} 問</strong>
                  。 忘れる前の数分が いちばん効きます。
                </>
              ) : (
                <>今日の復習は完了! {review.answered_today} 問解答しました。 また明日。</>
              )}
            </p>
          </CardContent>
        </Card>
      ) : null}
```

- [ ] **Step 2: 検証 + コミット**

```bash
bun run typecheck
bunx biome ci apps/web/src/components/learner/LearnerDashboard.tsx
git add apps/web/src/components/learner/LearnerDashboard.tsx
git commit -m "feat(web): ダッシュボードに今日の復習カードを追加"
```

---

### Task 8: core-loopスモーク拡張 + 全体検証

**Files:**
- Modify: `apps/api/scripts/core-loop-smoke.ts`

**Interfaces:**
- Consumes: Task 4のAPI、CMSの既存API(`POST /api/cms/quiz/ensure` → `{ row: { id } }`、`POST /api/cms/quiz-questions` (body `{ quiz_id, kind, prompt, explanation, points, order }`) → `{ row: { id } }`、`POST /api/cms/quiz-options` (body `{ question_id, label, is_correct, order }`) → `{ row: { id } }`)

**設計メモ(スペック§6):** 誤答カードは「翌日due・同日再出題なし」なので、HTTPスモークでは当日の出題リストに載る状態を作れない。検証するのは (1) 誤答直後に今日のリストへ**出ない**こと、(2) `/api/srs/answer` の採点とSM-2進行(連続正解で interval 1日→6日)、(3) `answered_today` の増加。

- [ ] **Step 1: スモークにステップを追加**

`core-loop-smoke.ts` の変数宣言部(`let lessonId = "";` の近く)に追加:

```ts
let quizId = "";
let questionId = "";
let correctOptionId = "";
let wrongOptionId = "";
```

「受講者が課題を提出する」ステップの**前**(受講登録がactiveでlessonIdが確定した後)に以下のステップ群を追加。tokenの変数名(admin/learner)は既存ステップで使われているものに合わせること:

```ts
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
    assert(first.result.interval_days === 1, `1 回目の正解は 1 日のはずが ${first.result.interval_days}`);
    const second = await ok("POST", "/api/srs/answer", {
      token: learner,
      body: { question_id: questionId, selected_option_ids: [correctOptionId] },
    });
    assert(second.result.interval_days === 6, `2 回目の連続正解は 6 日のはずが ${second.result.interval_days}`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(second.result.due_date), "due_date が YYYY-MM-DD でない");
    const today = await ok("GET", "/api/srs/today", { token: learner });
    assert(today.review.answered_today >= 2, `answered_today が増えていない (${today.review.answered_today})`);
  });
```

(クイズ本編は`max_attempts`未設定=無制限なので誤答1回で429にはならない。カード・ログはコース削除のcascade(question → review_cards → review_logs)で後片付けと一緒に消える。)

- [ ] **Step 2: スモークを実行**

前提: `bun run db:migrate && bun run db:seed` 済みで `bun run dev:api` が起動していること(起動はバックグラウンドで。Windowsでは停止時にworkerdが8787を掴み残すことがある — その場合は `Get-NetTCPConnection -LocalPort 8787 -State Listen` のOwningProcessを確認してから `Stop-Process -Force`)。

```bash
bun run smoke:core
```

Expected: 追加した3ステップを含め全ステップPASS。

- [ ] **Step 3: 全体検証**

```bash
bun run test
bun run typecheck
bun run build
```

Expected: すべて成功。(全体 `bun run lint` はCRLF起因の偽陽性があり得るため、変更ファイルへの `bunx biome ci` で代替済み。CIのLinuxでは全体lintが走る。)

- [ ] **Step 4: コミット**

```bash
git add apps/api/scripts/core-loop-smoke.ts
git commit -m "test(api): core-loopスモークにSRS復習の検証ステップを追加"
```

---

## 完了条件

- `bun run test` / `bun run typecheck` / `bun run build` / `bun run smoke:core` がすべて通る
- クイズ解答後、翌日以降にダッシュボードへ「今日の復習」カードが出て `/review` で1問ずつ解ける(手動確認はUI変更の常として推奨 — preview検証はメモリの手順: dev:api起動 → seed-learner JWTをlocalStorage `falcon_auth_token_v1` へ → :4173)
