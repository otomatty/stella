# VS Code「講師に引き継ぐ」 Implementation Plan (Issue #9 P0)

**Goal:** 自動採点で詰まった学習者が VS Code から講師の添削キューへエスカレーションでき、
講師は採点失敗サマリと AI 下書きを見て添削を確定できる。

**Architecture:** 純ロジック (サマリ整形 / ファイル連結 / upsert 判定) を `@stella/shared/review`
に置き、 D1 `submissions` に `grading_summary` 列を足す。 拡張は採点結果を控えて
`POST /api/submissions` するだけ。 講師 UI は既存 (`ReviewQueue` / `ReviewEditor`) に
「自動採点」タブを足す。

**Tech Stack:** Hono + Drizzle (D1/SQLite) + Cloudflare Workers / VS Code Extension API /
Vite + React / Vitest

**Spec:** `docs/superpowers/specs/2026-08-25-vscode-instructor-escalate-design.md`

**ステータス:** 完了 (全タスク実装・検証済み)

## Global Constraints

- Lint は **Biome** (`bun run lint` = `biome ci .`)。 `noExplicitAny` / `noNonNullAssertion` /
  `noConsoleLog` が error。
- TypeScript strict。 `bun run typecheck` は全ワークスペース対象。
- `packages/shared` / `apps/api` の内部 import は相対パス + `.js` 拡張子。 `apps/web` は `@/` エイリアス。
- 引き継いでもレッスン完了にはしない。 完了は自動採点クリアのまま。
- 検証: `bun run lint` / `bun run typecheck` / `bun run test` / `bun run build` /
  `bun run smoke:core` (要 `db:migrate` + `db:seed` + `dev:api`)。

---

### Task 1: 共有純関数 — 採点サマリ

- [x] `packages/shared/src/review/grading-summary.ts` — `buildGradingSummary` /
      `formatGradingSummaryText` / `parseGradingSummary` / `toReviewDraftLanguage`
- [x] `packages/shared/src/review/grading-summary.test.ts`
- [x] `packages/shared/src/review/types.ts` に `GradingSummary` / `ReviewDraftLanguage` を追加

### Task 2: 共有純関数 — エスカレーションと attempt 判定

- [x] `packages/shared/src/review/escalation.ts` — `concatExerciseFiles` /
      `buildEscalationSubmissionBody` / `nextSubmissionAttempt`
- [x] `packages/shared/src/review/escalation.test.ts`
- [x] `packages/shared/package.json` に exports 追加

### Task 3: D1 列

- [x] `apps/api/src/db/schema.ts` — `submissions.gradingSummary`
- [x] `apps/api/drizzle/0027_submission_grading_summary.sql` + `meta/_journal.json`
      (`grading_summary` 列 + `(tenant_id, student_id, assignment_id)` index)

### Task 4: POST /api/submissions の upsert + サマリ保存

- [x] `gradingSummary` を受け付け、 形が違えば 400 で弾く
- [x] 未添削は `WHERE ... status = 'pending'` の単一 UPDATE で上書き (`attempt` は SQL 側で +1)
- [x] update 時は `submitted_at` を打ち直し、 前回の AI 下書きと添削の打刻を戻す
- [x] 新規作成は `INSERT ... WHERE NOT EXISTS` で、 同時 POST でも pending を 2 行にしない
- [x] `toRow` に `grading_summary` を追加 (GET / PATCH にも自動で載る)

### Task 5: 拡張のパネル UI

- [x] `exercise-panel.ts` — 未クリアかつ控えがある時だけ「講師に引き継ぐ」 を出す
- [x] `enableCommandUris` に `falcon.escalateToInstructor` を追加
- [x] `exercise-panel.test.ts` — 出る / 出ない 3 ケース

### Task 6: 拡張の POST

- [x] `escalate.ts` — 採点の控えと `escalateToInstructor()`
- [x] `grader.ts` — `gradeActiveExercise()` が `{ assignment, files, result }` を返す
- [x] `catalog.ts` — `findCachedLessonContext()` (講座名 / セクション名)
- [x] `extension.ts` — 採点時に控える / `falcon.escalateToInstructor` コマンド登録
- [x] `package.json` — `FALCON: 講師に引き継ぐ`
- [x] `escalate.test.ts`

### Task 7: 講師 UI

- [x] `ReviewEditor` — 「自動採点」タブ + 未クリアバッジ + 提出切替時にそのタブを選ぶ
- [x] `ReviewEditor` — `review-draft` に課題言語と整形済みサマリを渡す
- [x] `review-draft` の言語を `js | ts | sql | fe-pseudo` に拡張 + `gradingSummary` を受け付ける
- [x] `ReviewQueue` — 「生成中」 → 「未生成」
- [x] `submissions-api.ts` — `grading_summary` のマッピング
- [x] `packages/shared/src/review/review-draft-request.test.ts`

### Task 9: レビュー指摘の反映 (Cursor Bugbot / Codex)

- [x] 添削確定と競合した引き継ぎが確定内容を巻き戻さない (`status = 'pending'` 条件 +
      `reviewed_at` / `reviewer_id` のリセット)
- [x] 省略マーカー込みで `MAX_ESCALATION_CODE_LENGTH` に収める (超えると
      `/api/review-draft` が 400 になり AI 下書きがヒューリスティックに落ちる)
- [x] 同時 POST で pending が増殖しない (`INSERT ... WHERE NOT EXISTS` / 実機で 4 並列を検証)
- [x] `gradingSummary` の要素まで検証し、 不正な payload は 400 (講師画面のクラッシュ防止)
- [x] `onDidChangeAuth` で採点の控えを捨てる (VS Code を共有した場合のコード漏えい防止)
- [x] 講師が開いている間に引き継ぎ直された提出への添削を 409 で弾く
      (`expectedSubmittedAt` の楽観ロック / Web は 409 でキューに戻す)
- [x] 版チェックを UPDATE の述語に入れて「比較 → 書き込み」の競合も塞ぐ
      (壊れた版指定は 400)
- [x] `ReviewEditor` の状態と下書き生成を id + `submittedAt` で管理する
      (引き継ぎ直しで下書きが作り直される / 再試行ループにしない)
- [x] 上書き / 新規作成のどちらも取れなかった競合はやり直す (500 を返さない)
- [x] `formatGradingSummaryText` を `MAX_REVIEW_SUMMARY_LENGTH` 以内に収める
      (超えると AI 下書きが必ずヒューリスティックに落ちる)
- [x] 上書きは同一課題の pending 最新 1 件だけにする (既存 DB の重複行を塗り替えない)
- [x] upsert のレスポンスは Web のキャッシュを id で置き換える (同じ id が 2 つ並ばない)
- [x] 採点結果のレッスンは **採点した課題** から引く
      (採点中にエディタを移しても別レッスンの下に保存されない)

### Task 8: docs / smoke

- [x] `smoke:core` に「VS Code から詰まりを引き継ぐと未添削の提出を上書きする」 ステップ
- [x] `smoke:core` に「添削確定後の引き継ぎは確定済みの提出を上書きしない」 ステップ
- [x] `smoke:core` に「開いていた版が古くなった添削は 409」 ステップ
- [x] `smoke:core` に「壊れた採点サマリ付きの提出は 400」 ステップ
- [x] 添削キューのステップで同一課題の提出が 1 件だけであることを確認
- [x] 設計書 / 本プラン / `AGENTS.md` / `apps/vscode/README.md` の更新
