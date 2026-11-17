---
sourceRefs: [SRC-typescriptbook-values-types-variables-number]
id: 1-4-2
title: エラーを投げる
takeaway: "受け付けない値は throw new Error で止め、! で条件を反対にできます。"
introduces: ["throw", "new Error", "!"]
requires: ["if", "<", "return", "number", "boolean", "true", "false", "型注釈"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-4-2 エラーを投げる

<!-- ノート: 受け付けない値は throw new Error で止め、! で条件を反対にできます。 -->

---

# 仕事の場面で考える

予約の人数にマイナスの数が届いたら、そのまま続けてよいでしょうか。

<!-- ノート: 身近な場面を問いにします。まだ答えは示しません。 -->

---

# 覚えること

- `new Error` で、理由を伝えるエラーを作る
- `throw` で投げると、その場で止まる
- `!true` は `false`、`!false` は `true`

<!-- ノート: throw はその場で止めます。new Error はメッセージ付きのエラーを作ります。感嘆符は真偽値を反対にします。 -->

---

# 最小のコード

```ts
// 支払済みの反対を未払いとして入れる
const isUnpaid = !true;
// 未払いかを表示する
console.log(isUnpaid);
// 結果: false
```

<!-- ノート: コメントとコードを一行ずつ対応させ、最後の結果を確かめます。 -->

---

# よくある間違い

文字列を return することは、エラーを投げることとは違います。

参考: サバイバルTypeScript [number型](https://typescriptbook.jp/reference/values-types-variables/number)。説明と業務の例は教材用に独自作成しています。

<!-- ノート: 文字列を return することは、エラーを投げることとは違います。 -->

---

<!-- _class: summary -->
# まとめ

受け付けない値は throw new Error で止め、! で条件を反対にできます。

<!-- ノート: 問題では型注釈とテストの値を先に確かめ、中の処理を自分で書きます。 -->
