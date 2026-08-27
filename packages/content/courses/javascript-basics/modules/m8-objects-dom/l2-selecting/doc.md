# レッスン8-2 要素を取る

## このレッスンの目標

- [ ] DOMとDOMツリーの関係を説明できる
- [ ] classやidのセレクターで狙った要素を取れる
- [ ] querySelectorAllの結果をfor...ofで回せる

## 8-2-1 DOMはHTMLを木として持つ

> **ブラウザーはHTMLをDOMという木の形で持ち、JavaScriptはそれを書き換える**

前のモジュールでquerySelectorから取っていた「要素」の正体をここで明かします。ブラウザーはHTMLファイルを読み込むと、そこから **DOM** という操作できるデータ構造を組み立てます。HTMLファイルが設計図、DOMが組み上がった模型で、JavaScriptが触るのは模型の方です。

DOMは、HTMLの入れ子がそのまま親子関係になった木の形をしています。これを **DOMツリー** といいます。

```text
document
└─ html
   └─ body
      ├─ h1
      └─ ul
         ├─ li
         └─ li
```

木の1つ1つの節を **ノード** と呼びます(要素はノードの代表です)。前レッスンのバブリングは、この木を発生源から上へ昇る動きだったのです。

もう1つ大事な性質があります。画面は「DOMのいまの状態」の描画です。JavaScriptがDOMを書き換えると、ブラウザーが画面を描き直します。**HTMLファイル自体は書き換わりません**。だから再読み込みすれば元どおりになります。

## 8-2-2 querySelectorはCSSのセレクターで選ぶ

> **querySelectorには、classやidなどCSSと同じセレクターが書ける**

ボタンが2つあるページで `querySelector("button")` と書くと、最初の1つしか取れません。「保存ボタンだけ」を狙うには、HTML/CSS入門で学んだ狙い撃ちの記法をそのまま使います。

```html
<button class="save">保存</button>
<button class="cancel">取消</button>
<script>
  const saveButton = document.querySelector(".save");
</script>
```

- **class** 属性で選ぶなら `.名前`
- **id** 属性で選ぶなら `#名前`(idはページ内で1つだけの要素に付けます)

CSSに書けるセレクターは、`ul .task` のような組み合わせも含めてほぼそのまま使えます。CSSと同じ頭で選べるのがquerySelectorの利点です。

なお、要素の取得には `getElementById` など古くからの方法もあります。この講座は **querySelectorに統一** します。書き分けを覚えるよりセレクター1本の方が迷いませんし、古いコードで `getElementById("menu")` を見たら「`#menu` と同じ意味」と読めれば十分です。

## 8-2-3 querySelectorAllで全部取る

> **querySelectorAllは、当てはまる要素すべてをまとめて返す**

リストの項目「全部」に同じ処理をしたいとき、1つしか返らないquerySelectorでは足りません。**querySelectorAll** は当てはまる要素すべてを返します。

```html
<li class="task">見積作成</li>
<li class="task">レビュー</li>
<script>
  const items = document.querySelectorAll(".task");
  console.log(items.length);  // => 2
</script>
```

返ってくるのは **NodeList** という「要素の集まり」です。配列そのものではありませんが、`length` で個数が見え、for...ofで回せます。

```js
for (const item of items) {
  console.log(item);
}
```

1件ずつは、querySelectorで取った要素とまったく同じように扱えます。

設計の選択肢も思い出してください。「全要素にリスナーを付ける」より、前レッスンの **イベント委譲**(親に1つ)が向く場面も多くあります。querySelectorAllは「読み取りや一括の書き換え」で特に活躍します。

## もっと知りたい人へ

- NodeListにはmapやfilterがありません。使いたいときは `Array.from(items)` で配列に変換してから呼びます
- セレクターを凝りすぎると、HTMLの構造変更に弱くなります。JavaScriptから触りたい要素には、専用のclassを付けておくのが実務の知恵です

---

演習は [practice.md](practice.md) にあります。
