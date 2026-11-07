---
sourceRefs: [SRC-dev-env-editor-20261107, SRC-dev-env-win-setup-20261107, SRC-dev-env-mac-setup-20261107, SRC-dev-env-locales-20261107, SRC-dev-env-jp-pack-20261107]
---
# レッスン01-1 VS Codeを入れる

## このレッスンの目標

- [ ] VS Code の役割を説明できる
- [ ] 自分のOSの公式手順で VS Code を起動できる
- [ ] メニューを日本語で表示できる

## 01-1-1 VS Codeの役割

> **VS Code は、ファイルを書いて保存するための道具です。**

エディターは、ファイルの中の文章を書く道具です。
VS Code は、そのエディターの1つです。
メモ帳と同じように、文字を書いてファイルに残せます。
VS Code には、開発で使う機能がそろっています。
課題でも仕事でも、ファイルを書く場所として使います。

## 01-1-2 公式サイトから入れる

> **VS Code は公式サイトから、自分のOS用を入れます。**

ブラウザーで、下の自分のOSの公式ページを開きます。
通常版の Stable を使います。
会社が管理するPCは、研修の担当者に先に確認してください。

:::os windows
1. [Windows 向け公式手順](https://code.visualstudio.com/docs/setup/windows)を開きます。
2. ダウンロードの案内から、自分のPC用の「User Installer」を選びます。
3. ダウンロードした User setup のインストーラーを開きます。
4. 使用許諾を読み、同意する場合は次へ進みます。
5. 以降は既定の設定のまま進め、「インストール」を押します。
6. 「完了」を押し、VS Code を起動します。

「PATH への追加」は既定でオンです。そのまま進めます。
PATH は、PC がプログラムを探す場所の一覧です。
会社の管理端末では、担当者が認めた導入方法に従います。
:::

:::os macos
1. [macOS 向け公式手順](https://code.visualstudio.com/docs/setup/mac)を開きます。
2. 自分の Mac 用の zip をダウンロードします。
3. zip を開いて展開します。
4. 「Visual Studio Code」を「アプリケーション」フォルダーへ移します。
5. 「アプリケーション」から「Visual Studio Code」を開きます。
6. 初回の確認が出たら、公式サイトから入れたことを確かめて「開く」を押します。
:::

VS Code のウィンドウが開けば、導入はここまで完了です。

## 01-1-3 日本語で表示する

> **表示言語は Japanese Language Pack で日本語にします。**

Japanese Language Pack は、表示を日本語にする追加機能です。
VS Code の右下に、日本語表示に切り替える通知が出ることがあります。
通知が出たら、案内に沿って言語パックを入れ、再起動します。

通知が無いときは、次の手順で切り替えます。
コマンドパレットは、操作の名前を探して実行する場所です。

1. 「表示」→「コマンドパレット」を開きます。
   英語表示では「View」→「Command Palette」です。
2. 「Configure Display Language」と入力し、その項目を選びます。
3. 「日本語」（Japanese）を選びます。
4. 言語パックの導入を求められたら、案内に沿って入れます。
5. 再起動の案内に従います。

日本語が候補に無い場合は、左の四角のアイコンを押します。
ここは「拡張機能」のビューです。
「Japanese Language Pack」で検索します。
発行元 Microsoft、ID `MS-CEINTL.vscode-language-pack-ja` を確かめます。
「インストール」を押し、もう一度表示言語を選びます。
再起動後に「ファイル」「表示」のメニューが読めれば完了です。

## うまくいかないとき

画面が例と違うときは、OSと表示言語を確かめます。
色や位置の違いだけで、失敗と判断する必要はありません。
英語のままなら、表示言語をもう一度選び、再起動します。
会社のPCで導入が止まったら、研修の担当者へ相談します。

## もっと知りたい人へ

- [Visual Studio Code editor tutorial](https://code.visualstudio.com/docs/editing/getting-started/editor-tutorial) — Get started with the editor
- [Visual Studio Code on Windows](https://code.visualstudio.com/docs/setup/windows) — Installation / User setup versus system setup
- [Visual Studio Code on macOS](https://code.visualstudio.com/docs/setup/mac) — Installation
- [Display language](https://code.visualstudio.com/docs/configure/locales) — Changing the display language
- [Japanese Language Pack for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=MS-CEINTL.vscode-language-pack-ja) — Usage

ログイン後は、このレッスンの知識問題で確かめます。
