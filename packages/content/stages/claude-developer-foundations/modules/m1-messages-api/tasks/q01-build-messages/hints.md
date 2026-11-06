## ヒント1 方針

`messages` は、`history` の要素を並べたあとに新しい発言を足した、新しい配列です。`history.push(…)` で足すと、呼び出し側の履歴まで書き換わります。`textOf` は、`content` から `type` が `"text"` のブロックだけを選んでから、`text` をつなぎます。

## ヒント2 手がかりのコード

```js
const messages = [...history, { role: "user", content: userText }];

const text = response.content
  .filter((block) => block.type === "text")
  .map((block) => block.text)
  .join("");
```
