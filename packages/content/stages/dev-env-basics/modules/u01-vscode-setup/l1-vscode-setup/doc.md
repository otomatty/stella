---
sourceRefs: ["SRC-dev-env-editor-20261107", "SRC-dev-env-win-setup-20261107", "SRC-dev-env-mac-setup-20261107", "SRC-dev-env-locales-20261107", "SRC-dev-env-jp-pack-20261107", "SRC-dev-env-extensions-20261107", "SRC-dev-env-stella-20261107", "SRC-dev-env-trust-20261107"]
---
# レッスン01-1 VS Codeの準備

## このレッスンの目標

- [ ] VS Code を日本語で使える
- [ ] STELLA 拡張を入れられる
- [ ] Web から課題を開き、同じ課題へ戻る方法が分かる

## 01-1-1 VS Codeを入れる

> **VS Code は、公式サイトから自分のOS用を入れ、日本語で表示します。**

エディターは、ファイルの文章を書く道具です。
VS Code はその1つで、課題でも仕事でも使います。
OS は PC の基本的な動きを支えるソフトウェアです。
自分のOSのタブで手順を読みます。
会社のPCでは、導入方法を先に担当者へ確認します。

:::os windows
1. [公式の Windows 向け手順](https://code.visualstudio.com/docs/setup/windows)から「User Installer」をダウンロードします。
2. インストーラーを開き、使用許諾を読んで同意する場合は進みます。
3. 既定の設定でインストールし、VS Code を起動します。
4. 「View」→「Command Palette」を開きます。
5. 「Configure Display Language」を探し、「日本語」を選びます。
6. 言語パックの導入と再起動の案内に従います。
:::

:::os macos
1. [公式の macOS 向け手順](https://code.visualstudio.com/docs/setup/mac)から自分の Mac 用をダウンロードします。
2. zip を展開し、「Visual Studio Code」を「アプリケーション」へ移します。
3. 「アプリケーション」から起動します。初回の確認では出所を確かめて「開く」を選びます。
4. 「View」→「Command Palette」を開きます。
5. 「Configure Display Language」を探し、「日本語」を選びます。
6. 言語パックの導入と再起動の案内に従います。
:::

Command Palette（コマンドパレット）は、操作名を探して実行する場所です。
日本語が候補に無ければ、四角の「拡張機能」から「Japanese Language Pack」を検索します。
発行元 Microsoft、ID `MS-CEINTL.vscode-language-pack-ja` を選んで入れ、表示言語を選び直します。
再起動後、「ファイル」「表示」が読めれば完了です。

## 01-1-2 STELLA拡張を入れる

> **STELLA 拡張は、拡張機能のビューで検索して入れます。**

拡張機能は、VS Code に機能を足すものです。
STELLA 拡張で、課題の受け取り・確認・提出ができます。

1. 左の四角の「拡張機能」アイコンを押し、「STELLA」を検索します。
2. 名前「STELLA」、発行元 `saedgewell`、ID `saedgewell.stella-lms` を確かめます。
3. 「インストール」を押します。「無効にする」が選べれば有効です。

## 01-1-3 Webから課題を開く

> **Web のレッスンの「VS Code で開く」で、VS Code に課題が届きます。**

:::tutorial open-in-vscode

この公開単元には課題はありません。U02 の最初の課題で試します。
PC で Web にログインし、課題文のレッスンから「VS Code で開く」を押します。
ブラウザーの確認で「開く」を選ぶと、左にファイル、右に課題文のパネルが出ます。
課題文のパネルは、取り組む課題の説明を読む場所です。

初回は、学習のファイルをまとめる「学習フォルダー」を選びます。
既定の `~/web-training` を作るか、既存の場所を選べます。
`~` は自分のユーザー用のホームフォルダーを表します。
中にはステージ・単元・課題の順に「課題フォルダー」が作られます。
選んだ学習フォルダーは拡張が覚えます。

「作成者を信頼しますか」と出たら、自分の学習フォルダーと出所を確かめて信頼します。
Workspace Trust は、この信頼を確かめる仕組みです。
信頼していないフォルダーでは「課題を確認する」が動きません。

翌日も、Web の同じ課題のレッスンから「VS Code で開く」で戻れます。
閉じる前には保存します。保存したファイルは残り、開き直しても上書きされません。

## もっと知りたい人へ

- [表示言語の公式手順](https://code.visualstudio.com/docs/configure/locales)
- [Japanese Language Pack](https://marketplace.visualstudio.com/items?itemName=MS-CEINTL.vscode-language-pack-ja)
- [拡張機能の公式手順](https://code.visualstudio.com/docs/configure/extensions/extensions)
- [STELLA の Marketplace ページ](https://marketplace.visualstudio.com/items?itemName=saedgewell.stella-lms)
- [Workspace Trust の公式説明](https://code.visualstudio.com/docs/editing/workspaces/workspace-trust)

ログイン後は、このレッスンの知識問題で確かめます。
