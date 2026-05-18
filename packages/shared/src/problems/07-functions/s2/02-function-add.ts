import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch07FunctionAdd: Assignment = {
  id: "S2-Ch07-02-function-add",
  stage: "S2",
  chapterId: "Ch07",
  sequence: 2,
  title: "引数と return で足し算関数を作る",
  newConcept: "引数を受け取り、 return で結果を返す",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`function add(a, b)\` を宣言し、 \`a + b\` を **return** で返します。 そのあと \`add(3, 4)\` を呼び出して結果 (\`7\`) を出力してください。

## 期待する出力

\`\`\`
7
\`\`\`

## ポイント

- 引数は \`function add(a, b) { ... }\` のように **括弧の中** に並べます。
- \`return\` で値を返すと、 呼び出し側で受け取って使えます。
`,
  starterFiles: singleFile(`// 2 つの引数を取る function 文の関数を宣言し、 引数同士を + で足した結果を return する


// 関数に説明文の値を渡して呼び出した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 7 になる",
      expectedStdout: "7",
    },
  ],
  hints: [
    "引数 `a, b` を取り、 `return a + b;` で結果を返します。",
    "呼び出し側で `console.log(add(3, 4));` を書きます。",
    "解答例:\n```js\nfunction add(a, b) {\n  return a + b;\n}\nconsole.log(add(3, 4));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "FunctionDeclaration", label: "function 宣言を使う" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で値を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function add(a, b) {
  return a + b;
}
console.log(add(3, 4));
`,
  badSolutions: [
    {
      code: `console.log(7);
`,
      description: "関数を作らず答えを直接書いている",
    },
    {
      code: `function add(a, b) {
  console.log(a + b);
}
add(3, 4);
`,
      description: "return せず関数内で console.log している (戻り値で返す形にする)",
    },
  ],
  mdnSections: [
    { heading: "return", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/return", pageTitle: "return" },
  ],
};
