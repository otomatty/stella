# TanStack Router 導入設計

日付: 2026-08-12 / 対象: `apps/web`

## 背景と目的

現在の web アプリはルーターを持たず、`App.tsx` の `page` 文字列 state と
`renderPage()` の分岐で画面を切り替えている。URL は常に `/`(例外は手動処理の
`/?cert=`, `/auth/callback`, `/support` のみ)。このため:

- ブラウザの戻る/進む・URL共有・ブックマークが効かない
- リロード復帰のために `localStorage`(`lms_state`)へ `page` / `reviewSubmissionId` /
  `resultSubmissionId` / `lastLocation` を自前保存している
- 検索パレットのディープリンクに `{ id, seq }` 版番号ハックが必要
- `__logout` / `__ai` という疑似ページが存在する

TanStack Router(ファイルベースルーティング)を導入し、URL を画面状態の真実にする。

## 方針(承認済み: 案A)

- `@tanstack/react-router` + `@tanstack/router-plugin`(Vite プラグイン)を追加
- **ファイルベースルーティング**: `src/routes/` 配下からルートツリーと型を自動生成
- **フラットURL**(役割プレフィックスなし): 1ユーザー=1ロール(profile 由来)なので、
  現状の「同じパスでロール別描画」をそのまま活かす
- 既存の画面コンポーネントは**ほぼ無改変**。ルートは props を渡す薄いラッパー
- **1PRで一括移行**(ステートマシンが App.tsx に密結合のため段階移行は不可)

## ルート構成

### 公開ルート(シェルなし)

| パス | 画面 |
|---|---|
| `/support` | `SupportPage` |
| `/auth/callback` | `AuthCallback` |
| `/verify/$certCode` | `PublicCertificateVerify` |

既発行の修了証URL `/?cert=<CODE>` は互換のため `/verify/$certCode` へリダイレクトする
(ルートインデックスの `beforeLoad` で search param を見て redirect)。

### 認証済みシェル(pathless layout route `_app`)

`_app` レイアウトルートが現 `MainApp` のロジック(認証セッション・profile・テナント・
コース取得・通知・AIボット・Tweaks)を持ち、`Sidebar` + `Topbar` + `<Outlet />` を描画する。
未ログイン時はリダイレクトせずその場で `LoginScreen` を描画(現挙動の維持。
fixtures フローの tenant-select 段階も同様にシェル内で分岐)。

| パス | 画面(ロール別) |
|---|---|
| `/` | LearnerDashboard / InstructorDashboard / AdminDashboard |
| `/courses` | CourseList / InstructorGeneric / AdminCoursesPage |
| `/courses/$courseId` | CourseDetail |
| `/courses/$courseId/lessons/$lessonId` | LessonPlayer |
| `/certificates` | CertificatePage |
| `/submissions/$submissionId` | ReviewResultView |
| `/review-queue` | ReviewQueue |
| `/reviews/$submissionId` | ReviewEditor |
| `/gradebook` | Gradebook |
| `/students` | InstructorGeneric |
| `/users` | UsersAdmin |
| `/enrollments` | AdminEnrollmentsPage |
| `/assignments` | AdminAssignmentsPage |
| `/audit` | AdminAuditPage |
| `/orgs` | AdminOrganizationsPage(platform_admin 以外は権限なし表示) |
| `/report` | AdminReportPage |
| `/settings` | SettingsPage |

- admin コース編集のディープリンクは `/courses?highlight=<courseId>` の search param に置換
  (`seq` ハックは URL 遷移 + `key={courseId}` で不要になる)
- ロールに存在しないパスへのアクセスは現状同様 `GenericEmpty`(または dash へ誘導)を表示

### シェルとルート間のデータ受け渡し

`_app` レイアウトが保持する値(role, tenant, courses, profile, callbacks 等)は
React Context(`AppShellContext`)で配下ルートへ渡す。ルートコンポーネントは
context + path params から既存コンポーネントの props を組み立てるだけの薄い層。

- `courseId` → course の解決は courses 一覧から `find`(現 `lastLocation` 復帰処理と同じ)。
  未ロード時はローディング、見つからなければ `EmptyCoursesNotice` 相当を表示

## 消えるもの / 残るもの

**削除**
- `lms_state` の `page` / `reviewSubmissionId` / `resultSubmissionId` 保存(URL が真実)
- `deepLinkLesson` / `deepLinkCourse` の `{ id, seq }` ハック
- `__logout` / `__ai` 疑似ページ(Sidebar からのコールバック / `navigate` に置換)
- `App.tsx` の手動 pathname 分岐

**残す**
- `lastLocation`(「続きから再開」機能。ダッシュボードの導線に必要)
- `showAIBot`、fixtures デモ用の tenant / role(localStorage 継続)
- 旧 `lms_state.page` からの一度きりの移行は**しない**(リロード時にダッシュボードへ
  落ちるだけ。lastLocation による再開導線は残るため許容)

## エラー処理

- 存在しない URL: ルートの `notFoundComponent` で `GenericEmpty` 相当を表示
- `$courseId` / `$submissionId` が不正: 各ルートで空状態表示(現挙動と同等)
- 認証切れ: シェルが LoginScreen を描画(現挙動どおり)

## テスト / 検証

- `bun run typecheck` / `bun run lint` / `bun run build` を通す
- 手動検証は `bun run build && bun run preview`(:4173)で行う
  (vite dev は practice ルートで `process is not defined` クラッシュするため — CLAUDE.md 参照)
- 検証項目: ログイン→ダッシュボード、コース一覧→詳細→レッスン、URL直叩きリロード、
  戻る/進む、`/?cert=` リダイレクト、`/support`、検索パレット遷移、ロール別画面
