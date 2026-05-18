import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch08AverageByField: Assignment = {
  id: "S4-Ch08-03-average-by-field",
  stage: "S4",
  chapterId: "Ch08",
  sequence: 3,
  title: "指定フィールドの平均値を返す (空配列は 0)",
  newConcept: "「空配列なら 0 を返す」 ガードを置いてから集計する 2 段構成",
  estimatedMinutes: 30,
  difficulty: 2,
  testKind: "function",
  description: `## やること

商品オブジェクトの配列 \`items\` と、 平均したい数値フィールド名 \`field\` を受け取り、 全アイテムの \`item[field]\` の **平均値** を返す関数 \`averageByField\` を実装してください。 空配列の場合は **\`0\`** を返します (\`NaN\` ではありません)。

\`\`\`js
averageByField(
  [
    { name: "A", rating: 80 },
    { name: "B", rating: 90 },
    { name: "C", rating: 70 },
  ],
  "rating",
);
// → 80

averageByField([{ x: 1 }, { x: 2 }], "x");   // → 1.5

averageByField([], "rating");   // → 0
\`\`\`

## ポイント

- まず \`items.length === 0\` なら \`0\` を返してください。 そのまま割り算すると \`0 / 0 = NaN\` になるため、 **空配列ガード** を最初に置くのが定石です。
- 合計は \`for...of\` で \`let sum = 0\` に足し込み、 最後に \`sum / items.length\` を返します。
- 戻り値は整数とは限りません (例: 平均が \`1.5\`)。
- S4 では \`reduce\` を使わず **手書きのループ** で合計を組み立てる練習をします。
`,
  starterFiles: singleFile(`function averageByField(items, field) {
  // 1) 空配列なら 0 を返す (NaN 回避)
  // 2) for...of で合計を作る
  // 3) sum / items.length を返す
}
`),
  entryPoints: ["averageByField"],
  demoCall: `console.log(averageByField([{ x: 1 }, { x: 2 }, { x: 3 }], "x"));`,
  tests: [
    {
      name: "整数の平均",
      code: `averageByField([{ rating: 80 }, { rating: 90 }, { rating: 70 }], "rating") === 80`,
    },
    {
      name: "結果が小数になる平均",
      code: `averageByField([{ x: 1 }, { x: 2 }], "x") === 1.5`,
    },
    {
      name: "空配列は 0 (NaN ではない)",
      code: `averageByField([], "rating") === 0`,
    },
    {
      name: "1 件ならその値そのもの",
      code: `averageByField([{ rating: 42 }], "rating") === 42`,
    },
    {
      name: "別フィールドでも動く",
      code: `averageByField([{ price: 100, stock: 4 }, { price: 200, stock: 8 }], "stock") === 6`,
    },
    {
      name: "負の数を含む平均",
      code: `averageByField([{ x: -2 }, { x: 0 }, { x: 2 }], "x") === 0`,
    },
    {
      name: "戻り値は数値 (NaN を返していない)",
      code: `Number.isFinite(averageByField([], "rating"))`,
    },
  ],
  hints: [
    "if (items.length === 0) return 0; let sum = 0; for (const item of items) sum += item[field]; return sum / items.length;",
    "解答例:\n```js\nfunction averageByField(items, field) {\n  if (items.length === 0) {\n    return 0;\n  }\n  let sum = 0;\n  for (const item of items) {\n    sum += item[field];\n  }\n  return sum / items.length;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で平均値を返す" },
        { kind: "node", nodeType: "IfStatement", label: "if で空配列ガードを書く" },
        { kind: "node", nodeType: "ForOfStatement", label: "for...of で合計を作る" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "method", name: "reduce", label: "S4 では reduce を使わない (Ch09 で導入)" },
        { kind: "method", name: "map", label: "S4 では map を使わない (Ch09 で導入)" },
        { kind: "method", name: "filter", label: "S4 では filter を使わない (Ch09 で導入)" },
      ],
    },
  },
  solution: `function averageByField(items, field) {
  if (items.length === 0) {
    return 0;
  }
  let sum = 0;
  for (const item of items) {
    sum += item[field];
  }
  return sum / items.length;
}
`,
  badSolutions: [
    {
      code: `function averageByField(items, field) {
  let sum = 0;
  for (const item of items) {
    sum += item[field];
  }
  return sum / items.length;
}
`,
      description: "空配列ガードを書いておらず空配列で NaN を返す (空配列テスト失敗 + AST required IfStatement 違反)",
    },
    {
      code: `function averageByField(items, field) {
  if (items.length === 0) {
    return 0;
  }
  let sum = 0;
  for (const item of items) {
    sum += item[field];
  }
  return sum;
}
`,
      description: "合計をそのまま返していて平均になっていない (テスト失敗)",
    },
    {
      code: `function averageByField(items, field) {
  if (items.length === 0) {
    return 0;
  }
  return items.reduce((a, b) => a + b[field], 0) / items.length;
}
`,
      description: "reduce を使った安易解 (AST forbidden 違反)",
    },
  ],
  mdnSections: [
    {
      heading: "for...of",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for...of",
      pageTitle: "for...of",
    },
    {
      heading: "Array: length",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/length",
      pageTitle: "Array.prototype.length",
    },
  ],
};
