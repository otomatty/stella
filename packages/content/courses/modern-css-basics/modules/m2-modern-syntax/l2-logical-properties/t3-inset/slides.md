---
id: 2-2-3
title: 位置の距離はinsetでまとめる
takeaway: "positionで使うtop・right・bottom・leftは、insetでまとめて書ける"
introduces: [inset]
requires: [論理プロパティ]
header: "モダンCSS入門"
---

<!-- _class: lead -->

# 2-2-3
# 位置の距離はinsetでまとめる

モダンCSS入門 — Module 2 / レッスン2-2

<!-- ノート: 論理プロパティの3本目。入門で学んだ位置指定の距離にも、まとめ書きがあります。 -->

---

## なぜ必要か

- 位置指定では `top: 0; right: 0; bottom: 0; left: 0;` のような4行が出てくる
- 4辺に同じ距離を書くだけで4行は長い

<!-- ノート: つかみ。入門のposition: absoluteで書いた距離指定を思い出してもらいます。 -->

---

## 結論

**`position`で使う`top`・`right`・`bottom`・`left`は、`inset`でまとめて書ける**

- `inset: 0` は4辺すべてに `0`
- marginと同じ省略記法で辺ごとの値も書ける

<!-- ノート: 結論。insetは「内側への差し込み距離」という意味の1語です。 -->

---

## 最小のコード

```css
.overlay {
  position: absolute;
  inset: 0;
}
```

- 基準の箱いっぱいに重なる

<!-- ノート: 4行が1行になりました。カード全体を覆うリンクや背景の overlay でよく使う形です。 -->

---

## 向きごとの形もある

- `inset-inline: 0` = 流れの向きの両端(横書きなら左右)だけ
- `inset-block-start: 0` = 行の積み重なる向きの先頭(横書きなら上)だけ

<!-- ノート: 関連の枠。margin-inlineと同じ命名がここにも通っています。語彙が1つの体系だと分かれば十分です。 -->

---

<!-- _class: summary -->

## まとめ

**`position`で使う`top`・`right`・`bottom`・`left`は、`inset`でまとめて書ける**

<!-- ノート: 結論の再掲だけ。次のレッスンは、当てる相手の絞り方を広げます。 -->
