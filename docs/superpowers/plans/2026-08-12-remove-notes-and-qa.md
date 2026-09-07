# Remove Notes & Q&A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** レッスンノートと受講者↔講師 Q&A を UI / API / shared / D1 から完全削除する。

**Architecture:** 一括削除。ルート・コンポーネント・型を除去し、drizzle migration で `qa_answered` 通知削除後に `question_replies` / `questions` / `lesson_notes` を DROP する。AI 質問・添削 `reviewNotes`・教材講師ノート・`quiz_questions` は触らない。

**Tech Stack:** Hono + Drizzle + D1 (`apps/api`)、React + Vite (`apps/web`)、`@stella/shared`、Vitest、Bun

## Global Constraints

- 仕様: `docs/superpowers/specs/2026-08-12-remove-notes-and-qa-design.md`
- 本番データ破棄 OK（DROP）
- クイズ `quiz_questions` と analytics のクイズ集計は残す（`questions` テーブル参照のみ削除）
- Commit はユーザー指示に従う（本作業ではユーザーがコミットを依頼済み）

---

## ファイル構成

| ファイル | 操作 |
|---------|------|
| `packages/shared/src/cms/types.ts` | Q&A 型・`qa_answered` 削除 |
| `packages/shared/src/study/notes-sync.ts` (+ test) | 削除 |
| `apps/api/src/db/schema.ts` | 3 テーブル + enum 削除 |
| `apps/api/drizzle/0009_*.sql` (+ meta) | migration 新規 |
| `apps/api/src/routes/{qa,lesson-notes}.ts` | 削除 |
| `apps/api/src/index.ts` | ルート登録解除 |
| `apps/api/src/routes/analytics.ts` | `open_questions` 削除 |
| `apps/api/src/lib/test-data.ts` | Q&A 関連削除 |
| `apps/web` LessonPlayer / App / Sidebar / InstructorDashboard / NotificationCenter | 導線削除 |
| `apps/web` QA/notes 関連ファイル一式 | 削除 |

---

### Task 1: shared 型・notes-sync 削除

**Files:**
- Modify: `packages/shared/src/cms/types.ts`
- Delete: `packages/shared/src/study/notes-sync.ts`, `packages/shared/src/study/notes-sync.test.ts`
- Check exports from `packages/shared` package entrypoints

- [ ] Remove `Question*` types and `qa_answered` from `NotificationType`
- [ ] Delete notes-sync module + test; fix any re-exports
- [ ] `bun run --filter=@stella/shared test` (or root `bun run test`) for remaining tests

### Task 2: API schema + migration + routes

**Files:**
- Modify: `apps/api/src/db/schema.ts`, `apps/api/src/index.ts`, `apps/api/src/routes/analytics.ts`, `apps/api/src/lib/test-data.ts`
- Delete: `apps/api/src/routes/qa.ts`, `apps/api/src/routes/lesson-notes.ts`
- Create: drizzle migration via `bun run db:generate` after schema edit (or hand-write DROP SQL + journal)

- [ ] Remove table defs and `qa_answered` from notifications enum / TABLE_NAMES
- [ ] Generate or write migration: delete `qa_answered` notifications, DROP 3 tables in FK order
- [ ] Unregister routes; scrub analytics `open_questions` and test-data Q&A
- [ ] `bun run typecheck` (api portion)

### Task 3: Web UI 削除

**Files:**
- Modify: `LessonPlayer.tsx`, `App.tsx`, `Sidebar.tsx`, `InstructorDashboard.tsx`, `NotificationCenter.tsx`
- Delete: StandaloneQA, InstructorQA, QAThread, QuestionComposer, useLessonNote, useQuestions, qa-api, lesson-notes*, etc.

- [ ] Strip tabs / pages / nav / badges / dashboard Q&A cards
- [ ] Delete orphaned files
- [ ] `bun run typecheck` && `bun run lint`

### Task 4: Verify

- [ ] `bun run test`
- [ ] Optional: `bun run db:migrate` locally
- [ ] Commit implementation
