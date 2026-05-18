import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch07FunctionLoopSum: Assignment = {
  id: "S2-Ch07-15-function-loop-sum",
  stage: "S2",
  chapterId: "Ch07",
  sequence: 15,
  title: "関数の中で for ループを使う",
  newConcept: "関数の中にループを入れて、 配列を受け取って結果を返す",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

\`function sum(arr)\` を作り、 配列の合計を **for ループ** で計算して \`return\` してください。 \`sum([1, 2, 3, 4, 5])\` の結果を出力してください。

## 期待する出力

\`\`\`
15
\`\`\`

## ポイント

- 関数の中で \`let total = 0;\` を準備し、 for ループで配列要素を足し込みます。
- 最後に \`return total;\`。
`,
  starterFiles: singleFile(`// 配列を引数に取る function 文の関数を宣言する
// 中で合計用の let の変数を 0 で初期化し、
// for ループで全要素を += で足し込んで合計を return する


// 関数に説明文の配列を渡して呼び出した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 15 になる",
      expectedStdout: "15",
    },
  ],
  hints: [
    "関数の中で `let total = 0;` を準備し、 for ループで `total += arr[i];` を繰り返します。",
    "ループが終わったら `return total;`。",
    "解答例:\n```js\nfunction sum(arr) {\n  let total = 0;\n  for (let i = 0; i < arr.length; i++) {\n    total += arr[i];\n  }\n  return total;\n}\nconsole.log(sum([1, 2, 3, 4, 5]));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "FunctionDeclaration", label: "function 宣言を使う" },
        { kind: "node", nodeType: "ForStatement", label: "for ループを使う" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で値を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function sum(arr) {
  let total = 0;
  for (let i = 0; i < arr.length; i++) {
    total += arr[i];
  }
  return total;
}
console.log(sum([1, 2, 3, 4, 5]));
`,
  badSolutions: [
    {
      code: `console.log(15);
`,
      description: "関数を作らず答えを直接書いている",
    },
  ],
  mdnSections: [
    { heading: "function 宣言", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/function", pageTitle: "function 宣言" },
  ],
};
