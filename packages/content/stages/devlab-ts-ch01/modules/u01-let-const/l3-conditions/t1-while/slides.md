---
sourceRefs: [SRC-typescriptbook-values-types-variables-let-and-const, SRC-typescriptbook-values-types-variables-number, SRC-typescriptbook-statements-if-else]
id: 1-1-8
title: 回数の決まらないくり返し
takeaway: "while は条件を先に確かめ、true の間だけ値を変えながらくり返します。"
introduces: ["while", ">", "!=="]
requires: ["let", "再代入", "引数", "関数", "戻り値", "true", "false", "===", "Math.floor"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-1-8 回数の決まらないくり返し

<!-- ノート: while は条件を先に確かめ、true の間だけ値を変えながらくり返します。 -->

---

# 仕事で使う場面

在庫がなくなるまで、どう発送をくり返すでしょうか。

<!-- ノート: 身近な問いを示し、答えはまだ言いません。 -->

---

# 覚えること

while は条件を先に確かめ、true の間だけ値を変えながらくり返します。

<!-- ノート: while は条件を先に確かめ、true の間だけ値を変えながらくり返します。 -->

---

# 書き方を読む

```ts
// 残り rest を入れ直せる変数として作り、2 を入れる
let rest = 2;
// rest が 0 より大きいかを確かめる
console.log(rest > 0);
```

<!-- ノート: 各行の役割を日本語のコメントで確かめ、値を追います。 -->

---

# 条件を先に確かめる

`while (rest > 0)` は、中身の前に毎回条件を見ます。
`!==` は等しくないかを比べます。
引数は let の変数に写し、くり返す中で値を変えます。

参考: サバイバルTypeScript [letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)・[number型](https://typescriptbook.jp/reference/values-types-variables/number)・[if-else文](https://typescriptbook.jp/reference/statements/if-else)。概念を参照し、説明と例は教材用に独自作成しています。

<!-- ノート: 更新を忘れると終了しません。等しくない比較は !== を使います。引数への再代入は課題の lint でエラーになります。 -->

---

<!-- _class: summary -->
# まとめ

while は条件を先に確かめ、true の間だけ値を変えながらくり返します。

<!-- ノート: while は条件を先に確かめ、true の間だけ値を変えながらくり返します。 -->
