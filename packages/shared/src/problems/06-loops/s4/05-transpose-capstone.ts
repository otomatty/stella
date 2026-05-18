import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch06TransposeCapstone: Assignment = {
  id: "S4-Ch06-05-transpose-capstone",
  stage: "S4",
  chapterId: "Ch06",
  sequence: 5,
  title: "[卒業課題] 行列の転置 (二次元配列の入れ替え)",
  newConcept: "「外側を列・内側を行」 で回し、 i / j を入れ替えて新しい行列を組み立てる",
  estimatedMinutes: 35,
  difficulty: 3,
  testKind: "function",
  isCapstone: true,
  description: `## やること

\`rows × cols\` の **長方形** な二次元配列 (各行の長さがすべて等しい) \`matrix\` を受け取り、 **転置** した \`cols × rows\` の二次元配列を返す関数 \`transpose\` を実装してください。

転置とは、 行と列を入れ替える操作のこと。 元の \`matrix[i][j]\` が、 結果の \`out[j][i]\` になります。

\`\`\`js
transpose([
  [1, 2, 3],
  [4, 5, 6],
]);
// → [
//   [1, 4],
//   [2, 5],
//   [3, 6],
// ]

transpose([[1, 2], [3, 4], [5, 6]]);
// → [[1, 3, 5], [2, 4, 6]]

transpose([[7]]);   // → [[7]]
transpose([]);      // → []
\`\`\`

## ポイント

- **これは S4 卒業課題のひとつ**。 行列の転置は二次元配列の代表的な操作で、 「外側を列・内側を行」 という反転した二重ループの組み立てが要です。
- 元: \`rows = matrix.length\`、 \`cols = matrix[0].length\`。 結果は \`cols\` 行 × \`rows\` 列。
- 外側 \`for (let j = 0; j < cols; j++)\` で結果の各行 (元の各列) を作り、 内側 \`for (let i = 0; i < rows; i++)\` で \`row.push(matrix[i][j])\` する 2 段構造が王道。
- 空配列 \`[]\` は空配列を返すこと。 最初に弾いておくと添字エラーを避けられます。
- AST で **二次元の \`for\` 文** と **\`return\`** を必須にしているため、 \`map\` ベースの実装では通りません。
`,
  starterFiles: singleFile(`function transpose(matrix) {
  // matrix.length === 0 のときは [] を返す
  // 外側で j = 0..cols、 内側で i = 0..rows を回し、 out[j][i] = matrix[i][j] を組み立てる
}
`),
  entryPoints: ["transpose"],
  demoCall: `console.log(transpose([[1, 2, 3], [4, 5, 6]]));`,
  tests: [
    {
      name: "2x3 を 3x2 に転置",
      code: `JSON.stringify(transpose([[1, 2, 3], [4, 5, 6]])) === JSON.stringify([[1, 4], [2, 5], [3, 6]])`,
    },
    {
      name: "3x2 を 2x3 に転置",
      code: `JSON.stringify(transpose([[1, 2], [3, 4], [5, 6]])) === JSON.stringify([[1, 3, 5], [2, 4, 6]])`,
    },
    {
      name: "1x1 はそのまま",
      code: `JSON.stringify(transpose([[7]])) === JSON.stringify([[7]])`,
    },
    {
      name: "空配列は空配列",
      code: `JSON.stringify(transpose([])) === JSON.stringify([])`,
    },
    {
      name: "正方行列 (2x2)",
      code: `JSON.stringify(transpose([[1, 2], [3, 4]])) === JSON.stringify([[1, 3], [2, 4]])`,
    },
    {
      name: "1 行のみ (1x4) は 4x1 になる",
      code: `JSON.stringify(transpose([[10, 20, 30, 40]])) === JSON.stringify([[10], [20], [30], [40]])`,
    },
    {
      name: "1 列のみ (4x1) は 1x4 になる",
      code: `JSON.stringify(transpose([[1], [2], [3], [4]])) === JSON.stringify([[1, 2, 3, 4]])`,
    },
    {
      name: "二重に転置すると元に戻る",
      code: `JSON.stringify(transpose(transpose([[1, 2, 3], [4, 5, 6]]))) === JSON.stringify([[1, 2, 3], [4, 5, 6]])`,
    },
    {
      name: "戻り値は配列",
      code: `Array.isArray(transpose([[1]]))`,
    },
  ],
  hints: [
    "rows = matrix.length、 cols = matrix[0].length。 外側 for (let j = 0; j < cols; j++) で結果の行を作り、 内側 for (let i = 0; i < rows; i++) で row.push(matrix[i][j])。",
    "解答例:\n```js\nfunction transpose(matrix) {\n  if (matrix.length === 0) {\n    return [];\n  }\n  const rows = matrix.length;\n  const cols = matrix[0].length;\n  const out = [];\n  for (let j = 0; j < cols; j++) {\n    const row = [];\n    for (let i = 0; i < rows; i++) {\n      row.push(matrix[i][j]);\n    }\n    out.push(row);\n  }\n  return out;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で二次元配列を返す" },
        { kind: "node", nodeType: "ForStatement", label: "for 文 (二重ループ) を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== ではなく === を使う" },
      ],
    },
  },
  solution: `function transpose(matrix) {
  if (matrix.length === 0) {
    return [];
  }
  const rows = matrix.length;
  const cols = matrix[0].length;
  const out = [];
  for (let j = 0; j < cols; j++) {
    const row = [];
    for (let i = 0; i < rows; i++) {
      row.push(matrix[i][j]);
    }
    out.push(row);
  }
  return out;
}
`,
  badSolutions: [
    {
      code: `function transpose(matrix) {
  const out = [];
  for (let i = 0; i < matrix.length; i++) {
    const row = [];
    for (let j = 0; j < matrix[i].length; j++) {
      row.push(matrix[i][j]);
    }
    out.push(row);
  }
  return out;
}
`,
      description: "i と j を入れ替えておらず、 元の行列と同じものを返している (テスト失敗)",
    },
    {
      code: `function transpose(matrix) {
  if (matrix.length === 0) return [];
  return matrix[0].map((_, j) => matrix.map((row) => row[j]));
}
`,
      description: "for 文を使わず map で実装している (AST required 違反)",
    },
  ],
  mdnSections: [
    {
      heading: "for 文",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for",
      pageTitle: "for",
    },
    {
      heading: "Array.prototype.push",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/push",
      pageTitle: "Array.prototype.push",
    },
  ],
};
