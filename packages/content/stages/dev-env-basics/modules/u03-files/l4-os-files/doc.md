---
sourceRefs: [SRC-dev-env-files-20261107, SRC-dev-env-windows-files-20261107, SRC-dev-env-mac-files-20261107]
---
# レッスン3-4 OSとファイル

## このレッスンの目標

- [ ] 入れ子のフォルダーの場所を読めます。
- [ ] 拡張子と隠しファイルの表示設定を確かめられます。

## 3-4-1 場所を表すパス

> **フォルダーは入れ子になり、ファイルの場所はパスで表します。**

フォルダーの中に、さらにフォルダーを置けます。
この重なりを入れ子と呼びます。
同じ名前のファイルでも、手前のフォルダーが違えば別の場所です。
実務で保存先を伝えるときにも、パスを使います。

:::os windows
Windows のパスは、通常 `\` で区切ります。
例は `C:\Users\yamada\web-training\practice\note.txt` です。
`yamada` は例です。自分のユーザー名に読み替えます。
この例の場所を新しく作る必要はありません。
:::

:::os macos
macOS のパスは `/` で区切ります。
例は `/Users/yamada/web-training/practice/note.txt` です。
`yamada` は例です。自分のユーザー名に読み替えます。
この例の場所を新しく作る必要はありません。
:::

## 3-4-2 表示されない名前

> **拡張子や隠しファイルは、OS の設定で見え方が変わります。**

OS の一覧では、拡張子の表示を省くことがあります。
名前を付け直す前に、拡張子を表示して確かめます。

:::os windows
エクスプローラーの「表示 > 表示 > ファイル名拡張子」を有効にします。
隠し項目は「表示 > 表示 > 隠しファイル」で表示します。
:::

:::os macos
Finder の「設定 > 詳細」を開きます。
「すべてのファイル名拡張子を表示」を有効にします。
隠し項目は Finder で Command + Shift + . を押して表示を切り替えます。
:::

学習フォルダーの中の課題フォルダーには `.stella` があります。
先頭が点の名前は、OS の一覧では隠れることがあります。
これは STELLA が使うフォルダーなので、削除や編集はしません。
実務でも、表示されない設定用ファイルがあると知っておくと役立ちます。

## うまくいかないとき

### 拡張子を付けたのにファイルの種類が違う

拡張子を表示し、`index.html.txt` になっていないか確かめます。
`.html` が本当の末尾かを読みます。

### .stella がOSの一覧に見当たらない

上の隠し項目の表示を確かめます。
表示できても、中のファイルは変更しません。

## もっと知りたい人へ

- [Dealing with files（File structure / File paths）](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Environment_setup/Dealing_with_files)
- [Common file name extensions in Windows（Common file name extensions in Windows）](https://support.microsoft.com/en-us/windows/common-file-name-extensions-in-windows-da4a4430-8e76-89c5-59f7-1cdbbc75cb01)
- [Show or hide filename extensions on Mac（For all files）](https://support.apple.com/guide/mac-help/show-or-hide-filename-extensions-on-mac-mchlp2304/mac)
