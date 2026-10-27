# 監査ログ 運用ポリシー (Issue #27)

認証・権限変更・削除など重要操作の証跡を記録する `audit_logs` テーブルの保管・運用方針。

> **現行構成**: Cloudflare D1 + Hono (アプリ層認可)。 旧 Postgres RLS / `security definer` /
> service-role 前提の記述は廃止済み。

## 何を記録するか

| action | 記録経路 | 対象 (target) | metadata |
|--------|----------|----------------|----------|
| `login` | `GET /api/auth/google/callback` | `user/<userId>` | `provider` |
| `user_invite` | `POST /api/admin/users/invite` | `user/<userId>` | `email`, `role`, `test_data` |
| `user_role_change` | `POST /api/admin/users/role` | `user/<userId>` | `new_role` |
| `user_disable` / `user_enable` | `POST /api/admin/users/disable` | `user/<userId>` | `disabled` |
| `course_publish` / `course_unpublish` / `course_status_change` | `PATCH /api/cms/courses/:id/status` | `course/<courseId>` | `title`, `slug`, `from`, `to` |
| `course_delete` | `DELETE /api/cms/courses/:id` | `course/<courseId>` | `title`, `slug`, `status`, `lesson_count` |
| `stage_self_start` | `POST /api/stages/:id/start` / 腕試しの飛び級 (`POST /api/skill-check/:stageId`) | `enrollment/<id>` | `stage_id`, `state`, `created`, `reactivated`, (飛び級のみ) `via: skill_check` |
| `enrollment_update` | `PATCH /api/enrollments/:id` | `enrollment/<id>` | `user_id`, `stage_id`, `patch` |
| `enrollment_delete` | `DELETE /api/enrollments/:id` | `enrollment/<id>` | `user_id`, `stage_id` |
| `certificate_issue` | `POST /api/certificates/issue` | `certificate/<id>` | `cert_code`, `course_id`, `user_id`, `self_issued` |
| `org_create` / `org_update` | `POST /api/admin/orgs/upsert` | `org/<orgId>` | `name`, `active` |
| `test_mode_enable` / `test_mode_disable` | `POST /api/admin/settings` | `tenant/<tenantId>` | `test_mode` |
| `r2_orphan_cleanup` | `POST /api/admin/r2/orphans/cleanup` | `storage` | `prefix`, `deleted`, `skipped` |
| `discovery_generate` | `POST /api/cms/discovery/requests/:id/generate` | `discovery_material/<id>` | `request_id`, `stage_id`, `generator`, `question_count` |
| `discovery_material_edit` | `PATCH /api/cms/discovery/materials/:id` | `discovery_material/<id>` | `stage_id`, `fields`, `question_count`, `approval_revoked` |
| `discovery_review` | `PATCH /api/cms/discovery/materials/:id` | `discovery_material/<id>` | `stage_id`, `from`, `to`, `generator`, (本文編集で外れたときのみ) `reason: content_edited` |

- 記録は共通ヘルパ `apps/api/src/lib/audit.ts` の `recordAudit()` が D1 へ INSERT する。
- 実行者 (actor) は Bearer JWT から `getCaller()` で確定する。 ログインのみ、 JWT 発行前のため
  `profiles` 行から actor を組み立てる。
- action の一覧とラベルは `@stella/shared/admin/audit-actions` の `AuditAction` 型が唯一の定義。
  `recordAudit()` がこの型を受け取るため、 **未定義の action を記録することはできない**
  （記録側とラベル側のズレを型で防ぐ / Issue #64）。
- コース状態変更は監査上の意味が違うため、 公開は `course_publish`、 公開→非公開は
  `course_unpublish`、 それ以外 (draft ⇄ archived 等) は `course_status_change` に分ける。
- 受講登録の入口は Phase 3b で **受講者の自己開始** に一本化した。 記録するのは登録が
  動いたとき (新規作成 / 期限切れからの再開) だけで、 2 度目以降の 「始める」 は
  何も書かない (連打や再訪で行が増えると、 「いつ始めたか」 が読めなくなる)。
  退役した割当の action (`enrollment_create` / `enrollment_bulk_create` /
  `enrollment_bulk_delete` / `enrollment_preset_apply`) は **記録側の型から外した** ので
  もう新規に記録されない。 過去ログは残るため、 ラベルは `DEPRECATED_LABELS` に移して
  監査画面の絞り込みからは 「(旧)」 付きで引ける。
- `certificate_issue` は新規発行時のみ記録する (既発行のべき等な再取得は操作ではない)。
  受講者本人の自己発行もあるため `self_issued` で区別する。
- 発見教材 (Phase 4) は **生成・編集・レビューを別の action で残す**。 「AI が書いたものを
  誰が公開したか」 と 「公開したものを誰がいつ書き換えたか」 は別の問いなので、 承認
  (`discovery_review`) の記録だけでは経緯を追えない。 承認済み教材の本文 (題名 / 説明 /
  設問) を変えるとサーバが承認を外して `draft` に落とすため、 その場合は
  `discovery_material_edit` (`approval_revoked: true`) と `discovery_review`
  (`to: draft`, `reason: content_edited`) の 2 行が並ぶ。
- 招待前 (プロフィール未作成) の Google ログインは記録しない。 所属テナントが未確定で
  `tenant_id` を決められず、 そもそもアプリへ入れないため。

> **best-effort である**: `recordAudit()` の失敗は `console.error` に留め、 主操作は成功させる。
> 主操作と監査記録の原子性 (片方だけ成功する状態の解消) は #39 で扱う別課題。
> D1 はインタラクティブトランザクションを持たないため、 解決には設計変更が要る。

## append-only (改ざん防止)

- クライアントから `audit_logs` を直接書き換える経路はない。 読み取りは
  `GET /api/audit-logs` のみ（`instructor` / `admin` + 同テナント）。
- INSERT はサーバ側 `recordAudit()` のみ。 actor・tenant はリクエスト本文ではなく
  `getCaller()` が解決した値を使うため、 一般ユーザーが自分の証跡を消す・捏造することはできない。
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
