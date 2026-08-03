# 多人数利用向けの認可・所属を固める（#62 / Phase 3）

日付: 2026-08-03  
ステータス: 設計承認済み（実装前）  
親 Issue: [#58](https://github.com/a-cial-dev/falcon-informal/issues/58)  
対象 Issue: [#62](https://github.com/a-cial-dev/falcon-informal/issues/62)  
関連: [#22](https://github.com/a-cial-dev/falcon-informal/issues/22)（招待 UI/API は実装済み、所属制御に穴）

## 背景

実データ経路では Google ログイン後、未招待でも `OnboardingScreen` から任意テナントを選べる。`admin` は自テナントのユーザー管理に加え、org 横断 API も叩ける。JWT は 7 日・サーバー失効なし。`/api/chat` と `/api/review-draft` は未認証でも呼べる（レート制限のみ）。

招待は `profiles` + `auth_users`（同一 UUID）の事前作成で動くが、自由オンボーディングと email 非一意・部分失敗により紐付けが壊れうる。

## 目標

1. 未招待ユーザーが任意テナントに入れない（招待制のみ）
2. `platform_admin` と tenant `admin` を分離し、テナント境界を破られない
3. 招待 CSV / 単発招待 → 初回 Google ログインの紐付けを確実にする（メール送信は必須としない）
4. JWT の最低限方針: 短命化（24h）。サーバー denylist / refresh は作らない
5. `/api/chat`・`/api/review-draft` を認証必須にし、`review-draft` はスタッフのみ

## 非目標

- 招待メール送信
- ドメイン制限（allowlist）
- JWT denylist / refresh token / `jti` 失効ストア
- 専用 `invites` テーブル新設
- fixtures / Tweaks デモ経路の大改修（#63 以降）
- 監査ログや R2 運用品質（#64）

## 選定方針

### 採用: 既存モデルを締める（Approach 1）

`profiles` + `auth_users` 招待を維持し、自由参加・権限穴・未認証 AI・長命 JWT を閉じる。新テーブルなし。

**不採用**

- `invites` テーブル新設: #22 の載せ替えが大きく Phase 3 に過剰
- グローバル認可ミドルウェア全面刷新: #62 の完了条件を超える

## 決定事項（ブレインストーム）

| 項目 | 決定 |
|------|------|
| 所属 | 招待制のみ（ドメイン制限なし） |
| ロール分離 | `profiles.role` に `platform_admin` を追加 |
| JWT | TTL 24h。revoke リストなし。`disabled` は `getCaller` で拒否 |
| AI | 認証必須。`chat` = 認証済み全員、`review-draft` = instructor / admin / platform_admin |
| オンボーディング | テナント選択廃止。未招待はエラー画面。招待済みは profile で直接入場 |
| platform_admin ブートストラップ | seed / SQL のみ。既存 `admin` は tenant-scoped のまま据え置き |

## アーキテクチャ

```text
Google OAuth
  → auth_users（email 一意）
  → GET /api/me
       ├ profile あり → アプリ
       └ なし → invite_required（入場拒否）

招待 (tenant admin)
  → profiles + auth_users を同一トランザクションで作成
  → 初回ログインは同一 id / email で紐付く

platform_admin
  → org 横断 API のみ特別
  → それ以外の staff 判定には含める（自テナント学習データ）
```

## データモデル

### `profiles.role`

```text
student | instructor | admin | platform_admin
```

- `admin`: 自テナントのユーザー招待・ロール変更・無効化など
- `platform_admin`: 上記に加え `GET/POST /api/admin/orgs*` などテナント横断
- tenant `admin` は他者を `platform_admin` に変更できない（API + UI）
- 既存 `admin` 行はマイグレーションで変更しない

### `profiles.email`

- UNIQUE 制約を追加（招待紐付けの穴を塞ぐ）
- migration 前に重複があれば失敗させて明示（または seed 掃除手順を README に記載）
- invite / login 双方で email を lower + trim に正規化

### 作らないもの

- `invites` / `memberships` / token denylist テーブル

## API / 認可

### 所属

| 変更 | 内容 |
|------|------|
| `GET /api/me` | profile なし → `403` + `{ error: "invite_required" }`（レスポンス形をフロントが分岐できるよう `error` コードを固定）。現状の `profile: null` 成功応答はやめる |
| `POST /api/me` | **新規 insert を廃止**。profile が無い場合は `403 invite_required`。既存 profile がある場合のみ `display_name` / `initials` / `email` を更新可（`role` / `tenant_id` は変更不可）。オンボーディング廃止後も自己更新用途として残す |

### 招待

| 変更 | 内容 |
|------|------|
| `POST /api/admin/users/invite` | `profiles` + `auth_users` を同一トランザクション。email 正規化 |
| login-before-invite | profile なしの `auth_users` は入場拒否。同一 email の招待で既存 `auth_users.id` に profile を紐付けて救済可能にする |

### ロール境界

| 面 | 許可 |
|----|------|
| ユーザー一覧 / 招待 / role / disable | `admin`（自テナント）および `platform_admin`（自テナント操作時は同様に tenant スコープ。org 以外で他テナントを触らない） |
| `GET/POST /api/admin/orgs*` | `platform_admin` のみ |
| CMS / submissions / quiz 等の staff | `instructor` \| `admin` \| `platform_admin` |
| role 変更先 | `student` \| `instructor` \| `admin` のみ（UI/API）。`platform_admin` は SQL/seed |

`platform_admin` の `tenant_id` は既存どおりいずれかのテナントに属する（「テナント無し超管理者」は作らない）。org 横断だけロールで許可する。

### JWT

| 項目 | 値 |
|------|-----|
| TTL | 24 時間（`auth-jwt.ts` の `TTL_SEC`） |
| refresh | なし |
| ログアウト | クライアント localStorage 削除のみ |
| 強制ログアウト相当 | `profiles.disabled = true`（API は即拒否、トークンは最大 24h で自然失効） |

### AI

| エンドポイント | 認可 |
|----------------|------|
| `POST /api/chat` | `getCaller` 必須（全ロール） |
| `POST /api/review-draft` | `getCaller` + `instructor` \| `admin` \| `platform_admin` |

クライアント（`streamChat` / review-draft API）に `Authorization: Bearer` を付与。既存の IP レート制限は維持。

## UI

- `OnboardingScreen` のテナント自由選択を廃止
- 未招待: 「招待が必要です。管理者に連絡してください」＋ログアウト
- 管理 UI: org 横断は `platform_admin` のみ表示。ロール選択肢に `platform_admin` を出さない
- README: 招待必須・`platform_admin` の SQL 昇格例・JWT 24h を追記（#59 の実データ手順と整合）

## エラーハンドリング

| 状況 | API | UI |
|------|-----|-----|
| 未招待ログイン | `403` `invite_required` | 招待必要画面＋ログアウト |
| disabled | 既存 `getCaller` 拒否 | 既存メッセージ |
| tenant admin → org API | `403` | org UI 非表示 |
| tenant admin → role=`platform_admin` | `400`/`403` | 選択肢なし |
| 未認証 AI | `401` | セッション切れ処理 |
| student → `review-draft` | `403` | 講師 UI 以外から呼ばない |

## テスト / 完了条件

手動検証:

1. 未招待 Google ログイン → 任意テナントに入れない
2. CSV/単発招待 → 同一 email ログイン → 正しい tenant/role
3. tenant `admin` は他テナント org / ユーザーを触れない；`platform_admin` は org 操作可
4. 未認証・student で `review-draft` 不可；認証済みで `chat` 可
5. `bun run typecheck` / `bun run build` 成功

Issue 完了条件との対応:

| 完了条件 | 本設計 |
|----------|--------|
| 未招待ユーザーが任意テナントに入れない | 招待制 + `POST /api/me` 自由作成廃止 |
| テナント境界が破られない | org API を `platform_admin` のみ、他は `caller.tenantId` |
| スタッフ以外が AI / review-draft を無制限に叩けない | 認証必須 + review-draft はスタッフのみ |

## 主な変更ファイル（予定）

| 領域 | ファイル |
|------|----------|
| スキーマ / migration | `apps/api/src/db/schema.ts`, `apps/api/drizzle/*` |
| 共有型 | `packages/shared/src/cms/types.ts`, CSV role エイリアス |
| 認可 | `apps/api/src/lib/authz.ts`, `apps/api/src/routes/admin.ts`, staff 判定箇所 |
| me / 招待 / JWT | `apps/api/src/routes/me.ts`, invite 経路, `apps/api/src/lib/auth-jwt.ts`, `auth-users.ts` |
| AI | `apps/api/src/routes/chat.ts`, `review-draft.ts`, web の API クライアント |
| UI | `OnboardingScreen` / 未招待画面, `UsersAdmin` / org UI, `App.tsx` ロールマップ |
| docs | `README.md`（昇格・招待必須の注記） |
