---
sourceRefs: [SRC-dev-env-git-init-20261107, SRC-dev-env-git-config-20261107, SRC-dev-env-gitignore-20261107, SRC-dev-env-git-status-20261107, SRC-dev-env-git-add-20261107, SRC-dev-env-git-commit-20261107]
---
# レッスン6-2 最初の記録を作る

## このレッスンの目標

- [ ] 学習フォルダーを初期化し、記録者をその中だけに設定できます。
- [ ] 記録しないファイルを .gitignore に書けます。
- [ ] 変更を選び、説明を添えてコミットできます。

## 6-2-1 記録する場所を決める

> **`git init` は、学習フォルダーで 1 回だけ実行します。**

まず、ターミナルで場所を確かめます。

```sh
pwd
```

末尾が `web-training` なら、学習フォルダーです。
課題フォルダーで開いているなら、3つ上へ戻ります。
次を1つずつ実行します。

```sh
cd ..
```

```sh
cd ..
```

```sh
cd ..
```

```sh
pwd
```

この3回は、課題フォルダーから始めた場合だけの手順です。
すでに `web-training` にいるなら、戻る操作はしません。
エクスプローラーの一番上の学習フォルダーを右クリックしても開けます。
「統合ターミナルで開く」を選び、`pwd` で照合します。

場所が合っていれば、一度だけ実行します。

```sh
git init
```

初期化とは、Git が記録を持つ準備をすることです。
学習フォルダーに `.git` という記録用のフォルダーができます。
すでに学習フォルダーのリポジトリがあれば、初期化は省略します。
課題フォルダーで `git init` を実行しません。

## 6-2-2 記録者を設定する

> **名前とメールは、学習リポジトリだけに設定します。**

初期化した学習フォルダーの中で、設定します。
引用符の中の名前とメールは例です。
名前は研修で使う自分の名前に、メールは研修で指定されたものに置き換えます。
例のメールアドレスをそのまま使わないでください。

```sh
git config user.name "yamada"
```

```sh
git config user.email "training@example.invalid"
```

リポジトリの中で実行した設定は、そのリポジトリだけに保存されます。
`--global` は付けません。
設定を読む場合は、値を付けずに実行します。

```sh
git config --local user.name
```

```sh
git config --local user.email
```


## 6-2-3 記録しないものを決める

> **記録しないファイルは `.gitignore` に書きます。**

エクスプローラーで学習フォルダー直下に `.gitignore` を作ります。
課題フォルダーの中ではありません。
すでにあれば開いて、次の3行と同じかを確かめます。
最初の `git add` より前に保存します。

```text
node_modules/
**/.stella/last-run.json
**/.stella/dotnet/
```

| 行 | 記録しないもの |
| --- | --- |
| `node_modules/` | npm が作る、部品の大きなフォルダー |
| `**/.stella/last-run.json` | 手元の確認の結果。毎回変わります |
| `**/.stella/dotnet/` | C# のビルドの出力。今は使いません |

`**/` は、下の階層のどこにあっても対象にする指定です。
`.stella` 全体を除外する指定にはしません。
課題の定義など、記録してよいファイルも入っているためです。
すでに記録したファイルを、この設定だけで除くことはできません。

## 6-2-4 選んで記録する

> **`git add` で選び、`git commit` で記録します。**

コミットは、選んだ変更を説明と一緒に残す記録です。
まず、学習フォルダーで状態を見ます。

```sh
git status
```

表示されたファイル名を読み、記録したいものかを確かめます。
学習に関係のないファイルがあれば、選ぶ前に講師へ相談します。
次に、いまのフォルダー以下の変更を選びます。

```sh
git add .
```

`.` はいまのフォルダー以下を表します。
もう一度、選んだ状態を見ます。

```sh
git status
```

変更を選んだだけでは、コミットは完成していません。
`-m` の後ろに説明を付けて記録します。次は別の練習の例です。

```sh
git commit -m "学習メモを追加する"
```

最後に状態を確認します。

```sh
git status
```

今回選んだ変更が残っていないかを読みます。
自動生成の結果以外に残りがあれば、そのファイルを確かめます。

## うまくいかないとき

### リポジトリが無いと言われる

`pwd` で場所を確認します。
学習フォルダーで初期化したか、記録した場所が違わないかを見ます。
課題フォルダーで作ってしまった `.git` を自己判断で削除しません。
どこで実行したかを講師に伝え、直し方を確認します。

### 名前やメールを求められる

学習リポジトリの中で、上の設定の2行を確認します。
PC全体の設定を変更する必要はありません。

### 記録するものが無いと言われる

`git status` を読み、変更が保存済みか、すでに記録済みかを見ます。
`nothing to commit` は、新しく選んだ変更が無いという意味です。
同じ記録を作るためだけにファイルを変える必要はありません。

## もっと知りたい人へ

- [git-init（DESCRIPTION / EXAMPLES）](<https://git-scm.com/docs/git-init>)
- [git-config（DESCRIPTION / SCOPES / user.name / user.email）](<https://git-scm.com/docs/git-config>)
- [gitignore（DESCRIPTION / PATTERN FORMAT）](<https://git-scm.com/docs/gitignore>)
- [git-status（DESCRIPTION / OUTPUT）](<https://git-scm.com/docs/git-status>)
- [git-add（DESCRIPTION / EXAMPLES）](<https://git-scm.com/docs/git-add>)
- [git-commit（DESCRIPTION / OPTIONS / EXAMPLES）](<https://git-scm.com/docs/git-commit>)
