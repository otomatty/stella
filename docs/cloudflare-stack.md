# Cloudflare スタック (#cloudflare)

Neon Postgres + Neon Auth から **Cloudflare ネイティブ構成**へ移行した。
フロントは Cloudflare Pages から **Workers Static Assets** へ移行済み。

## 目標アーキテクチャ

```
[ブラウザ apps/web]  → Cloudflare Workers (Static Assets)
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
- **フロント**: Cloudflare Workers Static Assets (`stella-web`、`apps/web/wrangler.toml` の `[assets] directory = "dist"`、SPA fallback は `not_found_handling = "single-page-application"`)。旧 Cloudflare Pages からの移行後。
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
```

## 本番デプロイ

**アカウント**: `a.sugai@a-cial.com` (`0a0dd103e779842ba2c67cbde20574a0`)

以下は Phase C の移行先。作成・デプロイ済みという記録ではない。
既存環境の切替は [Phase C 移行手順](stella-infrastructure-migration.md) に従う。

| リソース | 準備 | ID / URL |
|---------|------|----------|
| D1 `stella-db` | 新規作成 + 旧 DB の完全復元 | `deploy:prepare` が名前から実 ID を解決 |
| Worker `stella-api` | GitHub Actions でデプロイ | https://stella-api.a-sugai.workers.dev |
| Worker `stella-web` (Static Assets) | GitHub Actions でデプロイ | https://stella-web.a-sugai.workers.dev |
| Secret `AUTH_JWT_SECRET` など | 新 Worker に再登録 | 旧 Worker の secret は自動継承されない |
| R2 `stella-materials-public` | 全オブジェクトを移行 + 公開 URL を設定 | 新 URL を `VITE_MATERIALS_BASE_URL` に登録 |
| R2 `stella-skill-sheets` | 原本を移行 | 非公開を維持 |
| AI Gateway `stella-ai` | 認証・課金・プロバイダ設定を移行 | `AI_GATEWAY_ID` |

新規リソース作成・データコピー・secrets 登録・OAuth 更新の順序は移行手順に集約する。
`main` へのデプロイは GitHub Actions（`deploy.yml`）が実行する。
詳細は [`docs/ci-cd.md`](ci-cd.md) を参照。

Git 上の `database_id` はローカル専用。デプロイの冒頭で `bun run deploy:prepare` が
`stella-db` の実 ID を検索し、同じ checkout の設定を更新する。教材指紋・seed・Wrangler は
すべてその設定を読む。復旧時に remote コマンドを直接実行する場合も、この前処理が必要。

### 環境変数

| 場所 | 変数 | 用途 |
|------|------|------|
| Workers Secret | `AUTH_JWT_SECRET` | JWT 署名 |
| Workers Secret / var | `GOOGLE_CLIENT_SECRET` / `GOOGLE_CLIENT_ID` | Google OAuth |
| Workers var | `ALLOWED_ORIGINS` | CORS |
| Web (GitHub Actions Variable、ビルド時に焼き込み) | `VITE_SERVER_URL` | API URL |
| Web (GitHub Actions Variable、ビルド時に焼き込み) | `VITE_MATERIALS_BASE_URL` | R2 公開 URL |

## 移行元 (Neon) からの差分

| 項目 | Neon (旧) | Cloudflare (現) |
|------|-----------|-----------------|
| DB | Postgres HTTP | D1 バインディング |
| Auth | Neon Auth JWKS | Google OAuth + HS256 JWT |
| Storage | R2 (既に移行済) | R2 |
| 招待 | Neon admin API | profiles + auth_users (Google ログイン待ち) |
| フロント配信 | Cloudflare Pages | Workers Static Assets |

旧 `docs/neon-migration.md` は履歴参考。
