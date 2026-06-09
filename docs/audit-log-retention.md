# 監査ログ 運用ポリシー (Issue #27)

認証・権限変更・削除など重要操作の証跡を記録する `audit_logs` テーブルの保管・運用方針。

## 何を記録するか

| action | 記録経路 | 対象 (target) | metadata |
|--------|----------|----------------|----------|
| `role_change` | 管理 API (`POST /api/admin/users/role`) | `user/<userId>` | `from`, `to` (ロール) |
| `user_invite` | 管理 API (`POST /api/admin/users/invite`) | `user/<userId>` | `email`, `role` |
| `user_disable` / `user_enable` | 管理 API (`POST /api/admin/users/disable`) | `user/<userId>` | — |
| `course_publish` / `course_unpublish` / `course_status_change` | DB トリガー (`courses` AFTER UPDATE) | `course/<courseId>` | `slug`, `title`, `from`, `to` |
| `course_delete` | DB トリガー (`courses` AFTER DELETE) | `course/<courseId>` | `slug`, `title`, `status` |

- service-role 経由でしか実行できない特権操作 (ロール / 招待 / 無効化) は、 API 側で
  `recordAuditLog()` を呼んで記録する。 実行者 (actor) は Bearer トークンから確定する。
- ブラウザから RLS 配下で直接行うコース操作 (公開・削除) は、 `courses` テーブルの
  `security definer` トリガーで `auth.uid()` を実行者として記録する。

> ログイン (magic link 受諾) の記録は将来対応。 Supabase Auth Hook / Edge Function で
> 受け、 同じ `audit_logs` に `action='login'` で追記する想定。

## append-only (改ざん防止)

- `audit_logs` は RLS 有効。 **SELECT ポリシー (同テナントの instructor/admin) のみ** を持つ。
- INSERT / UPDATE / DELETE ポリシーは置かない。 → `authenticated` / `anon` ロールからの
  直接の書き込み・改ざん・削除はすべて拒否される。
- 記録は `security definer` トリガーと service-role 経由でのみ行われ、 これらは RLS を
  迂回して INSERT する。 一般ユーザーが自分の証跡を消す・捏造することはできない。

## 保管期間

- **最低 1 年間** は削除しない。 監査・インシデント調査・コンプライアンス対応のため。
- 1 年を超えた行は、 容量・コスト観点で世代削除してよい (任意)。 削除は **service-role を
  持つ定期ジョブからのみ** 行う (RLS では一般ユーザーから DELETE できないため)。

### 世代削除の例 (任意・1 年より十分長く保つ場合)

定期実行 (例: 月次の cron / scheduled Edge Function) で service-role 接続から:

```sql
-- 保管期間を 13 か月とし、 それより古い行を物理削除する例。
delete from public.audit_logs
where created_at < now() - interval '13 months';
```

長期保管が必要な要件 (例: 数年) では、 削除前にオブジェクトストレージへ
CSV / JSONL でアーカイブする運用を別途検討する。 当面は管理画面の **CSV出力**
(`/admin/audit`) で任意期間をエクスポートできる。

## 閲覧 / エクスポート

- 管理画面 `/admin/audit` で、 期間 (開始日 / 終了日)・実行者・操作種別で絞り込んで閲覧できる。
- 表示中の内容を **CSV出力** できる (UTF-8 BOM 付き。 Excel / Google スプレッドシートで
  文字化けしない)。 列: 日時 / 実行者 / 実行者ID / ロール / 操作 / 操作コード / 対象種別 /
  対象ID / IP / 詳細(metadata JSON)。
