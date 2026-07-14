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

## セットアップ

```bash
bun install
cp apps/web/.env.local.example apps/web/.env.local
cp apps/api/.dev.vars.example apps/api/.dev.vars
# 各ファイルを編集 (AUTH_JWT_SECRET / Anthropic 等)
```

> フィクスチャのフォールバックにより、 API / Auth 未設定でもモックログインで全ロール
> (Learner / Instructor / Admin) を Tweaks パネル (バックティック `` ` `` キー) から試せる。

### Cloudflare D1 (DB / マイグレーション)

1. 初回: `cd apps/api && wrangler d1 create falcon-db` → `wrangler.toml` の `database_id` を更新。
2. ローカル D1 にマイグレーション適用:

   ```bash
   bun run db:migrate      # wrangler d1 migrations apply --local
   bun run db:seed         # fixtures → D1
   bun run smoke:d1        # 21/21 テーブル確認
   ```

3. 初回 Google ログイン後は `profiles` に `role='student'` で行が作られる。 管理者:

   ```bash
   wrangler d1 execute falcon-db --local --command "update profiles set role='admin' where email='you@example.com'"
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

### Cloudflare R2 (教材配信・アップロード)

1. R2 バケット `falcon-materials-public` は `apps/api/wrangler.toml` の `[[r2_buckets]]` で Workers にバインド済み。
   未作成の場合は Dashboard または `wrangler r2 bucket create falcon-materials-public` で作成する。
2. Dashboard → R2 → バケット → **Settings** で **Public Development URL** (`r2.dev`) または
   **Custom Domain** を有効化し、 公開ベース URL を `VITE_MATERIALS_BASE_URL` に設定する
   (例: `https://pub-xxxx.r2.dev`)。
3. アップロードは `/api/materials/upload` 経由 (講師/管理者)。 Workers の R2 バインディングを使うため
   S3 API トークンは不要。
4. 既存オブジェクトを R2 へ移送する（必要なら）。

### 講師添削 (Issue #8)

受講者が `assignment` 型レッスンからコードを提出すると、 講師ロールの「添削待ち」キューに表示されます。
Tweaks パネルで講師ロールに切り替え、 キューから添削エディタを開くと AI 下書き (`POST /api/review-draft`) が生成されます
(API キー未設定時はルールベースのヒューリスティックにフォールバック)。

- DB 永続化 (D1 設定時): `submissions` テーブル (`/api/submissions` 経由、 ログインが必要)

### レッスン進捗の永続化 (Issue #21)

レッスン視聴進捗 (動画の視聴秒数 / スライドの閲覧ページ / 完了フラグ) を保存します。

- ローカル (デモ / API 未設定): `localStorage` キー `lms_lesson_progress`
- DB 永続化 (D1 設定時): `lesson_progress` テーブル (`/api/lesson-progress` 経由、 ログインが必要)。
  ログイン中はサーバから進捗を取り込み (端末間は updated_at による Last-Write-Wins でマージ)、 以降の更新を自動 upsert します。
  講師 / 管理者はアプリ層の認可により同テナントの進捗を read できます (可視化 UI は別 Issue)。

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
  API 未設定時は修了証ページが静的デモ表示にフォールバックします。

### Anthropic (AIチャット用、 任意)

`apps/api/.dev.vars` に `ANTHROPIC_API_KEY` を設定。 既定モデルは `claude-sonnet-4-6`。
本番は Cloudflare Workers の Secret (`wrangler secret put ANTHROPIC_API_KEY`) で管理する。

## 開発

```bash
# ターミナル 1: API (http://127.0.0.1:8787)
bun run dev:api

# ターミナル 2: フロント (http://localhost:5173)
bun run dev
```

`apps/web/.env.local` の `VITE_SERVER_URL` を API のオリジンに合わせる (ローカル既定: `http://127.0.0.1:8787`)。

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

## ロール切替

バックティック (`` ` ``) キーで Tweaks パネルを開き、 ロール・テナント・AIアシスタント表示を切替。
状態は `localStorage` に `lms_state` として永続化される。

- **受講者 (Learner)** — ダッシュボード / コース一覧 / レッスン視聴 (動画・テキスト・小テスト・コード課題) / Q&A / 修了証
- **講師 (Instructor)** — ダッシュボード / 添削キュー / AI下書き付き添削エディタ
- **テナント管理者 (Admin)** — KPIダッシュボード / ユーザー管理 / コース管理 / 監査ログ

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
