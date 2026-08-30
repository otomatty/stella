---
id: 5-3-2
title: リンクは状態の順番どおりに書く
takeaway: "リンクの状態を指定するときは、link・visited・hover・focus・activeの順に書く"
introduces: [visited, active, 状態の順番]
requires: [擬似クラス, hover, focus, リンク, セレクタ, カスケード, 詳細度]
header: "HTML/CSS入門"
---

<!-- _class: lead -->

# 5-3-2
# リンクは状態の順番どおりに書く

HTML/CSS入門 — Module 5 / レッスン5-3

<!-- ノート: 擬似クラスは 3-3-3 で扱いました。リンクは状態が5つあり、順番に決まりがあります。 -->

---

## なぜ必要か

- `:hover` を書いたのに、マウスを乗せても色が変わらない
- 訪問済みのリンクだけ、指定した色にならない

<!-- ノート: つかみ。書いた順のせいで効かない、という 3-2-1 の話がここで再登場する。 -->

---

## 結論

**リンクの状態を指定するときは、link・visited・hover・focus・activeの順に書く**

- 5つとも詳細度が同じなので、後に書いたほうが勝つ
- 順番を崩すと、必要な状態の指定が打ち消される

<!-- ノート: 結論を言い切る。呪文のように覚えるのではなく、カスケードの結果として説明する。 -->

---

## 最小のコード

```css
a:link { color: navy; }
a:visited { color: purple; }
a:hover { color: crimson; }
a:focus { color: crimson; }
a:active { color: orangered; }
```

- **visited** = 一度開いたことがあるリンク

<!-- ノート: :link は未訪問。**active** は押している最中の一瞬。 -->

---

## 順番を崩すと

```css
a:hover { color: crimson; }
a:link { color: navy; }
```

- 後に書いた `:link` が、`:hover` の指定を打ち消す
- マウスを乗せても色が変わらない

<!-- ノート: 失敗例の枠。**状態の順番** はこのために決まっている。効かないときはまず順番を見る。 -->

---

<!-- _class: summary -->

## まとめ

**リンクの状態を指定するときは、link・visited・hover・focus・activeの順に書く**

<!-- ノート: 結論の再掲だけ。次は、リンクだと分かる見た目を保つ話に進む。 -->
