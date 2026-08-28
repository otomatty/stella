# FALCON INFORMAL（VS Code 拡張）

拡張 ID: `falcon.informal`（publisher `falcon`、name `informal`）。パッケージは `apps/vscode`。

学習者のコード演習用。Web LMS はログイン・動画・ドキュメント・クイズ・CMS 用で、演習の編集と採点はこの拡張で行う。

## 学習者の流れ

1. Web にログインする
2. この拡張を入れる（下記「ローカル VSIX」）
3. Web のコードレッスンで「VS Code で開く」を押す

「VS Code で開く」は `POST /api/auth/vscode-link` でワンタイムコードを発行し、`vscode://falcon.informal/lesson?stageId=...&lessonId=...&code=...` を開く。拡張はその URI で JWT 交換（未接続時のみ通知）→ レッスン表示までを行うので、接続専用の Web ページは持たない。

未接続・期限切れのまま lesson URI が来た（コードが無い / 使用済み）場合、拡張は `falcon.webUrl` のそのレッスンのページ（レッスン不明なら `/stages`）を開いて、同じボタンを押し直してもらう。`FALCON: Web で接続` コマンドも同じ動きをする。

接続後、JWT は VS Code の SecretStorage（キー `falcon.accessToken`）に保存される。設定やファイルにトークンを貼らない。

## 詰まったときに講師へ引き継ぐ（Issue #9）

`FALCON: 採点を実行` が未クリアだったとき、演習パネルに **「講師に引き継ぐ」** が出る。押すと、いま採点したコードと採点失敗サマリ（Lint / AST / 失敗テスト）を `POST /api/submissions` で講師の添削キューに送る。

- 出るのは **採点して未クリアだった直後だけ**。クリア済み・未採点では出ない（自動採点で通る課題はキューに流さない）。
- 引き継いでも **レッスン完了にはならない**。完了は従来どおり自動採点クリア。
- 同じ課題で何度押しても、未添削の提出が残っていれば同じ 1 件が上書きされ、`attempt` だけ増える。添削が確定した後に押すと新しい提出になる。
- 添削が確定すると Web に `review_completed` 通知が届き、ダッシュボードの「提出・添削履歴」から結果を読める。

コマンドパレットの `FALCON: 講師に引き継ぐ` も同じ動きをする（引数なしなら開いている課題）。

## 設定

| 設定 | 既定 | 用途 |
|------|------|------|
| `falcon.serverUrl` | `http://127.0.0.1:8787` | API オリジン |
| `falcon.webUrl` | `http://127.0.0.1:5173` | Web オリジン（未接続時に開き直すレッスンページなど） |

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

`package` は `vsce package --no-dependencies` を回し、`informal-<version>.vsix` を作る。コマンドパレットの **Extensions: Install from VSIX...** で選ぶ。

## Marketplace 公開（手順のみ）

公開作業と CI での vsix ビルドは通常フローに含めない。publisher は `falcon`（拡張 ID `falcon.informal`）。手元で出すとき:

```bash
cd apps/vscode
bunx @vscode/vsce publish --no-dependencies
```

事前に Visual Studio Marketplace の PAT を `vsce login falcon` するか `VSCE_PAT` で渡す。このリポジトリから公開しない（手順の記載のみ）。Marketplace の掲載 URL はまだ無い。
