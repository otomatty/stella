import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch06MultiplicationTable: Assignment = {
  id: "S4-Ch06-01-multiplication-table",
  stage: "S4",
  chapterId: "Ch06",
  sequence: 1,
  title: "九九の表を二次元配列で返す",
  newConcept: "二重ループで二次元配列 (行列) を組み立てる",
  estimatedMinutes: 25,
  difficulty: 2,
  testKind: "function",
  description: `## やること

\`1〜9\` の九九の表を **二次元配列** で返す関数 \`multiplicationTable\` を実装してください。 戻り値は長さ 9 の配列で、 各要素も長さ 9 の配列です。 \`table[i][j]\` が \`(i + 1) * (j + 1)\` になるようにしてください。

\`\`\`js
const t = multiplicationTable();
t[0];     // → [1, 2, 3, 4, 5, 6, 7, 8, 9]
t[1];     // → [2, 4, 6, 8, 10, 12, 14, 16, 18]
t[8][8];  // → 81
t.length; // → 9
\`\`\`

## ポイント

- **外側のループで行 (\`i\`) を、 内側のループで列 (\`j\`) を回す** のが二重ループの基本形です。
- 行ごとに \`const row = []\` を作り、 内側ループで \`row.push((i + 1) * (j + 1))\` してから外側で \`table.push(row)\` する 2 段構成にすると読みやすいです。
- \`i\` と \`j\` を 0 から始めるか 1 から始めるかは設計次第。 配列の添字に合わせるなら 0 開始 + 中で +1 が安全です。
`,
  starterFiles: singleFile(`function multiplicationTable() {
  // 二重ループで 9x9 の二次元配列を組み立ててください
}
`),
  entryPoints: ["multiplicationTable"],
  demoCall: `console.log(multiplicationTable());`,
  tests: [
    {
      name: "戻り値は配列",
      code: `Array.isArray(multiplicationTable())`,
    },
    {
      name: "外側の長さは 9",
      code: `multiplicationTable().length === 9`,
    },
    {
      name: "各行の長さは 9",
      code: `multiplicationTable().every((row) => Array.isArray(row) && row.length === 9)`,
    },
    {
      name: "table[0] は [1..9]",
      code: `JSON.stringify(multiplicationTable()[0]) === JSON.stringify([1,2,3,4,5,6,7,8,9])`,
    },
    {
      name: "table[1] は 2 の段",
      code: `JSON.stringify(multiplicationTable()[1]) === JSON.stringify([2,4,6,8,10,12,14,16,18])`,
    },
    {
      name: "table[8][8] は 81",
      code: `multiplicationTable()[8][8] === 81`,
    },
    {
      name: "table[5][3] は 6 * 4 = 24",
      code: `multiplicationTable()[5][3] === 24`,
    },
  ],
  hints: [
    "外側 for (let i = 0; i < 9; i++) の中で row = [] を作り、 内側 for (let j = 0; j < 9; j++) で row.push((i + 1) * (j + 1)) する。",
    "解答例:\n```js\nfunction multiplicationTable() {\n  const table = [];\n  for (let i = 0; i < 9; i++) {\n    const row = [];\n    for (let j = 0; j < 9; j++) {\n      row.push((i + 1) * (j + 1));\n    }\n    table.push(row);\n  }\n  return table;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で二次元配列を返す" },
        { kind: "node", nodeType: "ForStatement", label: "for 文 (二重ループ) を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function multiplicationTable() {
  const table = [];
  for (let i = 0; i < 9; i++) {
    const row = [];
    for (let j = 0; j < 9; j++) {
      row.push((i + 1) * (j + 1));
    }
    table.push(row);
  }
  return table;
}
`,
  badSolutions: [
    {
      code: `function multiplicationTable() {
  const table = [];
  for (let i = 0; i < 9; i++) {
    table.push([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  }
  return table;
}
`,
      description: "全ての行が 1 の段になっており、 i に応じた値になっていない (テスト失敗)",
    },
    {
      code: `function multiplicationTable() {
  return Array.from({ length: 9 }, (_, i) =>
    Array.from({ length: 9 }, (_, j) => (i + 1) * (j + 1))
  );
}
`,
      description: "for 文を使わず Array.from で実装している (AST required 違反)",
    },
  ],
  mdnSections: [
    {
      heading: "for 文",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for",
      pageTitle: "for",
    },
  ],
};
