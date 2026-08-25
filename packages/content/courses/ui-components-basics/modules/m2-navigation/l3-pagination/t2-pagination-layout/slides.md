---
id: 2-3-2
title: 番号は横並びで置く位置を決める
takeaway: "ページ送りの番号はflexで横に並べ、justify-contentで置く位置を決める"
introduces: []
requires: [ページネーション]
header: "UI部品入門研修"
---

<!-- _class: lead -->

# 2-3-2
# 番号は横並びで置く位置を決める

UI部品入門研修 — Module 2 / レッスン2-3

<!-- ノート: 2段階目のレイアウトです。横に並べたあと、どこに置くかを決めます。 -->

---

## なぜ必要か

- 一覧の下に左寄せで小さく並ぶと、見つけてもらえない
- 中央に置きたいのに、`margin: 0 auto` が効かない

<!-- ノート: つかみ。中身の位置は、親のflexで決めるのがいちばん短い道です。 -->

---

## 結論

**ページ送りの番号は`flex`で横に並べ、`justify-content`で置く位置を決める**

- 並べる向き … 横
- 置く位置 … `justify-content` の 1 行

<!-- ノート: 結論。中央なら center、右端なら flex-end です。 -->

---

## 最小のコード

```css
.pagination ol {
  display: flex;
  gap: 4px;
  justify-content: center;
  list-style: none;
  padding: 0;
}
```

<!-- ノート: gap を小さめにして、番号のかたまり感を出します。 -->

---

## 幅が足りないとき

```css
.pagination ol {
  flex-wrap: wrap;
}
```

- ページ数が多いと 1 行に収まらない
- 折り返せるようにしておくと、狭い画面でもはみ出さない

<!-- ノート: 対比の枠。横スクロールが出るより、折り返すほうが読めます。 -->

---

<!-- _class: summary -->

## まとめ

**ページ送りの番号は`flex`で横に並べ、`justify-content`で置く位置を決める**

<!-- ノート: 結論の再掲だけ。次はトークンで押せる大きさを作ります。 -->
