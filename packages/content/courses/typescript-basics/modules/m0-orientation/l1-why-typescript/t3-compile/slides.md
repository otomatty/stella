---
id: 0-1-3
title: TypeScriptはJavaScriptに変換されて動く
takeaway: "TypeScriptはJavaScriptに変換されてから動く。型は変換時に消える"
introduces: [コンパイル]
requires: [TypeScript, JavaScript, 実行, 型]
header: "TypeScript入門"
---

<!-- _class: lead -->

# 0-1-3
# TypeScriptはJavaScriptに変換されて動く

TypeScript入門 — Module 0 / レッスン0-1

<!-- ノート: TypeScriptで書くと何が嬉しいかはわかりました。では、それがどうやって動くのかを1つだけ押さえます。 -->

---

## なぜ必要か

- ブラウザやサーバーが理解できるのはJavaScriptだけ
- 仕組みを知らないと、「型が実行時に守ってくれる」と誤解してしまう

<!-- ノート: つかみ。ここを誤解したまま進むと、後で「実行時に型チェックが効かない」という場面で混乱する。最初に正しい像を持ってもらう。 -->

---

## 結論

**TypeScriptはJavaScriptに変換されてから動く。型は変換時に消える**

- コンパイル = 書いたコードを、動かせる形に変換すること
- 型はコンパイラーへの指示。変換後のJavaScriptには残らない

<!-- ノート: 結論を先に言い切る。コンパイルという言葉をここで定義する。型は「実行時の防具」ではなく「開発中の相棒」であるという位置づけを、はっきり伝える。 -->

---

## 最小のコード

```ts
// TypeScript(書くもの)
const price: number = 300;
```

```js
// JavaScript(変換後・実際に動くもの)
const price = 300;
```

- 違いは型注釈`: number`があるかどうかだけ

<!-- ノート: 2つを並べて見せる。ほとんど同じであることが伝わると、「新しい言語を覚え直す」という身構えが解ける。JavaScriptを知っていればTypeScriptはすぐ書ける、という安心材料にもなる。 -->

---

## TSはJSに変換されてから動く

![w:950](assets/compile-flow.svg)

<!-- ノート: 書いたTypeScriptがコンパイラーを通ってJavaScriptになり、それが実行される流れ。チェックが行われるのはコンパイルの段階だけ、という点を矢印でなぞりながら確認する。 -->

---

<!-- _class: summary -->

## まとめ

**TypeScriptはJavaScriptに変換されてから動く。型は変換時に消える**

<!-- ノート: 結論の再掲だけ。レッスン0-1はここまで。次は実際に書ける場所を用意すると予告して締める。 -->
