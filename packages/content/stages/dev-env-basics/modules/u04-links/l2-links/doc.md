---
sourceRefs: [SRC-dev-env-links-20261107, SRC-dev-env-files-20261107]
---
# レッスン4-2 リンクでつなぐ

## このレッスンの目標

- [ ] a 要素でリンクを作れます。
- [ ] 同じ場所・下・上への相対パスを選べます。

## 4-2-1 a 要素の href

> **a 要素の href に、開きたいファイルの場所を書きます。**

`a` は、別の場所へ移動するリンクを作る要素です。
`href` は、移動先を指定する属性です。
属性は、開始タグに追加する情報です。

```html
<a href="about.html">自己紹介</a>
```

`href` の引用符の中に、開くファイルの場所を書きます。
タグの間の「自己紹介」が画面に出ます。
保存してブラウザーを再読み込みし、その文字を押します。
自己紹介の見出しが出たら、移動できています。
実務でも、一覧から詳しい説明へ読む人を案内します。

## 4-2-2 今の場所からたどる

> **相対パスは、今のファイルから見た相手の場所です。**

相対パスでは、リンクを書くファイルのあるフォルダーを基準にします。
同じフォルダーなら `about.html` と書きます。
下のフォルダーなら `pages/about.html` と書きます。
`pages/about.html` から上の `index.html` へは `../index.html` です。
`../` は、1つ上のフォルダーへ戻るという意味です。
リンク内の区切りは、OS によらず `/` で書きます。
実務でも、ページを分けたら行き帰りのリンクを確かめます。

```text
index.html
pages/
  about.html
```

この並びを紙に書き、今いるファイルから相手まで指でたどります。

## うまくいかないとき

### リンクを押すとページが見つからない

`href` のファイル名・拡張子と、一覧の実物を照合します。
大文字と小文字も含め、同じ綴りにそろえます。
次に、リンクを書くファイルを出発点に場所をたどります。

### 戻るリンクだけが開かない

下のフォルダーから上へ戻るなら、`../` が必要か見直します。

## もっと知りたい人へ

- [Creating links（Anatomy of a link / A quick primer on URLs and paths）](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/Creating_links)
- [Dealing with files（File structure / File paths）](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Environment_setup/Dealing_with_files)
