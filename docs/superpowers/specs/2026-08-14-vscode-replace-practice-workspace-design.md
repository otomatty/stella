# PracticeWorkspace を VS Code 拡張で置き換える

日付: 2026-08-14
ステータス: 実装計画待ち
対象: 受講者のコード演習をブラウザ内 PracticeWorkspace から VS Code 拡張へ移す

## 背景

FALCON INFORMAL の TypeScript 研修は、動画・ドキュメント・クイズを Web LMS で、コード演習を `apps/web` の PracticeWorkspace（ブラウザ内 CodeMirror + `@falcon/code-runner`）で進めている。現場のエンジニアは VS Code を日常使いしており、ブラウザ演習は補完・型チェック・複数ファイル・Git の点で劣る。

方針:

- 使い始め（ログイン・受講登録・動画・ドキュメント・クイズ）は Web
- 演習は VS Code 拡張で完走する（案3: 編集 + 今と同じ自動採点 + レッスン完了）
- モバイル Web は読む・見る・クイズのみ。演習 UI は出さない
- PracticeWorkspace を受講者経路から廃止する
- 新コース（HTML/CSS / Git 等）はこの計画の対象外。拡張の型は後から足せるようにする

## 目標

1. 学習者が Web でログインしたあと、ワンクリックで VS Code に接続できる
2. 拡張で受講中コースの目次を見られ、ドキュメント / スライドを読める
3. `type: "code"` レッスンでは starter ファイルをワークスペースに展開し、VS Code 本体で編集できる
4. 「採点」は今と同じ `runGrading`（テスト + Lint + AST）で、全通なら `/api/lesson-progress` に完了を書く
5. Web のコードレッスン画面は PracticeWorkspace を出さず、「VS Code で開く」に置き換える
6. 講師の課題プレビュー（`AssignmentEditor`）は Web に残す

## 非目標

- 新しい教材コースの執筆
- 採点 API のサーバ化（Workers に QuickJS を移さない）
- JWT リフレッシュトークン（現行どおり 24 時間。切れたら Web から再接続）
- 拡張からの AI チャット / 提出（`/api/submissions`）— 後続。クリア判定には不要
- SQL 対話ターミナルの完全移植（採点と free-run は grader で行う）
- デモ / fixtures モードの拡張対応（拡張は実 API 必須）
- Practice 配下の講師用 Editor / FileTabs / linter の即時削除

## 役割分担

| 面 | やること | やらないこと |
|---|---|---|
| Web（デスクトップ / モバイル） | ログイン、招待、受講登録、動画、テキスト、スライド、クイズ、証明書、講師 CMS | コード編集・採点 |
| VS Code 拡張 | 目次、教材表示、課題ファイル展開、採点、レッスン完了、次へ | 動画再生、クイズ受験、受講登録 |
| 講師 Web | 課題編集・プレビュー採点（現行 `runGrading`） | 変更しない |

進捗の真実は D1 の `lesson_progress`。Web と拡張は同じ `/api/lesson-progress` を読む / 書く。

## 認証

Google OAuth の redirect URI は今どおり `http(s)://<api>/api/auth/google/callback` のままにする。`vscode://` を OAuth `return_to` には使わない（`resolveOAuthReturnTo` は http(s) + `ALLOWED_ORIGINS` + `/auth/callback` のみ）。

接続手順:

1. 学習者は Web にログインする
2. Web の「VS Code に接続」または コードレッスンの「VS Code で開く」が `POST /api/auth/vscode-link` を呼ぶ
3. API は 8 文字のワンタイムコードを発行し、SHA-256 ハッシュだけを D1 に保存する（TTL 5 分、単回）
4. ブラウザが `vscode://falcon.informal/link?code=<CODE>` を開く
5. 拡張の URI handler が `POST /api/auth/vscode-link/exchange` に code を送り、JWT を受け取る
6. JWT は `SecretStorage`（`falcon.accessToken`）に保存する。設定ファイルには書かない

期限切れ・未接続時、拡張は「Web で接続してください」と `https://<web>/connect-vscode` を開く。

ディープリンク（接続済み）: `vscode://falcon.informal/lesson?courseId=<id>&lessonId=<id>`

## 拡張の配置

- パス: `apps/vscode`
- package name: `@falcon/vscode`
- publisher / name: `falcon` / `informal`（拡張 ID `falcon.informal`）
- ルート `workspaces` は既に `apps/*` なので追加不要
- `@falcon/shared` と grader 用 `@falcon/code-runner` は esbuild で .vsix に同梱する

設定:

- `falcon.serverUrl` — API オリジン。既定 `http://127.0.0.1:8787`
- `falcon.webUrl` — Web オリジン。既定 `http://127.0.0.1:5173`

拡張ホストからの `fetch` には Origin が付かないため CORS 変更は不要。WebView から API は呼ばない。通信はホスト → API、ホスト ⇄ WebView は `postMessage` のみ。

## 画面構成

サイドバー（Activity Bar「FALCON」）:

- 未接続: 「Web で接続」ボタン
- 接続後: 受講中コース → セクション → レッスン。完了はチェック
- レッスンクリック:
  - `video` / `quiz` / `assignment`（提出物）: 「Web で開く」
  - `text` / `slides`: WebView で Markdown / スライドを表示
  - `code`: 課題フォルダを開き、課題文 WebView を出す

課題フォルダ:

```
~/.falcon-informal/exercises/<assignmentId>/
  <starter files>
```

テスト定義・正解・mutation はディスクに書かない。拡張ホストが `GET /api/cms/assignments/:id` の結果をメモリに持つ。

採点:

- 隠し WebView（`retainContextWhenHidden`）が `@falcon/code-runner` の `runGrading` をブラウザ互換で実行する
- ホストがワークスペースのファイルを読み、assignment + files を WebView に渡す
- Lint / AST もこの WebView 内で、今の PracticeWorkspace と同じ `getLinter` / `analyzeAst` を採点時に一度回す
- クリア条件は現行 `evaluate()` のまま（Lint error 0 + AST 充足 + 全テスト pass）
- クリアしたら `POST /api/lesson-progress` に `completed: true` を送る

リセット: フォルダを starter で上書きする（確認ダイアログあり）。

自由実行: 同じ grader WebView で `mode: "freerun"`。出力は課題 WebView の「出力」タブ。

## Web の変更

コードレッスン（`LessonPlayer` で `type === "code"`）:

- PracticeWorkspace を描画しない
- 「VS Code で開く」を出す。接続コード発行 → `vscode://falcon.informal/lesson?...`
- 拡張未導入時の案内（Marketplace / ローカル VSIX）
- モバイル幅では「この演習はパソコンの VS Code で進めてください」だけ出す

新規ルート `/connect-vscode`: ログイン済み学習者が拡張へ JWT を渡す専用ページ。

講師 `AssignmentEditor` のプレビュー・Editor・FileTabs・linter は残す。`apps/web/src/practice/` のうち受講者専用（`PracticeWorkspace.tsx`、`useGradeRunner.ts`、BottomPanel、RunResultDialog）だけ削除する。

## データ / API

既存のまま使う:

- `GET /api/me`
- `GET /api/enrollments/mine`
- `GET /api/cms/courses` / `GET /api/cms/courses/:id`
- `GET /api/cms/assignments/:id`（受講者は published コースに紐づく課題のみ）
- `GET` / `POST /api/lesson-progress`

新規:

| エンドポイント | 認可 | 用途 |
|---|---|---|
| `POST /api/auth/vscode-link` | ログイン済み | `{ code, expires_at }` を返す。ハッシュを D1 に保存 |
| `POST /api/auth/vscode-link/exchange` | なし（code が秘密） | `{ access_token }`。使用済みにする |

テーブル `auth_vscode_links`:

- `id` text PK
- `user_id` text not null
- `code_hash` text not null unique
- `expires_at` integer (timestamp_ms) not null
- `used_at` integer (timestamp_ms) null
- `created_at` integer (timestamp_ms) not null

コードは暗号学的乱数 8 文字（`A-Z2-9`、紛らわしい文字なし）。保存は SHA-256 hex。平文はレスポンスに一度だけ出す。

## 受け入れ条件

1. Web でログイン → 「VS Code に接続」→ 拡張に自分のコース一覧が出る
2. TypeScript の既存 code レッスンを拡張で開き、starter が編集でき、今と同じ課題が採点でクリアできる
3. クリア後、Web のレッスン一覧でも完了になる（逆も同様）
4. モバイル Web で code レッスンを開いてもエディタは出ない
5. デスクトップ Web の code レッスンに PracticeWorkspace が無い
6. 講師の課題プレビュー採点は今どおり動く
7. テストファイルが学習者のディスクに現れない

## 実装の波

波はそれぞれ単独でマージ可能な状態にする。

1. **接続と目次** — link API、`/connect-vscode`、拡張 scaffold、認証、コースツリー、進捗表示、ドキュメント表示。PracticeWorkspace はまだ残る
2. **演習** — ファイル展開、grader WebView、採点、クリア、リセット、自由実行、レッスンディープリンク
3. **置き換え** — LessonPlayer から PracticeWorkspace を外す、モバイル文言、受講者専用 practice ファイル削除
