import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch09PipelineCapstone: Assignment = {
  id: "S4-Ch09-05-pipeline-capstone",
  stage: "S4",
  chapterId: "Ch09",
  sequence: 5,
  title: "[卒業課題] カテゴリ別売上トップ N をパイプラインで求める",
  newConcept: "自作高階関数の応用: reduce による Map 集計 → entries で配列化 → sort → slice の 4 段パイプライン",
  estimatedMinutes: 40,
  difficulty: 3,
  testKind: "function",
  isCapstone: true,
  description: `## やること

\`{ category: string, product: string, amount: number }\` の売上配列 \`orders\` と **0 以上の整数** \`n\` を受け取り、 以下の手順で **カテゴリごとの売上合計** を計算し、 降順上位 \`n\` 件の \`[category, total]\` ペア配列を返す関数 \`topCategoriesBySales\` を実装してください。

1. **集計**: \`reduce\` で \`category\` ごとに \`amount\` を Map に足し込む
2. **配列化**: \`[...map.entries()]\` で \`[category, total]\` のペア配列に変換
3. **ソート**: \`total\` の **降順** に並べ替える (\`sort\`)
4. **切り出し**: 先頭 \`n\` 件を \`slice(0, n)\` で取り出す

\`\`\`js
topCategoriesBySales([
  { category: "fruit", product: "apple",  amount: 300 },
  { category: "veg",   product: "carrot", amount: 200 },
  { category: "fruit", product: "banana", amount: 100 },
  { category: "veg",   product: "potato", amount: 150 },
], 2);
// → [["fruit", 400], ["veg", 350]]

topCategoriesBySales([], 5);                                  // → []
topCategoriesBySales([{ category: "x", product: "p", amount: 1 }], 0);   // → []
\`\`\`

## ポイント

- **これは S4 卒業課題のひとつ**。 これまでの \`reduce\` / \`Map\` / \`sort\` / \`slice\` を **1 つのパイプラインに繋ぐ** 集大成です。
- 同じ合計値の場合は **先に登場したカテゴリ** を優先します。 Map の挿入順は最初に登場した順なので、 \`Array.sort\` の安定性 (ES2019+) によって自然にそうなります。
- AST で **\`reduce\`** と **\`new Map()\`** と **\`sort\`** を必須にしているので、 \`map\` だけ / \`filter\` だけの実装や、 配列のままソートする実装では通りません。
- 入力配列 \`orders\` を **書き換えない** こと (非破壊)。
`,
  starterFiles: singleFile(`function topCategoriesBySales(orders, n) {
  // reduce で Map に集計 → entries() → sort で降順 → slice(0, n)
}
`),
  entryPoints: ["topCategoriesBySales"],
  demoCall: `console.log(topCategoriesBySales([
  { category: "fruit", product: "apple",  amount: 300 },
  { category: "veg",   product: "carrot", amount: 200 },
  { category: "fruit", product: "banana", amount: 100 },
], 2));`,
  tests: [
    {
      name: "カテゴリごとに集計し降順で上位 2 件を返す",
      code: `JSON.stringify(topCategoriesBySales([
        { category: "fruit", product: "apple",  amount: 300 },
        { category: "veg",   product: "carrot", amount: 200 },
        { category: "fruit", product: "banana", amount: 100 },
        { category: "veg",   product: "potato", amount: 150 },
      ], 2)) === JSON.stringify([["fruit", 400], ["veg", 350]])`,
    },
    {
      name: "同点は先に登場したカテゴリを優先",
      code: `JSON.stringify(topCategoriesBySales([
        { category: "a", product: "p1", amount: 100 },
        { category: "b", product: "p2", amount: 100 },
      ], 1)) === JSON.stringify([["a", 100]])`,
    },
    {
      name: "空配列は空",
      code: `JSON.stringify(topCategoriesBySales([], 5)) === JSON.stringify([])`,
    },
    {
      name: "n = 0 なら空",
      code: `JSON.stringify(topCategoriesBySales([{ category: "x", product: "p", amount: 1 }], 0)) === JSON.stringify([])`,
    },
    {
      name: "n が件数より大きいなら全カテゴリを返す",
      code: `JSON.stringify(topCategoriesBySales([
        { category: "a", product: "p", amount: 5 },
        { category: "b", product: "p", amount: 3 },
      ], 10)) === JSON.stringify([["a", 5], ["b", 3]])`,
    },
    {
      name: "同じカテゴリの amount が正しく合計される",
      code: `topCategoriesBySales([
        { category: "x", product: "p1", amount: 2 },
        { category: "x", product: "p2", amount: 3 },
        { category: "x", product: "p3", amount: 4 },
      ], 1)[0][1] === 9`,
    },
    {
      name: "戻り値の各要素は [category, total] のペア",
      code: `(() => {
        const r = topCategoriesBySales([{ category: "p", product: "x", amount: 7 }], 1);
        return Array.isArray(r) && Array.isArray(r[0]) && r[0][0] === "p" && r[0][1] === 7;
      })()`,
    },
    {
      name: "元の配列を変更しない (非破壊)",
      code: `(() => {
        const src = [
          { category: "a", product: "p", amount: 1 },
          { category: "b", product: "p", amount: 2 },
        ];
        topCategoriesBySales(src, 2);
        return src.length === 2 && src[0].category === "a" && src[1].category === "b";
      })()`,
    },
  ],
  hints: [
    "1) reduce で Map に amount を足し込む 2) [...totals.entries()].sort((a,b) => b[1] - a[1]).slice(0, n)",
    "解答例:\n```js\nfunction topCategoriesBySales(orders, n) {\n  const totals = orders.reduce((map, o) => {\n    map.set(o.category, (map.get(o.category) ?? 0) + o.amount);\n    return map;\n  }, new Map());\n  return [...totals.entries()]\n    .sort((a, b) => b[1] - a[1])\n    .slice(0, n);\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で配列を返す" },
        { kind: "method", name: "reduce", label: "Array.reduce で集計する" },
        { kind: "node", nodeType: "NewExpression", label: "new Map() で集計コンテナを作る" },
        { kind: "method", name: "sort", label: "Array.sort で降順に並べる" },
        { kind: "method", name: "slice", label: "上位 n 件を Array.slice で切り出す" },
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
  solution: `function topCategoriesBySales(orders, n) {
  const totals = orders.reduce((map, o) => {
    map.set(o.category, (map.get(o.category) ?? 0) + o.amount);
    return map;
  }, new Map());
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}
`,
  badSolutions: [
    {
      code: `function topCategoriesBySales(orders, n) {
  return orders
    .map((o) => [o.category, o.amount])
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}
`,
      description: "Map で集計しておらず、 同じ category が複数行残る (AST `new Map()` 未充足、 テスト失敗)",
    },
    {
      code: `function topCategoriesBySales(orders, n) {
  const totals = orders.reduce((map, o) => {
    map.set(o.category, (map.get(o.category) ?? 0) + o.amount);
    return map;
  }, new Map());
  return [...totals.entries()].slice(0, n);
}
`,
      description: "sort をしておらず降順が保証されない (AST `sort` 未充足、 一部テスト失敗)",
    },
    {
      code: `function topCategoriesBySales(orders, n) {
  const totals = new Map();
  for (const o of orders) {
    totals.set(o.category, (totals.get(o.category) ?? 0) + o.amount);
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}
`,
      description: "for ループで集計していて reduce を使っていない (AST 必須未充足)",
    },
  ],
  mdnSections: [
    {
      heading: "Array.prototype.reduce",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce",
      pageTitle: "Array.prototype.reduce",
    },
    {
      heading: "Map.prototype.entries",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Map/entries",
      pageTitle: "Map.prototype.entries",
    },
    {
      heading: "Array.prototype.sort",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/sort",
      pageTitle: "Array.prototype.sort",
    },
  ],
};
