import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch06MatrixSum: Assignment = {
  id: "S4-Ch06-03-matrix-sum",
  stage: "S4",
  chapterId: "Ch06",
  sequence: 3,
  title: "二次元配列の全要素を合計する",
  newConcept: "行列を二重ループで走査し、 累積で合計を取る",
  estimatedMinutes: 25,
  difficulty: 2,
  testKind: "function",
  description: `## やること

二次元配列 (行列) \`matrix\` を受け取り、 すべての要素の **合計** を返す関数 \`matrixSum\` を実装してください。 各行の長さが揃っていなくても (ジャグ配列でも) 動作するようにしてください。

\`\`\`js
matrixSum([
  [1, 2, 3],
  [4, 5, 6],
]);                          // → 21

matrixSum([[10]]);           // → 10
matrixSum([]);               // → 0
matrixSum([[], [1, 2], []]); // → 3
\`\`\`

## ポイント

- **外側で行を、 内側で列を回す** のが基本。 外側 \`for (const row of matrix)\` → 内側 \`for (const value of row)\` と書くとシンプルです。
- 累積パターン: \`let total = 0\` を関数のはじめに置き、 内側で \`total += value\` を繰り返します。
- ジャグ配列に対応するには **\`row.length\` を頼りにする** か、 \`for...of\` を使うのが確実です。
`,
  starterFiles: singleFile(`function matrixSum(matrix) {
  // 二重ループで行列の全要素を合計してください
}
`),
  entryPoints: ["matrixSum"],
  demoCall: `console.log(matrixSum([[1, 2, 3], [4, 5, 6]]));`,
  tests: [
    {
      name: "[[1,2,3],[4,5,6]] の合計は 21",
      code: `matrixSum([[1, 2, 3], [4, 5, 6]]) === 21`,
    },
    {
      name: "1 行 1 列",
      code: `matrixSum([[10]]) === 10`,
    },
    {
      name: "空配列の合計は 0",
      code: `matrixSum([]) === 0`,
    },
    {
      name: "ジャグ配列 (空行を含む) も合計できる",
      code: `matrixSum([[], [1, 2], []]) === 3`,
    },
    {
      name: "負の数も含めて合計",
      code: `matrixSum([[1, -2], [-3, 4]]) === 0`,
    },
    {
      name: "3x3 の合計",
      code: `matrixSum([[1,1,1],[1,1,1],[1,1,1]]) === 9`,
    },
    {
      name: "戻り値は number",
      code: `typeof matrixSum([[1]]) === "number"`,
    },
  ],
  hints: [
    "let total = 0; for (const row of matrix) for (const v of row) total += v; return total;",
    "解答例:\n```js\nfunction matrixSum(matrix) {\n  let total = 0;\n  for (const row of matrix) {\n    for (const value of row) {\n      total += value;\n    }\n  }\n  return total;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で合計を返す" },
        { kind: "node", nodeType: "ForOfStatement", label: "for...of で行と要素を走査する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function matrixSum(matrix) {
  let total = 0;
  for (const row of matrix) {
    for (const value of row) {
      total += value;
    }
  }
  return total;
}
`,
  badSolutions: [
    {
      code: `function matrixSum(matrix) {
  let total = 0;
  for (const row of matrix) {
    total += row[0] ?? 0;
  }
  return total;
}
`,
      description: "各行の先頭要素しか足しておらず、 内側ループが無い (テスト失敗)",
    },
    {
      code: `function matrixSum(matrix) {
  return matrix.flat().reduce((a, b) => a + b, 0);
}
`,
      description: "for...of を使わず flat / reduce で実装している (AST required 違反)",
    },
  ],
  mdnSections: [
    {
      heading: "for...of 文",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for...of",
      pageTitle: "for...of",
    },
  ],
};
