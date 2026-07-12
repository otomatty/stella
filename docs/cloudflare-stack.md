# Cloudflare スタック (#cloudflare)

Neon Postgres + Neon Auth から **Cloudflare ネイティブ構成**へ移行した。
フロントは Cloudflare Pages から **Workers Static Assets** へ移行済み。

## 目標アーキテクチャ

```text
[ブラウザ apps/web]  → Cloudflare Workers (Static Assets / SPA)
   │  fetch (Authorization: Bearer = Workers JWT)
   ▼
[Hono API apps/api]  → Cloudflare Workers
   │  Drizzle (d1)
   ▼
[Cloudflare D1]      ← SQLite (apps/api/src/db/schema.ts)
[Cloudflare R2]      ← 教材配信 / アップロード
[Workers 自前 Auth]  ← Google OAuth + JWT (HS256)
```

## 決定事項

- **DB 層**: Drizzle ORM + D1 バインディング (`drizzle-orm/d1`)
- **認証**: Google OAuth (`/api/auth/google`) + JWT (`AUTH_JWT_SECRET`)
- **認可**: Hono アプリ層 (旧 RLS 相当)
- **フロント**: Workers Static Assets (`apps/web/wrangler.toml` の `[assets]`)

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
```

## 本番デプロイ

**アカウント**: `a.sugai@a-cial.com` (`0a0dd103e779842ba2c67cbde20574a0`)

| リソース | 状態 | ID / URL |
|---------|------|----------|
| D1 `falcon-db` | ✅ マイグレーション + seed 済 | `5c22102a-6c90-4433-b744-4f51f0f608f9` |
| Worker `falcon-api` | ✅ デプロイ済 | https://falcon-api.a-sugai.workers.dev |
| Worker `falcon-web` (Static Assets) | ✅ Pages から移行 | https://falcon-web.a-sugai.workers.dev |
| Secret `AUTH_JWT_SECRET` | ✅ 設定済 | (wrangler secret) |
| R2 `falcon-materials-public` | ✅ 作成 + 公開 URL 有効 | https://pub-bd7872ac470e4c649d6bc3cc86ac9ca7.r2.dev |

```bash
# 1. D1 作成 (初回のみ)
cd apps/api && wrangler d1 create falcon-db
# wrangler.toml の database_id を更新

# 2. マイグレーション + seed
bun run db:migrate:remote
# remote seed: wrangler d1 execute falcon-db --remote --file=...

# 3. Secrets / Google OAuth
wrangler secret put AUTH_JWT_SECRET
wrangler secret put GOOGLE_CLIENT_SECRET
# wrangler.toml [vars] または secret で GOOGLE_CLIENT_ID を設定
# Google Cloud Console → 認可済みリダイレクト URI:
#   https://falcon-api.a-sugai.workers.dev/api/auth/google/callback
#   http://127.0.0.1:8787/api/auth/google/callback
wrangler secret put ANTHROPIC_API_KEY   # 任意

# 4. R2 (教材)
cd apps/api
wrangler r2 bucket create falcon-materials-public   # 初回のみ
wrangler r2 bucket dev-url enable falcon-materials-public
wrangler r2 bucket dev-url get falcon-materials-public  # → VITE_MATERIALS_BASE_URL

# 5. API デプロイ
bun run deploy:api

# 6. Web (Workers Static Assets)
cd apps/web
VITE_SERVER_URL=https://falcon-api.a-sugai.workers.dev \
VITE_MATERIALS_BASE_URL=https://pub-bd7872ac470e4c649d6bc3cc86ac9ca7.r2.dev \
CLOUDFLARE_ACCOUNT_ID=0a0dd103e779842ba2c67cbde20574a0 \
  bun run deploy
# → https://falcon-web.a-sugai.workers.dev
```

### 環境変数

| 場所 | 変数 | 用途 |
|------|------|------|
| Workers Secret | `AUTH_JWT_SECRET` | JWT 署名 |
| Workers Secret / var | `GOOGLE_CLIENT_SECRET` / `GOOGLE_CLIENT_ID` | Google OAuth |
| Workers var | `ALLOWED_ORIGINS` | CORS |
| Web (build-time) | `VITE_SERVER_URL` | API URL |
| Web (build-time) | `VITE_MATERIALS_BASE_URL` | R2 公開 URL |

## 移行元 (Neon) からの差分

| 項目 | Neon (旧) | Cloudflare (現) |
|------|-----------|-----------------|
| DB | Postgres HTTP | D1 バインディング |
| Auth | Neon Auth JWKS | Google OAuth + HS256 JWT |
| Storage | R2 (既に移行済) | R2 |
| 招待 | Neon admin API | profiles + auth_users (Google ログイン待ち) |
| フロント配信 | Cloudflare Pages | Workers Static Assets |

旧 `docs/neon-migration.md` は履歴参考。
