---
id: 3-3-2
title: 枠は消すだけにしない
takeaway: "outline: noneで枠を消すなら、:focus-visibleで代わりの枠を必ず用意する"
introduces: [outline]
requires: [":focus-visible", フォーカス]
header: "モダンCSS入門研修"
---

<!-- _class: lead -->

# 3-3-2
# 枠は消すだけにしない

モダンCSS入門研修 — Module 3 / レッスン3-3

<!-- ノート: focus-visibleを知った上で、「枠を消してほしい」への正しい答え方を決めます。 -->

---

## なぜ必要か

- 「既定の枠がデザインに合わないので消して」と頼まれる
- `outline: none` の1行で消えるが、それで終わると事故になる

<!-- ノート: つかみ。入門でも警告した事故です。この講座では代替の作り方まで含めて解決します。 -->

---

## 結論

**`outline: none`で枠を消すなら、`:focus-visible`で代わりの枠を必ず用意する**

- **outline** = フォーカスの枠を描くプロパティ
- 消すことと引き換えに、見える手がかりを返す

<!-- ノート: 結論。「消すな」ではなく「消すなら置き換える」。これで要望と操作性が両立します。 -->

---

## 最小のコード

```css
button {
  &:focus { outline: none; }

  &:focus-visible {
    outline: 3px solid var(--color-brand);
    outline-offset: 2px;
  }
}
```

<!-- ノート: クリック時の枠は消え、キーボード操作では太い枠が出ます。入れ子と&もここで実戦投入です。 -->

---

## outlineがborderより向く理由

- outlineは**レイアウトに影響しない**(場所を取らない)
- `outline-offset` で要素から少し離して描ける

<!-- ノート: borderで代用すると枠のぶんだけ要素が動きます。フォーカス表示はoutlineの仕事です。 -->

---

<!-- _class: summary -->

## まとめ

**`outline: none`で枠を消すなら、`:focus-visible`で代わりの枠を必ず用意する**

<!-- ノート: 結論の再掲だけ。Module 3はここまで。最後のモジュールで、ここまでの道具で1枚を作り直します。 -->
