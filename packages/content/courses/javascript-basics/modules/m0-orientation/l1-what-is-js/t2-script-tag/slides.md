---
id: 0-1-2
title: scriptタグはbodyの末尾に置く
takeaway: "JavaScriptはscriptタグに書き、bodyの閉じタグの直前に置く"
introduces: [scriptタグ, タグ, 要素, body]
requires: [JavaScript, HTML]
header: "JavaScript入門研修"
---

<!-- _class: lead -->

# 0-1-2
# scriptタグはbodyの末尾に置く

JavaScript入門研修 — Module 0 / レッスン0-1

<!-- ノート: HTML/CSS入門で学んだ「タグで要素を作る」を思い出してもらいながら、JavaScriptの置き場所を決めます。 -->

---

## なぜ必要か

- JavaScriptを書く場所は、HTMLの側で決まっている
- 置き場所を間違えると、「まだ無い要素」を触ろうとして失敗する
- 最初に置き場所を1つに固定してしまうのが安全

<!-- ノート: つかみ。CSSにlinkの置き場所があったように、JavaScriptにも決まった置き場所がある、という流れです。 -->

---

## 結論

**JavaScriptはscriptタグに書き、bodyの閉じタグの直前に置く**

- `script` という **タグ** で囲んだ中がJavaScript
- 置くのは `</body>` の直前(= HTMLを読み終わった後)

<!-- ノート: 結論。この講座では一貫してbody末尾の古典形を使います。理由は次のスライドのコードで見せます。 -->

---

## 最小のコード

```html
<body>
  <h1>お知らせ</h1>
  <script>
    alert("こんにちは!");
  </script>
</body>
```

<!-- ノート: h1などの要素が先、scriptが後。ブラウザーは上から読むので、scriptが動く時点でページの要素は出そろっています。 -->

---

## 別ファイルに分けてもよい

```html
<script src="script.js"></script>
```

- CSSを別ファイルにしたのと同じで、`src` で読み込める
- どちらでも動く。この講座の例は、まず中に書く形で示す

<!-- ノート: 関連枠。実務は別ファイルが基本ですが、学習中はファイル1つで完結する方が迷いません。type="module"はfile://で開くと動かないため、この講座では使いません。 -->

---

<!-- _class: summary -->

## まとめ

**JavaScriptはscriptタグに書き、bodyの閉じタグの直前に置く**

<!-- ノート: 再掲のみ。書いた結果をどこで確かめるのか、という問いを次に残します。 -->
