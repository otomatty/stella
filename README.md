# FALCON INFORMAL

部活動指導者講習とSES未経験エンジニア育成を **単一基盤で支えるLMS** のプロトタイプ。

- 教材を見る (PDFスライド / 動画) — P1
- 演習する (CodeMirror + Lint + AST + テスト実行) — P2
- 採点される / AIに質問する — P2

## モノレポ構成

```text
falcon-informal/
├── apps/
│   ├── web/                  # @falcon/web — LMS フロント (Vite + React) → Cloudflare Workers (Static Assets)
│   │   ├── src/              # Learner / Instructor / Admin UI
│   │   └── vite-plugins/     # copy-sqljs-wasm
│   └── api/                  # @falcon/api — Hono API → Cloudflare Workers
│       └── src/              # /api/chat, /api/healthz
├── packages/
│   ├── shared/               # @falcon/shared — 課題型・カリキュラム・採点ロジック
│   └── code-runner/          # @falcon/code-runner — JS/SQL ランナー (QuickJS WASM / sql.js)
├── apps/api/drizzle/         # Drizzle マイグレーション (Cloudflare D1)
├── tsconfig.base.json
└── package.json              # Bun workspaces
```

> **アーキテクチャ (#cloudflare)**: **Cloudflare D1 + Google OAuth + R2 + Workers (Static Assets)**。
> フロントは DB を直接叩かず、 全アクセスが Hono API (`apps/api`) を経由し、 認可はアプリ層に集約されている。
> 詳細は [`docs/cloudflare-stack.md`](docs/cloudflare-stack.md) を参照。
>
> **デプロイ**: 旧 Cloudflare Pages から Workers Static Assets (`falcon-web`) へ移行済み。
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

1. 初回のみ（リモート D1 を新規作成する場合）: `cd apps/api && wrangler d1 create falcon-db` → `wrangler.toml` の `database_id` を更新。
2. ローカル D1:

   ```bash
   bun run db:migrate      # wrangler d1 migrations apply --local
   bun run db:seed         # fixtures → D1
   bun run smoke:d1        # テーブル確認
   ```

   seed に含まれる `seed-admin` / `seed-instructor` / `seed-learner` はキューや一覧確認用の固定ユーザーです。Google ログインした本人とは別です。自分のアカウントの招待・ロール昇格は下記「初回ログインとロール昇格」を参照してください。

   コース ID が安定 UUID に変わったあと、古いローカル D1 で seed が失敗する場合は `apps/api/.wrangler/state`（または同等のローカル D1 状態）を削除してから `bun run db:migrate && bun run db:seed` をやり直してください。リモート D1（`db:seed:remote`）も既存のランダム course ID は書き換えられないため、安定 UUID 導入前に seed 済みなら wipe/再作成するか、衝突する course 行を消してから再 seed してください。

### 起動（既定）

```bash
# ターミナル 1: API (http://127.0.0.1:8787)
bun run dev:api

# ターミナル 2: フロント (http://localhost:5173)
bun run dev
```

`apps/web/.env.local` の `VITE_SERVER_URL` が API オリジンと一致していること。

```bash
bun run build            # 全 workspace の build
bun run typecheck        # 全 workspace の tsc --noEmit
```

特定 workspace だけ動かす場合:

```bash
bun run --filter=@falcon/web dev
bun run --filter=@falcon/api dev
bun run --filter=@falcon/shared typecheck
```

### 認証 (Google OAuth)

1. [Google Cloud Console](https://console.cloud.google.com/) で OAuth 2.0 クライアント ID を作成。
2. **認可済みリダイレクト URI** に以下を追加:
   - `http://127.0.0.1:8787/api/auth/google/callback` (ローカル)
   - `https://falcon-api.a-sugai.workers.dev/api/auth/google/callback` (本番)
3. `apps/api/.dev.vars` に `AUTH_JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` を設定。
   本番は `wrangler secret put AUTH_JWT_SECRET` / `GOOGLE_CLIENT_SECRET`。
4. Web は `https://falcon-web.a-sugai.workers.dev/auth/callback` で JWT を受け取る
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

wrangler d1 execute falcon-db --local --command \
  "insert into auth_users (id, email, created_at) values ('<uuid>', 'you@example.com', unixepoch() * 1000)"

wrangler d1 execute falcon-db --local --command \
  "insert into profiles (id, tenant_id, role, display_name, initials, email, disabled, created_at) values ('<uuid>', 'ses', 'admin', 'You', 'Y', 'you@example.com', 0, unixepoch() * 1000)"
```

既に tenant `admin` で入れている場合は、管理画面の招待（単発 / CSV）で同じ email を追加してもよい。

#### ロール昇格（SQL）

Admin / Instructor / プラットフォーム管理を検証するとき（`apps/api` で実行）:

```bash
cd apps/api

# テナント管理者
wrangler d1 execute falcon-db --local --command \
  "update profiles set role='admin' where email='you@example.com'"

# 講師
wrangler d1 execute falcon-db --local --command \
  "update profiles set role='instructor' where email='you@example.com'"

# プラットフォーム管理者（組織マスタなどテナント横断。招待 UI からは付与不可）
wrangler d1 execute falcon-db --local --command \
  "update profiles set role='platform_admin' where email='you@example.com'"
```

昇格後はブラウザをリロードしてロールを反映させる。
認可は `/api/me` の `profiles.role` を参照するため、ロール変更だけの再ログインは不要。

JWT の有効期限は **24 時間**。失効後は再ログインが必要（サーバー側 denylist / refresh は無い）。

### 手動検証チェックリスト

実データ経路が通っていることの確認（Tweaks パネルは使わない）:

- [ ] `curl -s http://127.0.0.1:8787/api/healthz` が `ok: true`（できれば `jwtConfigured` / `googleOAuthConfigured` も true）
- [ ] 招待済み email で `http://localhost:5173` から Google ログインできる
- [ ] Learner（UI 名; DB は `profiles.role='student'`）としてコース一覧など D1（seed）由来のデータが見える
- [ ] 上記コマンドで `instructor` に上げたあと、Tweaks なしで講師画面（添削キュー等）が D1 データを表示する
- [ ] `admin` に上げたあと、Tweaks なしで管理画面（ユーザー / コース等）が D1 データを表示する
- [ ] 管理画面「レポート」で種別・期間を切り替えると D1 由来の明細が出て、CSV をダウンロードできる

### 認可・所属（#62）手動確認

- [ ] 未招待 Google ログイン → 招待必要画面（任意テナントに入れない）
- [ ] 招待後ログイン → 正しい tenant/role
- [ ] tenant admin は組織マスタ不可 / platform_admin は可
- [ ] 未認証で /api/chat・/api/review-draft が 401
- [ ] student で review-draft が 403

### コア学習ループ（#61）手動 E2E

前提: `dev:api` + `dev`、Google ログイン、必要なら admin/instructor 昇格、受講登録済み。

- [ ] Admin がコースを公開し、教材を R2 にアップロードできる
- [ ] 学習者を受講登録できる（Admin 受講登録画面）
- [ ] 学習者がレッスン進捗・クイズ・課題提出を実行し、D1 に残る（再ログイン後も見える）
- [ ] 講師が ReviewQueue から添削確定でき、失敗時はエラートースト（成功時のみ「LMS通知」文言）
- [ ] 学習者 Dashboard / 通知から ReviewResultView で verdict・rubric・行コメント・要約が見える
- [ ] 未受講コースのクイズは受験できない
- [ ] API 停止時に courses / announcements が fixtures に化けない（#60）
- [ ] 別ブラウザ（またはシークレット）で再ログイン後も進捗・提出履歴が見える

### デモ専用（モック単体）

`VITE_SERVER_URL` を空のまま `bun run dev` だけ起動すると、fixtures とモックログインで UI を試せる。
バックティック (`` ` ``) の Tweaks パネルでロール切替可能。状態は `localStorage` の `lms_state`。

**日常開発・ #58 以降の作業には使わない。** 障害調査や API なしの画面確認用のデモ経路である。

ロール別の画面一覧（参考）:

- **受講者 (Learner)** — ダッシュボード / コース一覧 / レッスン視聴 / Q&A / 修了証
- **講師 (Instructor)** — ダッシュボード / 添削キュー / AI下書き付き添削エディタ
- **テナント管理者 (Admin)** — KPIダッシュボード / ユーザー管理 / コース管理 / 監査ログ

### Cloudflare R2 (教材配信・アップロード)

1. R2 バケット `falcon-materials-public` は `apps/api/wrangler.toml` の `[[r2_buckets]]` で Workers にバインド済み。
   未作成の場合は Dashboard または `wrangler r2 bucket create falcon-materials-public` で作成する。
2. Dashboard → R2 → バケット → **Settings** で **Public Development URL** (`r2.dev`) または
   **Custom Domain** を有効化し、 公開ベース URL を `VITE_MATERIALS_BASE_URL` に設定する
   (例: `https://pub-xxxx.r2.dev`)。
3. アップロードは `/api/materials/upload` 経由 (講師/管理者)。 Workers の R2 バインディングを使うため
   S3 API トークンは不要。
4. 既存オブジェクトを R2 へ移送する（必要なら）。

seed 教材パスは `tenant/ses/courses/{courseUuid}/...` 形式。オブジェクトが R2 に無いと再生は失敗する。Admin の教材アップロード、または同キーでの配置で確認する。

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
- 日付境界はアプリ基準 TZ (Asia/Tokyo) で切ります (`@falcon/shared/study/activity`)。
- `GET /api/study-activity/mine?days=14` が欠損日を 0 埋めした系列と連続学習日数を返し、
  受講者ダッシュボードの「週間学習時間」チャートと「連続学習」KPI がこれを描画します。
  受講者は自分のログのみ参照できます。
- テナントのテストモード中に招待された受講者には、動作確認用の日別ログも投入されます。

### 成績台帳と修了証 (Issue #26)

コースの **修了基準** (全レッスン完了 / 小テスト合格 / 課題 pass) を満たすと修了と判定し、
**修了証 (certificates)** を実データで発行・検証できます。

- コース編集画面 (管理者) の「修了基準」で、 必須にする条件と自動発行の可否をトグルできます。
- 講師 / 管理者は **成績台帳** (サイドバー → 成績台帳) で受講者ごとの達成状況を確認し、
  基準達成者へ修了証を承認発行できます。
- 受講者は **修了証** ページで、 達成済みコースの修了証を発行 (自動発行が許可されたコース) /
  確認でき、 認定番号 (`cert_code`) と公開検証ページへのリンクを得られます。
- 公開検証ページは **ログイン不要**で `/?cert=<CODE>` から到達し、 真正性を確認できます。
  検証は匿名エンドポイント `GET /api/certificates/verify/:code` 経由で、 公開して良い情報のみ返します。
- DB 永続化 (D1 設定時): `certificates` テーブル + 判定/発行/匿名検証 (`/api/certificates/*`)。
  デモ専用 (`VITE_SERVER_URL` 未設定) では修了証ページが静的デモ表示にフォールバックします。

### レポート (Issue #75)

管理画面サイドバーの **レポート** は、 期間を指定して明細を CSV に書き出す横断エクスポートです
(KPI ダッシュボード #28 の「今の状態」、 成績台帳 #26 の「コース単位の一覧」とは別の用途)。

- 種別: **受講状況** (受講登録ごとの進捗 / 期限 / 完了) · **成績** (小テスト受験 + 課題提出) ·
  **修了証** (発行済み一覧) · **監査** (操作証跡)。
- 期間: 今月 / 先月 / 直近30日 / 直近90日 / 年初来 / 全期間 / 日付指定。
  日付境界はアプリ基準 TZ (Asia/Tokyo) で切ります。
- 画面はプレビュー (先頭 200 件) を表示し、「CSV出力」は条件に一致する全件をページングで取得します。
  列定義は `@falcon/shared/admin/reports` に集約しており、 プレビュー表と CSV は同じ変換を通ります。
- API: `GET /api/reports/:type?from=&to=&limit=&offset=` (from/to は ISO 日時 または `YYYY-MM-DD` · inclusive。
  日付だけを渡した場合はアプリ基準 TZ の日境界として解釈します)。
  同テナントの `admin` / `platform_admin` のみ。 母集合は caller のテナントに固定されます。
- 件数 (`total`) は各テーブルの `COUNT` で数えるため、 取得上限で明細が欠けることはありません
  (成績は小テストと課題を提出日時で併合するため、 ページ確定に必要な分だけ各表から読みます)。
- 出力は **CSV のみ** です (Issue #75 の受け入れ基準に合わせたスコープ。 Excel 形式は未対応)。
- デモ専用 (`VITE_SERVER_URL` 未設定) では実データが無いため、 デモ行は出さず案内のみ表示します。

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
| **P5** | 教材 CMS — 講師が UI からコース・レッスン・課題を作成 / 編集 (DB スキーマ + RLS + 管理画面 骨組み) | #10 |

## デプロイ

**通常のデプロイは GitHub Actions が自動実行する**（手動 `wrangler` ではない）。
`pull_request` は `ci.yml` が lint/typecheck/test/build を検証ゲートとして実行し、
`main` への push は `deploy.yml` が同じ検証 → D1 migrate(remote) → API デプロイ → Web デプロイを直列実行する。
GitHub リポジトリの Secrets（`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`）と
Variables（`VITE_SERVER_URL` / `VITE_MATERIALS_BASE_URL`）の設定が必要。
詳細（ワークフロー一覧・必須チェック設定・OAuth Console 手順・失敗時の再デプロイ）は
[`docs/ci-cd.md`](docs/ci-cd.md) を参照。

以下はローカルからの手動デプロイ手順（初回セットアップ / 障害時の代替手段）。

### フロント — Cloudflare Workers Static Assets (`apps/web`)

```bash
bun run deploy:web   # build + wrangler deploy
```

- **環境変数** (ビルド時に焼き込み。通常は GitHub Actions Variables から供給):
  - `VITE_SERVER_URL` — Workers API URL
  - `VITE_MATERIALS_BASE_URL` — R2 公開 URL
- 本番 URL 例: `https://falcon-web.a-sugai.workers.dev`

### API — Cloudflare Workers (`apps/api`)

```bash
cd apps/api
wrangler d1 create falcon-db          # 初回: database_id を wrangler.toml に反映
bun run db:migrate:remote
wrangler secret put AUTH_JWT_SECRET
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put ANTHROPIC_API_KEY   # 任意
bun run deploy
```

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
