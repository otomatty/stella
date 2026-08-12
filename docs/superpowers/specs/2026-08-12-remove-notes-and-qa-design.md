# レッスンノート / Q&A の削除

日付: 2026-08-12  
ステータス: 承認済み（実装前）

## 背景

レッスン内の個人ノートと、受講者↔講師の Q&A は、受講者が AI に質問する導線と役割が重なっている。UI（レッスンタブ・サイドバー・講師ダッシュボード）に残っているが、製品としては不要と判断した。

## 目標

1. 受講者向けレッスンノート機能を製品から完全削除する
2. 受講者↔講師 Q&A 機能を製品から完全削除する
3. UI・API・shared 型・D1 テーブルまで一括で除去する（フル削除）
4. 本番 remote D1 の既存ノート / Q&A データは破棄してよい（`DROP TABLE`）

## 非目標

- AI 質問機能（フローティング等）の変更・削除
- 添削フローの `reviewNotes`（講師の添削メモ）の変更
- 教材スライド内の講師ノート（`<!-- ノート: ... -->`）の扱い変更
- クイズの `quiz_questions` / クイズ API の変更
- 既存 localStorage キーのブラウザ側クリーンアップ UI（死んだキーは放置で可）

## 方針

一括削除（単一実装単位）。UI だけ残す・API だけ残す段階は作らない。

## 変更概要

### フロント (`apps/web`)

| 箇所 | 変更 |
|------|------|
| `LessonPlayer` | 「ノート」「Q&A」タブ、`NotesView` / `QAView`、「ノートに追加」を削除。残タブのみ |
| `Sidebar` / `App` | page id `qa`、バッジ件数、`StandaloneQA` / `InstructorQA` ルーティングを削除 |
| `InstructorDashboard` | 未返信 Q&A 件数・`setPage('qa')` 導線を削除（analytics の `open_questions` 依存も外す） |
| `NotificationCenter` | `qa_answered` 表示ラベルを削除 |
| 削除ファイル | `StandaloneQA.tsx`, `InstructorQA.tsx`, `QAThread.tsx`, `QuestionComposer.tsx`, `useLessonNote.ts`, `useQuestions.ts`, `qa-api.ts`, `lesson-notes.ts`, `lesson-notes-api.ts` |
| `App` 起動時 | `configureNotesSync` 呼び出しを削除 |

### API (`apps/api`)

| 箇所 | 変更 |
|------|------|
| ルート | `routes/lesson-notes.ts` / `routes/qa.ts` を削除し、`index.ts` から外す |
| schema | `lessonNotes` / `questions` / `questionReplies` テーブル定義を削除。通知 type から `qa_answered` を外す |
| analytics | 受講者 Q&A の `open_questions` 集計を削除（クイズ用 `quiz_questions` は残す） |
| test-data | Q&A / `qa_answered` シード・クリーンアップを削除 |

### Migration

新規 drizzle migration（例: `0009_*.sql`）:

1. `DELETE FROM notifications WHERE type = 'qa_answered';`
2. `DROP TABLE` `question_replies` → `questions` → `lesson_notes`（FK 順）
3. journal / snapshot を通常フローで更新

SQLite の notifications.type はアプリ側 enum なので、列再定義は不要。行削除 + schema/TS から `qa_answered` を除去すれば足りる。

### shared (`packages/shared`)

- Q&A 関連型（`Question*` 等）と `NotificationType` の `qa_answered` を削除
- `study/notes-sync.ts` と `notes-sync.test.ts` を削除

## データフロー（削除後）

- レッスン閲覧・進捗・提出・添削・通知（announcement / review_completed / assignment_due）・修了証・AI 質問は従来どおり
- `/api/lesson-notes` と `/api/questions*` は 404（ルート未登録）
- サイドバーに Q&A 項目は出ない

## エラーハンドリング

- 削除対象 API へのクライアント呼び出しはコードから無くす（呼び出し残存は typecheck / 参照検索で検知）
- 既存クライアントが古いバンドルで API を叩いても、ルート不在で失敗するだけ（後方互換は不要）

## テスト / 検証

- `bun run lint` / `typecheck` / `test`
- `smoke:core` はノート・Q&A に依存しない想定。壊れていれば参照除去で直す
- 手動: レッスン画面にノート/Q&A タブが無いこと、サイドバーに Q&A が無いこと、AI 質問が使えること

## 完了条件

- UI からノート・Q&A 導線が消えている
- 関連 API ルート・shared 型・hooks がリポジトリに残っていない
- D1 migration で対象テーブルが DROP され、`qa_answered` 通知行が消える
- lint / typecheck / test が通る

## リスク

- remote D1 の既存ノート・Q&A は復元不可（承認済み）
- analytics の `open_questions` を消すと講師ダッシュボードの数値カードが減る（意図どおり）
