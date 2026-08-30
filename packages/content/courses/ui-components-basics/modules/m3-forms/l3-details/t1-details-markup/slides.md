---
id: 3-3-1
title: detailsはJavaScriptなしで開閉する
takeaway: "detailsとsummaryは、JavaScriptなしで開閉できる部品を作る"
introduces: [details, summary, 開閉]
requires: [HTML骨格]
header: "UI部品入門"
---

<!-- _class: lead -->

# 3-3-1
# detailsはJavaScriptなしで開閉する

UI部品入門 — Module 3 / レッスン3-3

<!-- ノート: Module 3 の最後は開閉です。ここからは、HTMLだけで動く部品を扱います。 -->

---

## なぜ必要か

- よくある質問を全部開いて並べると、ページがとても長くなる
- 開閉のために JavaScript を書くと、それだけで仕組みが増える

<!-- ノート: つかみ。開閉は昔はJavaScriptの仕事でしたが、いまはHTMLでできます。 -->

---

## 結論

**`details`と`summary`は、JavaScriptなしで開閉できる部品を作る**

- `details` … 開閉するかたまり
- `summary` … いつも見えている見出し

<!-- ノート: 結論。summaryを押すと開き、もう一度押すと閉じます。CSSも不要です。 -->

---

## 最小のコード

```html
<details>
  <summary>受講に必要な環境は?</summary>
  <p>ブラウザーとテキストエディタだけです。</p>
</details>
```

<!-- ノート: summaryは details の最初の子として書きます。残りが開いたときに出る中身です。 -->

---

## 最初から開いておく

```html
<details open>
  <summary>受講に必要な環境は?</summary>
</details>
```

- `open` 属性を付けると、最初から開いた状態になる
- 利用者が閉じると `open` は自動で外れる

<!-- ノート: 関連情報の枠。状態がHTMLの属性として持たれているのがポイントです。 -->

---

<!-- _class: summary -->

## まとめ

**`details`と`summary`は、JavaScriptなしで開閉できる部品を作る**

<!-- ノート: 結論の再掲だけ。次は見出しの印を整えます。 -->
