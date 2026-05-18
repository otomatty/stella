import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch07CallTwice: Assignment = {
  id: "S2-Ch07-08-call-twice",
  stage: "S2",
  chapterId: "Ch07",
  sequence: 8,
  title: "同じ関数を 2 回呼んで使い回す",
  newConcept: "関数は何度でも呼び出して同じ処理を再利用できる",
  estimatedMinutes: 7,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`function double(n) { return n * 2; }\` を作り、 \`double(3)\` と \`double(7)\` の結果を 1 行ずつ出力してください。

## 期待する出力

\`\`\`
6
14
\`\`\`

## ポイント

- 同じ関数を引数を変えて呼べば、 違う結果が返ります。
- これが「処理を関数にまとめる」 ことのメリットです。
`,
  starterFiles: singleFile(`// 引数を 2 倍にして return する function 文の関数を宣言する


// 関数に説明文の 1 つ目の値を渡して呼び出した結果を console.log で出力する


// 関数に説明文の 2 つ目の値を渡して呼び出した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 6/14 の 2 行になる",
      expectedStdout: "6\n14",
    },
  ],
  hints: [
    "`function double(n) { return n * 2; }` を 1 つだけ作ります。",
    "それを 2 回呼んで結果を 1 行ずつ出力します。",
    "解答例:\n```js\nfunction double(n) {\n  return n * 2;\n}\nconsole.log(double(3));\nconsole.log(double(7));\n```",
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
  solution: `function double(n) {
  return n * 2;
}
console.log(double(3));
console.log(double(7));
`,
  badSolutions: [
    {
      code: `console.log(6);
console.log(14);
`,
      description: "関数を作らず数値を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "function 宣言", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/function", pageTitle: "function 宣言" },
  ],
};
