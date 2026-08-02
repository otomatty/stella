# コア学習ループを端到端で閉じる（#61 / Phase 2）

日付: 2026-08-02  
ステータス: 設計承認済み（実装待ち）  
親 Issue: [#58](https://github.com/a-cial-dev/falcon-informal/issues/58)  
対象 Issue: [#61](https://github.com/a-cial-dev/falcon-informal/issues/61)  
吸収: [#9](https://github.com/a-cial-dev/falcon-informal/issues/9)（完了時にクローズ）

## 背景

#59 / #60 により実データ開発が既定になり、API 失敗時の fixtures 退避も除去済み。縦スライスの主要 API（受講登録・進捗・提出・添削・証明書・アプリ内通知）は存在するが、次の穴でループが閉じていない。

1. レビュー確定が楽観更新 / fire-and-forget で、サーバ確定前に成功扱いになる
2. 学習者向け提出・レビュー履歴 API / UI がなく、再ログイン後に添削結果を読めない
3. クイズ認可が published のみで enrollment と未整合
4. seed / fixtures の教材パスが R2 の `tenant/{id}/...` と不一致

#61 はこれらの穴を埋め、1 人の学習者が招待〜証明書まで実データで完走できるようにする。講師連携の学習者結果 UX（#9）も本 Issue に吸収する。

## 目標

1. 提出〜レビューをサーバ確定待ちにする（楽観更新 / fire-and-forget の解消）
2. 学習者自身の提出・レビュー履歴 API / UI を追加し、`ReviewResultView`（rubric / 行コメント / 要約 / verdict）まで届ける
3. クイズ認可を enrollment と整合させる
4. 教材パスを seed / fixtures と R2 プレフィックスで統一する
5. メールは後回し。アプリ内通知だけでループを閉じる（通知ディープリンク含む）
6. 手動 E2E チェックリストを Issue / docs に残す
7. #9 の受け入れ条件を満たし、完了時に #9 もクローズする

## 非目標

- メール通知
- 多テナント認可・所属の本格強化（#62）
- fixtures 削除・残モック仕分け（#63）
- 監査ログ統合・本番 E2E 自動化（#64）
- submissions ストア全体のサーバファースト作り直し
- 新 DataSource Provider / ルーティング基盤の新設
- seed パス書き換えに伴う R2 実ファイルの自動配置
- DB への独立 `inlineComments` カラム追加

## 選定方針

### 採用: 既存 API / ストア上の局所拡張（Approach 1）

既存の Hono/D1 ルートと web ストアを延長し、実装をタスク分割する。#60 と同じ進め方で差分が追いやすい。

**不採用**

- LearningLoop Provider 新設: #61 に対してリファクタが厚い
- submissions ストアの全面サーバファースト化: デモ経路・講師 UI への影響が大きく YAGNI

## モード境界

| モード | 条件 | 挙動 |
|--------|------|------|
| 実データ | `VITE_SERVER_URL` 設定（`isBackendConfigured()`） | API/D1 のみ。失敗 → エラー／空。fixtures 退避禁止（#60） |
| デモ専用 | URL 未設定 | 現行どおり fixtures / localStorage を維持可。本 Issue の新 UI は実データ経路を優先実装 |

## データフロー（提出〜レビュー〜学習者結果）

```text
学習者 POST /api/submissions（await・既存）
  → 講師 ReviewQueue / ReviewEditor
  → finalize: await PATCH /api/submissions/:id
       （status ≠ pending, verdict, rubric, reviewNotes, aiSuggestions）
  → API が reviewed_at 初回時に notifications(review_completed) 作成（既存）
  → 成功後のみトースト「添削を確定しました」
  → 学習者 GET /api/submissions/mine または /:id
  → ReviewResultView
  → 通知クリック → 同じ詳細へ
```

行アンカー付き指摘は既存 JSON カラム `aiSuggestions` を用いる（独立カラムは作らない）。`rubric` / `reviewNotes` / `verdict` も既存列をそのまま学習者 UI で表示する。

## API

| エンドポイント | 認可 | 用途 |
|----------------|------|------|
| `GET /api/submissions/mine`（新規） | 認証済み・本人の行のみ | 提出履歴一覧 |
| `GET /api/submissions/:id`（新規） | 本人 **または** 同テナント staff | 詳細 / 通知ディープリンク |
| `GET /api/submissions` | staff（既存） | テナント一覧 |
| `POST /api/submissions` | 認証済み・`student_id = caller`（既存） | 作成 |
| `PATCH /api/submissions/:id` | staff（既存） | 添削更新・確定 |

返却形は既存 `toRow`（snake_case + `profiles` ネスト）を維持する。  
ルート登録順: `/mine` を `/:id` より先に置く（`"mine"` が id に取られないようにする）。

### クイズ認可

`apps/api/src/routes/quiz.ts` の `isAuthorizedForLesson` を次に変更する。

- staff: 同テナントなら可（現行）
- student: 同テナント **かつ** 当該コースに active enrollment **かつ** published
- 拒否時の応答は既存どおり: GET `/api/quiz/for-lesson/:lessonId` は `{ quiz: null }`、POST attempt は 403

## Store / クライアント

対象: `apps/web/src/lib/submissions-store.ts`、`hooks/useSubmissions.ts`、`lib/submissions-api.ts`、`ReviewEditor.tsx`

- 実データモードでは `updateSubmission` / `finalizeReview` を async 化し、PATCH 完了を待つ
- デモ専用は現行の同期 localStorage 挙動を維持可
- 失敗時: ローカルロールバック + エラーを呼び出し元へ。成功トーストは出さない
- ReviewEditor の「デモ: 通知は未送信」「メール + LMS」文言を、実データ時は「LMS 通知を送信しました」系へ修正（メールは送らない旨を明記）

## Learner UI（#9 吸収）

| 画面 | 内容 |
|------|------|
| 提出履歴 | LearnerDashboard に「提出・添削」セクション。`mine` を一覧（課題名・提出日・status / verdict） |
| `ReviewResultView`（新規） | verdict、`reviewNotes`、rubric、行アンカー付き `aiSuggestions`、提出コード（read-only） |
| CourseDetail / Lesson | 該当提出が reviewed 系ならバッジ。レッスンから結果を開ける |

遷移は既存の `setPage` にページキーを追加する（例: `submission-result`）。ルーティング基盤は新設しない。

### 通知ディープリンク

- `NotificationCenter` で `review_completed` クリック時、`payload.submission_id` で `ReviewResultView` へ遷移し、既読にする
- メール送信は行わない

## 教材パス統一

- `apps/web/src/data/fixtures.ts` の `pdfPath` / `videoPath` を  
  `tenant/ses/courses/{決定論的 course UUID}/{ファイル名}` に寄せる
- `packages/shared/scripts/export-seed-sql.ts` は fixtures 由来のため、再 seed 後も同形になる
- seed は再 seed 安定のためアップロード用の uniq 乱数は付けない（プレフィックス `tenant/{tenantId}/courses/{courseId}/` はアップロードと揃える）
- `buildMaterialPath` / materials API の `tenant/{id}/...` 要件は変更しない
- パス文字列の統一であり、R2 への実ファイル自動配置はしない。seed 教材の視聴確認は R2 に同キーで置くか、Admin アップロード経路で行う（E2E に明記）

## エラー処理

| 場面 | 挙動 |
|------|------|
| レビュー確定 PATCH 失敗 | ロールバック、エラートースト、成功文言なし |
| `mine` / `/:id` 失敗 | 空一覧 + エラー表示（fixtures 退避なし） |
| 他人の提出 `/:id` | 403 |
| 未 enrollment でクイズ | 取得/提出とも拒否 |
| seed パスの R2 未配置 | プレイヤーは既存どおり読み込み失敗（別 URL に黙って化けない） |

## 変更対象（想定）

| 領域 | 主なファイル |
|------|----------------|
| API submissions | `apps/api/src/routes/submissions.ts` |
| API quiz | `apps/api/src/routes/quiz.ts` |
| Store / API client | `submissions-store.ts`, `submissions-api.ts`, `useSubmissions.ts` |
| Instructor UI | `ReviewEditor.tsx`（await + 文言） |
| Learner UI | `LearnerDashboard.tsx`, `CourseDetail.tsx`, 新規 `ReviewResultView`, `App.tsx`（page key） |
| Notifications | `NotificationCenter.tsx`, `App.tsx` / Topbar 配線 |
| Seed / fixtures | `fixtures.ts`, `export-seed-sql.ts`（必要なら README 一言） |
| Docs | README または docs に手動 E2E チェックリスト |

## 実装タスク分割

1. Review await + ReviewEditor 文言修正
2. `GET /api/submissions/mine` および `GET /api/submissions/:id` + client
3. Learner 履歴 + `ReviewResultView` + 通知ディープリンク
4. Quiz enrollment ゲート
5. fixtures / seed パス統一
6. 手動 E2E チェックリスト文書化
7. #9 / #61 受け入れ突合せと Issue クローズ準備

## 検証方針

実装者（エージェント）:

- `bun run typecheck`
- seed を再実行し、教材パスが `tenant/ses/courses/{uuid}/...` のままであること
- 可能なら quiz API が enrollment なしで拒否されることを確認

利用者（人手・手動 E2E）:

1. Admin がコースを公開し、教材を R2 に上げられる
2. 学習者を受講登録できる
3. 学習者が進捗・クイズ・提出を D1 に残せる
4. 講師がキューからレビューし、結果が学習者の `ReviewResultView` / 通知で見える
5. API 停止時にデモデータへ化けない（#60）
6. ブラウザを変えても（再ログイン後）進捗・提出が見える

## 完了条件

- #61 本文の作業チェックリストおよび受け入れチェックリストを満たす
- #9 の提出 → ReviewQueue → ReviewEditor → 学習者結果表示を満たす
- 手動 E2E チェックリストが docs / Issue に残っている
- 完了時に #61 と #9 をクローズできる状態にする

## フォローアップ

- #62 — 多人数利用向けの認可・所属
- #63 — 残モックの仕分け
- #64 — 運用品質（監査・R2・E2E 自動化・docs）
