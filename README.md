# FALCON INFORMAL

SES未経験エンジニア向け **TypeScript 入門** を配信する LMS。教材の正本は `packages/content`。

- 教材を見る (PDFスライド / 動画) / クイズ — Web
- コード演習する (VS Code 拡張 `falcon.informal`) — P2
- 採点される / AIに質問する — P2

## モノレポ構成

```text
falcon-informal/
├── apps/
│   ├── web/                  # @stella/web — LMS フロント (Vite + React) → Cloudflare Workers (Static Assets)
│   │   ├── src/              # Learner / Instructor / Admin UI
│   │   └── vite-plugins/     # copy-sqljs-wasm
│   ├── api/                  # @stella/api — Hono API → Cloudflare Workers
│   │   └── src/              # /api/chat, /api/healthz
│   └── vscode/               # informal (`falcon.informal`) — 学習者のコード演習用 VS Code 拡張
├── packages/
│   ├── shared/               # @stella/shared — 課題型・カリキュラム・採点ロジック
│   └── code-runner/          # @stella/code-runner — JS/SQL ランナー (QuickJS WASM / sql.js)
├── apps/api/drizzle/         # Drizzle マイグレーション (Cloudflare D1)
├── tsconfig.base.json
└── package.json              # Bun workspaces
```

> **アーキテクチャ (#cloudflare)**: **Cloudflare D1 + Google OAuth + R2 + Workers (Static Assets)**。
> フロントは DB を直接叩かず、 全アクセスが Hono API (`apps/api`) を経由し、 認可はアプリ層に集約されている。
> 詳細は [`docs/cloudflare-stack.md`](docs/cloudflare-stack.md) を参照。
>
> **デプロイ**: 旧 Cloudflare Pages から Workers Static Assets (`stella-web`) へ移行済み。
> デプロイは GitHub Actions（PR は `ci.yml` で検証ゲート、`main` は `deploy.yml` が自動デプロイ）。
> 詳細は [`docs/ci-cd.md`](docs/ci-cd.md) を参照。

## スタック

- **Vite 5 + React 19 + TypeScript 7 (strict)** — フロント (`apps/web`) → Cloudflare Workers (Static Assets)
- **Hono + Cloudflare Workers** — API (`apps/api`)。 認可をアプリ層に集約
- **Cloudflare D1** — DB (Drizzle ORM / `drizzle-orm/d1`)
- **Google OAuth + JWT** — `/api/auth/google`, `AUTH_JWT_SECRET`, `GOOGLE_CLIENT_*`
- **Cloudflare R2** — 教材配信・アップロード (Workers R2 バインディング + 公開 URL)
- **Tailwind CSS v4 + shadcn/ui** (`apps/web/src/components/ui/`)
- **Radix UI** プリミティブ
- **Bun** (パッケージマネージャ / Workspaces)
- **採点エンジン**: QuickJS WASM (in Web Worker) / sql.js (SQLite in browser)
- **VS Code 拡張** (`falcon.informal` / `apps/vscode`) — 学習者のコード演習
- **AI**: Anthropic Claude (`/api/chat` 経由、Cloudflare Workers でプロキシ)

## セットアップ（実データ開発・既定）

日常の開発は **API + ローカル D1 + Google ログイン** を既定とする。
`VITE_SERVER_URL` 未設定のモック単体起動は [デモ専用](#デモ専用モック単体) を参照。

```bash
bun install
cp apps/web/.env.local.example apps/web/.env.local
cp apps/api/.dev.vars.example apps/api/.dev.vars
```

必須（ローカル）:

| ファイル | 変数 | 値の目安 |
|---------|------|---------|
| `apps/web/.env.local` | `VITE_SERVER_URL` | `http://127.0.0.1:8787`（example のまま） |
| `apps/api/.dev.vars` | `AUTH_JWT_SECRET` | 任意の長いランダム文字列（example のままでも可） |
| `apps/api/.dev.vars` | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud Console の OAuth クライアント |

任意: `ANTHROPIC_API_KEY`（AI チャット）、`VITE_MATERIALS_BASE_URL`（R2 教材）。

### DB 初期化

1. ローカル D1 は同梱設定の専用 ID を使う。本番の新規作成・既存データ移行は [Phase C 移行手順](docs/stella-infrastructure-migration.md) を参照。`deploy:prepare` が新名の DB の実 ID を取得する。
2. ローカル D1:

   ```bash
   bun run db:migrate      # wrangler d1 migrations apply --local
   bun run db:seed         # packages/content の TypeScript 研修 → D1
   bun run smoke:d1        # テーブル確認
   ```

   seed に含まれる `seed-admin` / `seed-instructor` / `seed-learner` / `seed-learner2` / `seed-sales` はキューや一覧確認用の固定ユーザーです。Google ログインした本人とは別です。自分のアカウントの招待・ロール昇格は下記「初回ログインとロール昇格」を参照してください。

   受講登録まわりは 2 人の受講者で見分けます。`seed-learner` は全ステージに登録済みで、その行は **自己開始の履歴** の形（`assigned_by = seed-learner` / `required = 0` / 期限なし）です — Phase 3b で管理者からの割り当ては廃止したので、登録が生まれる道は受講者自身の「始める」だけになりました。`seed-learner2` は **受講登録が 0 件** で、「まだ何も始めていない人」の画面（ホームのプレースメント案内、スキルマップの推奨、受講状況の空表示）を確認するための固定ユーザーです。`bun run db:seed` を 2 回流しても、この 2 人の登録件数は変わりません（`seed-learner` は全ステージ、`seed-learner2` は 0 件のまま）:

   ```bash
   bunx wrangler d1 execute stella-db --local --command \
     "select user_id, count(*) from enrollments where user_id like 'seed-learner%' group by user_id"
   ```

   ステージ ID が安定 UUID に変わったあと、古いローカル D1 で seed が失敗する場合は `apps/api/.wrangler/state`（または同等のローカル D1 状態）を削除してから `bun run db:migrate && bun run db:seed` をやり直してください。リモート D1（`db:seed:remote`）も既存のランダムな stage ID は書き換えられないため、安定 UUID 導入前に seed 済みなら wipe/再作成するか、衝突する stages 行を消してから再 seed してください。

### 起動（既定）

```bash
# ターミナル 1: API (http://127.0.0.1:8787)
bun run dev:api

# ターミナル 2: フロント (http://localhost:5173)
bun run dev
```

`apps/web/.env.local` の `VITE_SERVER_URL` が API オリジンと一致していること。

```bash
bun run typecheck        # 全 workspace の tsc --noEmit（型はこちらが見る）
bun run build            # 成果物を出す workspace だけ（web = Vite / vscode = esbuild）
```

特定 workspace だけ動かす場合:

```bash
bun run --filter=@stella/web dev
bun run --filter=@stella/api dev
bun run --filter=@stella/shared typecheck
```

### コード演習（VS Code 拡張）

学習者のコード演習はブラウザではなく VS Code 拡張 `falcon.informal`（`apps/vscode`）で行う。
Web はログイン・動画・ドキュメント・クイズ・CMS 用。講師の課題プレビュー（`AssignmentEditor`）だけ Web に残る。

**学習者**

1. Web にログインする
2. 拡張を入れる（ローカルは `apps/vscode` で `bun run package` した VSIX。Marketplace は下記の手順のみ。このリポジトリからは公開しない）
3. コードレッスンの「VS Code で開く」を押す。ワンタイム接続コードを載せた `vscode://falcon.informal/lesson?...&code=...` が開き、未接続でもその 1 クリックで接続とレッスン表示まで進む（接続専用ページは無い）

JWT は拡張の SecretStorage（`falcon.accessToken`）に入る。設定にトークンを貼らない。

**開発者**

`bun run dev:api` と `bun run dev` のあと、`apps/vscode` を VS Code で開いて F5 する（`.vscode/launch.json` の `extensionHost`。`--extensionDevelopmentPath` は `apps/vscode`）。モノレポルートを開いている場合は、同じ構成を `--extensionDevelopmentPath` が `apps/vscode` を指すようにしてから F5 する。
設定の既定は `falcon.serverUrl` = `http://127.0.0.1:8787`、`falcon.webUrl` = `http://127.0.0.1:5173`。
詳細は [`apps/vscode/README.md`](apps/vscode/README.md)。

**Marketplace（手順のみ・公開しない）**

CI では出さない。publisher は `falcon`。手元: `cd apps/vscode && bunx @vscode/vsce publish --no-dependencies`（`vsce login falcon` または `VSCE_PAT`）。

### 認証 (Google OAuth)

1. [Google Cloud Console](https://console.cloud.google.com/) で OAuth 2.0 クライアント ID を作成。
2. **認可済みリダイレクト URI** に以下を追加:
   - `http://127.0.0.1:8787/api/auth/google/callback` (ローカル)
   - `https://stella-api.a-sugai.workers.dev/api/auth/google/callback` (本番)
3. `apps/api/.dev.vars` に `AUTH_JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` を設定。
   本番は `wrangler secret put AUTH_JWT_SECRET` / `GOOGLE_CLIENT_SECRET`。
4. Web は `https://stella-web.a-sugai.workers.dev/auth/callback` で JWT を受け取る
   (SPA fallback は `apps/web/wrangler.toml` の `[assets] not_found_handling = "single-page-application"`)。

> **ログインできない場合**: 切り分け手順は
> [`docs/google-login-troubleshooting.md`](docs/google-login-troubleshooting.md) を参照
> (`/api/healthz` の `googleOAuthConfigured` / `jwtConfigured` で設定状況を確認できる)。
> ユーザー向けにはサポートページ `/support` (FAQ + 問い合わせフォーム) を案内する。

### 初回ログインとロール昇格

所属は**招待制のみ**。自由オンボーディング（任意テナント選択）は廃止済み。
未招待のまま Google ログインすると招待必要画面になり、テナントには入れない。

先に tenant `admin`（管理画面のユーザー招待）か、下記の開発用 SQL で
自分の Google メールを `profiles` + `auth_users`（同一 UUID）に登録してからログインする。
招待メール送信はない。先に未招待ログインしたあとで招待しても、再ログインで紐付く（救済）。

#### 開発ブートストラップ（ローカル D1）

seed の `seed-admin` 等は Google ログイン用ではない。自分の email を seed テナント `ses` へ直接入れる例
（`<uuid>` は同じ値を両方に使う。メールは自分のものに置換）:

```bash
cd apps/api

wrangler d1 execute stella-db --local --command \
  "insert into auth_users (id, email, created_at) values ('<uuid>', 'you@example.com', unixepoch() * 1000)"

wrangler d1 execute stella-db --local --command \
  "insert into profiles (id, tenant_id, role, display_name, initials, email, disabled, created_at) values ('<uuid>', 'ses', 'admin', 'You', 'Y', 'you@example.com', 0, unixepoch() * 1000)"
```

既に tenant `admin` で入れている場合は、管理画面の招待（単発 / CSV）で同じ email を追加してもよい。

#### ロール昇格（SQL）

Admin / Instructor / プラットフォーム管理を検証するとき（`apps/api` で実行）:

```bash
cd apps/api

# テナント管理者
wrangler d1 execute stella-db --local --command \
  "update profiles set role='admin' where email='you@example.com'"

# 講師
wrangler d1 execute stella-db --local --command \
  "update profiles set role='instructor' where email='you@example.com'"

# プラットフォーム管理者（組織マスタなどテナント横断。招待 UI からは付与不可）
wrangler d1 execute stella-db --local --command \
  "update profiles set role='platform_admin' where email='you@example.com'"
```

昇格後はブラウザをリロードしてロールを反映させる。
認可は `/api/me` の `profiles.role` を参照するため、ロール変更だけの再ログインは不要。

JWT の有効期限は **24 時間**。失効後は再ログインが必要（サーバー側 denylist / refresh は無い）。

### 手動検証チェックリスト

実データ経路が通っていることの確認（Tweaks パネルは使わない）:

- [ ] `curl -s http://127.0.0.1:8787/api/healthz` が `ok: true`（できれば `jwtConfigured` / `googleOAuthConfigured` も true）
- [ ] 招待済み email で `http://localhost:5173` から Google ログインできる
- [ ] Learner（UI 名; DB は `profiles.role='student'`）としてステージ一覧など D1（seed）由来のデータが見える
- [ ] 上記コマンドで `instructor` に上げたあと、Tweaks なしで講師画面（添削キュー等）が D1 データを表示する
- [ ] `admin` に上げたあと、Tweaks なしで管理画面（ユーザー / ステージ等）が D1 データを表示する
- [ ] 管理画面「レポート」で種別・期間を切り替えると D1 由来の明細が出て、CSV をダウンロードできる

### 認可・所属（#62）手動確認

- [ ] 未招待 Google ログイン → 招待必要画面（任意テナントに入れない）
- [ ] 招待後ログイン → 正しい tenant/role
- [ ] tenant admin は組織マスタ不可 / platform_admin は可
- [ ] 未認証で /api/chat・/api/review-draft が 401
- [ ] student で review-draft が 403

### コア学習ループの自動スモーク（#64）

ブラウザを使わず、起動中の API に HTTP だけでコア学習ループを 1 本流す E2E スモーク。
CI（`.github/workflows/ci.yml` の `core-loop` ジョブ）でも同じものが回る。

```bash
bun run dev:api      # ターミナル 1（migrate / seed 済みであること）
bun run smoke:core   # ターミナル 2
```

検証内容（45 ステップ）: ステージ作成 → 公開（draft は受講者に見えないことも確認）→
**受講者による自己開始**（割当が無くても道に星が出て「次の一歩」の候補になること / 開始が冪等で
期限も必須も付かないこと / 存在しない星は汎用文言の 400 / 講師・営業は 403 / 退役した割当 API
`POST /api/enrollments`・`/bulk`・プリセット適用が 410 を返すこと）→
割当プリセットの定義（同名の 409 / 退役した名前の再利用 / 教材削除で空になったプリセットの自動退役）→
レッスン進捗 → 課題提出 → VS Code からの引き継ぎ（同一課題の未添削提出が upsert され、
採点失敗サマリが講師側に届くこと）→ 添削キュー表示 → 受講者による添削の 403 → 添削確定 → 通知生成 →
講師が開いている間に学習者が引き継ぎ直したら添削を 409 で弾くこと /
添削確定後の引き継ぎが確定済みの提出を巻き戻さないこと / 壊れた採点サマリを 400 で弾くこと →
修了条件の充足 → 修了証の自動発行（受講者の手動発行は 403 / staff 再発行のべき等性・未認証での検証）→
監査ログ記録の確認 → 後片付け。

認証は OAuth を通さず、`apps/api/.dev.vars` の `AUTH_JWT_SECRET` で seed ユーザーの JWT を
直接発行する（`SMOKE_BASE_URL` / `SMOKE_LEARNER_ID` などで上書き可）。
作成したステージと受講登録は最後に削除するが、提出物に削除 API がないため
`[smoke]` 付きの提出が 1 件残る（添削確定済みなのでキューには出ない）。

### コア学習ループ（#61）手動 E2E

UI を含めた確認。API レベルの検証は上記のスモークで代替できる。

前提: `dev:api` + `dev`、Google ログイン、必要なら admin/instructor 昇格。
受講登録は **学習者が自分で作る**（Phase 3b で管理者の割当は廃止）。

- [ ] Admin がステージを公開し、教材を R2 にアップロードできる
- [ ] 受講登録が 0 件の学習者のホームに「学びの地図へようこそ」（プレースメント）が出て、
      おすすめから「ここから始める」を押すとそのステージが進行中になる（「あとで選ぶ」で閉じられる）
- [ ] ホームの「ステージの道」／スキルツリーで、解放済みの星から「ここから始める」で開始できる
      （ロック星・霧より先の星には出ない。腕試しに合格した飛び級の星もそのまま始められる）
- [ ] スキルツリーで、2 歩先の星は名前がぼやけ（解放条件も出ない）、3 歩先は星が無く線だけが薄れて消え、
      4 歩以上先は何も出ない（開発者モードの FAB をオンにすると全部出る）
- [ ] Admin の「受講状況」画面が読み取り専用で、誰がどのステージをいつ開始したかを一覧・CSV 出力できる
      （割当・一括割当・プリセット適用のボタンが無いこと）
- [ ] 学習者がレッスン進捗・クイズ・課題提出を実行し、D1 に残る（再ログイン後も見える）
- [ ] 学習者が最後の修了条件を満たすと「ステージクリア！」ダイアログが出て、
      「スキルツリーを見る」で遷移した先に次の星が解放されている
      （修了証ページには自動発行済みの修了証が並び、「発行する」ボタンは無い）
- [ ] 講師が ReviewQueue から添削確定でき、失敗時はエラートースト（成功時のみ「LMS通知」文言）
- [ ] VS Code で採点が未クリアのとき「講師に引き継ぐ」が出て、押すと ReviewQueue に載る
      （レッスンは完了にならない / 何度押しても同じ 1 件が上書きされ attempt が増える）
- [ ] ReviewEditor の「自動採点」タブに Lint / AST / 失敗テストが出る
- [ ] 学習者 Dashboard / 通知から ReviewResultView で verdict・rubric・行コメント・要約が見える
- [ ] 未受講ステージのクイズは受験できない
- [ ] API 停止時に stages / announcements が fixtures に化けない（#60）
- [ ] 別ブラウザ（またはシークレット）で再ログイン後も進捗・提出履歴が見える

### デモ専用（モック単体）

`VITE_SERVER_URL` を空のまま `bun run dev` だけ起動すると、fixtures とモックログインで UI を試せる。
バックティック (`` ` ``) の Tweaks パネルでロール切替可能。状態は `localStorage` の `lms_state`。

**日常開発・ #58 以降の作業には使わない。** 障害調査や API なしの画面確認用のデモ経路である。

ロール別の画面一覧（参考）:

- **受講者 (Learner)** — ダッシュボード / ステージ一覧 / レッスン視聴 / Q&A / 修了証
- **講師 (Instructor)** — ダッシュボード / 添削キュー / AI下書き付き添削エディタ
- **テナント管理者 (Admin)** — KPIダッシュボード / ユーザー管理 / ステージ管理 / 監査ログ

### Cloudflare R2 (教材配信・アップロード)

1. R2 バケット `stella-materials-public` は `apps/api/wrangler.toml` の `[[r2_buckets]]` で Workers にバインド済み。
   未作成の場合は Dashboard または `wrangler r2 bucket create stella-materials-public` で作成する。
2. Dashboard → R2 → バケット → **Settings** で **Public Development URL** (`r2.dev`) または
   **Custom Domain** を有効化し、 公開ベース URL を `VITE_MATERIALS_BASE_URL` に設定する
   (例: `https://pub-xxxx.r2.dev`)。
3. アップロードは `/api/materials/upload` 経由 (講師/管理者)。 Workers の R2 バインディングを使うため
   S3 API トークンは不要。
4. 既存オブジェクトを R2 へ移送する（必要なら）。

seed 教材パスは `tenant/ses/courses/{stageUuid}/...` 形式 (`courses/` は改名前からの R2 キーで、値は変えていない)。オブジェクトが R2 に無いと再生は失敗する。Admin の教材アップロード、または同キーでの配置で確認する。

#### 孤児オブジェクトの棚卸し・掃除（#64）

教材の差し替えや削除時の R2 削除失敗（best-effort）で、DB から参照されない実体が残ることがある。

```bash
bun run r2:orphans              # 棚卸しのみ（既定・削除しない）
bun run r2:orphans -- --delete  # 一覧に出た孤児を削除
```

API の保守エンドポイント（`GET /api/admin/r2/orphans` / `POST /api/admin/r2/orphans/cleanup`、
tenant admin 以上）の薄いラッパ。1 リクエストの走査件数には上限があり、超える場合は
`next_cursor` を返す（CLI はカーソルを辿って全件走査する）。分割走査になったときは
「DB 行に対する実体なし判定」だけスキップする（そのページに出なかっただけの参照と区別できないため）。
走査・削除とも呼び出し元テナントの `tenant/<tenantId>/` 配下に限定し、
参照判定には配布資料（`lesson_materials.path`）に加えてレッスンの動画・スライド
（`lessons.video_path` / `pdf_path`）も含める。DB に行があるのに実体が無いパスも併せて報告する。
削除は監査ログ（`r2_orphan_cleanup`）に残る。

本番に対して実行する場合は `API_BASE_URL` と、admin の JWT を `ADMIN_TOKEN` に渡す
（未指定ならローカルの `.dev.vars` から `seed-admin` の JWT を発行する）。

### 講師添削 (Issue #8)

受講者が `assignment` 型レッスンからコードを提出すると、 講師ロールの「添削待ち」キューに表示されます。
実データ経路では Google ログイン後に `instructor`（または `admin`）へロール昇格したアカウントでキューを開く。
AI 下書き (`POST /api/review-draft`) は API キー未設定時はルールベースのヒューリスティックにフォールバックする。

- DB 永続化 (D1 設定時): `submissions` テーブル (`/api/submissions` 経由、 ログインが必要)

### レッスン進捗の永続化 (Issue #21)

レッスン視聴進捗 (動画の視聴秒数 / スライドの閲覧ページ / 完了フラグ) を保存します。

- デモ専用 (`VITE_SERVER_URL` 未設定): `localStorage` キー `lms_lesson_progress`
- DB 永続化 (D1 設定時): `lesson_progress` テーブル (`/api/lesson-progress` 経由、 ログインが必要)。
  ログイン中はサーバから進捗を取り込み (端末間は updated_at による Last-Write-Wins でマージ)、 以降の更新を自動 upsert します。
  講師 / 管理者はアプリ層の認可により同テナントの進捗を read できます (可視化 UI は別 Issue)。

### 学習アクティビティ (Issue #73)

`lesson_progress` はレッスンごとの最終状態しか持たないため、日別の学習履歴は
`study_activity` テーブル (`user_id` / `date` / `watched_sec` / `completed_lessons`) に別途積みます。

- `POST /api/lesson-progress` の upsert 時に、サーバが「反映前後の差分」
  (視聴秒数の増分 / 未完了 → 完了に変わったレッスン数) を当日分へ加算します。
  進捗と日別ログは D1 の batch で 1 トランザクションにまとめて書きます。
- 日付境界はアプリ基準 TZ (Asia/Tokyo) で切ります (`@stella/shared/study/activity`)。
- `GET /api/study-activity/mine?days=14` が欠損日を 0 埋めした系列と連続学習日数を返し、
  受講者ダッシュボードの「週間学習時間」チャートと「連続学習」KPI がこれを描画します。
  受講者は自分のログのみ参照できます。
- テナントのテストモード中に招待された受講者には、動作確認用の日別ログも投入されます
  (→ [テストモード](#テストモード-issue-58--76))。

### 成績台帳と修了証 (Issue #26)

ステージの **修了基準** (全レッスン完了 / 小テスト合格 / 課題 pass) を満たすと修了と判定し、
**修了証 (certificates)** を実データで発行・検証できます。

- ステージ編集画面 (管理者) の「修了基準」で、 必須にする条件と自動発行の可否をトグルできます。
- 自動発行が許可されたステージは、 修了条件を満たした時点で**サーバが自動的に修了証を発行**し、
  受講登録を completed にします (レッスン完了の同期 / 小テスト合格 / 課題の合格確定がトリガ)。
  クリア時は画面にダイアログが出て、 スキルツリーで解放された次のステージへ誘導します。
- 講師 / 管理者は **成績台帳** (サイドバー → 成績台帳) で受講者ごとの達成状況を確認し、
  基準達成者へ修了証を承認発行できます (講師承認ステージはこちらが唯一の発行経路)。
- 受講者は **修了証** ページで発行済みの修了証を確認でき、 認定番号 (`cert_code`) と
  公開検証ページへのリンクを得られます (受講者による手動発行は廃止)。
- 公開検証ページは **ログイン不要**で `/?cert=<CODE>` から到達し、 真正性を確認できます。
  検証は匿名エンドポイント `GET /api/certificates/verify/:code` 経由で、 公開して良い情報のみ返します。
- DB 永続化 (D1 設定時): `certificates` テーブル + 判定/発行/匿名検証 (`/api/certificates/*`)。
  デモ専用 (`VITE_SERVER_URL` 未設定) では修了証ページが静的デモ表示にフォールバックします。

### レポート (Issue #75)

管理画面サイドバーの **レポート** は、 期間を指定して明細を CSV に書き出す横断エクスポートです
(KPI ダッシュボード #28 の「今の状態」、 成績台帳 #26 の「ステージ単位の一覧」とは別の用途)。

- 種別: **受講状況** (受講登録ごとの進捗 / 期限 / 完了) · **成績** (小テスト受験 + 課題提出) ·
  **修了証** (発行済み一覧) · **監査** (操作証跡)。
- 期間: 今月 / 先月 / 直近30日 / 直近90日 / 年初来 / 全期間 / 日付指定。
  日付境界はアプリ基準 TZ (Asia/Tokyo) で切ります。
- 画面はプレビュー (先頭 200 件) を表示し、「CSV出力」は条件に一致する全件をページングで取得します。
  列定義は `@stella/shared/admin/reports` に集約しており、 プレビュー表と CSV は同じ変換を通ります。
- API: `GET /api/reports/:type?from=&to=&limit=&offset=` (from/to は ISO 日時 または `YYYY-MM-DD` · inclusive。
  日付だけを渡した場合はアプリ基準 TZ の日境界として解釈します)。
  同テナントの `admin` / `platform_admin` のみ。 母集合は caller のテナントに固定されます。
- 件数 (`total`) は各テーブルの `COUNT` で数えるため、 取得上限で明細が欠けることはありません
  (成績は小テストと課題を提出日時で併合するため、 ページ確定に必要な分だけ各表から読みます)。
- 出力は **CSV のみ** です (Issue #75 の受け入れ基準に合わせたスコープ。 Excel 形式は未対応)。
- デモ専用 (`VITE_SERVER_URL` 未設定) では実データが無いため、 デモ行は出さず案内のみ表示します。

### テストモード (Issue #58 / #76)

管理画面サイドバーの **設定** で、 テナントごとに **テストモード** を切り替えられます。
ON の間に招待 (ユーザー登録) されたユーザーには、 直後に動作確認用のテストデータが入り、
受講者 / 講師 / 管理者の主要画面を空のまま眺めることなく確認できます。

- **受講者を招待したとき**: 公開ステージへの受講登録 (期限 30 日後 / 必須) · 最初のレッスンの完了進捗 ·
  直近 8 日の日別学習ログ · サンプル提出 3 件 (添削待ち 2 件 + 添削済み 1 件) ·
  サンプル Q&A 2 スレッド (未返信 1 件 + 講師返信済み 1 件) · 通知 3 件
  (ようこそ / 添削完了 / Q&A 回答)。
  提出は課題・演習レッスンに紐付き、 添削待ちの 1 件はあえて AI 下書き未生成にしてあるため、
  ReviewEditor を開くと `/api/review-draft` の生成経路まで確認できます。
- **講師 / 管理者を招待したとき**: テナントに添削待ちの提出も未返信 Q&A も無い場合に限り、
  既存の受講者名義でサンプルを補充します (受講者を先に招待していれば何もしません)。
  講師 ↔ 受講者の担当割当モデルは無く、 講師画面の母集合はテナント全体です。
- したがって **受講者と講師を 1 人ずつ招待すれば、 どちらの順でも** 三者の主要画面が埋まります。
- 投入したデータは通常のレコードなので、 テストモードを OFF にしても消えません。
  本文には「(テストデータ)」を含め、 通知 / 監査ログの payload には `test_data: true` が入ります。
- 雛形と投入処理はどちらも `apps/api/src/lib/test-data.ts` にあります。
  現在の投入経路は招待 (`POST /api/admin/users/invite`) のみです。 セルフサインアップ
  (Google ログインだけで profile を作る経路) はまだ無いため、 その経路が入る際に
  `insertTestDataForNewUser()` のフックを足します (Issue #76 の残タスク)。

### Anthropic (AIチャット用、 任意)

`apps/api/.dev.vars` に `ANTHROPIC_API_KEY` を設定。 既定モデルは `claude-sonnet-4-6`。
本番は Cloudflare Workers の Secret (`wrangler secret put ANTHROPIC_API_KEY`) で管理する。

## デザイントークン

`apps/web/src/index.css` の `:root` に生トークン、 `@theme inline` で Tailwind ユーティリティに射影。

- Surface: warm off-white `oklch(98.5% 0.004 85)`
- Ink: near-black `oklch(22% 0.01 260)`
- Brand: deep indigo `oklch(46% 0.15 265)`
- Typography: Inter + Noto Sans JP + JetBrains Mono

## ロードマップ

| Phase | 内容 | Issue |
|---|---|---|
| **P0** | monorepo化 + js-review-prototype取り込み + 教材ストレージ | #2 |
| **P1** | 教材閲覧 (PDFスライドビューア + 動画プレイヤー + 進捗) | #3 |
| **P2** | コード演習統合 (PracticeWorkspace + AIChatBot リアル化) | #4 |
| **P3** | 講師添削ワークフロー (提出 → AI下書き → ルーブリック採点 → 確定) | #8 |
| **P5** | 教材 CMS — 講師が UI からステージ・レッスン・課題を作成 / 編集 (DB スキーマ + RLS + 管理画面 骨組み) | #10 |

## デプロイ

**通常のデプロイは GitHub Actions が自動実行する**（手動 `wrangler` ではない）。
`pull_request` は `ci.yml` が lint/typecheck/test/build を検証ゲートとして実行し、
`main` への push は `deploy.yml` が同じ検証 → 教材の変更判定 → 教材画像 / PDF の R2 アップロード → D1 migrate(remote) → API デプロイ → D1 seed(remote) → Web デプロイを直列実行する。seed は教材ファイルを正本として D1 を upsert / prune する。教材もスキーマも変わっていない push では教材まわり（画像 / PDF / seed）を丸ごと飛ばす。
GitHub リポジトリの Secrets（`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`）と
Variables（`VITE_SERVER_URL` / `VITE_MATERIALS_BASE_URL`）の設定が必要。
詳細（ワークフロー一覧・必須チェック設定・OAuth Console 手順・失敗時の再デプロイ）は
[`docs/ci-cd.md`](docs/ci-cd.md) を参照。

Phase C の初回切替は [インフラ移行手順](docs/stella-infrastructure-migration.md) に従う。
全セッションが失効するため、告知とメンテナンス中の D1 / R2 移行を済ませてからマージする。
本番 API は `https://stella-api.a-sugai.workers.dev`、Web は `https://stella-web.a-sugai.workers.dev`。

Deploy は教材処理の前に `bun run deploy:prepare` を実行し、`stella-db` の実 ID を取得する。
Git 上のゼロ UUID はローカル専用で、本番デプロイには使わない。
障害復旧で remote コマンドを直接実行するときも、`CLOUDFLARE_*` と `VITE_*` を設定し、
リポジトリルートで `deploy:prepare` を先に実行する。復旧手順は `docs/ci-cd.md` を参照。

**環境変数 / Secrets**

| 名前 | 種別 | 用途 |
|---|---|---|
| `AUTH_JWT_SECRET` | Secret | JWT 署名 (必須) |
| `GOOGLE_CLIENT_ID` | var / Secret | Google OAuth クライアント ID |
| `GOOGLE_CLIENT_SECRET` | Secret | Google OAuth シークレット |
| `ANTHROPIC_API_KEY` | Secret | Anthropic API |
| `DB` | D1 binding | データベース (`wrangler.toml`) |
| `MATERIALS_BUCKET` | R2 binding | 教材アップロード |
| `ALLOWED_ORIGINS` | var | CORS 許可オリジン |

### バックエンド — 完全 Cloudflare

- **D1** — LMS データ
- **Workers** — API + Google OAuth 認証
- **R2** — 教材ファイル
- **Workers (Static Assets)** — フロント

詳細: [`docs/cloudflare-stack.md`](docs/cloudflare-stack.md)
