## ヒント1 方針

`runEval` は、最初に空のケースと `id` の重なりを確かめてから、`for` で全部のケースを回します。`generate` の呼び出しを `try`・`catch` で囲み、失敗したら結果に `error` を付けて `continue` します。`grade` は `await` しておけば、`async` でもそうでなくても同じに扱えます。`compareRuns` は、後の結果を `id` で引ける `Map` にし、前の結果の順に回して、合格と不合格が入れ替わったものを集めます。

## ヒント2 手がかりのコード

```js
const afterById = new Map(after.results.map((result) => [result.id, result]));
for (const result of before.results) {
  const next = afterById.get(result.id);
  if (result.pass && !next.pass) regressions.push(result.id);
  if (!result.pass && next.pass) fixes.push(result.id);
}
```
