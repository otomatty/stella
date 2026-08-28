# CI / CD

GitHub Actions を単一基盤とする。CI は認証不要、CD は `main` push のみ。

## ワークフロー

| ファイル | トリガ | 内容 |
|---------|--------|------|
| `.github/workflows/ci.yml` | `pull_request`（全ブランチ） + `workflow_call` | **検証ゲートの正本**。`verify` ジョブ（typecheck → test → lint → content:check → 図解 lint → build）と `core-loop` ジョブ（E2E スモーク）の 2 本 |
| `.github/workflows/deploy.yml` | `main` への push | `ci.yml` を呼ぶ（`verify` + `core-loop`）→ R2 教材画像 upload(remote) → 教材 PDF sync(remote) → D1 migrate(remote) → deploy:api → D1 seed(remote) → deploy:web |
| `.github/workflows/release-vscode.yml` | `main` への push（`apps/vscode/**` 変更時） | `ci.yml` を `scope: code` で呼ぶ → `.vsix` をビルドして GitHub Releases（タグ `vscode-v<version>`）に添付 |

検証ゲートの定義は `ci.yml` の 1 か所だけに置き、`deploy.yml` / `release-vscode.yml` は
`uses: ./.github/workflows/ci.yml` で呼ぶ。3 つのワークフローに同じ手順を書き写すと、
片方だけ直したときに黙って乖離するため（実際、`content:check` の追加がこの表から漏れていた）。
`ci.yml` 自体は `main` push を起動しない（`deploy.yml` からの呼び出しで走る）。

`scope` 入力は呼び出し側がゲートの範囲を選ぶためのもの。

| `scope` | 走るもの | 使う場所 |
|---------|----------|---------|
| `full`（既定） | verify の全ステップ + core-loop | `pull_request`、`deploy.yml` |
| `code` | typecheck + test のみ | `release-vscode.yml`（`.vsix` を出す前の最小確認） |

**E2E（`core-loop`）は `deploy.yml` の経路にも入っている。** PR で通っていても、
マージ後の main の組み合わせで一度も E2E を通さずにデプロイする、という穴を塞ぐため。
そのぶんデプロイ完了までの時間は core-loop ジョブ 1 本ぶん（数分）伸びる。

教材画像 (図解 SVG + 講座サムネイル) は seed の**前**に R2 へ流す。D1 が指す先が先に存在している必要があるため、順序を入れ替えないこと。put は冪等なので毎回全件流す。`wrangler r2 object put` は 1 ファイル 1 プロセスで数秒かかるため、`upload-materials.ts` が同時 8 本で並列に投げ、失敗は 3 回まで再試行する（70 件で 1 分前後）。サムネイルの R2 キーは内容ハッシュ入り (`tenant/<tenantId>/courses/<slug>/thumbnail-<hash>.webp`) で、旧世代は `bun run r2:orphans` の棚卸しで掃除する。

このステップは `CLOUDFLARE_API_TOKEN` に **Workers R2 Storage: Edit** 権限を要求する。権限が無いとここで落ち、seed 以降は動かない（D1 が存在しない画像を指すことはない）。

seed は `packages/content/courses/<slug>/` を正本として各講座を D1 に upsert し、GitHub から消えたトピック / セクションは prune する。旧デモ講座 (`web-fundamentals` 等) は安定 UUID で削除する。デプロイ時は `db:seed:remote:content`（検証用 `seed-*` ユーザー / 提出は含めない）。CMS で作った別 ID のコースのレッスンツリーは触らない。

## VS Code 拡張のリリース

`apps/vscode/**` を含む PR が `main` にマージされると `release-vscode.yml` が `.vsix` をパッケージし、
`apps/vscode/package.json` の `version` から作ったタグ `vscode-v<version>` の Release に添付する。
バージョンは手動採番（自動 bump はしない）。同じバージョンのまま再度マージした場合は既存 Release の `.vsix` と本文を上書きする（本文の commit がビルド元。タグは初回リリース時のコミットを指したままなので、タグと実体を一致させたいならバージョンを上げる）。
トリガは `main` への push のみ（`workflow_dispatch` は付けない。任意の ref から未マージのコードでリリースを作れてしまうため）。やり直しは Actions の Re-run で行う。
`.vsix` を出す前に `ci.yml` を `scope: code`（typecheck / test）で呼んで通す（`deploy.yml` の検証ゲートは同じ push で並走するだけで、このジョブを止められないため）。
Marketplace への publish はしない（`.vsix` を落として「Extensions: Install from VSIX...」でインストールする配布形態）。

## 必須ステータスチェック設定

GitHub リポジトリの Settings → Branches → Branch protection rule（`main`）で、
`ci.yml` の 2 つのジョブを **どちらも** **Require status checks to pass** に追加する。

| チェック名 | 内容 |
|-----------|------|
| `verify` | typecheck / test / lint / content:check / 図解 lint / build |
| `core-loop` | コア学習ループの E2E スモーク |

`core-loop` を入れ忘れると **E2E が赤のままマージできてしまう**。2 つとも必須にすること。

チェック名は `ci.yml` の **job ID をそのまま**使う（ジョブに `name:` を付けていない）。
表示名を足すとチェック名がそちらに変わり、保護ルールが「存在しないチェック待ち」で
固まるため、ジョブ ID もジョブ名も安易に変えないこと。

※ このチェック名は `ci.yml` が一度でも実行された後でないと候補に現れない。ブランチ保護ルールの設定画面で手入力せず、`ci.yml` を一度実行してから表示されるドロップダウンの候補から選択すること。

> ⚠️ 以前のチェック名は `lint / typecheck / test / build`（`ci.yml` の job 表示名）だった。
> ジョブ ID ベースに変えたので、**既存のブランチ保護ルールは旧名のまま残っていると
> 永久に満たされない**。上の 2 つへ差し替えること。

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
- **教材画像 upload 失敗**: 画像か R2 認証 (API トークンの R2 権限) を直して再 push（seed 以降は動かない）。
- **手動再デプロイ**: ローカルから
  - API: `bun run deploy:api`
  - Web: `bun run deploy:web`
  - migrate: `bun run db:migrate:remote`
  - seed: `bun run db:seed:remote:content`
  - 教材画像: `bun run content:upload:remote`（サムネイルだけなら `content:upload:thumbnails:remote`）
  （ローカル実行時も `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` が必要）

## 検査の内訳（`verify` ジョブ）

| 検査 | コマンド | 見ているもの |
|------|---------|-------------|
| 型 | `bun run typecheck` | 6 ワークスペースの `tsc --noEmit`。strict + `noUnusedLocals` / `noUnusedParameters` など。**テストと scripts も対象**（`exclude` を持つ tsconfig は無い） |
| テスト | `bun run test:coverage` | Vitest 116 ファイル / 1408 件。カバレッジは**閾値なし**で数字をジョブサマリに出すだけ |
| lint | `bun run lint` | `biome ci .`（lint + フォーマットの両方）。`noExplicitAny` / `noNonNullAssertion` / `noConsole` / a11y などを error |
| 教材 | `bun run content:check` | 画像リンクの実在・スライド枚数 4〜6・語彙台帳の学習順序・サムネイル規格（16:9 / 800px 以上 / 400KB 以内）・前提グラフ（未知 slug / 自己参照 / 循環） |
| 図解 | `lint-skin.py` | スライド図解 SVG のトークン検査。`content:check` は Node だけで走る検査で打ち切るため、これは別ステップで呼ぶ |
| バンドル | `bun run build` | 成果物を出す web（Vite）と vscode（esbuild）だけ。型は typecheck が見るので、ここで `tsc --noEmit` を重ねない |

カバレッジに閾値を置いていないのは意図的。落とすためではなく手薄な場所を見えるように
するためで、数字を見ないまま閾値だけ入れると「通すためのテスト」が書かれる。
