## ヒント1 方針

書かれていないことがある文字列は `type: ["string", "null"]` にして、`null` を受け付けます。選択肢から選ぶ項目は `enum` に `"unknown"` を足します。`required` には 5 つの項目を全部並べます。`readInquiry` は、`stop_reason` の確認 → テキストのブロックをつなぐ → `try`・`catch` で `JSON.parse` → `plan` をそろえる、の順に書きます。

## ヒント2 手がかりのコード

JSON を読んだあと、`wants_demo` が真・偽、`preferred_date` が日付・null の 4 通りを紙に書きます。営業が原文を確認したい組を一つだけ選びます。

保存済みの `"null"` は `JSON.parse` に通ります。項目を読む前に値そのものを確かめ、`toLowerCase()` を呼ぶ前に `plan` の型を確かめてください。

```js
preferred_date: { type: ["string", "null"], format: "date" },
```

```js
let data;
try {
  data = JSON.parse(text);
} catch {
  return { ok: false, reason: "invalid_json" };
}
```
