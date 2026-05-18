import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch08SumByField: Assignment = {
  id: "S4-Ch08-01-sum-by-field",
  stage: "S4",
  chapterId: "Ch08",
  sequence: 1,
  title: "商品配列の指定フィールドを合計する",
  newConcept: "オブジェクト配列を for...of で走査し、 動的キーで数値プロパティを集計する",
  estimatedMinutes: 25,
  difficulty: 1,
  testKind: "function",
  description: `## やること

\`{ name, price, stock, ... }\` のような商品オブジェクトの配列 \`items\` と、 合計したい数値フィールド名 \`field\` を受け取り、 全アイテムの \`item[field]\` の **合計** を返す関数 \`sumByField\` を実装してください。 空配列の場合は \`0\` を返します。

\`\`\`js
sumByField(
  [
    { name: "Apple",  price: 100, stock: 5 },
    { name: "Banana", price: 200, stock: 3 },
    { name: "Cherry", price: 300, stock: 8 },
  ],
  "price",
);
// → 600

sumByField(
  [
    { name: "Apple",  price: 100, stock: 5 },
    { name: "Banana", price: 200, stock: 3 },
  ],
  "stock",
);
// → 8

sumByField([], "price");   // → 0
\`\`\`

## ポイント

- S4 は **アルゴリズム編**。 \`reduce\` / \`map\` / \`filter\` といった高階メソッドは **Ch09 で導入予定** のため、 ここでは **\`for...of\` ループで自分で合計** を組み立ててください。
- 集計用の変数は \`let total = 0\` で用意し、 ループの中で \`total += item[field]\` のように **動的なキー** でアクセスします。
- 空配列のときは初期値の \`0\` がそのまま返るので、 特別なガードは不要です。
`,
  starterFiles: singleFile(`function sumByField(items, field) {
  // for...of でアイテムを走査し、 item[field] を total に足し込んでください
}
`),
  entryPoints: ["sumByField"],
  demoCall: `console.log(sumByField([{ price: 100 }, { price: 200 }], "price"));`,
  tests: [
    {
      name: "price フィールドの合計",
      code: `sumByField([{ price: 100 }, { price: 200 }, { price: 300 }], "price") === 600`,
    },
    {
      name: "stock フィールドの合計 (別フィールド)",
      code: `sumByField([{ price: 100, stock: 5 }, { price: 200, stock: 3 }], "stock") === 8`,
    },
    {
      name: "空配列なら 0",
      code: `sumByField([], "price") === 0`,
    },
    {
      name: "1 件だけのときはそのアイテムの値",
      code: `sumByField([{ price: 42 }], "price") === 42`,
    },
    {
      name: "負の数も合計できる",
      code: `sumByField([{ x: -10 }, { x: 5 }, { x: -3 }], "x") === -8`,
    },
    {
      name: "戻り値は数値",
      code: `typeof sumByField([{ p: 1 }], "p") === "number"`,
    },
  ],
  hints: [
    "let total = 0; for (const item of items) { total += item[field]; } return total;",
    "解答例:\n```js\nfunction sumByField(items, field) {\n  let total = 0;\n  for (const item of items) {\n    total += item[field];\n  }\n  return total;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で合計を返す" },
        { kind: "node", nodeType: "ForOfStatement", label: "for...of でアイテムを走査する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "method", name: "reduce", label: "S4 では reduce を使わない (Ch09 で導入)" },
        { kind: "method", name: "map", label: "S4 では map を使わない (Ch09 で導入)" },
        { kind: "method", name: "filter", label: "S4 では filter を使わない (Ch09 で導入)" },
      ],
    },
  },
  solution: `function sumByField(items, field) {
  let total = 0;
  for (const item of items) {
    total += item[field];
  }
  return total;
}
`,
  badSolutions: [
    {
      code: `function sumByField(items, field) {
  return items.reduce((a, b) => a + b[field], 0);
}
`,
      description: "reduce を使った安易解 (AST forbidden 違反)",
    },
    {
      code: `function sumByField(items, field) {
  let total = 1;
  for (const item of items) {
    total += item[field];
  }
  return total;
}
`,
      description: "初期値が 1 になっていて空配列で 0 が返らない (テスト失敗)",
    },
    {
      code: `function sumByField(items, field) {
  let total = 0;
  for (const item of items) {
    total += item.price;
  }
  return total;
}
`,
      description: "field 引数を使わず price 固定でアクセスしている (別フィールドのテストで失敗)",
    },
  ],
  mdnSections: [
    {
      heading: "ブラケット記法",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Property_accessors#bracket_notation",
      pageTitle: "プロパティアクセサー",
    },
    {
      heading: "for...of",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for...of",
      pageTitle: "for...of",
    },
  ],
};
