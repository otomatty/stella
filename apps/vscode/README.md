# STELLA（VS Code 拡張）

旧拡張を使っていた方は [クライアント移行ガイド](https://github.com/otomatty/stella/blob/main/docs/stella-client-migration.md) に従い、新 VSIX のインストールと Web からの再接続を行ってください。

拡張 ID: `stella.stella`（publisher `stella`、name `stella`）。パッケージは `apps/vscode`。

学習者のコード演習用。Web LMS はログイン・動画・ドキュメント・クイズ・CMS 用で、演習の編集と採点はこの拡張で行う。

## 学習者の流れ

1. Web にログインする
2. この拡張を入れる（下記「ローカル VSIX」）
3. Web のコードレッスンで「VS Code で開く」を押す

「VS Code で開く」は `POST /api/auth/vscode-link` でワンタイムコードを発行し、`vscode://stella.stella/lesson?stageId=...&lessonId=...&code=...` を開く。拡張はその URI で JWT 交換（未接続時のみ通知）→ レッスン表示までを行うので、接続専用の Web ページは持たない。

未接続・期限切れのまま lesson URI が来た（コードが無い / 使用済み）場合、拡張は `stella.webUrl` のそのレッスンのページ（レッスン不明なら `/stages`）を開いて、同じボタンを押し直してもらう。`STELLA: Web で接続` コマンドも同じ動きをする。

接続後、JWT は VS Code の SecretStorage（キー `stella.accessToken`）に保存される。設定やファイルにトークンを貼らない。

## 詰まったときに講師へ引き継ぐ（Issue #9）

`STELLA: 採点を実行` が未クリアだったとき、演習パネルに **「講師に引き継ぐ」** が出る。押すと、いま採点したコードと採点失敗サマリ（Lint / AST / 失敗テスト）を `POST /api/submissions` で講師の添削キューに送る。

- 出るのは **採点して未クリアだった直後だけ**。クリア済み・未採点では出ない（自動採点で通る課題はキューに流さない）。
- 引き継いでも **レッスン完了にはならない**。完了は従来どおり自動採点クリア。
- 同じ課題で何度押しても、未添削の提出が残っていれば同じ 1 件が上書きされ、`attempt` だけ増える。添削が確定した後に押すと新しい提出になる。
- 添削が確定すると Web に `review_completed` 通知が届き、ダッシュボードの「提出・添削履歴」から結果を読める。

コマンドパレットの `STELLA: 講師に引き継ぐ` も同じ動きをする（引数なしなら開いている課題）。

## 新形式の課題を手元で確かめる（`.stella/task.json`）

新カリキュラム（`docs/curriculum/07-stella-adoption-redesign.md` §5）の課題は、受講者の端末で実行して確かめる。課題フォルダーに `.stella/task.json` があれば、そのフォルダーが課題になる。課題のファイルを開いた状態で次のコマンドを使う。

| コマンド | 動き |
|------|------|
| `STELLA: 課題を確認する` | 課題の runner の手順を順に実行し、結果のパネルを開く。結果は `.stella/last-run.json` に残る |
| `STELLA: 開発環境を診断する` | Node.js・npm・Git の版を確かめる。課題の `environment` があれば、その要件と照合する |
| `STELLA: 実行ログを表示する` | 道具の出力（出力パネル「STELLA 実行ログ」）を開く |

- **実行するのは固定の手順だけ。** 課題が選べるのは `runner`（runnerId）と、lint・整形をするか（`checks`）だけで、起動するコマンドと引数は拡張の `src/runner/steps.ts` が決める。課題ファイルや画面の文字列をコマンドとして実行しない。シェルも通さない。
- **信頼したフォルダーでだけ実行する。** Workspace Trust で信頼していないフォルダーでは、プロセスを起動する手順（npm・テスト・診断）を実行しない。HTML の確認（`static-preview`）は拡張の中でファイルを読むだけなので動く。
- **道具は受講者の端末のもの。** Node.js・npm・Git は PATH から探す（拡張自身の実行環境は使わない）。Vitest・ESLint・Prettier・Playwright・Next.js は課題フォルダーの `node_modules` に入ったものを Node.js で直接起動する。依存パッケージは初回に `npm ci`（lockfile が無ければ `npm install`）で準備し、`package.json` と lockfile が変わるまで再実行しない。
- **失敗を 2 種類に分ける。** 受講者のコードや置き場所の問題は「要修正」、Node.js が無い・npm の準備に失敗したなど環境の問題は「環境の問題」にする。環境の問題が出たら、残りの手順は省略する。
- **保存していない変更**があれば、保存してから確かめるか尋ねる（確かめるのは保存した内容）。
- 提出するファイル（`submit.files`）と配布したファイル（`protected`）の内容ハッシュを結果に添える。ハッシュは BOM を外し、CRLF を LF にそろえてから取る（Windows の改行変換で「改変」と誤判定しないため）。

| runnerId | 手順 |
|------|------|
| `static-preview` | HTML の確認（Node.js 不要） |
| `env-diagnose` | 開発環境の診断 |
| `node-test` / `dom-test` / `http-mock` / `react-test` / `storybook` / `api-test` / `db` | 依存の準備 → lint・整形（指定時）→ Vitest |
| `e2e` | 依存の準備 → ブラウザの準備 → lint・整形（指定時）→ Playwright |
| `next-app` | 依存の準備 → ブラウザの準備 → lint・整形（指定時）→ `next build` → Playwright |
| `ci-deploy` | 手元では実行しない（CI の結果を使う） |

試すときは `apps/vscode/samples/` の見本を開く（`samples/README.md`）。定義の型と検証は `@stella/shared/tasks/*`。提出・AI の一次レビューは次の段階で足す。旧形式の演習（`STELLA: 採点を実行`、QuickJS）はそのまま残る。

## 設定

| 設定 | 既定 | 用途 |
|------|------|------|
| `stella.serverUrl` | `http://127.0.0.1:8787` | API オリジン |
| `stella.webUrl` | `http://127.0.0.1:5173` | Web オリジン（未接続時に開き直すレッスンページなど） |

どちらも**ユーザー設定でだけ**変えられる（`scope: application`）。ワークスペース設定（`.vscode/settings.json`）の値は読まない。学習用のプロジェクトを開いただけで API の宛先が変わり、ログインのトークンが別のサーバーへ送られるのを防ぐため。

## 開発（Extension Development Host）

リポジトリルートで API と Web を先に起動する。

```bash
bun run dev:api
bun run dev
```

`apps/vscode` を VS Code で開いて F5 する。コミット済みの `.vscode/launch.json` が `extensionHost` を `--extensionDevelopmentPath` = `apps/vscode` で起動する。モノレポルートを開いている場合、F5 はその設定が無いと Extension Development Host にならない。同じ `extensionHost` 構成を `--extensionDevelopmentPath` が `apps/vscode` を指すようにしてから F5 する。

## ローカル VSIX

手元では VSIX を入れる。

```bash
cd apps/vscode
bun run package
```

`package` は `vsce package --no-dependencies` を回し、`stella-<version>.vsix` を作る。コマンドパレットの **Extensions: Install from VSIX...** で選ぶ。

## Marketplace 公開（手順のみ）

VSIX は main への push 時に GitHub Actions でビルドして GitHub Releases に添付する。Marketplace への公開は別の作業。publisher は `stella`（拡張 ID `stella.stella`）。手元で出すとき:

```bash
cd apps/vscode
bunx @vscode/vsce publish --no-dependencies
```

事前に Visual Studio Marketplace の PAT を `vsce login stella` するか `VSCE_PAT` で渡す。このリポジトリから公開しない（手順の記載のみ）。Marketplace の掲載 URL はまだ無い。
