---
sourceRefs: [SRC-typescriptbook-values-types-variables-string]
id: 1-5-3
title: 位置で取り出す
takeaway: "後ろから取り出すなら slice の負の位置、指定の一文字なら charAt を使います。"
introduces: ["slice", "charAt"]
requires: ["string"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-5-3 位置で取り出す

<!-- ノート: この動画は書き方ガイドを操作して説明します。ここは短く読み返すための版です。 -->

---

# 商品コードの末尾だけを読みたい

位置は前からも後ろからも数えられます。

<!-- ノート: 仕事で文字列を扱うときも、欲しい結果を先に決めます。 -->

---

# 覚えること

後ろから取り出すなら slice の負の位置、指定の一文字なら charAt を使います。

<!-- ノート: 後ろから取り出すなら slice の負の位置、指定の一文字なら charAt を使います。 -->

---

# 最小のコード

```ts
// 商品コードの後ろから三文字を取り出します
const numberPart = "ABC-123".slice(-3);
// 結果: numberPart は "123"
```

<!-- ノート: コメントを読み、どの行が何をするか確かめてください。 -->

---

# 見比べる

| 呼び出し | 結果 |
| --- | --- |
| `"ABC-123".slice(-3)` | `"123"` |
| `"B203".charAt(0)` | `"B"` |
| `"B203".charAt(9)` | `""` |

参考: [サバイバルTypeScript string型](https://typescriptbook.jp/reference/values-types-variables/string)。書き方と例は教材独自のものです。

<!-- ノート: 表の違いを、ガイドのテストで確かめる値に照らします。 -->

---

<!-- _class: summary -->
# まとめ

後ろから取り出すなら slice の負の位置、指定の一文字なら charAt を使います。

<!-- ノート: ガイドのヒント 1 に戻り、日本語の一行に合う書き方を選びます。 -->
