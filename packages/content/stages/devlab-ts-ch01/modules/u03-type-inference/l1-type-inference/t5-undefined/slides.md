---
sourceRefs: [SRC-typescriptbook-values-types-variables-type-inference]
id: 3-1-5
title: 値が無いことを返す
takeaway: "返す値が無いときは undefined を返します。型は number | undefined のようになります。"
introduces: ["undefined"]
requires: ["ユニオン型", "return", "if", "number", "boolean"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 3-1-5 値が無いことを返す

<!-- ノート: この動画では、値が無いことを返す方法を学びます。 -->

---

# 予約した席があるか確かめる

予約した席を案内する処理を書きます。予約が見つからないとき、席の番号が無いことをどう伝えるでしょうか。

<!-- ノート: 会場の受付に、予約を確かめに来ました。予約があれば、案内できる席があります。 -->

---

# 覚えること

返す値が無いときは undefined を返します。型は number | undefined のようになります。

<!-- ノート: 予約を受け付けたかどうかを、条件にします。予約があるときに返す値は、席の番号です。予約が無い場合は、undefined を返します。戻り値の型は number または undefined です。 -->

---

# 値が無い場合も返す

関数から返す値を順に見ます。次は `return` の行の抜粋です。

```ts
// 予約した席の番号を返す
return seat;
// 案内する席が無いことを返す
return undefined;
```

<!-- ノート: 予約が無い場合を、見てみましょう。この場合は、席の番号を返しません。戻る値は、undefined です。型を読むときは、値が無い場合も数に入れます。 -->

---

# 番号が無い場合も型に入る

`seatFor` の戻り値の型は `number | undefined` です。

参考資料は[サバイバルTypeScript「型推論」](https://typescriptbook.jp/reference/values-types-variables/type-inference)です。

<!-- ノート: `seatFor` の戻り値の型は `number | undefined` です。 -->

---

<!-- _class: summary -->
# まとめ

返す値が無いときは undefined を返します。型は number | undefined のようになります。

<!-- ノート: 返す値が無いときは undefined を返します。型は number | undefined のようになります。 -->
