import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch09GroupBy: Assignment = {
  id: "S4-Ch09-03-group-by",
  stage: "S4",
  chapterId: "Ch09",
  sequence: 3,
  title: "reduce で `groupBy` を自作する",
  newConcept: "key 関数を受け取り、 `reduce` の中で Map を組み立てて要素をグループ化する",
  estimatedMinutes: 30,
  difficulty: 2,
  testKind: "function",
  description: `## やること

配列 \`arr\` と キー関数 \`keyFn\` を受け取り、 \`keyFn(item)\` の値をキーとして **\`Map\`** に要素をグループ化した結果を返す関数 \`groupBy\` を **\`reduce\` を使って** 実装してください。 同じキーに属する要素は **出現順** で配列にまとめます。

\`\`\`js
const byParity = groupBy([1, 2, 3, 4, 5], (n) => n % 2 === 0 ? "even" : "odd");
byParity.get("odd");   // → [1, 3, 5]
byParity.get("even");  // → [2, 4]
byParity.size;         // → 2

groupBy([], (x) => x).size;   // → 0
\`\`\`

## ポイント

- 戻り値は **\`Map\` インスタンス** (オブジェクトリテラルではありません)。 \`instanceof Map\` で判定されます。
- \`reduce\` の初期値を \`new Map()\` にし、 各要素で:
  - キーが未登録なら \`map.set(key, [])\` で空配列を初期化
  - \`map.get(key).push(item)\` で末尾に追加
- 同じキーの要素は **入力順** に並ぶこと (Map の挿入順は保たれます)。
- AST で **\`reduce\`** と **\`new Map()\`** と **\`Map#set\`** を必須にしているので、 オブジェクトで返したり \`for\` ループで組み立てたりすると通りません。
- 入力配列 \`arr\` を **書き換えない** こと (非破壊)。
`,
  starterFiles: singleFile(`function groupBy(arr, keyFn) {
  // reduce の初期値 new Map() に対して set/push でグループ化してください
}
`),
  entryPoints: ["groupBy"],
  demoCall: `console.log(groupBy([1, 2, 3, 4], (n) => n % 2 === 0 ? "even" : "odd"));`,
  tests: [
    {
      name: "戻り値は Map のインスタンス",
      code: `groupBy([], (x) => x) instanceof Map`,
    },
    {
      name: "空配列なら size は 0",
      code: `groupBy([], (x) => x).size === 0`,
    },
    {
      name: "偶奇でグループ化される (odd グループ)",
      code: `JSON.stringify(groupBy([1, 2, 3, 4, 5], (n) => n % 2 === 0 ? "even" : "odd").get("odd")) === JSON.stringify([1, 3, 5])`,
    },
    {
      name: "偶奇でグループ化される (even グループ)",
      code: `JSON.stringify(groupBy([1, 2, 3, 4, 5], (n) => n % 2 === 0 ? "even" : "odd").get("even")) === JSON.stringify([2, 4])`,
    },
    {
      name: "オブジェクト配列を category でグループ化",
      code: `(() => {
        const items = [
          { name: "apple",  category: "fruit" },
          { name: "carrot", category: "veg" },
          { name: "banana", category: "fruit" },
        ];
        const g = groupBy(items, (o) => o.category);
        return g.size === 2 && g.get("fruit").length === 2 && g.get("veg").length === 1 && g.get("fruit")[0].name === "apple";
      })()`,
    },
    {
      name: "1 件しかないグループも配列でラップされる",
      code: `JSON.stringify([...groupBy([42], (n) => n).entries()]) === JSON.stringify([[42, [42]]])`,
    },
    {
      name: "元の配列を変更しない (非破壊)",
      code: `(() => {
        const src = [1, 2, 3];
        groupBy(src, (n) => n);
        return JSON.stringify(src) === JSON.stringify([1, 2, 3]);
      })()`,
    },
  ],
  hints: [
    "arr.reduce((map, x) => { const k = keyFn(x); if (!map.has(k)) map.set(k, []); map.get(k).push(x); return map; }, new Map())",
    "解答例:\n```js\nfunction groupBy(arr, keyFn) {\n  return arr.reduce((map, item) => {\n    const key = keyFn(item);\n    if (!map.has(key)) {\n      map.set(key, []);\n    }\n    map.get(key).push(item);\n    return map;\n  }, new Map());\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で Map を返す" },
        { kind: "method", name: "reduce", label: "Array.reduce を使う" },
        { kind: "node", nodeType: "NewExpression", label: "new Map() で初期化する" },
        { kind: "method", name: "set", label: "Map#set でキーを登録する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "method", name: "forEach", label: "reduce 課題なので forEach は使わない" },
        { kind: "node", nodeType: "ForStatement", label: "reduce 課題なので for は使わない" },
        { kind: "node", nodeType: "ForOfStatement", label: "reduce 課題なので for...of は使わない" },
        { kind: "node", nodeType: "ForInStatement", label: "reduce 課題なので for...in は使わない" },
        { kind: "node", nodeType: "WhileStatement", label: "reduce 課題なので while は使わない" },
        { kind: "node", nodeType: "DoWhileStatement", label: "reduce 課題なので do...while は使わない" },
      ],
    },
  },
  solution: `function groupBy(arr, keyFn) {
  return arr.reduce((map, item) => {
    const key = keyFn(item);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(item);
    return map;
  }, new Map());
}
`,
  badSolutions: [
    {
      code: `function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}
`,
      description: "戻り値が plain object で Map ではない (instanceof Map のテストで失敗、 AST `new Map()` 未充足)",
    },
    {
      code: `function groupBy(arr, keyFn) {
  return arr.reduce((map, item) => {
    map.set(keyFn(item), [item]);
    return map;
  }, new Map());
}
`,
      description: "同じキーに来るたび配列で上書きしていて push していない (テスト失敗)",
    },
    {
      code: `function groupBy(arr, keyFn) {
  const map = new Map();
  for (const item of arr) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}
`,
      description: "for ループで書いていて reduce を使っていない (AST 必須未充足)",
    },
  ],
  mdnSections: [
    {
      heading: "Array.prototype.reduce",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce",
      pageTitle: "Array.prototype.reduce",
    },
    {
      heading: "Map.prototype.set",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Map/set",
      pageTitle: "Map.prototype.set",
    },
  ],
};
