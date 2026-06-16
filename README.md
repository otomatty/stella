# FALCON INFORMAL

部活動指導者講習とSES未経験エンジニア育成を **単一基盤で支えるLMS** のプロトタイプ。

- 教材を見る (PDFスライド / 動画) — P1
- 演習する (CodeMirror + Lint + AST + テスト実行) — P2
- 採点される / AIに質問する — P2

## モノレポ構成

```text
falcon-informal/
├── apps/
│   ├── web/                  # @falcon/web — LMS フロント (Vite + React) → Vercel
│   │   ├── src/              # Learner / Instructor / Admin UI
│   │   └── vite-plugins/     # copy-sqljs-wasm
│   └── api/                  # @falcon/api — Hono API → Cloudflare Workers
│       └── src/              # /api/chat, /api/healthz
├── packages/
│   ├── shared/               # @falcon/shared — 課題型・カリキュラム・採点ロジック
│   └── code-runner/          # @falcon/code-runner — JS/SQL ランナー (QuickJS WASM / sql.js)
├── apps/api/drizzle/         # Drizzle マイグレーション (Neon Postgres)
├── supabase/                 # 旧 Supabase マイグレーション (移行元の参考・履歴用)
├── tsconfig.base.json
└── package.json              # Bun workspaces
```

> **アーキテクチャ移行 (#neon)**: Supabase (PostgREST 直叩き + RLS + RPC + Auth + Storage) から
> **Neon Postgres + Neon Auth + Cloudflare R2** へ移行済み。 フロントは DB を直接叩かず、
> 全アクセスが Hono API (`apps/api`) を経由し、 認可はアプリ層に集約されている。
> 詳細は [`docs/neon-migration.md`](docs/neon-migration.md) を参照。

## スタック

- **Vite 5 + React 18 + TypeScript (strict)** — フロント (`apps/web`)
- **Hono + Cloudflare Workers** — API (`apps/api`)。 認可をアプリ層に集約 (旧 RLS の代替)
- **Neon Postgres** — DB (Drizzle ORM / `drizzle-orm/neon-http`)
- **Neon Auth** — 認証 (Magic Link / Email OTP)。 JWT を JWKS で検証
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
# 各ファイルを編集して Neon / Anthropic の認証情報を埋める
```

> フィクスチャのフォールバックにより、 Neon / Anthropic 未設定でもモックログインで全ロール
> (Learner / Instructor / Admin) を Tweaks パネル (バックティック `` ` `` キー) から試せる。

### Neon Postgres (DB / マイグレーション)

CMS / 進捗 / 提出 / 小テスト / 修了証 など DB 連携機能を使う場合は、 Neon プロジェクトを作成し
スキーマを適用する。

1. [Neon Console](https://console.neon.tech) で新規プロジェクトを作成し、 **pooled connection** の
   接続文字列を取得する (例: `postgres://user:pass@ep-xxxx-pooler.<region>.aws.neon.tech/dbname?sslmode=require`)。
   staging / production は別プロジェクト (または別 branch) に分ける。
2. `apps/api/.dev.vars` の `DATABASE_URL` に貼る (本番は `wrangler secret put DATABASE_URL`)。
3. 疎通確認 → マイグレーション適用 → 再確認:

   ```bash
   DATABASE_URL=postgres://... bun run smoke:neon   # 接続 OK・テーブル未適用を確認
   DATABASE_URL=postgres://... bun run db:migrate    # 全 19 テーブルを適用
   DATABASE_URL=postgres://... bun run smoke:neon    # 19/19 存在 を確認
   ```

4. 初期データ (テナント `coach` / `ses` + fixtures のコース・課題) を投入:

   ```bash
   bun run seed:fixtures:sql > apps/api/drizzle/seed.sql      # fixtures → INSERT SQL を生成
   psql "$DATABASE_URL" -f apps/api/drizzle/seed.sql          # Neon に適用 (SQL Editor 貼付でも可)
   ```

5. 初回 Magic Link ログイン後は `profiles` に `role='student'` で行が作られる。 管理者にするには:

   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```

### Neon Auth (Magic Link / Email OTP)

1. Neon Console → Auth を有効化し、 Magic Link / Email OTP を設定する。
2. `NEON_AUTH_JWKS_URL` (API / `apps/api/.dev.vars`) と `VITE_NEON_AUTH_URL` (web / `apps/web/.env.local`)
   を設定する。 必要に応じて `NEON_AUTH_ISSUER` / `NEON_AUTH_AUDIENCE` で iss / aud も検証する。
3. **ユーザー招待** (identity 作成 + 招待メール) を使う場合のみ、 `NEON_AUTH_ADMIN_URL` /
   `NEON_AUTH_ADMIN_SECRET` を設定する (未設定時は招待エンドポイントが 503。 ロール変更 / 無効化 /
   一覧 / 組織 CRUD は DB のみで動作する)。

### Cloudflare R2 (教材配信・アップロード)

1. R2 バケット `falcon-materials-public` は `apps/api/wrangler.toml` の `[[r2_buckets]]` で Workers にバインド済み。
   未作成の場合は Dashboard または `wrangler r2 bucket create falcon-materials-public` で作成する。
2. Dashboard → R2 → バケット → **Settings** で **Public Development URL** (`r2.dev`) または
   **Custom Domain** を有効化し、 公開ベース URL を `VITE_MATERIALS_BASE_URL` に設定する
   (例: `https://pub-xxxx.r2.dev`)。
3. アップロードは `/api/materials/upload` 経由 (講師/管理者)。 Workers の R2 バインディングを使うため
   S3 API トークンは不要。
4. 旧 Supabase Storage `materials-public` バケットの既存オブジェクトを R2 へ移送する。

### 講師添削 (Issue #8)

受講者が `assignment` 型レッスンからコードを提出すると、 講師ロールの「添削待ち」キューに表示されます。
Tweaks パネルで講師ロールに切り替え、 キューから添削エディタを開くと AI 下書き (`POST /api/review-draft`) が生成されます
(API キー未設定時はルールベースのヒューリスティックにフォールバック)。

- 提出物の永続化 (デモ / Neon 未設定): `localStorage` キー `lms_submissions_v1`
- DB 永続化 (Neon 設定時): `submissions` テーブル (`/api/submissions` 経由、 Magic Link ログインが必要)

### レッスン進捗の永続化 (Issue #21)

レッスン視聴進捗 (動画の視聴秒数 / スライドの閲覧ページ / 完了フラグ) を保存します。

- ローカル (デモ / Neon 未設定): `localStorage` キー `lms_lesson_progress`
- DB 永続化 (Neon 設定時): `lesson_progress` テーブル (`/api/lesson-progress` 経由、 Magic Link ログインが必要)。
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
- DB 永続化 (Neon 設定時): `certificates` テーブル + 判定/発行/匿名検証 (`/api/certificates/*`)。
  Neon 未設定時は修了証ページが静的デモ表示にフォールバックします。

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

### フロント — Vercel (`apps/web`)

- **Root Directory**: `apps/web` (`apps/web/vercel.json` あり)
- **Framework**: Vite
- **Install Command**: `cd ../.. && bun install`
- **Build Command**: `bun run build`
- **環境変数**:
  - `VITE_SERVER_URL` — Cloudflare Workers API の URL (例: `https://falcon-api.example.workers.dev`)
  - `VITE_NEON_AUTH_URL` — Neon Auth のベース URL
  - `VITE_MATERIALS_BASE_URL` — Cloudflare R2 バケットの公開ベース URL

### API — Cloudflare Workers (`apps/api`)

```bash
cd apps/api
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put DATABASE_URL              # Neon pooled connection
wrangler secret put NEON_AUTH_ADMIN_SECRET    # ユーザー招待を使う場合のみ
bun run deploy
```

**環境変数 / Secrets**

| 名前 | 種別 | 用途 |
|---|---|---|
| `ANTHROPIC_API_KEY` | Secret | Anthropic API |
| `DATABASE_URL` | Secret | Neon Postgres 接続文字列 (pooled) |
| `NEON_AUTH_JWKS_URL` | var/Secret | Neon Auth JWT 検証用 JWKS エンドポイント |
| `NEON_AUTH_ISSUER` / `NEON_AUTH_AUDIENCE` | var | 任意: JWT の iss / aud 検証 |
| `NEON_AUTH_ADMIN_URL` / `NEON_AUTH_ADMIN_SECRET` | var/Secret | ユーザー招待 (任意) |
| `MATERIALS_BUCKET` | R2 binding | 教材アップロード (`wrangler.toml` `[[r2_buckets]]`) |
| `ANTHROPIC_MODEL` | var | 既定: `claude-sonnet-4-6` |
| `ALLOWED_ORIGINS` | var | CORS 許可オリジン (カンマ区切り、`*.vercel.app` 可) |

本番例:

```toml
# wrangler.toml [vars]
ALLOWED_ORIGINS = "https://your-app.vercel.app,https://*.vercel.app"
```

### バックエンド — Neon + Cloudflare R2

- Neon Postgres / Neon Auth
- 教材ファイル: Cloudflare R2 (`falcon-materials-public`)
- staging / production は Neon を別プロジェクト (または別 branch) に分ける
- マイグレーション適用は `DATABASE_URL=... bun run db:migrate` (詳細は上記「Neon Postgres」)
