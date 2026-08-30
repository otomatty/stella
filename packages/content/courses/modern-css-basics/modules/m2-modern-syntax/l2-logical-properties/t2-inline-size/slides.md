---
id: 2-2-2
title: 幅はinline-sizeで書ける
takeaway: "inline-sizeは、文章が流れる向きの寸法を表すwidthの論理版"
introduces: [inline-size, max-inline-size]
requires: [論理プロパティ, margin-inline]
header: "モダンCSS入門"
---

<!-- _class: lead -->

# 2-2-2
# 幅はinline-sizeで書ける

モダンCSS入門 — Module 2 / レッスン2-2

<!-- ノート: 余白の次は寸法です。widthとheightにも論理版があります。 -->

---

## なぜ必要か

- 余白を流れの向きで書いたのに、寸法だけ `width` のままだと基準が混ざる
- 「幅」と呼んでいるものの正体は、文字が進む向きの寸法

<!-- ノート: つかみ。margin-inlineと揃えるなら、寸法も同じ物差しで書きたい。 -->

---

## 結論

**`inline-size`は、文章が流れる向きの寸法を表す`width`の論理版**

- 行が積み重なる向きは `block-size`(`height` の論理版)
- 横書きのページでは、見た目は width / height と同じ

<!-- ノート: 結論。今のページで結果は変わりません。基準の揃った語彙に置き換える話です。 -->

---

## 最小のコード

```css
.container {
  inline-size: 640px;
  margin-inline: auto;
}
```

- 幅640pxの箱を左右中央に置く

<!-- ノート: 中央寄せの定番ペアが、どちらも流れの向きの語彙で揃いました。 -->

---

## 対応表

| 従来(横書き) | 論理プロパティ |
| --- | --- |
| width | inline-size |
| height | block-size |
| max-width | max-inline-size |

<!-- ノート: maxの形もそのままあります。max-inline-sizeは後のレッスンで行の長さを抑えるのに使います。 -->

---

<!-- _class: summary -->

## まとめ

**`inline-size`は、文章が流れる向きの寸法を表す`width`の論理版**

<!-- ノート: 結論の再掲だけ。次は位置指定の距離をまとめる書き方です。 -->
