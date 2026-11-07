---
sourceRefs: [SRC-dev-env-git-commit-20261107, SRC-dev-env-git-init-20261107, SRC-dev-env-git-windows-20261107, SRC-dev-env-git-mac-20261107]
---
# レッスン6-1 Git とは

## このレッスンの目標

- [ ] 保存と Git の記録の違いを説明できます。
- [ ] 学習リポジトリの範囲を説明できます。
- [ ] Git を導入し、版を確かめられます。

## 6-1-1 Git の役割

> **Git は、ファイルの変更を記録として残す道具です。**

ファイルの保存は、いま編集した内容を残す操作です。
Git の記録には、作業の区切りの内容と説明を残せます。
何を変えたかを後から読み、変更の経緯を調べるために使います。
この単元では、自分の PC の中で記録を作ります。

## 6-1-2 リポジトリとは

> **リポジトリは、Git が記録を持つフォルダーです。**

この研修では、学習フォルダー全体を1つのリポジトリにします。
学習フォルダー `web-training` が、リポジトリの一番上です。
その下にステージ・単元・課題フォルダーが並びます。

```text
web-training/
  dev-env-basics/
    u06-git/
      q01-init-repo/
```

課題ごとにリポジトリを作ることはしません。
これからのステージでも、同じリポジトリに記録していきます。

## 6-1-3 Git を入れる

> **Git は公式の配布元から入れ、`git --version` で確かめます。**

まず「表示 > ターミナル」で次を実行します。

```sh
git --version
```

この教材では Git 2.40以上を使います。
条件に合う版が使えれば、入れ直す必要はありません。
見つからない場合は、自分の OS の手順を使います。

:::os windows
1. [Git for Windows の公式配布ページ](https://git-scm.com/install/windows)を開きます。
2. PC の CPU に合うインストーラーをダウンロードします。
3. インストーラーを開き、既定の選択のまま進めます。
4. 導入を終えたら保存し、VS Code をすべて閉じて開き直します。
5. PowerShell で次を実行します。
```powershell
git --version
```
:::

:::os macos
1. VS Code の zsh で次を実行します。
```sh
git --version
```
2. 開発者ツールの導入を尋ねられたら「インストール」を選びます。
3. 画面の案内に沿って導入を終えます。
4. 保存して VS Code をすべて閉じ、開き直します。
5. 新しいターミナルで、もう一度次を実行します。
```sh
git --version
```
:::

実行結果の例です。数字や末尾の文字は環境によって違います。
```text
git version 2.40.0
```

「Git の版を確かめる」の課題で「課題を確認する」を押します。
この診断では、U05で準備した Node.js と npm の版も照合します。
必要なのは Node.js 22.13以上の22系か24系と、npm 10以上です。

## うまくいかないとき

### git が見つからない

導入が終わったかを確認します。
保存して VS Code をすべて閉じ、開き直して版を再確認します。
まだ認識されなければ、実行したコマンドとメッセージを講師に伝えます。

### 版が足りない・導入できない

表示された版と、必要な2.40以上という条件を照合します。
会社の PC の管理や権限で進められないときは講師に相談します。
環境の不具合や導入待ちは、能力の評価には入りません。

## もっと知りたい人へ

- [git-commit（DESCRIPTION / OPTIONS / EXAMPLES）](<https://git-scm.com/docs/git-commit>)
- [git-init（DESCRIPTION / EXAMPLES）](<https://git-scm.com/docs/git-init>)
- [Install for Windows（Install for Windows）](<https://git-scm.com/install/windows>)
- [Install for macOS（Install for macOS / Xcode）](<https://git-scm.com/install/mac>)
