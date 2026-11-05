## ヒント1 方針

送り直しの回数を数えながら、`send()` を `try`・`catch` で囲んで繰り返します。`catch` では、まず「送り直せるエラーか」と「まだ回数が残っているか」を確かめ、どちらかを満たさなければ `throw` します。満たすときだけ `await options.sleep(…)` で待ってから、次の繰り返しに進みます。

## ヒント2 手がかりのコード

```js
const retryAfterSeconds = Number(error.headers?.["retry-after"]);
const waitMs = Number.isFinite(retryAfterSeconds)
  ? retryAfterSeconds * 1000
  : options.baseDelayMs * 2 ** retry;
```

`Number(undefined)` は `NaN` になり、`Number.isFinite` で弾けます。
