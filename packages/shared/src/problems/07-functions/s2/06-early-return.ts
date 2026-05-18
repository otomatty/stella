import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch07EarlyReturn: Assignment = {
  id: "S2-Ch07-06-early-return",
  stage: "S2",
  chapterId: "Ch07",
  sequence: 6,
  title: "早期 return で if/else をフラットにする",
  newConcept: "条件に該当したら即 return する書き方",
  estimatedMinutes: 9,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

絶対値を返す関数 \`abs(n)\` を作ります。 **早期 return** を使って:

- \`n < 0\` なら \`-n\` を即 \`return\`
- それ以外は最後で \`n\` を \`return\`

\`abs(-7)\` の結果を出力してください。

## 期待する出力

\`\`\`
7
\`\`\`

## ポイント

- 早期 return は「条件を満たしたらすぐ抜ける」 書き方で、 ネストが浅くなり読みやすいです。
- \`if (n < 0) { return -n; }\` で書いて、 その後ろに \`return n;\` を置きます。
`,
  starterFiles: singleFile(`// function 文の関数を宣言する
// 中で「負の入力は符号反転して return」 → 「それ以外は入力をそのまま return」 の早期 return を書く


// 関数に説明文の値を渡して呼び出した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 7 になる",
      expectedStdout: "7",
    },
  ],
  hints: [
    "`if (n < 0) { return -n; }` で負の場合を先に処理。",
    "その下に `return n;` を書くと「それ以外」 のケース。",
    "解答例:\n```js\nfunction abs(n) {\n  if (n < 0) {\n    return -n;\n  }\n  return n;\n}\nconsole.log(abs(-7));\n```",
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
        { kind: "method", name: "abs", label: "Math.abs は使わない (自分で実装する)" },
      ],
    },
  },
  solution: `function abs(n) {
  if (n < 0) {
    return -n;
  }
  return n;
}
console.log(abs(-7));
`,
  badSolutions: [
    {
      code: `console.log(7);
`,
      description: "関数を作らず答えを直接書いている",
    },
    {
      code: `console.log(Math.abs(-7));
`,
      description: "Math.abs を使っている (自分で実装すること)",
    },
  ],
  mdnSections: [
    { heading: "return", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/return", pageTitle: "return" },
  ],
};
