---
sourceRefs: ["SRC-dev-env-explorer-20261107", "SRC-dev-env-files-20261107", "SRC-dev-env-workspaces-20261107"]
---
# レッスン00-1 ファイルの操作

## このレッスンの目標

- [ ] 課題フォルダーにファイルを作って保存できる
- [ ] ファイルの名前を変え、拡張子を確かめられる
- [ ] 開いているフォルダー名から保存先をたどれる

## 00-1-1 新しいファイルを作る

> **新しいファイルは、エクスプローラーで課題フォルダーを選んでから作り、保存します。**

「STELLAの使い方」で使ったエクスプローラー、課題フォルダー、保存の操作を思い出しましょう。
課題「メモのファイルを作る」の「VS Code で開く」から始めます。
エクスプローラーが見えなければ「表示」→「エクスプローラー」を選びます。
学習フォルダーから、ステージ・単元・課題の順に展開します。

1. 課題フォルダー `q01-note-file` を選びます。
2. 一覧の上の「新しいファイル」を押します。
3. `note.txt` と入力し、Enter キーで名前を決めます。
4. エディターに課題文で指定された本文を書きます。
5. Ctrl + S（Mac は ⌘ + S）で保存します。

課題フォルダーを右クリックし、「新しいファイル」でも作れます。
名前は一覧に、本文はエディターに入力します。
実務でも、置く場所を選んでからファイルを作ります。

## 00-1-2 ファイルの名前を変える

> **ファイルを選び、F2 キー（Mac は Enter キー）で名前を変え、拡張子を確かめます。**

課題「ファイルの名前を変える」で、配られた `memo.txt` を使います。
エクスプローラーで `memo.txt` をクリックして選びます。

:::os windows
F2 キーを押して、名前の入力欄を開きます。
:::

:::os macos
Enter キーを押して、名前の入力欄を開きます。
:::

`.txt` を残して前半を `plan` に変え、Enter キーで決めます。

拡張子は、名前の最後の `.txt` や `.html` の部分です。
`.txt` は文章のメモ、`.html` は HTML の文書を表します。
種類を保つなら、末尾の拡張子を残して名前を変えます。
`plan.txt.txt` のように二重に付けないよう、最後まで読みます。
拡張子を変えても、本文が別の形式に変換されるわけではありません。

## 00-1-3 保存先を確かめる

> **エクスプローラーの一番上のフォルダー名から、ファイルの保存先をたどります。**

一番上の名前は、いま VS Code で開いているフォルダーです。
STELLA では、通常は学習フォルダー `web-training` が出ます。
別の名前を選んだ場合は、その名前です。

その中の `html-css-basics` → `u00-files` → `q01-note-file` を展開します。
`note.txt` が課題フォルダーの中にあるか確かめます。
エディター上のパンくずリストも、今のファイルまでの場所を示します。
表示が無ければ「表示」→「外観」→「パンくずリスト」で表示できます。

ファイルの場所を表す文字列をパスと呼びます。
同名のファイルを取り違えないよう、手前のフォルダーも読みます。
OS によって区切りの表記が違います。

:::os windows
パスは通常 `\` で区切ります。
例：`C:\Users\yamada\web-training\html-css-basics\u00-files\q01-note-file\note.txt`
:::

:::os macos
パスは `/` で区切ります。
例：`/Users/yamada/web-training/html-css-basics/u00-files/q01-note-file/note.txt`
:::

`yamada` はユーザー名の例です。この場所を新しく作る必要はありません。

## もっと知りたい人へ

- [VS Code の画面（Explorer view / Breadcrumbs）](https://code.visualstudio.com/docs/editing/getting-started/userinterface)
- [ファイルの構成やパス](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Environment_setup/Dealing_with_files)
- [VS Code で開くフォルダー](https://code.visualstudio.com/docs/editing/workspaces/workspaces)
