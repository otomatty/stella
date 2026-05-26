# Supabase (falcon-informal)

このディレクトリは **FALCON INFORMAL** 用の Supabase スキーマとセットアップ手順です。

## クラウドプロジェクト

| 項目 | 値 |
|------|-----|
| 名前 | `falcon-informal` |
| リージョン | `ap-northeast-2` (Seoul) |
| Project ref | `jpanvybfaukpgqtwjljl` |
| API URL | `https://jpanvybfaukpgqtwjljl.supabase.co` |
| Dashboard | [プロジェクトを開く](https://supabase.com/dashboard/project/jpanvybfaukpgqtwjljl) |

## 初回セットアップ（ローカル）

```bash
# 1. 依存関係
bun install

# 2. フロント用環境変数（例をコピーしてキーを埋める）
cp apps/web/.env.local.example apps/web/.env.local
```

`apps/web/.env.local` に以下を設定します（Dashboard → **Settings → API Keys**）:

- `VITE_SUPABASE_URL` — Project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Publishable key (`sb_publishable_...`)
- `SUPABASE_URL` — 同上（seed 用）
- `SUPABASE_SERVICE_ROLE_KEY` — Secret key (`sb_secret_...`) または legacy `service_role` JWT（**ブラウザに公開しない**）

```bash
# 3. DB マイグレーション（リモートへ push する場合）
bun run supabase:push

# 4. fixtures → DB へ投入（`apps/web/.env.local` の SUPABASE_* を読み込む）
bun run seed:fixtures
```

マイグレーションは Dashboard の SQL Editor で `migrations/*.sql` を順に実行しても構いません。

## マイグレーション一覧

| ファイル | 内容 |
|----------|------|
| `20260519000000_cms_foundation.sql` | CMS テーブル、RLS、`materials-public` バケット |
| `20260525000000_submissions_reviews.sql` | 講師添削用 `submissions` テーブル |

## Storage

- バケット名: `materials-public`（public read）
- 教材パス例: `web-fundamentals/01-http.pdf`
- 管理画面からのアップロードは `tenant/{tenant_id}/...` プレフィックス（RLS）

## 認証

1. Dashboard → **Authentication → Providers** で **Email**（Magic Link）を有効化
2. **URL Configuration** の Site URL / Redirect URLs に `http://localhost:5173` を追加
3. 初回サインイン後、`profiles` に `role='student'` で行が作成される
4. 管理者にする例:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

## シード後の確認

```sql
select count(*) as courses from public.courses;
select count(*) as assignments from public.assignments;
```

## セットアップ後の動作確認

1. `bun run dev` でフロントを起動し、 Magic Link でサインイン
2. 初回はオンボーディングでテナントを選択 → `profiles` 行が作成される
3. 講師ロールにする場合は SQL Editor で `role` を更新 (上記「認証」参照)
4. 受講者として assignment レッスンからコードを提出 → `submissions` テーブルに行が増える
5. 講師ロールで「添削待ち」キューに提出が表示される

## トラブルシュート

- **Magic Link が届かない** — Auth の SMTP / レート制限、Redirect URL を確認
- **教材が表示されない** — Storage にオブジェクトがあるか、`VITE_SUPABASE_*` がビルドに入っているか確認
- **seed が RLS で失敗** — `SUPABASE_SERVICE_ROLE_KEY`（secret / service_role）を使っているか確認
