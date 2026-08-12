# Supabase → Neon 移行 (#neon) — 履歴

> **注**: その後 Neon から Cloudflare D1 へ再移行済み (`docs/cloudflare-stack.md`)。
> 旧 `supabase/` ディレクトリと互換シム (`isSupabaseConfigured`) は削除済み。
> 現行のフロント判定は `isBackendConfigured()` (`apps/web/src/lib/backend.ts`)。

Supabase の BaaS 的な使い方 (PostgREST 直叩き + RLS + RPC + Auth + Storage) をやめ、
**Neon Postgres + Neon Auth + Neon File Storage + Hono API** へ移行する。
strangler-fig 方式で、 各コミットで `bun run typecheck` を green に保ちながら段階移行する。

## 目標アーキテクチャ

```
[ブラウザ apps/web]
   │  fetch (Authorization: Bearer = Neon Auth JWT)   ← .from()/.rpc() を全廃
   ▼
[Hono API apps/api]                                   ← 認可をアプリ層に集約
   │  Drizzle (@neondatabase/serverless / neon-http)
   ▼
[Neon Postgres]   ← Drizzle スキーマ (apps/api/src/db/schema.ts)
[Neon Auth]       ← JWT を JWKS で検証 (apps/api/src/lib/authz.ts)
[Cloudflare R2]   ← 教材配信 (VITE_MATERIALS_BASE_URL) / アップロード (Workers R2 バインディング)
```

## 決定事項

- **DB 層**: Drizzle ORM (`drizzle-orm/neon-http`)
- **認可**: Hono アプリ層 (RLS は廃止)。 旧 RLS 述語を caller.id / caller.tenantId / role の突合で再現

## 確立したパターン (新ドメインの移行手順)

1. `apps/api/src/db/schema.ts` に対象テーブルを Drizzle で定義 (snake_case 列名は据え置き)。
2. `apps/api/src/routes/<domain>.ts` を作る。 各ハンドラは
   `const { caller, db } = await getCaller(c);` で認証 + caller 解決し、
   旧 RLS を `requireRole(...)` と `where(eq(col, caller.id|tenantId))` で再現する。
   旧 SECURITY DEFINER RPC のロジックはハンドラ内の Drizzle クエリへ翻訳する。
3. `apps/api/src/index.ts` に `app.route("/", <domain>Route)` を追加。
4. フロントの `apps/web/src/lib/<domain>-api.ts` を `apiFetch(...)` 経由に書き換える
   (公開関数のシグネチャは保ち、 利用側コンポーネント/フックは無変更に)。
5. `bun run typecheck` が green であることを確認してコミット。

## 進捗

### ✅ 完了 (foundation)
- Drizzle スキーマ + Neon HTTP クライアント (`db/schema.ts`, `db/client.ts`)
- Neon Auth JWT 検証 + 認可ヘルパ (`lib/authz.ts`: verifyToken / getCaller / requireRole)
- Neon Auth クライアント + api-client (`web/src/lib/neon-auth.ts`, `api-client.ts`)
- 認証ラッパ差し替え (`web/src/lib/auth.ts` → Neon Auth + `/api/me`)
- 教材配信 → Neon File Storage (`web/src/lib/storage.ts`)
- ドメイン: **lesson-progress** (`/api/lesson-progress`, LWW upsert)
- ドメイン: **enrollments** (`/api/enrollments`)
- ドメイン: **qa** (`/api/questions`, author/is_instructor/answered をアプリ層で確定)
- ドメイン: **audit-logs** (`/api/audit-logs`, read-only / staff)
- ドメイン: **notifications / announcements** (`/api/announcements`, `/api/notifications`, fan-out 再現)
- ドメイン: **quiz** (`/api/quiz/*`, サニタイズ出題 + サーバ採点)
- ドメイン: **certificates** (`/api/certificates/*`, 修了判定/台帳/発行/匿名検証)
- ドメイン: **analytics** (`/api/analytics/*`, テナント KPI / 講師概況)
- ドメイン: **submissions** (`/api/submissions`, staff キュー / 提出 / 添削 + review_completed 通知)
- ドメイン: **cms** (`/api/cms/*`, course/section/lesson/quiz/assignment + reorder)
- 教材アップロード: **materials** (`/api/materials/upload`, Cloudflare R2 Workers バインディング)
- 配布資料一覧: **materials** (`/api/materials?lessonId=` / `?courseId=`, 受講者は published + active enrollment)
- ドメイン: **search** (`/api/search`, コース / レッスン横断検索 — staff は同テナント全件、 受講者は受講中コースのみ)
- ドメイン: **admin-users / organizations** (`/api/admin/*`, ロール変更 / 無効化 / 組織 CRUD)

### ✅ Supabase 依存の完全撤去（当時の Neon 移行時点）
- `@supabase/supabase-js` を apps/web / apps/api の依存から削除。
- `apps/api/src/lib/supabase-admin.ts` 等を削除。
- 当時は `apps/web/src/lib/supabase.ts` を互換シム化していた
  (`isSupabaseConfigured` = Neon Auth + API 設定済み、 `getMaterialUrl` は R2 へ委譲)。
- **その後の Cloudflare 移行でシム自体も削除**し、 現行は `isBackendConfigured()`
  (`apps/web/src/lib/backend.ts`) を使う。 詳細は冒頭の注を参照。

### ⚠️ 1 点だけ外部 API 依存が残る: ユーザー招待
- **ロール変更 / 無効化 / 一覧 / 組織 CRUD は Neon で完全動作**する。
- **招待 (identity 作成 + 招待メール)** だけは Neon Auth の admin API が必要。
  `routes/admin.ts` の `inviteNeonAuthUser` が `NEON_AUTH_ADMIN_URL` / `NEON_AUTH_ADMIN_SECRET`
  を使って `POST {url}/users/invite` を呼ぶ実装になっている。 実際のエンドポイント / レスポンス
  形状は Neon Auth のバージョンに合わせて確認 / 調整が必要 (未設定時は 503)。
- 無効化は `profiles.disabled` を立てるだけで、 API 経由の全アクセスが `getCaller` の disabled
  チェックで即時遮断される (アイデンティティ側のセッション失効は Neon Auth admin API で任意併用)。

## ランタイム設定 (ユーザー側で必要な作業)

1. **Neon プロジェクト作成** → `DATABASE_URL` を取得。
2. `bun run --filter=@falcon/api db:generate` で Drizzle マイグレーション SQL を生成 →
   `bun run --filter=@falcon/api db:migrate` (要 `DATABASE_URL`) で Neon に適用。
   ※ 旧 `supabase/migrations/*.sql` の seed / 既存データは別途移送が必要。
3. **Neon Auth** を有効化し、 Magic Link / Email OTP を設定。
   - `NEON_AUTH_JWKS_URL` (API) / `VITE_NEON_AUTH_URL` (web) を設定。
   - `web/src/lib/neon-auth.ts` の Magic Link 送信 / トークン取り込みエンドポイントを
     実際の Neon Auth (Better Auth) のパスに合わせる (または公式 React SDK に置換)。
4. **Cloudflare R2** バケット (`falcon-materials-public`) を Workers にバインド → 公開ベース URL を
   `VITE_MATERIALS_BASE_URL` に。 旧 `materials-public` バケットの中身を移送する。
