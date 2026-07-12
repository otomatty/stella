# Cloudflare CI/CD 基盤設計

日付: 2026-07-12  
ステータス: 承認済み（実装前レビュー待ち）

## 背景

FALCON INFORMAL は Cloudflare（Workers `falcon-api` + 旧 Pages `falcon-web` + D1 + R2）上で動いているが、デプロイは手元の `wrangler` 手動実行のみで、`.github` ワークフローは存在しない。モノレポ（Bun workspaces）で検証コマンド（`typecheck` / `build`）はあるが、lint / test の自動実行基盤がない。

## 目標

1. フロントを **Cloudflare Pages から Workers（Static Assets）へ統一**する
2. PR で **lint / typecheck / test / build** を必須ゲートにする（最小構成）
3. `main` へのマージで **D1 マイグレーション → API / Web 自動デプロイ**する
4. Lint 本格整備と TDD 移行は本タスク完了後の最優先として **フォローアップ issue** に切り出す

## 非目標（このタスク外）

- API と Web の Worker 1 本統合
- staging 環境 / PR プレビュー URL
- Lint ルールの徹底強化・カバレッジのある TDD スイート
- D1 seed の自動実行
- 旧 Pages プロジェクトの削除（移行確認後のフォローアップ）
- Workers runtime secrets（`AUTH_JWT_SECRET` 等）の CD によるローテーション

## 選定方針

### 採用: GitHub Actions 一本化 + Worker 2 本（案1）

| 項目 | 内容 |
|------|------|
| CI | GitHub Actions `ci.yml`（`pull_request`） |
| CD | GitHub Actions `deploy.yml`（`main` のみ） |
| API | 既存 Workers `falcon-api` |
| Web | 新規/移行 Workers `falcon-web`（Static Assets） |

**不採用理由**

- **Workers Builds + GHA 検査分割**: モノレポで Worker 2 本 + migrate 順序制御が割れやすい
- **Worker 1 本統合**: OAuth / CORS / `VITE_SERVER_URL` / ルーティング変更が大きく、CI/CD 基盤の範囲を超える

## アーキテクチャ

```text
GitHub (a-cial-dev/falcon-informal)
        │
        ├─ PR ─────────► .github/workflows/ci.yml
        │                  lint → typecheck → test → build
        │                  （Cloudflare 認証不要）
        │
        └─ main ───────► .github/workflows/deploy.yml
                           1. 同じ検証ゲート
                           2. wrangler d1 migrations apply falcon-db --remote
                           3. wrangler deploy  (apps/api → falcon-api)
                           4. Vite build + wrangler deploy (apps/web → falcon-web)
```

## フロント: Pages → Workers 移行

### 設定変更

| 対象 | 変更 |
|------|------|
| `apps/web/wrangler.toml` | `pages_build_output_dir` を廃止。`[assets] directory = "dist"` と SPA 用 `not_found_handling = "single-page-application"` を設定。`name = "falcon-web"`、`account_id` は API と同一 |
| `apps/web/package.json` | `deploy` を `wrangler pages deploy ...` から `wrangler deploy` へ |
| `apps/web/public/_redirects` | Pages 用 SPA fallback。Workers では wrangler 側の SPA 設定に置換するため **削除** |
| ルート `package.json` | `deploy:web` は build → web deploy を維持（中身は Workers） |

### Worker スクリプト

静的配信のみ。追加サーバロジックは不要。既存 Vite ビルド成果物を `[assets]` で配信する。Cloudflare Vite plugin の全面導入はスコープ外。

Wrangler が assets-only を要求する場合は、`ASSETS.fetch` に委譲する最小 `main` エントリを `apps/web` に置く。それ以外の Worker ロジックは追加しない。

### URL / OAuth / CORS

- 配信 URL は当面 `https://falcon-web.<workers-subdomain>.workers.dev`（初回デプロイで確定。カスタムドメインは別途）
- `apps/api/wrangler.toml` の `ALLOWED_ORIGINS` / `INVITE_REDIRECT_URL` を新 Web オリジンに更新
- Google OAuth 認可済みリダイレクト URI を新オリジンに合わせて更新（Console 作業は docs に手順記載。リポジトリ外）
- 移行期間のみ旧 `https://falcon-web.pages.dev` を CORS に併記する
- ビルド時 `VITE_SERVER_URL` / `VITE_MATERIALS_BASE_URL` は GitHub Actions **variables**（`VITE_SERVER_URL`, `VITE_MATERIALS_BASE_URL`）から注入し、Pages ダッシュボード依存をやめる

### 移行運用

1. Worker `falcon-web` を初回デプロイ
2. OAuth / CORS / docs を新オリジンに合わせる
3. 動作確認後、旧 Pages `falcon-web` の退役は **フォローアップ作業**（本タスクの必須成功条件には含めない）

## CI/CD 詳細

### 共通

- Runner: `ubuntu-latest`
- パッケージマネージャ: Bun
- Deploy 認証: GitHub Secrets `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`
- API Token 権限: Workers Scripts Edit、D1 Edit、Account 読み取り（最小権限）

### `ci.yml`

トリガ: `pull_request`（全ブランチ）。`main` への push は `deploy.yml` 側で同一検証を再実行するため、`ci.yml` では `main` 向け push を重複起動しない。

```text
checkout → setup bun → bun install → lint → typecheck → test → build
```

| ステップ | コマンド |
|---------|----------|
| lint | `bun run lint`（Biome） |
| typecheck | 既存 `bun run typecheck` |
| test | `bun run test`（Vitest） |
| build | 既存 `bun run build` |

リポジトリ設定で本ジョブを PR の必須ステータスチェックにする手順をドキュメントに記載する。

### `deploy.yml`

トリガ: `main` への push（マージ含む）

```text
検証ゲート（ci と同内容）
  → D1 migrations apply --remote（apps/api）
  → deploy:api
  → web build（VITE_* 注入）→ deploy:web
```

| 順序 | 理由 |
|------|------|
| migrate 先 | 新コードが必要とするスキーマを先に適用。失敗時はデプロイしない |
| api 次 | Worker 更新 |
| web 最後 | ビルド時 env を焼き込んで Static Assets デプロイ |

- seed は自動実行しない
- runtime secrets は CD で変更しない
- api 成功・web 失敗時の自動ロールバックはしない。再実行手順を docs に書く

### 最小ツール導入

| ツール | 範囲 |
|--------|------|
| Biome | ルート設定。緩い既定＋フォーマット。`lint` / `format` スクリプト |
| Vitest | 1〜数本のスモーク（例: `packages/shared` の純粋関数） |
| package.json | ルートに `lint` / `test` を追加 |

## ドキュメント更新

| ファイル | 内容 |
|---------|------|
| `docs/cloudflare-stack.md` | Pages → Workers、手動 → GHA CD、migrate 自動化 |
| `README.md` / `AGENTS.md` | 同上、Secrets / Variables 設定手順 |
| `docs/ci-cd.md`（新規・短文） | ワークフロー概要、失敗時の再デプロイ、必須チェック設定 |

## フォローアップ issue

本タスク完了時に GitHub issue を作成する。

- **タイトル:** Lint ルールの徹底整備と TDD 前提への移行
- **優先度:** CI/CD 基盤完了後の最優先
- **含める内容:** Biome ルール段階強化、Vitest を TDD 前提に拡充（shared → api → web）、必須チェック維持方針

## 成功条件

1. PR で lint / typecheck / test / build が緑になる
2. `main` マージで D1 migrate → api → web が自動デプロイされる
3. フロントが Workers Static Assets で配信され、OAuth / CORS が新オリジンで動く
4. フォローアップ issue が作成済みである

## 実装順序（参考）

1. Biome + Vitest 最小 + ルート scripts
2. `.github/workflows/ci.yml`
3. web の Workers 化（wrangler / deploy / CORS・OAuth / docs）
4. `.github/workflows/deploy.yml` + Secrets/Variables 手順ドキュメント
5. フォローアップ issue 作成

## リスクと緩和

| リスク | 緩和 |
|--------|------|
| Web URL 変更で OAuth / ブックマーク切れ | 同変更セットで CORS・OAuth・docs を更新 |
| migrate 成功・deploy 一部失敗で不整合 | ジョブを直列化。失敗時はログと手動再実行手順を docs 化 |
| 緩い lint で品質ゲートが弱い | フォローアップ issue で本格整備を最優先化 |
| Pages 名と Worker 名の衝突 | Worker 名は原則 `falcon-web`。衝突時のみ別名を検討 |
