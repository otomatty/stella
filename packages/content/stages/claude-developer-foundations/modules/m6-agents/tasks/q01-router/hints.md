## ヒント1 方針

`parseCategory` は、`trim()` → `toLowerCase()` → 末尾の句読点を正規表現で外す、の順にそろえてから、`categories.includes(...)` で確かめます。`routeInquiry` は、最初に `routes[fallback]` があるかを確かめ、次に `classify` → `parseCategory` で行き先を決め、`parsed ?? fallback` で当てはまらないときの行き先に回します。`fellBack` は、`parseCategory` が `null` だったかで決まります。

## ヒント2 手がかりのコード

```js
const normalized = label
  .trim()
  .toLowerCase()
  .replace(/[.。、,!！?？]+$/u, "");
```

```js
const parsed = parseCategory(await classify(text), Object.keys(routes));
const category = parsed ?? fallback;
```
