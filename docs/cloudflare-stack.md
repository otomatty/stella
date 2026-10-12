# Cloudflare スタック (#cloudflare)

Neon Postgres + Neon Auth から **Cloudflare ネイティブ構成**へ移行した。
フロントは Cloudflare Pages から **Workers Static Assets** へ移行済み。

## 目標アーキテクチャ

```
[ブラウザ apps/web]  ─(CF_Authorization Cookie)─▶ [Cloudflare Access]  ← ログイン・多要素認証・セッション
   │  fetch /api/* (同じオリジン)                     │ Cf-Access-Jwt-Assertion を付ける
   ▼                                                  ▼
[stella-web Worker]  → Static Assets + /api/* をサービスバインディングで中継
   ▼
[Hono API apps/api]  → Cloudflare Workers (stella-api。workers_dev / preview_urls は閉じる)
   │  Drizzle (d1)      Cf-Access-Jwt-Assertion を署名・発行者・AUD から検証 → メールで profiles を引く
   ▼
[Cloudflare D1]      ← SQLite (apps/api/src/db/schema.ts)
[Cloudflare R2]      ← 教材配信 / アップロード
```

## 決定事項

- **DB 層**: Drizzle ORM + D1 バインディング (`drizzle-orm/d1`)
- **認証**: Cloudflare Access (`apps/api/src/lib/access-auth.ts`)。アプリは自前の認証を持たず、招待済みの `profiles` にメールで結び付けるだけ。ローカルは Access なしで `DEV_AUTH_JWT_SECRET` の開発用トークン (localhost のみ)。手順は [`docs/cloudflare-access.md`](cloudflare-access.md)。旧 Google OAuth + HS256 JWT は廃止 (`/api/auth/google*` は 410)
- **認可**: Hono アプリ層 (旧 RLS 相当)
- **フロント**: Cloudflare Worker + Static Assets (`stella-web`、`apps/web/wrangler.toml` の `[assets] directory = "dist"`、SPA fallback は `not_found_handling = "single-page-application"`)。`/api/*` だけは Worker (`apps/web/worker/`) が先に受け (`run_worker_first`)、サービスバインディング `API` で `stella-api` へ中継する。旧 Cloudflare Pages からの移行後。
- **デプロイ運用**: 手動 `wrangler` ではなく GitHub Actions（`.github/workflows/deploy.yml`）。`main` マージで D1 migrate（remote）→ D1 seed（remote）→ api → web を自動実行。詳細は [`docs/ci-cd.md`](ci-cd.md) を参照。

## ローカル開発

```bash
bun install
cp apps/api/.dev.vars.example apps/api/.dev.vars
cp apps/web/.env.local.example apps/web/.env.local

# D1 マイグレーション + seed
bun run db:migrate
bun run db:seed
bun run smoke:d1

# API + Web
bun run dev:api   # :8787
bun run dev       # :5173

# 開発用トークン (画面のログイン画面に貼る)
bun run --filter=@stella/api dev:token seed-admin
```

## 本番デプロイ

**アカウント**: `saedgewell@gmail.com` (`175c04a4465bcc9815b21176a852f0c0`)

| リソース | 準備 | ID / URL |
|---------|------|----------|
| D1 `stella-db` | 新規作成。`deploy:prepare` が名前から実 ID を解決 | Git 上のゼロ UUID はローカル専用 |
| Worker `stella-api` | GitHub Actions またはローカル `wrangler deploy` | 公開 URL なし (`workers_dev = false` / `preview_urls = false`。Web からのサービスバインディングだけで呼ばれる) |
| Worker `stella-web` (Static Assets + `/api/*` 中継) | 同上 | https://stella-web.saedgewell.workers.dev (Cloudflare Access が守る) |
| Cloudflare Access アプリケーション | Zero Trust で作成 (ログインなしのパスは Bypass) | AUD Tag を GitHub Variable `ACCESS_AUD` に |
| Secret `ANTHROPIC_API_KEY` など | Worker に登録 | `wrangler secret put` |
| R2 `stella-materials-public` | 公開 URL を `VITE_MATERIALS_BASE_URL` に登録 | `https://pub-cc7cf3c40111439d989be39f89a6eb84.r2.dev` |
| R2 `stella-skill-sheets` | 原本用。非公開を維持 | |
| AI Gateway `stella-ai` | 未作成なら Anthropic 直叩きにフォールバック | `AI_GATEWAY_ID` |

新規リソース作成・データコピー・secrets 登録の順序は移行手順に、Access の設定と切り替えの順番は [`docs/cloudflare-access.md`](cloudflare-access.md) に集約する。
`main` へのデプロイは GitHub Actions（`deploy.yml`）が実行する。
詳細は [`docs/ci-cd.md`](ci-cd.md) を参照。

Git 上の `database_id` はローカル専用。デプロイの冒頭で `bun run deploy:prepare` が
`stella-db` の実 ID を検索し、同じ checkout の設定を更新する。教材指紋・seed・Wrangler は
すべてその設定を読む。復旧時に remote コマンドを直接実行する場合も、この前処理が必要。

### 環境変数

| 場所 | 変数 | 用途 |
|------|------|------|
| Workers var (GitHub Actions Variable → `deploy:prepare` が `[vars]` に書く) | `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD` | Access のトークンの検証 (必須。無ければデプロイが止まる) |
| Workers Secret (任意) | `CF_ACCESS_API_TOKEN` | Access のログの取り込み・セッション失効 (`/admin/security`) |
| Workers Secret (任意) | `SECURITY_ALERT_WEBHOOK_URL` | セキュリティアラートの Webhook |
| `.dev.vars` のみ | `DEV_AUTH_JWT_SECRET` | ローカルの開発用トークン。本番には設定しない |
| Workers var | `ALLOWED_ORIGINS` | CORS (本番は Web のオリジンだけ。ローカルは `.dev.vars`) |
| Web (GitHub Actions Variable、ビルド時に焼き込み) | `VITE_SERVER_URL` | API の呼び先 = Web のオリジン (`https://stella-web.saedgewell.workers.dev`。同じオリジンの `/api/*`) |
| Web (GitHub Actions Variable、ビルド時に焼き込み) | `VITE_MATERIALS_BASE_URL` | R2 公開 URL |

## 移行元 (Neon) からの差分

| 項目 | Neon (旧) | Cloudflare (現) |
|------|-----------|-----------------|
| DB | Postgres HTTP | D1 バインディング |
| Auth | Neon Auth JWKS | Cloudflare Access (Google OAuth + HS256 JWT を経て移行) |
| Storage | R2 (既に移行済) | R2 |
| 招待 | Neon admin API | profiles + auth_users (アプリで招待 + Access のポリシーで許可) |
| フロント配信 | Cloudflare Pages | Workers Static Assets |

旧 `docs/neon-migration.md` は履歴参考。
