# ターミナルの場所を確かめてファイルを作る

## 何を作るか

課題フォルダーの中に `notes/hello.txt` を作ります。
そのファイルに `hello` を含めます。
エディターでファイルを作らず、コマンドで作ってください。
手元の確認では、どちらで作ったかは分かりません。
場所を確かめ、コマンドを実行することが練習の目的です。

## 手順

1. Web の「VS Code で開く」で、この課題を開きます。
2. 「表示 > ターミナル」を選びます。
3. いまの場所を確かめます。

```sh
pwd
```

4. 末尾が `web-training` なら、次の1行で課題フォルダーへ移動します。

```sh
cd dev-env-basics/u05-terminal-node/q01-where-am-i
```

学習フォルダー以外にいる場合は、この相対パスをそのまま使いません。
エクスプローラーで `q01-where-am-i` を右クリックします。
「統合ターミナルで開く」を選べば、その場所から始められます。

5. もう一度、場所を確かめます。

```sh
pwd
```

末尾が `dev-env-basics/u05-terminal-node/q01-where-am-i` か読みます。
区切りの表示は OS によって違います。

6. 次の1行でフォルダーを作り、結果を読みます。

```sh
mkdir notes
```

7. 自分の OS のコマンドでファイルに文字を書きます。

:::os windows
PowerShell で、次の1行を実行します。
```powershell
Set-Content -Path notes/hello.txt -Value hello
```
:::

:::os macos
zsh で、次の1行を実行します。
```sh
echo hello > notes/hello.txt
```
:::

8. エクスプローラーで `notes/hello.txt` を開き、文字を確かめます。
9. 「課題を確認する」を押します。
10. 通らない項目を直して確認し、通ったら「提出する」で提出します。

## うまくいかないとき

ファイルが見つからなければ、`pwd` で場所を読み直します。
`notes` がすでにある場合は、場所を確かめてそのまま使います。
コマンドをエディターに書いた場合は、その文字を消して保存します。
ターミナルへ戻り、1行ずつ実行します。
困ったら、試したコマンドと出たメッセージを添えて相談します。

参照: [VS Code Terminal Basics](https://code.visualstudio.com/docs/terminal/basics)
