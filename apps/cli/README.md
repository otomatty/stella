# stella

問題つきの課題を、課題フォルダーの中で確認して提出するコマンドです。受け取り (課題フォルダーを用意すること) は VS Code 拡張が行います。このコマンドは、用意されたフォルダーで動きます。

Node.js 22 以上が必要です。

## 入れる

npm への公開はまだしていません。リポジトリからビルドします。

```bash
bun install
bun run --cwd apps/cli build
```

成果物は `apps/cli/dist/stella.mjs` です。`node apps/cli/dist/stella.mjs help` で起動します。パスを通すときは、このファイルを `stella` として置きます。

## 接続する

1. Web の設定画面で接続コードを発行する。
2. `stella login` を実行し、表示に従ってコードを貼り付ける。`stella login --code <code>` でも渡せます。

接続先の既定は `https://stella.saedgewell.workers.dev` です。変えるときは環境変数 `STELLA_SERVER_URL` を使います。`https:` 以外は、`localhost` と `127.0.0.1` の `http:` だけを使えます。

トークンは `~/.stella/credentials.json` に保存します。標準出力、標準エラー、ログには出しません。保存したときと違う接続先には送りません。違っているときと、サーバーが 401 を返したときは、`stella login` をやり直します。

`stella logout` で保存したトークンを消します。

## 使い方

`.stella/task.json` がある課題フォルダーか、その中のフォルダーで実行します。問題つきの課題だけを扱います。問題の無い課題では、VS Code 拡張で開く案内を出して終了します。

| コマンド | 動き |
| --- | --- |
| `stella status` | 問題の一覧、状態、件数 |
| `stella check [problem]` | 問題を確認する。省略すると次の未提出。通らなかった手順とテストの名前、メッセージを出す |
| `stella submit [problem]` | 確認してから提出する。確認が落ちたら提出しない |
| `stella submit --all` | 未提出の問題を順に確認して提出する。最初に通らなかった問題で止まる |
| `stella help` | 使い方 |

合格した確認は終了コード 0、不合格とエラーは 1 です。
