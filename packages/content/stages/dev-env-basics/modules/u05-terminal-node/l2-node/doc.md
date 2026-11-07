---
sourceRefs: [SRC-dev-env-node-intro-20261107, SRC-dev-env-node-download-20261107, SRC-dev-env-node-releases-20261107, SRC-dev-env-powershell-command-20261107]
---
# レッスン5-2 Node.js と npm を入れる

## このレッスンの目標

- [ ] Node.js と npm の役割を区別できます。
- [ ] 指定に合う版を公式サイトから導入できます。
- [ ] 版を読み、環境診断の結果と照合できます。

## 5-2-1 Node.js の役割

> **Node.js は、ブラウザーの外で JavaScript を動かす道具です。**

JavaScript はプログラムを書くための言語です。
Node.js は、そのプログラムをブラウザーの外で動かします。
npm は、プログラムで使う部品を入れる道具です。
Node.js と一緒に入ります。
このステージでは、npm で部品を入れる操作は行いません。
JavaScript のステージで使うために準備します。

## 5-2-2 指定の版を入れる

> **Node.js は、教材が指定する版を公式サイトから入れます。**

LTS は長い期間の保守を予定した版です。
この教材は、22系か24系の LTS を使います。
22系の場合は22.13.0以上にします。
23など奇数の版や、指定外の系は使いません。
すでに条件に合う版が使えれば、入れ直す必要はありません。

[Node.js の公式ダウンロードページ](https://nodejs.org/ja/download)を開きます。
サイトの最初の表示が、教材の対象の版とは限りません。
版の選択で22系か24系の LTS を選びます。
必要なら[版の一覧](https://nodejs.org/en/about/previous-releases)と照合します。
使う PC に合う CPU の種類も確認します。
分からないときは、ダウンロードする前に講師へ相談します。

:::os windows
1. OS に Windows を選びます。
2. CPU の種類を確認し、「Windows Installer (.msi)」を選びます。
3. ダウンロードした `.msi` を開き、画面の案内に沿って進めます。
4. npm を含む既定の構成で導入を終えます。
:::

:::os macos
1. OS に macOS を選びます。
2. CPU の種類を確認し、「macOS Installer (.pkg)」を選びます。
3. ダウンロードした `.pkg` を開き、画面の案内に沿って進めます。
4. 導入を終えます。
:::

入れたら、編集したファイルを保存します。
VS Code を一度すべて閉じ、Web のレッスンから開き直します。
開いていたターミナルは、新しい PATH を知りません。
PATH は、コマンドの道具を探す場所を列挙した設定です。
開き直したターミナルで、版を確かめます。

## 5-2-3 版を照合する

> **版は `node --version` で確かめ、教材の指定と照らし合わせます。**

次をターミナルで実行します。

```sh
node --version
```

実行結果の例です。数字は入っている版によって違います。
```text
v22.13.0
```
先頭の `v` の後の数字を、教材の指定と照らし合わせます。
22.13.0は対象、22.12.0や23系は対象外です。
24系も対象です。

次は npm の版を、別の1行で確かめます。

:::os windows
PowerShell で、まず次を実行します。
```powershell
npm --version
```
「スクリプトの実行が無効」などと表示されたら、次を使います。
```powershell
npm.cmd --version
```
`npm.cmd` と拡張子まで指定し、別の起動用ファイルを使います。
実行ポリシーは変更しません。
:::

:::os macos
zsh で次を実行します。
```sh
npm --version
```
:::

結果の例です。npm は10以上が必要です。
```text
10.9.2
```

環境診断は、STELLA 拡張が必要な道具の版を照合する確認です。
「Node.js と npm の版を確かめる」の課題を開きます。
「課題を確認する」を押し、表示された版と必要な版を読みます。
この課題ではコードやファイルを作りません。
Git の確認は、この診断には含まれません。

## うまくいかないとき

### node が見つからない

導入を終えたかを確認し、保存して VS Code をすべて閉じます。
開き直したターミナルで、もう一度版を確かめます。
まだ見つからなければ、試した操作とメッセージを講師に伝えます。

### npm.ps1 を実行できない

上の自分の OS の欄を読み直します。
PowerShell の制限を変更せず、拡張子を付けた起動方法を使います。

### 会社の PC に入れられない

管理方法や権限の制約は講師へ相談します。
環境の問題は、能力の評価には入りません。

## もっと知りたい人へ

- [Introduction to Node.js（Introduction to Node.js）](<https://nodejs.org/learn/getting-started/introduction-to-nodejs>)
- [Node.js®をダウンロードする（Node.js®をダウンロードする）](<https://nodejs.org/ja/download>)
- [Node.js Releases（Node.js Releases / Release schedule）](<https://nodejs.org/en/about/previous-releases>)
- [about_Command_Precedence（Command precedence / Use command name with extension）](<https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_command_precedence>)
