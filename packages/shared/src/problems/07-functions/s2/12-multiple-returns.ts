import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch07MultipleReturns: Assignment = {
  id: "S2-Ch07-12-multiple-returns",
  stage: "S2",
  chapterId: "Ch07",
  sequence: 12,
  title: "複数の return で結果を分岐する",
  newConcept: "条件ごとに異なる値を return する",
  estimatedMinutes: 8,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

\`function sign(n)\` を作ります。 引数 \`n\` の **符号** を文字列で返します:

- \`n > 0\` なら \`"+"\`
- \`n < 0\` なら \`"-"\`
- それ以外は \`"0"\`

\`sign(0)\` の結果を出力してください。

## 期待する出力

\`\`\`
0
\`\`\`

## ポイント

- 各 if ブロックで \`return\` すると、 そこで関数の実行は終わります。
- \`else if\` でも書けますが、 ここでは早期 return で 3 通りの結果を返します。
`,
  starterFiles: singleFile(`// function 文の関数を宣言する
// 中で「正のとき → return」「負のとき → return」「それ以外 → return」 を if で順に書き分ける


// 関数に説明文の値を渡して呼び出した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 0 になる",
      expectedStdout: "0",
    },
  ],
  hints: [
    "`if (n > 0) return \"+\";` のように早期 return で書けます。",
    "最後の `return \"0\";` がデフォルトの分岐になります。",
    "解答例:\n```js\nfunction sign(n) {\n  if (n > 0) {\n    return \"+\";\n  }\n  if (n < 0) {\n    return \"-\";\n  }\n  return \"0\";\n}\nconsole.log(sign(0));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "FunctionDeclaration", label: "function 宣言を使う" },
        { kind: "node", nodeType: "IfStatement", label: "if 文を使う" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で値を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function sign(n) {
  if (n > 0) {
    return "+";
  }
  if (n < 0) {
    return "-";
  }
  return "0";
}
console.log(sign(0));
`,
  badSolutions: [
    {
      code: `console.log("0");
`,
      description: "関数を作らず答えを直接書いている",
    },
  ],
  mdnSections: [
    { heading: "return", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/return", pageTitle: "return" },
  ],
};
