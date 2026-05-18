import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch02IsArithmetic: Assignment = {
  id: "S4-Ch02-02-is-arithmetic",
  stage: "S4",
  chapterId: "Ch02",
  sequence: 2,
  title: "等差数列かどうかを判定する",
  newConcept: "隣り合う差を順に比較して数列のパターンを検出する",
  estimatedMinutes: 25,
  difficulty: 2,
  testKind: "function",
  description: `## やること

数値の配列 \`arr\` を受け取り、 その並びが **等差数列** (隣り合う 2 数の差がすべて同じ) かどうかを判定する関数 \`isArithmetic\` を実装してください。

\`\`\`js
isArithmetic([3, 5, 7, 9]);    // → true   (公差 2)
isArithmetic([5, 5, 5]);        // → true   (公差 0)
isArithmetic([1, -1, -3, -5]);  // → true   (公差 -2)
isArithmetic([1, 2, 4]);        // → false  (差が 1, 2 で揃わない)
isArithmetic([10]);             // → true   (要素 1 つは空虚に等差)
isArithmetic([]);               // → true   (空配列も空虚に等差)
\`\`\`

## ポイント

- 配列の長さが \`0\` または \`1\` のときは判定対象がないので **\`true\`** を返します。
- まず先頭 2 つで **公差** \`arr[1] - arr[0]\` を決めます。
- そのあと \`i = 2\` から末尾まで \`for\` で回り、 \`arr[i] - arr[i - 1]\` が公差と一致しない要素があれば \`false\` を返します。
- 最後まで一致したまま抜けたら \`true\` を返します。
`,
  starterFiles: singleFile(`function isArithmetic(arr) {
  // 隣り合う差がすべて同じかをループでチェックしてください
  // 長さ <= 1 のときは true を返す
}
`),
  entryPoints: ["isArithmetic"],
  demoCall: `console.log(isArithmetic([3, 5, 7, 9]));`,
  tests: [
    { name: "[3, 5, 7, 9] は等差数列 (公差 2)", code: `isArithmetic([3, 5, 7, 9]) === true` },
    { name: "[5, 5, 5] は等差数列 (公差 0)", code: `isArithmetic([5, 5, 5]) === true` },
    { name: "[1, -1, -3, -5] は等差数列 (公差 -2)", code: `isArithmetic([1, -1, -3, -5]) === true` },
    { name: "[1, 2, 4] は等差数列ではない", code: `isArithmetic([1, 2, 4]) === false` },
    { name: "[2, 4, 8, 16] は等差数列ではない (これは等比)", code: `isArithmetic([2, 4, 8, 16]) === false` },
    { name: "[10] は true (要素 1 つ)", code: `isArithmetic([10]) === true` },
    { name: "[] は true (空配列)", code: `isArithmetic([]) === true` },
    { name: "[0, 3, 6, 9, 12, 15] は等差数列", code: `isArithmetic([0, 3, 6, 9, 12, 15]) === true` },
    { name: "[1, 2, 3, 4, 5, 7] は最後でずれて false", code: `isArithmetic([1, 2, 3, 4, 5, 7]) === false` },
  ],
  hints: [
    "先頭 2 つで公差を決めて、 i = 2 から for で回って差が一致するかを見る。",
    "長さ 0 / 1 は空虚に等差扱い (true)。 ループ内で差がずれたら return false、 最後まで通れば return true。",
    "解答例:\n```js\nfunction isArithmetic(arr) {\n  if (arr.length <= 1) {\n    return true;\n  }\n  const diff = arr[1] - arr[0];\n  for (let i = 2; i < arr.length; i++) {\n    if (arr[i] - arr[i - 1] !== diff) {\n      return false;\n    }\n  }\n  return true;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で真偽値を返す" },
        { kind: "node", nodeType: "ForStatement", label: "for で配列を走査する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
      ],
    },
  },
  solution: `function isArithmetic(arr) {
  if (arr.length <= 1) {
    return true;
  }
  const diff = arr[1] - arr[0];
  for (let i = 2; i < arr.length; i++) {
    if (arr[i] - arr[i - 1] !== diff) {
      return false;
    }
  }
  return true;
}
`,
  badSolutions: [
    {
      code: `function isArithmetic(arr) {
  if (arr.length <= 1) {
    return false;
  }
  const diff = arr[1] - arr[0];
  for (let i = 2; i < arr.length; i++) {
    if (arr[i] - arr[i - 1] !== diff) {
      return false;
    }
  }
  return true;
}
`,
      description: "要素 1 つ・空配列のとき誤って false を返す",
    },
    {
      code: `function isArithmetic(arr) {
  if (arr.length <= 1) {
    return true;
  }
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] - arr[0] !== arr[1] - arr[0]) {
      return false;
    }
  }
  return true;
}
`,
      description: "隣の差ではなく先頭との差を比較しているため [3,5,7,9] でも false になる",
    },
    {
      code: `function isArithmetic(arr) {
  if (arr.length <= 1) {
    return true;
  }
  for (let i = 2; i < arr.length; i++) {
    if (arr[i] - arr[i - 1] !== arr[1] - arr[0]) {
      return true;
    }
  }
  return false;
}
`,
      description: "true / false の方向が逆で、 ループ内で見つけ次第 true を返してしまう",
    },
  ],
  mdnSections: [
    {
      heading: "for 文",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for",
      pageTitle: "for",
    },
    {
      heading: "減算 (-)",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Subtraction",
      pageTitle: "減算 (-)",
    },
  ],
};
