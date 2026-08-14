# CI / CD

GitHub Actions を単一基盤とする。CI は認証不要、CD は `main` push のみ。

## ワークフロー

| ファイル | トリガ | 内容 |
|---------|--------|------|
| `.github/workflows/ci.yml` | `pull_request`（全ブランチ） | lint → typecheck → test → build |
| `.github/workflows/deploy.yml` | `main` への push | 検証ゲート → D1 migrate(remote) → D1 seed(remote) → deploy:api → deploy:web |
| `.github/workflows/release-vscode.yml` | `main` への push（`apps/vscode/**` 変更時） | `.vsix` をビルドして GitHub Releases（タグ `vscode-v<version>`）に添付 |

`main` push の検証は `deploy.yml` 側で再実行するため、`ci.yml` は `main` push を起動しない。

seed は `packages/content/courses/<slug>/` を正本として各講座を D1 に upsert し、GitHub から消えたトピック / セクションは prune する。旧デモ講座 (`web-fundamentals` 等) は安定 UUID で削除する。デプロイ時は `db:seed:remote:content`（検証用 `seed-*` ユーザー / 提出は含めない）。CMS で作った別 ID のコースのレッスンツリーは触らない。

## VS Code 拡張のリリース

`apps/vscode/**` を含む PR が `main` にマージされると `release-vscode.yml` が `.vsix` をパッケージし、
`apps/vscode/package.json` の `version` から作ったタグ `vscode-v<version>` の Release に添付する。
バージョンは手動採番（自動 bump はしない）。同じバージョンのまま再度マージした場合は既存 Release の `.vsix` と本文を上書きする（本文の commit がビルド元。タグは初回リリース時のコミットを指したままなので、タグと実体を一致させたいならバージョンを上げる）。
トリガは `main` への push のみ（`workflow_dispatch` は付けない。任意の ref から未マージのコードでリリースを作れてしまうため）。やり直しは Actions の Re-run で行う。
`.vsix` を出す前に `typecheck` / `test` をこのワークフロー内でも実行する（`deploy.yml` の検証ゲートは同じ push で並走するだけで、このジョブを止められないため）。
Marketplace への publish はしない（`.vsix` を落として「Extensions: Install from VSIX...」でインストールする配布形態）。

## 必須ステータスチェック設定

GitHub リポジトリの Settings → Branches → Branch protection rule（`main`）で、
`lint / typecheck / test / build`（`ci.yml` の job 名。ワークフロー名 `CI` は含まない）を **Require status checks to pass** に追加する。

※ このチェック名は `ci.yml` が一度でも実行された後でないと候補に現れない。ブランチ保護ルールの設定画面で手入力せず、`ci.yml` を一度実行してから表示されるドロップダウンの候補から選択すること。

## Secrets / Variables

Settings → Secrets and variables → Actions で設定する。

**Secrets（Repository secrets）**

| 名前 | 用途 |
|------|------|
| `CLOUDFLARE_API_TOKEN` | Wrangler デプロイ/マイグレーション認証。権限は Workers Scripts Edit / D1 Edit / Account 読み取り（最小権限） |
| `CLOUDFLARE_ACCOUNT_ID` | 対象アカウント ID |

**Variables（Repository variables）**

| 名前 | 用途 |
|------|------|
| `VITE_SERVER_URL` | Web ビルド時に焼き込む API のベース URL |
| `VITE_MATERIALS_BASE_URL` | Web ビルド時に焼き込む教材配信ベース URL |

## Google OAuth（Web オリジン変更に伴う手動作業・リポジトリ外）

Web が `*.pages.dev` から `*.workers.dev` に変わるため、Google Cloud Console で更新する。

1. Google Cloud Console → 該当プロジェクト → APIs & Services → Credentials
2. 対象の OAuth 2.0 クライアント ID を開く
3. **Authorized JavaScript origins** / **Authorized redirect URIs** に新 Web オリジン
   `https://falcon-web.<account-subdomain>.workers.dev` を追加
4. 移行期間は旧 `https://falcon-web.pages.dev` も残す（切替確認後に削除）

## 失敗時の再デプロイ（自動ロールバックなし）

デプロイは直列（migrate → seed → api → web）で、api 成功・web 失敗などの部分失敗時に自動ロールバックはしない。

- **web だけ失敗**: 修正 push、または Actions で該当 `deploy.yml` を Re-run。
- **migrate 失敗**: スキーマ側を修正して再 push（api/web は動かない）。
- **seed 失敗**: 教材 seed SQL を修正して再 push（migrate は済んでいる。api/web は動かない）。
- **手動再デプロイ**: ローカルから
  - API: `bun run deploy:api`
  - Web: `bun run deploy:web`
  - migrate: `bun run db:migrate:remote`
  - seed: `bun run db:seed:remote:content`
  （ローカル実行時も `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` が必要）
