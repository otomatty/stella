---
sourceRefs: [SRC-dev-env-web-20261107, SRC-dev-env-url-20261107]
---
# レッスン4-4 Webのしくみ

## このレッスンの目標

- [ ] HTML とブラウザーの表示の関係を説明できます。
- [ ] URL のスキーム・ホスト・パスを区別できます。

## 4-4-1 HTML から画面へ

> **ブラウザーは HTML を読んで画面を作ります。**

HTML には、文字の内容と文書の構造が書かれています。
ブラウザーはそれを読み、見出しなどの画面を作ります。

```html
<h1>学習の予定</h1>
```

画面では「学習の予定」が見出しとして表示されます。
`<h1>` 自体を、本文の文字として見せるためではありません。
実務でも、画面のどの部分が HTML のどこに当たるかを見比べます。

## 4-4-2 URL の部品

> **URL は、どこにある何を開くかを表します。**

URL は、どこにある何を開くかを表す文字列です。
ブラウザーのアドレス欄で確認できます。
例として `https://example.com/pages/about.html` を読みます。
これは説明用の URL なので、実際に開く必要はありません。

- スキーム `https` は、開くための方式です。
- ホスト `example.com` は、相手の名前です。
- パス `/pages/about.html` は、相手の中の場所です。

実務でも、案内された URL と開いている URL を照合します。
ここでは、この3つの部品が読めれば十分です。

## うまくいかないとき

### タグの文字まで画面に出る

保存した名前の末尾が `.html` か確かめます。
ブラウザーで開いたファイルと編集したファイルを照合します。

### URL のどこを見ればよいか分からない

例の `://` の前、次の `/` まで、その後の順に分けて読みます。

## もっと知りたい人へ

- [How the web works（Order in which component files are parsed）](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Web_standards/How_the_web_works)
- [What is a URL?（Basics: anatomy of a URL / Scheme / Authority / Path to resource）](https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Web_mechanics/What_is_a_URL)
