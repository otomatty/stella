# FALCON INFORMAL（VS Code 拡張）

拡張 ID: `falcon.informal`（publisher `falcon`、name `informal`）。パッケージは `apps/vscode`。

学習者のコード演習用。Web LMS はログイン・動画・ドキュメント・クイズ・CMS 用で、演習の編集と採点はこの拡張で行う。

## 学習者の流れ

1. Web にログインする
2. この拡張を入れる（下記「ローカル VSIX」）
3. Web の `/connect-vscode`（サイドバー「VS Code」）で「VS Code に接続」する。またはコードレッスンの「VS Code で開く」

未接続のままレッスンを開くと、拡張は `falcon.webUrl` の `/connect-vscode` を開く。

接続後、JWT は VS Code の SecretStorage（キー `falcon.accessToken`）に保存される。設定やファイルにトークンを貼らない。

## 設定

| 設定 | 既定 | 用途 |
|------|------|------|
| `falcon.serverUrl` | `http://127.0.0.1:8787` | API オリジン |
| `falcon.webUrl` | `http://127.0.0.1:5173` | Web オリジン（接続ページなど） |

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
