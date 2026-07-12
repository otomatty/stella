# 監査ログ 運用ポリシー (Issue #27)

認証・権限変更・削除など重要操作の証跡を記録する `audit_logs` テーブルの保管・運用方針。

> **現行構成**: Cloudflare D1 + Hono (アプリ層認可)。 旧 Postgres RLS / `security definer` /
> service-role 前提の記述は廃止済み。

## 何を記録するか

| action | 記録経路 | 対象 (target) | metadata |
|--------|----------|----------------|----------|
| `user_invite` | `POST /api/admin/users/invite` | `user/<userId>` | `email`, `role` |
| `user_role_change` | `POST /api/admin/users/role` | `user/<userId>` | `new_role` |
| `user_disable` / `user_enable` | `POST /api/admin/users/disable` | `user/<userId>` | `disabled` |
| `org_create` / `org_update` | `POST /api/admin/orgs/upsert` | `org/<orgId>` | `name`, `active` |

- 特権操作は管理 API (`apps/api/src/routes/admin.ts`) 内の `recordAudit()` が D1 へ INSERT する。
- 実行者 (actor) は Bearer JWT から `getCaller()` で確定する。
- コース公開・削除の DB トリガー記録は現行 D1 構成では未実装（必要なら CMS API 側で追加）。

> ログインの記録は将来対応。 Google OAuth コールバック成功時に同じ `audit_logs` へ
> `action='login'` で追記する想定（actor = ログインユーザー、 target = `user/<id>`、
> metadata に provider 等）。

## append-only (改ざん防止)

- クライアントから `audit_logs` を直接書き換える経路はない。 読み取りは
  `GET /api/audit-logs` のみ（`instructor` / `admin` + 同テナント）。
- INSERT は管理 API のサーバ側 `recordAudit()` のみ。 一般ユーザーが自分の証跡を
  消す・捏造することはできない。
- 物理 DELETE 用の公開 API は用意しない。 世代削除は運用ジョブ（下記）からのみ行う。

## 保管期間

- **最低 1 年間** は削除しない。 監査・インシデント調査・コンプライアンス対応のため。
- 1 年を超えた行は、 容量・コスト観点で世代削除してよい (任意)。

### 世代削除の例 (任意・D1)

Workers Cron や手動の `wrangler d1 execute` から:

```sql
-- 保管期間を 13 か月とし、 それより古い行を物理削除する例 (SQLite / D1)。
DELETE FROM audit_logs
WHERE created_at < datetime('now', '-13 months');
```

長期保管が必要な要件では、 削除前に R2 等へ CSV / JSONL でアーカイブする運用を別途検討する。
当面は管理画面の **CSV出力** (`/admin/audit`) で任意期間をエクスポートできる。

## 閲覧 / エクスポート

- 管理画面 `/admin/audit` で、 期間 (開始日 / 終了日)・実行者・操作種別で絞り込んで閲覧できる。
- 表示中の内容を **CSV出力** できる (UTF-8 BOM 付き。 Excel / Google スプレッドシートで
  文字化けしない)。 列: 日時 / 実行者 / 実行者ID / ロール / 操作 / 操作コード / 対象種別 /
  対象ID / IP / 詳細(metadata JSON)。
