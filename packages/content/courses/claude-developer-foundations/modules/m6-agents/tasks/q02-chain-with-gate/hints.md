## ヒント1 方針

1 つの段を「ゲートを通るか、やり直しを使い切るまで」行う関数 `runStage(stage, value)` を作り、`{ ok: true, output }` か `{ ok: false, reason }` を返すようにします。`runChain` は、最初に名前の重なりを `Set` で確かめてから、段ごとに `runStage` を呼び、`ok` が `false` ならすぐに返します。`runStage` の中では、`for` で `retries + 1` 回まで回し、`run` を `try`・`catch` で囲みます。

## ヒント2 手がかりのコード

```js
const attempts = (stage.retries ?? 0) + 1;
let feedback = null;
for (let attempt = 1; attempt <= attempts; attempt++) {
  // output = await stage.run(value, { attempt, feedback }) を try・catch で囲む
  const reason = stage.check ? stage.check(output) : null;
  if (reason === null) return { ok: true, output };
  feedback = reason;
}
return { ok: false, reason: feedback };
```
