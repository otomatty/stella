import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch08FindLowStock: Assignment = {
  id: "S4-Ch08-04-find-low-stock",
  stage: "S4",
  chapterId: "Ch08",
  sequence: 4,
  title: "在庫が閾値未満の商品だけを抽出する",
  newConcept: "filter を使わずに 「条件を満たすものだけ push する」 抽出ループを書く",
  estimatedMinutes: 30,
  difficulty: 2,
  testKind: "function",
  description: `## やること

商品オブジェクトの配列 \`items\` と、 在庫の閾値 \`threshold\` を受け取り、 **\`stock\` が \`threshold\` 未満** の商品だけを集めた **新しい配列** を返す関数 \`findLowStock\` を実装してください。

- 元の順序は保つ
- 元の \`items\` 配列を **破壊しない** (非破壊)
- 該当 0 件のときは空配列 \`[]\` を返す

\`\`\`js
findLowStock(
  [
    { name: "Apple",  stock: 3 },
    { name: "Banana", stock: 10 },
    { name: "Cherry", stock: 1 },
    { name: "Date",   stock: 8 },
  ],
  5,
);
// → [{ name: "Apple", stock: 3 }, { name: "Cherry", stock: 1 }]

findLowStock([{ stock: 10 }], 5);   // → []
findLowStock([], 5);                  // → []
\`\`\`

## ポイント

- S4 では \`filter\` / \`map\` は禁止です。 自分で \`const result = []\` を用意して、 \`for...of\` の中で **条件を満たすときだけ \`push\`** する書き方を練習します。
- 条件は **\`item.stock < threshold\`** (未満)。 等しい (\`===\`) は含めません。
- 元の \`items\` 配列に手を加えてはいけません。 例えば \`items.splice(...)\` で取り出すのは NG (非破壊テストで失敗します)。
`,
  starterFiles: singleFile(`function findLowStock(items, threshold) {
  // 結果を入れる空の配列を用意する


  // for...of で items を 1 件ずつ走査し、 stock が threshold 未満のときだけ結果配列に push する


  // 結果配列を return する
}
`),
  entryPoints: ["findLowStock"],
  demoCall: `console.log(findLowStock([{ name: "A", stock: 3 }, { name: "B", stock: 10 }], 5));`,
  tests: [
    {
      name: "stock が threshold 未満のアイテムだけ取り出す",
      code: `(() => {
        const r = findLowStock([
          { name: "Apple",  stock: 3 },
          { name: "Banana", stock: 10 },
          { name: "Cherry", stock: 1 },
          { name: "Date",   stock: 8 },
        ], 5);
        return Array.isArray(r) && r.length === 2 && r[0].name === "Apple" && r[1].name === "Cherry";
      })()`,
    },
    {
      name: "threshold と等しいものは含まない (未満)",
      code: `(() => {
        const r = findLowStock([
          { name: "A", stock: 5 },
          { name: "B", stock: 4 },
        ], 5);
        return r.length === 1 && r[0].name === "B";
      })()`,
    },
    {
      name: "該当 0 件なら空配列",
      code: `(() => {
        const r = findLowStock([{ stock: 10 }, { stock: 20 }], 5);
        return Array.isArray(r) && r.length === 0;
      })()`,
    },
    {
      name: "空配列入力は空配列",
      code: `(() => {
        const r = findLowStock([], 5);
        return Array.isArray(r) && r.length === 0;
      })()`,
    },
    {
      name: "全件マッチなら全件返る",
      code: `(() => {
        const r = findLowStock([{ stock: 1 }, { stock: 2 }, { stock: 3 }], 10);
        return r.length === 3;
      })()`,
    },
    {
      name: "元の配列を破壊しない (非破壊)",
      code: `(() => {
        const items = [{ stock: 3 }, { stock: 10 }, { stock: 1 }];
        findLowStock(items, 5);
        return items.length === 3 && items[0].stock === 3 && items[2].stock === 1;
      })()`,
    },
    {
      name: "戻り値は元の要素の参照 (新しいオブジェクトを作らない)",
      code: `(() => {
        const a = { name: "A", stock: 1 };
        const b = { name: "B", stock: 100 };
        const r = findLowStock([a, b], 5);
        return r[0] === a;
      })()`,
    },
  ],
  hints: [
    "const result = []; for (const item of items) { if (item.stock < threshold) result.push(item); } return result;",
    "解答例:\n```js\nfunction findLowStock(items, threshold) {\n  const result = [];\n  for (const item of items) {\n    if (item.stock < threshold) {\n      result.push(item);\n    }\n  }\n  return result;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で抽出結果の配列を返す" },
        { kind: "node", nodeType: "ForOfStatement", label: "for...of でアイテムを走査する" },
        { kind: "node", nodeType: "IfStatement", label: "if で条件を満たすときだけ push する" },
        { kind: "method", name: "push", label: "push で結果配列に追加する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "method", name: "filter", label: "S4 では filter を使わない (Ch09 で導入)" },
        { kind: "method", name: "map", label: "S4 では map を使わない (Ch09 で導入)" },
        { kind: "method", name: "reduce", label: "S4 では reduce を使わない (Ch09 で導入)" },
        { kind: "method", name: "splice", label: "splice は元配列を破壊するので使わない" },
      ],
    },
  },
  solution: `function findLowStock(items, threshold) {
  const result = [];
  for (const item of items) {
    if (item.stock < threshold) {
      result.push(item);
    }
  }
  return result;
}
`,
  badSolutions: [
    {
      code: `function findLowStock(items, threshold) {
  return items.filter((item) => item.stock < threshold);
}
`,
      description: "filter を使った安易解 (AST forbidden 違反)",
    },
    {
      code: `function findLowStock(items, threshold) {
  const result = [];
  for (const item of items) {
    if (item.stock <= threshold) {
      result.push(item);
    }
  }
  return result;
}
`,
      description: "<= で比較しているので threshold と等しいアイテムまで含めてしまう (テスト失敗)",
    },
    {
      code: `function findLowStock(items, threshold) {
  const result = [];
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i].stock >= threshold) {
      items.splice(i, 1);
    }
  }
  return items;
}
`,
      description: "splice で元配列を破壊している (AST forbidden + 非破壊テスト失敗)",
    },
  ],
  mdnSections: [
    {
      heading: "Array.prototype.push",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/push",
      pageTitle: "Array.prototype.push",
    },
    {
      heading: "for...of",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for...of",
      pageTitle: "for...of",
    },
  ],
};
