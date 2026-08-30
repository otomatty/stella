---
id: 4-1-1
title: popoverは属性2つで開閉する
takeaway: "popover属性を付けた要素は、popovertargetで指すボタンだけで開閉できる"
introduces: [ポップオーバー, popover属性, popovertarget]
requires: [HTML骨格, 開閉]
header: "UI部品入門"
---

<!-- _class: lead -->

# 4-1-1
# popoverは属性2つで開閉する

UI部品入門 — Module 4 / レッスン4-1

<!-- ノート: Module 4 は、ページの上に重ねて出す部品です。まずはポップオーバーから。 -->

---

## なぜ必要か

- ボタンを押したら小さなメニューを出したい
- `details` では、他の要素の上に重ねて出せない

<!-- ノート: つかみ。開閉はできても「重ねて出す」は前のレッスンの部品ではできません。 -->

---

## 結論

**`popover`属性を付けた要素は、`popovertarget`で指すボタンだけで開閉できる**

- 重ねて出す小さな面を **ポップオーバー** と呼ぶ
- 使う属性は 2 つだけ

<!-- ノート: 結論。JavaScriptを書かずに、開く・閉じる・Escで閉じるまでが手に入ります。 -->

---

## 最小のコード

```html
<button popovertarget="menu">メニュー</button>

<div id="menu" popover>
  <a href="/profile">プロフィール</a>
</div>
```

<!-- ノート: ボタンの popovertarget と、出したい要素の id を一致させます。これだけで開閉します。 -->

---

## ついてくるふるまい

- 外側を押すと閉じる
- Esc キーで閉じる
- Tab を押すと、続きがポップオーバーの中になる

<!-- ノート: 関連情報の枠。開いた瞬間にフォーカスが飛ぶわけではありません。移したいときは autofocus を付けます。 -->

---

<!-- _class: summary -->

## まとめ

**`popover`属性を付けた要素は、`popovertarget`で指すボタンだけで開閉できる**

<!-- ノート: 結論の再掲だけ。次は、出てくる位置を決めます。 -->
