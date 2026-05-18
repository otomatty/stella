import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch07PassArray: Assignment = {
  id: "S2-Ch07-10-pass-array",
  stage: "S2",
  chapterId: "Ch07",
  sequence: 10,
  title: "配列引数の先頭を返す関数",
  newConcept: "配列も引数として渡せる",
  estimatedMinutes: 7,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`function first(arr) { return arr[0]; }\` を作り、 \`first(["a", "b", "c"])\` の結果を出力してください。

## 期待する出力

\`\`\`
a
\`\`\`

## ポイント

- 引数として配列も渡せます。 関数内では普通の配列として使えます。
- 配列の長さや要素を扱うのが関数の典型用途です。
`,
  starterFiles: singleFile(`// 配列の引数を取り、 添字 0 の要素を return する function 文の関数を宣言する


// 関数に説明文の配列を渡して呼び出した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が a になる",
      expectedStdout: "a",
    },
  ],
  hints: [
    "`function first(arr) { return arr[0]; }` の形で作ります。",
    "呼び出して結果を `console.log` に渡します。",
    "解答例:\n```js\nfunction first(arr) {\n  return arr[0];\n}\nconsole.log(first([\"a\", \"b\", \"c\"]));\n```",
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
  solution: `function first(arr) {
  return arr[0];
}
console.log(first(["a", "b", "c"]));
`,
  badSolutions: [
    {
      code: `console.log("a");
`,
      description: "関数を作らず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "function 宣言", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/function", pageTitle: "function 宣言" },
  ],
};
